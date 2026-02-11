/**
 * AniMaps - Layers & Drawing Module
 * Handles location search, boundary highlighting, drawing tools, and layer animation
 */

class LayersManager {
    constructor(animaps) {
        this.animaps = animaps;
        this.map = null;
        this.layers = [];
        this.layerCounter = 0;
        this.selectedLayerIndex = -1;
        
        // Drawing state
        this.isDrawing = false;
        this.drawingMode = null;
        this.drawingPoints = [];
        this.tempMarkers = [];
        
        // Default style settings
        this.shapeStyle = {
            fillColor: '#6366f1',
            fillOpacity: 0.3,
            outlineColor: '#8b5cf6',
            outlineWidth: 2,
            outlineOpacity: 1.0,
            outlineOffset: 0, 
            reverseOffset: false, // Fixes winding order issues
            dashLength: 0,
            dashGap: 0,
            dashOffset: 0,
            visible: true
        };

        // Animation state
        this.strokeAnimationFrame = null;
    }

    init(map) {
        this.map = map;
        this.bindElements();
        this.bindEvents();
        this.setupMapDrawingEvents();
        this.startStrokeAnimation();
    }

    bindElements() {
        // Search
        this.locationSearch = document.getElementById('locationSearch');
        this.searchBtn = document.getElementById('searchBtn');
        this.searchResults = document.getElementById('searchResults');
        
        // Style controls
        this.fillColorInput = document.getElementById('shapeFillColor');
        this.fillOpacityInput = document.getElementById('shapeFillOpacity');
        this.outlineColorInput = document.getElementById('shapeOutlineColor');
        this.outlineWidthInput = document.getElementById('shapeOutlineWidth');
        
        // Drawing tools
        this.drawPolygonBtn = document.getElementById('drawPolygon');
        this.drawRectangleBtn = document.getElementById('drawRectangle');
        this.drawCircleBtn = document.getElementById('drawCircle');
        this.drawLineBtn = document.getElementById('drawLine');
        this.cancelDrawBtn = document.getElementById('cancelDraw');
        this.drawHint = document.getElementById('drawHint');
        
        // Layers list & editor
        this.layersList = document.getElementById('layersList');
        this.clearAllLayersBtn = document.getElementById('clearAllLayers');
        this.layerEditor = document.getElementById('layerEditor');
    }

    bindEvents() {
        // Search events
        this.searchBtn.addEventListener('click', () => this.searchLocation());
        this.locationSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchLocation();
        });

        // Style change events for new shapes
        this.fillColorInput.addEventListener('input', (e) => {
            this.shapeStyle.fillColor = e.target.value;
        });
        this.fillOpacityInput.addEventListener('input', (e) => {
            this.shapeStyle.fillOpacity = parseFloat(e.target.value);
        });
        this.outlineColorInput.addEventListener('input', (e) => {
            this.shapeStyle.outlineColor = e.target.value;
        });
        this.outlineWidthInput.addEventListener('input', (e) => {
            this.shapeStyle.outlineWidth = parseInt(e.target.value);
        });

        // Drawing tool buttons
        this.drawPolygonBtn.addEventListener('click', () => this.startDrawing('polygon'));
        this.drawRectangleBtn.addEventListener('click', () => this.startDrawing('rectangle'));
        this.drawCircleBtn.addEventListener('click', () => this.startDrawing('circle'));
        this.drawLineBtn.addEventListener('click', () => this.startDrawing('line'));
        this.cancelDrawBtn.addEventListener('click', () => this.cancelDrawing());

        // Clear all layers
        this.clearAllLayersBtn.addEventListener('click', () => this.clearAllLayers());
    }

    // ==================== LOCATION SEARCH ====================
    async searchLocation() {
        const query = this.locationSearch.value.trim();
        if (!query) return;

        this.searchResults.innerHTML = '<p class="search-loading">Searching...</p>';

        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&polygon_geojson=1&limit=5`,
                { headers: { 'User-Agent': 'AniMaps/1.0' } }
            );
            
            const results = await response.json();
            
            if (results.length === 0) {
                this.searchResults.innerHTML = '<p class="empty-state small">No results found</p>';
                return;
            }

            this.renderSearchResults(results);
        } catch (error) {
            console.error('Search error:', error);
            this.searchResults.innerHTML = '<p class="empty-state small">Search failed. Try again.</p>';
        }
    }

    renderSearchResults(results) {
        this.searchResults.innerHTML = results.map((result, i) => `
            <div class="search-result-item" data-index="${i}">
                <svg class="result-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                </svg>
                <span class="result-name">${result.display_name.split(',')[0]}</span>
                <span class="result-type">${result.type || 'place'}</span>
            </div>
        `).join('');

        this.searchResults.querySelectorAll('.search-result-item').forEach((item, i) => {
            item.addEventListener('click', () => this.addLocationLayer(results[i]));
        });
    }

    async addLocationLayer(result) {
        const bounds = result.boundingbox;
        if (bounds) {
            this.map.fitBounds([
                [parseFloat(bounds[2]), parseFloat(bounds[0])],
                [parseFloat(bounds[3]), parseFloat(bounds[1])]
            ], { padding: 50 });
        } else {
            this.map.flyTo({
                center: [parseFloat(result.lon), parseFloat(result.lat)],
                zoom: 10
            });
        }

        if (result.geojson) {
            this.addGeoJsonLayer(result.display_name.split(',')[0], result.geojson);
        }

        this.searchResults.innerHTML = '';
        this.locationSearch.value = '';
    }

    // ==================== ADD LAYERS ====================
    addGeoJsonLayer(name, geojson, customStyle = null) {
        const layerId = `layer-${++this.layerCounter}`;
        const sourceId = `source-${layerId}`;
        const style = customStyle || { ...this.shapeStyle };

        // Add source
        this.map.addSource(sourceId, {
            type: 'geojson',
            data: geojson
        });

        // Add fill layer
        this.map.addLayer({
            id: `${layerId}-fill`,
            type: 'fill',
            source: sourceId,
            paint: {
                'fill-color': style.fillColor,
                'fill-opacity': style.fillOpacity
            }
        });

        // Add outline layer with advanced settings
        const linePaint = {
            'line-color': style.outlineColor,
            'line-width': style.outlineWidth,
            'line-opacity': style.outlineOpacity !== undefined ? style.outlineOpacity : 1.0,
            'line-offset': style.outlineOffset || 0
        };

        // Add dash array if specified
        if (style.dashLength > 0) {
            linePaint['line-dasharray'] = [style.dashLength, style.dashGap || style.dashLength];
        }

        this.map.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: linePaint
        });

        // Create layer object with animation properties
        const layer = {
            id: layerId,
            name: name,
            sourceId: sourceId,
            geojson: geojson,
            type: 'polygon',
            visible: true,
            // Current style (can be animated)
            style: {
                fillColor: style.fillColor,
                fillOpacity: style.fillOpacity,
                outlineColor: style.outlineColor,
                outlineWidth: style.outlineWidth,
                outlineOpacity: style.outlineOpacity !== undefined ? style.outlineOpacity : 1.0,
                outlineOffset: style.outlineOffset || 0,
                reverseOffset: style.reverseOffset || false,
                dashLength: style.dashLength || 0,
                dashGap: style.dashGap || 0,
                dashOffset: 0,
                animateStroke: false,
                strokeSpeed: 1
            },
            // Animation keyframes for this layer
            keyframes: []
        };

        this.layers.push(layer);
        this.renderLayersList();
        this.selectLayer(this.layers.length - 1);
        
        // Update timeline to show the new layer track
        if (this.animaps && this.animaps.renderLayerTracks) {
            this.animaps.renderLayerTracks();
        }
    }

    // ==================== LAYER SELECTION & EDITING ====================
    selectLayer(index) {
        this.selectedLayerIndex = index;
        this.renderLayersList();
        this.renderLayerEditor();
    }

    renderLayerEditor() {
        if (!this.layerEditor) return;

        if (this.selectedLayerIndex < 0 || !this.layers[this.selectedLayerIndex]) {
            this.layerEditor.innerHTML = '<p class="empty-state small">Select a layer to edit</p>';
            return;
        }

        const layer = this.layers[this.selectedLayerIndex];
        const s = layer.style;

        this.layerEditor.innerHTML = `
            <div class="layer-editor-content">
                <div class="layer-editor-title">
                    <span class="layer-color-badge" style="background: ${s.fillColor}"></span>
                    <input type="text" id="layerName" value="${layer.name}" class="layer-name-input">
                </div>

                <div class="editor-section">
                    <label class="section-label">Fill</label>
                    <div class="style-row">
                        <div class="style-field">
                            <label>Color</label>
                            <input type="color" id="layerFillColor" value="${s.fillColor}">
                        </div>
                        <div class="style-field">
                            <label>Opacity: ${(s.fillOpacity * 100).toFixed(0)}%</label>
                            <input type="range" id="layerFillOpacity" min="0" max="1" step="0.05" value="${s.fillOpacity}">
                        </div>
                    </div>
                </div>

                <div class="editor-section">
                    <label class="section-label">Outline</label>
                    <div class="style-row">
                        <div class="style-field">
                            <label>Color</label>
                            <input type="color" id="layerOutlineColor" value="${s.outlineColor}">
                        </div>
                        <div class="style-field">
                            <label>Width: ${s.outlineWidth}px</label>
                            <input type="range" id="layerOutlineWidth" min="0" max="20" step="0.5" value="${s.outlineWidth}">
                        </div>
                    </div>
                    <div class="style-row">
                        <div class="style-field">
                            <label>Opacity: ${(s.outlineOpacity * 100).toFixed(0)}%</label>
                            <input type="range" id="layerOutlineOpacity" min="0" max="1" step="0.05" value="${s.outlineOpacity}">
                        </div>
                        <div class="style-field">
                            <label>Offset: ${s.outlineOffset}px</label>
                            <input type="range" id="layerOutlineOffset" min="-20" max="20" step="1" value="${s.outlineOffset}">
                        </div>
                    </div>
                        <div class="style-field">
                            <label>Mode</label>
                            <select id="layerOutlineMode">
                                <option value="0" ${s.outlineOffset === 0 ? 'selected' : ''}>Center</option>
                                <option value="positive" ${s.outlineOffset > 0 ? 'selected' : ''}>Outset (Expand)</option>
                                <option value="negative" ${s.outlineOffset < 0 ? 'selected' : ''}>Inset (Contract)</option>
                            </select>
                        </div>
                    </div>
                    <div class="style-row">
                        <div class="style-field full">
                            <label class="checkbox-label" title="Fixes issues where 'outset' contracts the shape due to polygon winding order">
                                <input type="checkbox" id="layerReverseOffset" ${s.reverseOffset ? 'checked' : ''}>
                                Reverse offset direction (Flip Inset/Outset)
                            </label>
                        </div>
                    </div>
                </div>

                <div class="editor-section">
                    <label class="section-label">Stroke Animation</label>
                    <div class="style-row">
                        <div class="style-field">
                            <label>Dash: ${s.dashLength}px</label>
                            <input type="range" id="layerDashLength" min="0" max="30" step="1" value="${s.dashLength}">
                        </div>
                        <div class="style-field">
                            <label>Gap: ${s.dashGap}px</label>
                            <input type="range" id="layerDashGap" min="0" max="30" step="1" value="${s.dashGap}">
                        </div>
                    </div>
                    <div class="style-row">
                        <div class="style-field full">
                            <label class="checkbox-label">
                                <input type="checkbox" id="layerAnimateStroke" ${s.animateStroke ? 'checked' : ''}>
                                Animate stroke (marching ants)
                            </label>
                        </div>
                    </div>
                    <div class="style-row" ${s.animateStroke ? '' : 'style="display:none"'} id="strokeSpeedRow">
                        <div class="style-field full">
                            <label>Speed: ${s.strokeSpeed}x</label>
                            <input type="range" id="layerStrokeSpeed" min="0.1" max="5" step="0.1" value="${s.strokeSpeed}">
                        </div>
                    </div>
                </div>

                <div class="editor-section">
                    <label class="section-label">Layer Keyframes</label>
                    <p class="hint-text">Add keyframes to animate this layer's properties over time</p>
                    <div class="layer-keyframes-controls">
                        <button class="btn btn-secondary btn-small" id="addLayerKeyframe">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <line x1="12" y1="5" x2="12" y2="19"/>
                                <line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                            Add Keyframe
                        </button>
                    </div>
                    <div class="layer-keyframes-list" id="layerKeyframesList">
                        ${this.renderLayerKeyframes(layer)}
                    </div>
                </div>

                <div class="editor-section">
                    <label class="section-label">Visibility</label>
                    <label class="checkbox-label">
                        <input type="checkbox" id="layerVisible" ${layer.visible ? 'checked' : ''}>
                        Layer visible
                    </label>
                </div>
            </div>
        `;

        // Bind all editor events
        this.bindLayerEditorEvents();
    }

    renderLayerKeyframes(layer) {
        if (layer.keyframes.length === 0) {
            return '<p class="empty-state tiny">No keyframes. Properties are static.</p>';
        }

        return layer.keyframes.map((kf, i) => `
            <div class="layer-keyframe-item" data-index="${i}">
                <span class="kf-time">${this.formatTime(kf.time)}</span>
                <span class="kf-props">${Object.keys(kf.props).length} props</span>
                <button class="layer-btn delete" data-kf-index="${i}">×</button>
            </div>
        `).join('');
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    bindLayerEditorEvents() {
        const layer = this.layers[this.selectedLayerIndex];
        if (!layer) return;

        // Name
        const nameInput = document.getElementById('layerName');
        if (nameInput) {
            nameInput.addEventListener('change', (e) => {
                layer.name = e.target.value;
                this.renderLayersList();
            });
        }

        // Fill controls
        this.bindStyleInput('layerFillColor', 'fillColor', (v) => {
            this.updateLayerStyle(layer, 'fill-color', v, 'fill');
        });
        
        this.bindStyleInput('layerFillOpacity', 'fillOpacity', (v) => {
            const val = parseFloat(v);
            this.updateLayerStyle(layer, 'fill-opacity', val, 'fill');
            document.querySelector('#layerFillOpacity').previousElementSibling.textContent = 
                `Opacity: ${(val * 100).toFixed(0)}%`;
        });

        // Outline controls
        this.bindStyleInput('layerOutlineColor', 'outlineColor', (v) => {
            this.updateLayerStyle(layer, 'line-color', v, 'outline');
        });

        this.bindStyleInput('layerOutlineWidth', 'outlineWidth', (v) => {
            const val = parseFloat(v);
            this.updateLayerStyle(layer, 'line-width', val, 'outline');
            document.querySelector('#layerOutlineWidth').previousElementSibling.textContent = 
                `Width: ${val}px`;
        });

        this.bindStyleInput('layerOutlineOpacity', 'outlineOpacity', (v) => {
            const val = parseFloat(v);
            this.updateLayerStyle(layer, 'line-opacity', val, 'outline');
            document.querySelector('#layerOutlineOpacity').previousElementSibling.textContent = 
                `Opacity: ${(val * 100).toFixed(0)}%`;
        });

        this.bindStyleInput('layerOutlineOffset', 'outlineOffset', (v) => {
            const val = parseInt(v);
            this.updateLayerOffset(layer);
            document.querySelector('#layerOutlineOffset').previousElementSibling.textContent = 
                `Offset: ${val}px`;
        });

        const reverseCheck = document.getElementById('layerReverseOffset');
        if (reverseCheck) {
            reverseCheck.addEventListener('change', (e) => {
                layer.style.reverseOffset = e.target.checked;
                this.updateLayerOffset(layer);
            });
        }

        // Outline mode selector
        const modeSelect = document.getElementById('layerOutlineMode');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                const offsetSlider = document.getElementById('layerOutlineOffset');
                let newOffset = 0;
                if (e.target.value === 'positive') newOffset = 5;
                if (e.target.value === 'negative') newOffset = -5;
                offsetSlider.value = newOffset;
                offsetSlider.dispatchEvent(new Event('input'));
            });
        }

        // Dash controls
        this.bindStyleInput('layerDashLength', 'dashLength', (v) => {
            const val = parseInt(v);
            this.updateDashArray(layer);
            document.querySelector('#layerDashLength').previousElementSibling.textContent = 
                `Dash: ${val}px`;
        });

        this.bindStyleInput('layerDashGap', 'dashGap', (v) => {
            const val = parseInt(v);
            this.updateDashArray(layer);
            document.querySelector('#layerDashGap').previousElementSibling.textContent = 
                `Gap: ${val}px`;
        });

        // Animate stroke checkbox
        const animateCheck = document.getElementById('layerAnimateStroke');
        if (animateCheck) {
            animateCheck.addEventListener('change', (e) => {
                layer.style.animateStroke = e.target.checked;
                document.getElementById('strokeSpeedRow').style.display = 
                    e.target.checked ? '' : 'none';
            });
        }

        this.bindStyleInput('layerStrokeSpeed', 'strokeSpeed', (v) => {
            document.querySelector('#layerStrokeSpeed').previousElementSibling.textContent = 
                `Speed: ${parseFloat(v)}x`;
        });

        // Visibility
        const visibleCheck = document.getElementById('layerVisible');
        if (visibleCheck) {
            visibleCheck.addEventListener('change', (e) => {
                layer.visible = e.target.checked;
                this.setLayerVisibility(layer, layer.visible);
                this.renderLayersList();
            });
        }

        // Add keyframe button
        const addKfBtn = document.getElementById('addLayerKeyframe');
        if (addKfBtn) {
            addKfBtn.addEventListener('click', () => this.addLayerKeyframe(layer));
        }

        // Delete keyframe buttons
        document.querySelectorAll('.layer-keyframe-item .delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const kfIndex = parseInt(e.target.dataset.kfIndex);
                layer.keyframes.splice(kfIndex, 1);
                this.renderLayerEditor();
            });
        });
    }

    bindStyleInput(inputId, styleKey, callback) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const layer = this.layers[this.selectedLayerIndex];
        
        input.addEventListener('input', (e) => {
            layer.style[styleKey] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
            if (callback) callback(e.target.value);
        });
    }

    updateLayerStyle(layer, property, value, type) {
        const layerId = `${layer.id}-${type === 'fill' ? 'fill' : 'outline'}`;
        if (this.map.getLayer(layerId)) {
            this.map.setPaintProperty(layerId, property, value);
        }
    }

    updateLayerOffset(layer) {
        const layerId = `${layer.id}-outline`;
        if (this.map.getLayer(layerId)) {
            const baseOffset = parseInt(layer.style.outlineOffset) || 0;
            const finalOffset = layer.style.reverseOffset ? -baseOffset : baseOffset;
            this.map.setPaintProperty(layerId, 'line-offset', finalOffset);
        }
    }

    updateDashArray(layer) {
        const layerId = `${layer.id}-outline`;
        if (!this.map.getLayer(layerId)) return;

        const dash = parseInt(layer.style.dashLength) || 0;
        const gap = parseInt(layer.style.dashGap) || dash;

        if (dash > 0) {
            this.map.setPaintProperty(layerId, 'line-dasharray', [dash, gap]);
        } else {
            this.map.setPaintProperty(layerId, 'line-dasharray', undefined);
        }
    }

    setLayerVisibility(layer, visible) {
        ['fill', 'outline', 'line'].forEach(type => {
            const layerId = `${layer.id}-${type}`;
            if (this.map.getLayer(layerId)) {
                this.map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
            }
        });
    }

    // ==================== LAYER ANIMATION ====================
    addLayerKeyframe(layer) {
        const currentTime = this.animaps.currentTime || 0;
        
        // Create keyframe with current style snapshot
        const keyframe = {
            time: currentTime,
            props: { ...layer.style }
        };

        // Check if keyframe exists at this time
        const existingIndex = layer.keyframes.findIndex(kf => 
            Math.abs(kf.time - currentTime) < 0.01
        );

        if (existingIndex >= 0) {
            layer.keyframes[existingIndex] = keyframe;
        } else {
            layer.keyframes.push(keyframe);
            layer.keyframes.sort((a, b) => a.time - b.time);
        }

        this.renderLayerEditor();
        
        // Update timeline to show the new keyframe
        if (this.animaps && this.animaps.renderLayerTracks) {
            this.animaps.renderLayerTracks();
        }
    }

    // Called by main animation loop to update layer styles based on keyframes
    updateLayerAnimations(currentTime) {
        this.layers.forEach(layer => {
            // No keyframes - just keep current style
            if (layer.keyframes.length === 0) {
                this.applyLayerStyle(layer);
                return;
            }

            // Single keyframe - apply that keyframe's properties at all times
            if (layer.keyframes.length === 1) {
                const kf = layer.keyframes[0];
                // Apply keyframe properties to layer style
                Object.keys(kf.props).forEach(prop => {
                    if (kf.props[prop] !== undefined) {
                        layer.style[prop] = kf.props[prop];
                    }
                });
                this.applyLayerStyle(layer);
                return;
            }

            // Multiple keyframes - interpolate
            // Find surrounding keyframes
            let prevKf = layer.keyframes[0];
            let nextKf = layer.keyframes[layer.keyframes.length - 1];

            // Handle times before first keyframe
            if (currentTime <= layer.keyframes[0].time) {
                prevKf = nextKf = layer.keyframes[0];
            }
            // Handle times after last keyframe
            else if (currentTime >= layer.keyframes[layer.keyframes.length - 1].time) {
                prevKf = nextKf = layer.keyframes[layer.keyframes.length - 1];
            }
            // Find the two keyframes we're between
            else {
                for (let i = 0; i < layer.keyframes.length - 1; i++) {
                    if (currentTime >= layer.keyframes[i].time && currentTime <= layer.keyframes[i + 1].time) {
                        prevKf = layer.keyframes[i];
                        nextKf = layer.keyframes[i + 1];
                        break;
                    }
                }
            }

            // Interpolate properties
            const timeDiff = nextKf.time - prevKf.time;
            const t = timeDiff > 0 ? (currentTime - prevKf.time) / timeDiff : 1;

            // Interpolate numeric properties
            const numericProps = ['fillOpacity', 'outlineWidth', 'outlineOpacity', 'outlineOffset', 'dashLength', 'dashGap'];
            numericProps.forEach(prop => {
                if (prevKf.props[prop] !== undefined && nextKf.props[prop] !== undefined) {
                    layer.style[prop] = this.lerp(
                        parseFloat(prevKf.props[prop]),
                        parseFloat(nextKf.props[prop]),
                        t
                    );
                }
            });

            // Interpolate colors
            if (prevKf.props.fillColor && nextKf.props.fillColor) {
                layer.style.fillColor = this.lerpColor(prevKf.props.fillColor, nextKf.props.fillColor, t);
            }
            if (prevKf.props.outlineColor && nextKf.props.outlineColor) {
                layer.style.outlineColor = this.lerpColor(prevKf.props.outlineColor, nextKf.props.outlineColor, t);
            }

            // Apply interpolated styles to map
            this.applyLayerStyle(layer);
        });
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    lerpColor(color1, color2, t) {
        const c1 = this.hexToRgb(color1);
        const c2 = this.hexToRgb(color2);
        if (!c1 || !c2) return color1;

        const r = Math.round(this.lerp(c1.r, c2.r, t));
        const g = Math.round(this.lerp(c1.g, c2.g, t));
        const b = Math.round(this.lerp(c1.b, c2.b, t));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    applyLayerStyle(layer) {
        const s = layer.style;
        
        // Fill
        this.updateLayerStyle(layer, 'fill-color', s.fillColor, 'fill');
        this.updateLayerStyle(layer, 'fill-opacity', parseFloat(s.fillOpacity), 'fill');

        // Outline
        this.updateLayerStyle(layer, 'line-color', s.outlineColor, 'outline');
        this.updateLayerStyle(layer, 'line-width', parseFloat(s.outlineWidth), 'outline');
        this.updateLayerStyle(layer, 'line-opacity', parseFloat(s.outlineOpacity), 'outline');
        this.updateLayerOffset(layer);

        // Dash
        this.updateDashArray(layer);
    }

    // Marching ants animation for strokes
    startStrokeAnimation() {
        let lastTime = performance.now();

        const animate = () => {
            const now = performance.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            this.layers.forEach(layer => {
                if (layer.style.animateStroke && layer.style.dashLength > 0) {
                    layer.style.dashOffset = (layer.style.dashOffset || 0) + (delta * layer.style.strokeSpeed * 20);
                    
                    // MapLibre doesn't support line-dashoffset directly, but we can simulate
                    // by updating the dash pattern periodically
                    // This is a limitation - for true dash offset animation, we'd need WebGL shaders
                }
            });

            this.strokeAnimationFrame = requestAnimationFrame(animate);
        };

        animate();
    }

    // ==================== DRAWING TOOLS ====================
    startDrawing(mode) {
        this.cancelDrawing();
        this.isDrawing = true;
        this.drawingMode = mode;
        this.drawingPoints = [];
        this.updateToolButtons(mode);
        this.updateDrawHint(mode);
        this.map.getCanvas().style.cursor = 'crosshair';
        
        // Disable map movement while drawing
        this.map.dragPan.disable();
        this.map.doubleClickZoom.disable();
    }

    updateToolButtons(activeMode) {
        [this.drawPolygonBtn, this.drawRectangleBtn, this.drawCircleBtn, this.drawLineBtn].forEach(btn => {
            btn.classList.remove('active');
        });

        switch (activeMode) {
            case 'polygon': this.drawPolygonBtn.classList.add('active'); break;
            case 'rectangle': this.drawRectangleBtn.classList.add('active'); break;
            case 'circle': this.drawCircleBtn.classList.add('active'); break;
            case 'line': this.drawLineBtn.classList.add('active'); break;
        }
    }

    updateDrawHint(mode) {
        const hints = {
            polygon: 'Click to add points. Double-click to finish.',
            rectangle: 'Click two corners to create rectangle.',
            circle: 'Click center, then click for radius.',
            line: 'Click to add points. Double-click to finish.'
        };
        this.drawHint.textContent = hints[mode] || 'Click on map to start drawing';
        this.drawHint.classList.add('active');
    }

    setupMapDrawingEvents() {
        this.map.on('click', (e) => this.handleMapClick(e));
        this.map.on('dblclick', (e) => this.handleMapDoubleClick(e));
        this.map.on('mousemove', (e) => this.handleMapMouseMove(e));
    }

    handleMapClick(e) {
        if (!this.isDrawing) return;

        const point = [e.lngLat.lng, e.lngLat.lat];
        this.drawingPoints.push(point);
        this.addTempMarker(point);

        if (this.drawingMode === 'rectangle' && this.drawingPoints.length === 2) {
            this.finishRectangle();
        } else if (this.drawingMode === 'circle' && this.drawingPoints.length === 2) {
            this.finishCircle();
        }

        this.updateDrawingPreview();
    }

    handleMapDoubleClick(e) {
        if (!this.isDrawing) return;
        e.preventDefault();

        if (this.drawingMode === 'polygon' && this.drawingPoints.length >= 3) {
            this.finishPolygon();
        } else if (this.drawingMode === 'line' && this.drawingPoints.length >= 2) {
            this.finishLine();
        }
    }

    handleMapMouseMove(e) {
        if (!this.isDrawing || this.drawingPoints.length === 0) return;
        this.updateDrawingPreview([e.lngLat.lng, e.lngLat.lat]);
    }

    addTempMarker(point) {
        const el = document.createElement('div');
        el.style.cssText = `
            width: 10px; height: 10px;
            background: ${this.shapeStyle.outlineColor};
            border: 2px solid white;
            border-radius: 50%;
        `;
        const marker = new maplibregl.Marker({ element: el }).setLngLat(point).addTo(this.map);
        this.tempMarkers.push(marker);
    }

    updateDrawingPreview(currentPoint = null) {
        const previewId = 'drawing-preview';
        const sourceId = `${previewId}-source`;
        
        if (this.drawingPoints.length === 0) {
            if (this.map.getLayer(previewId)) this.map.removeLayer(previewId);
            if (this.map.getSource(sourceId)) this.map.removeSource(sourceId);
            return;
        }

        let coordinates = [...this.drawingPoints];
        if (currentPoint) coordinates.push(currentPoint);

        let geojson;

        if (this.drawingMode === 'polygon' && coordinates.length >= 2) {
            geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...coordinates, coordinates[0]]] } };
        } else if (this.drawingMode === 'line' && coordinates.length >= 2) {
            geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates } };
        } else if (this.drawingMode === 'rectangle' && coordinates.length >= 1 && currentPoint) {
            const [x1, y1] = coordinates[0], [x2, y2] = currentPoint;
            geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[x1, y1], [x2, y1], [x2, y2], [x1, y2], [x1, y1]]] } };
        } else if (this.drawingMode === 'circle' && coordinates.length >= 1 && currentPoint) {
            geojson = this.createCircleGeoJSON(coordinates[0], this.calculateDistance(coordinates[0], currentPoint));
        }

        if (geojson) {
            const source = this.map.getSource(sourceId);
            if (source) {
                source.setData(geojson);
            } else {
                this.map.addSource(sourceId, { type: 'geojson', data: geojson });
                this.map.addLayer({
                    id: previewId,
                    type: this.drawingMode === 'line' ? 'line' : 'fill',
                    source: sourceId,
                    paint: this.drawingMode === 'line' 
                        ? { 'line-color': this.shapeStyle.outlineColor, 'line-width': 2, 'line-dasharray': [2, 2] }
                        : { 'fill-color': this.shapeStyle.fillColor, 'fill-opacity': 0.3 }
                });
            }
        }
    }

    finishPolygon() {
        if (this.drawingPoints.length < 3) return;
        const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[...this.drawingPoints, this.drawingPoints[0]]] } };
        this.addGeoJsonLayer(`Polygon ${this.layerCounter + 1}`, geojson);
        this.cleanupDrawing();
    }

    finishRectangle() {
        const [p1, p2] = this.drawingPoints;
        const geojson = { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[p1[0], p1[1]], [p2[0], p1[1]], [p2[0], p2[1]], [p1[0], p2[1]], [p1[0], p1[1]]]] } };
        this.addGeoJsonLayer(`Rectangle ${this.layerCounter + 1}`, geojson);
        this.cleanupDrawing();
    }

    finishCircle() {
        const center = this.drawingPoints[0], edge = this.drawingPoints[1];
        const geojson = this.createCircleGeoJSON(center, this.calculateDistance(center, edge));
        this.addGeoJsonLayer(`Circle ${this.layerCounter + 1}`, geojson);
        this.cleanupDrawing();
    }

    finishLine() {
        const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: this.drawingPoints } };
        
        const layerId = `layer-${++this.layerCounter}`;
        const sourceId = `source-${layerId}`;

        this.map.addSource(sourceId, { type: 'geojson', data: geojson });
        this.map.addLayer({
            id: `${layerId}-outline`,
            type: 'line',
            source: sourceId,
            paint: { 'line-color': this.shapeStyle.outlineColor, 'line-width': this.shapeStyle.outlineWidth }
        });

        this.layers.push({
            id: layerId, name: `Line ${this.layerCounter}`, sourceId, geojson, type: 'line', visible: true,
            style: { ...this.shapeStyle }, keyframes: []
        });

        this.renderLayersList();
        this.selectLayer(this.layers.length - 1);
        this.cleanupDrawing();
    }

    createCircleGeoJSON(center, radiusKm) {
        const coords = [];
        const steps = 64;
        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * 2 * Math.PI;
            const lat = center[1] + (radiusKm * Math.sin(angle) / 111.32);
            // Fix longitude calculation to prevent issues near poles and handle dateline (though simplified)
            const lng = center[0] + (radiusKm * Math.cos(angle) / (111.32 * Math.cos(center[1] * Math.PI / 180)));
            coords.push([lng, lat]);
        }
        // Explicitly close the linear ring by repeating the first coordinate
        coords.push(coords[0]);
        return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } };
    }

    calculateDistance(p1, p2) {
        const R = 6371, dLat = (p2[1] - p1[1]) * Math.PI / 180, dLon = (p2[0] - p1[0]) * Math.PI / 180;
        const a = Math.sin(dLat/2)**2 + Math.cos(p1[1]*Math.PI/180) * Math.cos(p2[1]*Math.PI/180) * Math.sin(dLon/2)**2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    }

    cancelDrawing() { this.cleanupDrawing(); }

    cleanupDrawing() {
        this.isDrawing = false;
        this.drawingMode = null;
        this.drawingPoints = [];
        this.tempMarkers.forEach(m => m.remove());
        this.tempMarkers = [];

        if (this.map.getLayer('drawing-preview')) this.map.removeLayer('drawing-preview');
        if (this.map.getSource('drawing-preview-source')) this.map.removeSource('drawing-preview-source');

        this.updateToolButtons(null);
        this.drawHint.textContent = 'Click on map to start drawing';
        this.drawHint.classList.remove('active');
        this.map.getCanvas().style.cursor = '';
        
        // Re-enable map movement after drawing
        this.map.dragPan.enable();
        this.map.doubleClickZoom.enable();
    }

    // ==================== LAYERS LIST ====================
    renderLayersList() {
        if (this.layers.length === 0) {
            this.layersList.innerHTML = '<p class="empty-state small">No layers yet. Search or draw to add.</p>';
            return;
        }

        this.layersList.innerHTML = this.layers.map((layer, i) => `
            <div class="layer-item ${i === this.selectedLayerIndex ? 'selected' : ''} ${!layer.visible ? 'hidden' : ''}" data-index="${i}">
                <div class="layer-color" style="background: ${layer.style.fillColor}"></div>
                <span class="layer-name">${layer.name}</span>
                <div class="layer-actions">
                    <button class="layer-btn visibility" title="${layer.visible ? 'Hide' : 'Show'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${layer.visible 
                                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                                : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                            }
                        </svg>
                    </button>
                    <button class="layer-btn zoom" title="Zoom to layer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </button>
                    <button class="layer-btn delete" title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');

        this.layersList.querySelectorAll('.layer-item').forEach((item, i) => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.layer-btn')) this.selectLayer(i);
            });
            item.querySelector('.visibility').addEventListener('click', () => this.toggleLayerVisibility(i));
            item.querySelector('.zoom').addEventListener('click', () => this.zoomToLayer(i));
            item.querySelector('.delete').addEventListener('click', () => this.deleteLayer(i));
        });
    }

    toggleLayerVisibility(index) {
        const layer = this.layers[index];
        layer.visible = !layer.visible;
        this.setLayerVisibility(layer, layer.visible);
        this.renderLayersList();
        if (this.selectedLayerIndex === index) this.renderLayerEditor();
    }

    zoomToLayer(index) {
        const layer = this.layers[index];
        const source = this.map.getSource(layer.sourceId);
        if (source && source._data) {
            const bounds = this.getGeoJSONBounds(source._data);
            if (bounds) this.map.fitBounds(bounds, { padding: 50 });
        }
    }

    getGeoJSONBounds(geojson) {
        let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
        const processCoords = (coords) => {
            if (typeof coords[0] === 'number') {
                minLng = Math.min(minLng, coords[0]); maxLng = Math.max(maxLng, coords[0]);
                minLat = Math.min(minLat, coords[1]); maxLat = Math.max(maxLat, coords[1]);
            } else coords.forEach(processCoords);
        };
        if (geojson.coordinates) processCoords(geojson.coordinates);
        else if (geojson.geometry) processCoords(geojson.geometry.coordinates);
        return minLng === Infinity ? null : [[minLng, minLat], [maxLng, maxLat]];
    }

    deleteLayer(index) {
        const layer = this.layers[index];
        ['fill', 'outline', 'line'].forEach(type => {
            const id = `${layer.id}-${type}`;
            if (this.map.getLayer(id)) this.map.removeLayer(id);
        });
        if (this.map.getSource(layer.sourceId)) this.map.removeSource(layer.sourceId);

        this.layers.splice(index, 1);
        if (this.selectedLayerIndex === index) this.selectedLayerIndex = -1;
        else if (this.selectedLayerIndex > index) this.selectedLayerIndex--;
        
        this.renderLayersList();
        this.renderLayerEditor();
        
        // Update timeline to remove the layer track
        if (this.animaps && this.animaps.renderLayerTracks) {
            this.animaps.renderLayerTracks();
        }
    }

    clearAllLayers() {
        while (this.layers.length > 0) this.deleteLayer(0);
    }

    exportLayers() {
        return this.layers.map(layer => ({
            name: layer.name, style: layer.style, type: layer.type,
            geojson: layer.geojson, keyframes: layer.keyframes, visible: layer.visible
        }));
    }

    importLayers(data) {
        data.forEach(l => {
            if (l.geojson) {
                this.addGeoJsonLayer(l.name, l.geojson, l.style);
                const layer = this.layers[this.layers.length - 1];
                if (l.keyframes) layer.keyframes = l.keyframes;
                if (l.visible !== undefined) {
                    layer.visible = l.visible;
                    this.setLayerVisibility(layer, layer.visible);
                }
            }
        });
    }

    reAddLayersToMap() {
        if (!this.map || this.layers.length === 0) return;

        this.layers.forEach(layer => {
            // Add source if it doesn't exist
            if (!this.map.getSource(layer.sourceId)) {
                this.map.addSource(layer.sourceId, {
                    type: 'geojson',
                    data: layer.geojson
                });
            }

            const style = layer.style;

            if (layer.type === 'line') {
                // Add line layer for line type
                if (!this.map.getLayer(`${layer.id}-outline`)) {
                    this.map.addLayer({
                        id: `${layer.id}-outline`,
                        type: 'line',
                        source: layer.sourceId,
                        paint: {
                            'line-color': style.outlineColor,
                            'line-width': style.outlineWidth,
                            'line-opacity': style.outlineOpacity !== undefined ? style.outlineOpacity : 1.0
                        },
                        layout: {
                            'visibility': layer.visible ? 'visible' : 'none'
                        }
                    });
                }
            } else {
                // Add fill layer for polygons
                if (!this.map.getLayer(`${layer.id}-fill`)) {
                    this.map.addLayer({
                        id: `${layer.id}-fill`,
                        type: 'fill',
                        source: layer.sourceId,
                        paint: {
                            'fill-color': style.fillColor,
                            'fill-opacity': style.fillOpacity
                        },
                        layout: {
                            'visibility': layer.visible ? 'visible' : 'none'
                        }
                    });
                }

                // Add outline layer for polygons
                if (!this.map.getLayer(`${layer.id}-outline`)) {
                    const linePaint = {
                        'line-color': style.outlineColor,
                        'line-width': style.outlineWidth,
                        'line-opacity': style.outlineOpacity !== undefined ? style.outlineOpacity : 1.0,
                        'line-offset': style.outlineOffset || 0
                    };

                    if (style.dashLength > 0) {
                        linePaint['line-dasharray'] = [style.dashLength, style.dashGap || style.dashLength];
                    }

                    this.map.addLayer({
                        id: `${layer.id}-outline`,
                        type: 'line',
                        source: layer.sourceId,
                        paint: linePaint,
                        layout: {
                            'visibility': layer.visible ? 'visible' : 'none'
                        }
                    });
                }
            }
            
            // Re-apply current styling state (essential for animation continuity)
            this.applyLayerStyle(layer);
        });
    }
}

window.LayersManager = LayersManager;
