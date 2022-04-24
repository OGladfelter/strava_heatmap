/*
 Leaflet.BigImage (https://github.com/pasichnykvasyl/Leaflet.BigImage).
 (c) 2020, Vasyl Pasichnyk, pasichnykvasyl (Oswald)
*/

(function (factory, window) {

    // define an AMD module that relies on 'leaflet'
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);

        // define a Common JS module that relies on 'leaflet'
    } else if (typeof exports === 'object') {
        module.exports = factory(require('leaflet'));
    }

    // attach your plugin to the global 'L' variable
    if (typeof window !== 'undefined' && window.L) {
        window.L.YourPlugin = factory(L);
    }
}(function (L) {

    L.Control.BigImage = L.Control.extend({
        options: {
            position: 'topleft',
            title: 'Export to PNG',
            printControlLabel: '&#x1F4F7;',
            printControlClasses: [],
            printControlTitle: 'Export to PNG',
            _unicodeClass: 'bigimage-unicode-icon',
            maxScale: 10,
            minScale: 1,
            inputTitle: 'Choose scale:',
            downloadTitle: 'Download'
        },

        onAdd: function (map) {
            this._map = map;

            const title = this.options.printControlTitle;
            const label = this.options.printControlLabel;
            let classes = this.options.printControlClasses;

            if (label.indexOf('&') != -1) classes.push(this.options._unicodeClass);

            return this._createControl(label, title, classes, this);
        },

        _createControl: function (label, title, classesToAdd, context) {

            this._container = document.createElement('div');
            this._container.id = 'print-container';
            this._container.classList.add('leaflet-bar');

            this._container.addEventListener('click', () => {
                // this print button opens a modal
                document.getElementById("printModal").style.display = 'block';
            });

            var canvas = this; // so we can access the canvas within the button functions
+           document.getElementById("normalResolutionButton").addEventListener("click", function(){canvas._print(false);});
+           document.getElementById("highResolutionButton").addEventListener("click", function(){canvas._print(true);});

            this._createControlPanel(classesToAdd, context, label, title);

            return this._container;
        },

        _createControlPanel: function (classesToAdd, context, label, title) {
            let controlPanel = document.createElement('a');
            controlPanel.innerHTML = label;
            controlPanel.id = 'print-btn';
            controlPanel.setAttribute('title', title);
            classesToAdd.forEach(function (c) {
                controlPanel.classList.add(c);
            });
            //L.DomEvent.on(controlPanel, 'click', context);
            this._container.appendChild(controlPanel);
            this._controlPanel = controlPanel;

            // this._loader = document.createElement('div');
            // this._loader.id = 'print-loading';
            // this._container.appendChild(this._loader);
        },

        _getLayers: function (resolve) {
            let self = this;
            let promises = [];
            self._map.eachLayer(function (layer) {
                promises.push(new Promise((new_resolve) => {
                    try {
                        if (layer instanceof L.Marker && layer._icon && layer._icon.src) {
                            self._getMarkerLayer(layer, new_resolve)
                        } else if (layer instanceof L.TileLayer) {
                            self._getTileLayer(layer, new_resolve);
                        } else if (layer instanceof L.Circle) {
                            if (!self.circles[layer._leaflet_id]) {
                                self.circles[layer._leaflet_id] = layer;
                            }
                            new_resolve();
                        } else if (layer instanceof L.Path) {
                            self._getPathLayer(layer, new_resolve);
                        } else {
                            new_resolve();
                        }
                    } catch (e) {
                        new_resolve();
                    }
                }));
            });

            Promise.all(promises).then(() => {
                resolve()
            });
        },

        _getTileLayer: function (layer, resolve) {
            let self = this;

            self.tiles = [];
            self.tileSize = layer._tileSize.x;
            self.tileBounds = L.bounds(self.bounds.min.divideBy(self.tileSize)._floor(), self.bounds.max.divideBy(self.tileSize)._floor());

            for (let j = self.tileBounds.min.y; j <= self.tileBounds.max.y; j++)
                for (let i = self.tileBounds.min.x; i <= self.tileBounds.max.x; i++)
                    self.tiles.push(new L.Point(i, j));

            let promiseArray = [];
            self.tiles.forEach(tilePoint => {
                let originalTilePoint = tilePoint.clone();
                if (layer._adjustTilePoint) layer._adjustTilePoint(tilePoint);

                let tilePos = originalTilePoint.scaleBy(new L.Point(self.tileSize, self.tileSize)).subtract(self.bounds.min);

                if (tilePoint.y < 0) return;

                promiseArray.push(new Promise(resolve => {
                    self._loadTile(tilePoint, tilePos, layer, resolve);
                }));
            });

            Promise.all(promiseArray).then(() => {
                resolve();
            });
        },

        _loadTile: function (tilePoint, tilePos, layer, resolve) {
            let self = this;
            let imgIndex = tilePoint.x + ':' + tilePoint.y + ':' + self.zoom;
            let image = new Image();
            image.crossOrigin = 'Anonymous';
            image.onload = function () {
                if (!self.tilesImgs[imgIndex]) self.tilesImgs[imgIndex] = {img: image, x: tilePos.x, y: tilePos.y};
                resolve();
            };
            image.src = layer.getTileUrl(tilePoint);
        },

        _getMarkerLayer: function (layer, resolve) {
            let self = this;

            if (self.markers[layer._leaflet_id]) {
                resolve();
                return;
            }

            let pixelPoint = self._map.project(layer._latlng);
            pixelPoint = pixelPoint.subtract(new L.Point(self.bounds.min.x, self.bounds.min.y));

            if (layer.options.icon && layer.options.icon.options && layer.options.icon.options.iconAnchor) {
                pixelPoint.x -= layer.options.icon.options.iconAnchor[0];
                pixelPoint.y -= layer.options.icon.options.iconAnchor[1];
            }

            if (!self._pointPositionIsNotCorrect(pixelPoint)) {
                let image = new Image();
                image.crossOrigin = 'Anonymous';
                image.onload = function () {
                    self.markers[layer._leaflet_id] = {img: image, x: pixelPoint.x, y: pixelPoint.y};
                    resolve();
                };
                image.src = layer._icon.src;
            } else {
                resolve();
            }
        },

        _pointPositionIsNotCorrect: function (point) {
            return (point.x < 0 || point.y < 0 || point.x > this.canvas.width || point.y > this.canvas.height);
        },

        _getPathLayer: function (layer, resolve) {
            let self = this;

            let correct = 0;
            let parts = [];

            if (layer._mRadius || !layer._latlngs) {
                resolve();
                return;
            }

            let latlngs = layer.options.fill ? layer._latlngs[0] : layer._latlngs;
            latlngs.forEach((latLng) => {
                let pixelPoint = self._map.project(latLng);
                pixelPoint = pixelPoint.subtract(new L.Point(self.bounds.min.x, self.bounds.min.y));
                parts.push(pixelPoint);
                if (pixelPoint.x < self.canvas.width && pixelPoint.y < self.canvas.height) correct = 1;
            });

            if (correct) self.path[layer._leaflet_id] = {
                parts: parts,
                closed: layer.options.fill,
                options: layer.options
            };
            resolve();
        },

        _drawPath: function (value) {

            // if this path's activity isn't in the currently selected activities, don't add it to screenshot
            if (!activityTypes.includes(value.options.activity)){
                return;
            }

            // activities outside the date range also should not be included in screenshot
            var dates = $('#dateSlider').slider("option", "values");
            var minEpoch = new Date(dates[0] * 1000).setHours(0,0,0,0);
            var maxEpoch = new Date(dates[1] * 1000).setHours(0,0,0,0);
            // reformat EPOS seconds back into date object - must be of time 00:00:00 to match strava date that I pulled
            var minDate = new Date(minEpoch);
            var maxDate = new Date(maxEpoch);
            if (value.options.date < minDate || value.options.date > maxDate) {
                return;
            }

            // finally, don't include activities outside the time range
            var times = $('#timeSlider').slider("option", "values");
            if (value.options.startTime < times[0] || value.options.startTime > times[1]) {
                return;
            }

            let self = this;

            self.ctx.beginPath();
            let count = 0;
            let options = value.options;
            value.parts.forEach((point) => {
                self.ctx[count++ ? 'lineTo' : 'moveTo'](point.x, point.y);
            });

            if (value.closed) self.ctx.closePath();

            // plug in correct asthetics
            options.color = value.options.color;
            options.weight = $('#thicknessSlider').slider("option", "value");
            options.opacity = $('#alphaSlider').slider("option", "value");

            this._feelPath(options);
        },

        _drawCircle: function (layer, resolve) {

            if (layer._empty()) {
                return;
            }

            let point = this._map.project(layer._latlng);
            point = point.subtract(new L.Point(this.bounds.min.x, this.bounds.min.y));

            let r = Math.max(Math.round(layer._radius), 1),
                s = (Math.max(Math.round(layer._radiusY), 1) || r) / r;

            if (s !== 1) {
                this.ctx.save();
                this.scale(1, s);
            }

            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y / s, r, 0, Math.PI * 2, false);

            if (s !== 1) {
                this.ctx.restore();
            }

            this._feelPath(layer.options);
        },

        _feelPath: function (options) {

            if (options.fill) {
                this.ctx.globalAlpha = options.fillOpacity;
                this.ctx.fillStyle = options.fillColor || options.color;
                this.ctx.fill(options.fillRule || 'evenodd');
            }

            if (options.stroke && options.weight !== 0) {
                if (this.ctx.setLineDash) {
                    this.ctx.setLineDash(options && options._dashArray || []);
                }
                this.ctx.globalAlpha = options.opacity;
                this.ctx.lineWidth = options.weight;
                this.ctx.strokeStyle = options.color;
                this.ctx.lineCap = options.lineCap;
                this.ctx.lineJoin = options.lineJoin;
                this.ctx.stroke();
            }
        },

        _print: function (highResolution) {
            let self = this;

            self.tilesImgs = {};
            self.markers = {};
            self.path = {};
            self.circles = {};

            let dimensions = self._map.getSize();

            self.zoom = self._map.getZoom();
            self.bounds = self._map.getPixelBounds();

            self.canvas = document.createElement('canvas');
            self.canvas.width = dimensions.x;
            self.canvas.height = dimensions.y;
            self.ctx = self.canvas.getContext('2d');

            // this adds background color to the image
            self.ctx.save();
            self.ctx.globalCompositeOperation = 'destination-over';
            self.ctx.fillStyle = document.getElementById("backgroundColor").value;
            self.ctx.fillRect(0, 0, self.canvas.width, self.canvas.height);
            self.ctx.restore();

            let promise = new Promise(function (resolve, reject) {
                self._getLayers(resolve);
            });

            promise.then(() => {
                return new Promise(((resolve, reject) => {
                    for (const [key, value] of Object.entries(self.tilesImgs)) {
                        self.ctx.drawImage(value.img, value.x, value.y, self.tileSize, self.tileSize);
                    }
                    for (const [key, value] of Object.entries(self.path)) {
                        self._drawPath(value);
                    }
                    for (const [key, value] of Object.entries(self.markers)) {
                        self.ctx.drawImage(value.img, value.x, value.y);
                    }
                    for (const [key, value] of Object.entries(self.circles)) {
                        self._drawCircle(value);
                    }
                    resolve();
                }));
            }).then(() => {
                function resizedCanvas(c, scaleFactor) {
                    // Set up CSS size.
                    var canvas = c;
                    canvas.style.width = canvas.style.width || canvas.width + 'px';
                    canvas.style.height = canvas.style.height || canvas.height + 'px';

                    // Get size information.
                    var width = parseFloat(canvas.style.width);
                    var height = parseFloat(canvas.style.height);

                    // Backup the canvas contents.
                    var oldScale = canvas.width / width;
                    var backupScale = scaleFactor / oldScale;
                    var backup = canvas.cloneNode(false);
                    backup.getContext('2d').drawImage(canvas, 0, 0);

                    // Resize the canvas.
                    var ctx = canvas.getContext('2d');
                    canvas.width = Math.ceil(width * scaleFactor);
                    canvas.height = Math.ceil(height * scaleFactor);

                    // Redraw the canvas image and scale future draws.
                    ctx.setTransform(backupScale, 0, 0, backupScale, 0, 0);
                    ctx.drawImage(backup, 0, 0);
                    ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
                    return canvas
                }

                // optional line to resize the image to something larger. skip this if it's not for a poster.
                if (highResolution) {
                    self.canvas = resizedCanvas(self.canvas, 5);
                }
                
                self.canvas.toBlob(function (blob) {
                    let link = document.createElement('a');
                    link.download = "activity_heatmap.png";
                    link.href = URL.createObjectURL(blob);
                    link.click();
                });
            });
        }
    });

    L.control.bigImage = function (options) {
        return new L.Control.BigImage(options);
    };
}, window));