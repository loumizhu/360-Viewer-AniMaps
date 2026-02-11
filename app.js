/**
 * AniMaps - Map Animation Studio
 * A browser-based tool for creating map animations using MapLibre GL JS
 * 100% Free and Open Source - No API key required
 */

// Free map style URLs from various providers
const MAP_STYLES = {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    streets: 'https://tiles.openfreemap.org/styles/liberty',
    bright: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    positron: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
    voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
    liberty: 'https://tiles.openfreemap.org/styles/liberty'
};

class AniMaps {
    constructor() {
        this.map = null;
        this.keyframes = [];
        this.selectedKeyframeIndex = -1;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 10; // seconds
        this.fps = 30;
        this.easing = 'easeInOut';
        this.animationFrame = null;
        this.lastFrameTime = 0;
        this.currentStyle = 'dark';
        this.layersManager = null;
        
        // Customization State
        this.customization = {
            land: { color: null, texture: null, opacity: 0.5, blend: 'normal', textureId: null },
            water: { color: null, texture: null, opacity: 0.5, blend: 'normal', textureId: null }
        };
        
        // Context menu state
        this.contextMenuTarget = null;
        this.contextMenuData = null;
        
        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        this.updateTotalTime();
        this.updateRuler(); // Call this to set initial widths
        this.initMap();
        this.initContextMenu();
        this.initCurveEditor();
        this.initProjectManagement();
        this.initVideoExport();
    }

    bindElements() {
        // Map elements
        this.mapContainer = document.getElementById('map');
        
        // Camera info
        this.infoLat = document.getElementById('infoLat');
        this.infoLng = document.getElementById('infoLng');
        this.infoZoom = document.getElementById('infoZoom');
        this.infoBearing = document.getElementById('infoBearing');
        this.infoPitch = document.getElementById('infoPitch');
        
        // Timeline elements
        this.playBtn = document.getElementById('playBtn');
        this.playIcon = this.playBtn.querySelector('.play-icon');
        this.pauseIcon = this.playBtn.querySelector('.pause-icon');
        this.addKeyframeBtn = document.getElementById('addKeyframeBtn');
        this.deleteKeyframeBtn = document.getElementById('deleteKeyframeBtn');
        this.goToStartBtn = document.getElementById('goToStartBtn');
        this.goToEndBtn = document.getElementById('goToEndBtn');
        this.prevFrameBtn = document.getElementById('prevFrameBtn');
        this.nextFrameBtn = document.getElementById('nextFrameBtn');
        this.prevKfBtn = document.getElementById('prevKfBtn');
        this.nextKfBtn = document.getElementById('nextKfBtn');
        
        // Multi-track timeline elements
        this.timelineTracks = document.getElementById('timelineTracks');
        this.timelinePlayhead = document.getElementById('timelinePlayhead');
        this.playheadHandle = this.timelinePlayhead.querySelector('.playhead-handle');
        this.keyframesContainer = document.getElementById('keyframesContainer');
        this.timelineRuler = document.getElementById('timelineRuler');
        this.timelineWrapper = document.querySelector('.timeline-wrapper');
        
        this.currentTimeDisplay = document.getElementById('currentTime');
        this.totalTimeDisplay = document.getElementById('totalTime');
        
        // Settings
        this.durationInput = document.getElementById('duration');
        this.easingSelect = document.getElementById('easing');
        this.fpsSelect = document.getElementById('fps');
        this.mapStyleSelect = document.getElementById('mapStyle');
        
        // Keyframe list & editor
        this.keyframeList = document.getElementById('keyframeList');
        this.keyframeEditor = document.getElementById('keyframeEditor');
        
        // Zoom controls
        this.timelineZoom = document.getElementById('timelineZoom');
        this.zoomInBtn = document.getElementById('zoomInBtn');
        this.zoomOutBtn = document.getElementById('zoomOutBtn');
        
        // Modals
        this.exportModal = document.getElementById('exportModal');
        this.exportBtn = document.getElementById('exportBtn');
        this.closeExportModal = document.getElementById('closeExportModal');
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.importJsonBtn = document.getElementById('importJsonBtn');
        this.importJsonInput = document.getElementById('importJsonInput');
        
        // Context menu
        this.contextMenu = document.getElementById('contextMenu');

        // Style Settings Widget
        this.styleSettingsBtn = document.getElementById('styleSettingsBtn');
        this.styleSettingsDropdown = document.getElementById('styleSettingsDropdown');
        this.showLabelsCheck = document.getElementById('showLabels');
        this.labelTextSizeRange = document.getElementById('labelTextSize');
        this.mapLanguageSelect = document.getElementById('mapLanguage');
        this.labelTextColorInput = document.getElementById('labelTextColor');
        this.labelHaloColorInput = document.getElementById('labelHaloColor');

        // Map Customization UI
        this.landColorInput = document.getElementById('landColor');
        this.resetLandColorBtn = document.getElementById('resetLandColor');
        this.waterColorInput = document.getElementById('waterColor');
        this.resetWaterColorBtn = document.getElementById('resetWaterColor');

        this.landTextureInput = document.getElementById('landTextureInput');
        this.landTextureControls = document.getElementById('landTextureControls');
        this.landTextureOpacity = document.getElementById('landTextureOpacity');
        this.landTextureBlend = document.getElementById('landTextureBlend');
        this.removeLandTextureBtn = document.getElementById('removeLandTexture');

        this.waterTextureInput = document.getElementById('waterTextureInput');
        this.waterTextureControls = document.getElementById('waterTextureControls');
        this.waterTextureOpacity = document.getElementById('waterTextureOpacity');
        this.waterTextureBlend = document.getElementById('waterTextureBlend');
        this.removeWaterTextureBtn = document.getElementById('removeWaterTexture');
    }

    bindEvents() {
        // Playback controls
        this.playBtn.addEventListener('click', () => this.togglePlayback());
        this.goToStartBtn.addEventListener('click', () => this.goToTime(0));
        this.goToEndBtn.addEventListener('click', () => this.goToTime(this.duration));
        this.prevFrameBtn.addEventListener('click', () => this.stepFrame(-1));
        this.nextFrameBtn.addEventListener('click', () => this.stepFrame(1));
        this.prevKfBtn.addEventListener('click', () => this.jumpToKeyframe(-1));
        this.nextKfBtn.addEventListener('click', () => this.jumpToKeyframe(1));

        // Keyframe controls
        this.addKeyframeBtn.addEventListener('click', () => this.addKeyframe());
        this.deleteKeyframeBtn.addEventListener('click', () => this.deleteSelectedKeyframe());

        // Settings
        this.durationInput.addEventListener('change', (e) => {
            this.duration = parseFloat(e.target.value) || 10;
            this.updateRuler();
            this.updateTotalTime();
            this.renderTimelineKeyframes();
            this.renderLayerTracks();
        });

        this.easingSelect.addEventListener('change', (e) => {
            this.easing = e.target.value;
        });

        this.fpsSelect.addEventListener('change', (e) => {
            this.fps = parseInt(e.target.value);
        });

        this.mapStyleSelect.addEventListener('change', (e) => {
            this.changeMapStyle(e.target.value);
        });

        // Style Settings Widget Events
        this.styleSettingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.styleSettingsDropdown.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (this.styleSettingsDropdown && !this.styleSettingsDropdown.contains(e.target)) {
                this.styleSettingsDropdown.classList.remove('active');
            }
        });

        if (this.showLabelsCheck) {
            this.showLabelsCheck.addEventListener('change', () => this.applyMapStyling());
        }
        if (this.labelTextSizeRange) {
            this.labelTextSizeRange.addEventListener('input', () => this.applyMapStyling());
        }
        if (this.mapLanguageSelect) {
            this.mapLanguageSelect.addEventListener('change', () => this.applyMapStyling());
        }
        if (this.labelTextColorInput) {
            this.labelTextColorInput.addEventListener('input', () => this.applyMapStyling());
        }
        if (this.labelHaloColorInput) {
            this.labelHaloColorInput.addEventListener('input', () => this.applyMapStyling());
        }

        // Map Customization Events
        if (this.landColorInput) {
            this.landColorInput.addEventListener('input', (e) => this.updateLandWaterColor('land', e.target.value));
            this.resetLandColorBtn.addEventListener('click', () => {
                this.customization.land.color = null;
                this.landColorInput.value = '#e0e0e0'; // Default placeholder
                this.applyCustomStyles();
            });
        }
        if (this.waterColorInput) {
            this.waterColorInput.addEventListener('input', (e) => this.updateLandWaterColor('water', e.target.value));
            this.resetWaterColorBtn.addEventListener('click', () => {
                this.customization.water.color = null;
                this.waterColorInput.value = '#a0c8f0'; // Default placeholder
                this.applyCustomStyles();
            });
        }

        // Texture Inputs
        const setupTextureEvents = (type, input, controls, opacityInput, blendInput, removeBtn) => {
            input.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleTextureUpload(type, e.target.files[0]);
                    controls.style.display = 'flex';
                }
            });

            opacityInput.addEventListener('input', (e) => {
                this.customization[type].opacity = parseFloat(e.target.value);
                this.updateTextureLayer(type);
            });

            blendInput.addEventListener('change', (e) => {
                this.customization[type].blend = e.target.value;
                this.updateTextureLayer(type);
            });

            removeBtn.addEventListener('click', () => {
                this.removeTexture(type);
                input.value = '';
                controls.style.display = 'none';
            });
        };

        if (this.landTextureInput) {
            setupTextureEvents('land', this.landTextureInput, this.landTextureControls, this.landTextureOpacity, this.landTextureBlend, this.removeLandTextureBtn);
        }
        if (this.waterTextureInput) {
            setupTextureEvents('water', this.waterTextureInput, this.waterTextureControls, this.waterTextureOpacity, this.waterTextureBlend, this.removeWaterTextureBtn);
        }

        // Timeline scrubbing on track content areas and ruler
        const cameraTrack = document.getElementById('cameraTrack');
        if (cameraTrack) {
            cameraTrack.addEventListener('mousedown', (e) => this.startScrubbing(e));
        }
        
        // Also allow scrubbing on the ruler
        if (this.timelineRuler) {
            this.timelineRuler.addEventListener('mousedown', (e) => this.startScrubbing(e));
        }
        
        // Allow scrubbing by dragging the playhead
        const playheadHandle = this.timelinePlayhead.querySelector('.playhead-handle');
        if (playheadHandle) {
            playheadHandle.addEventListener('mousedown', (e) => this.startScrubbing(e));
        }
        
        // Allow clicking on any track content added later (use event delegation on tracks container)
        if (this.timelineTracks) {
            this.timelineTracks.addEventListener('mousedown', (e) => {
                // Only trigger if clicking on track-content, not on track-label or keyframes
                if (e.target.classList.contains('track-content') || 
                    e.target.closest('.track-content')) {
                    this.startScrubbing(e);
                }
            });
        }

        // Timeline zoom
        this.timelineZoom.addEventListener('input', () => {
            this.updateRuler();
            this.renderTimelineKeyframes();
            this.renderLayerTracks();
            this.updatePlayhead();
        });
        this.zoomInBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.timelineZoom.value = Math.min(10, parseFloat(this.timelineZoom.value) + 0.5);
            this.timelineZoom.dispatchEvent(new Event('input'));
        });
        this.zoomOutBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.timelineZoom.value = Math.max(1, parseFloat(this.timelineZoom.value) - 0.5);
            this.timelineZoom.dispatchEvent(new Event('input'));
        });

        // Panning in timeline (Middle Click)
        let isPanning = false;
        let startX, scrollLeft;

        const startPanning = (e) => {
            if (e.button === 1) { // Middle click
                isPanning = true;
                this.timelineTracks.classList.add('panning');
                startX = e.pageX - this.timelineTracks.offsetLeft;
                scrollLeft = this.timelineTracks.scrollLeft;
                e.preventDefault();
            }
        };

        this.timelineTracks.addEventListener('mousedown', startPanning);
        this.timelineRuler.addEventListener('mousedown', startPanning);

        document.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            const x = e.pageX - this.timelineTracks.offsetLeft;
            const walk = (x - startX);
            this.timelineTracks.scrollLeft = scrollLeft - walk;
            this.timelineRuler.scrollLeft = this.timelineTracks.scrollLeft;
            this.updatePlayhead();
        });

        document.addEventListener('mouseup', () => {
            isPanning = false;
            this.timelineTracks.classList.remove('panning');
        });

        // Sync scroll between tracks and ruler
        this.timelineTracks.addEventListener('scroll', () => {
            if (!isPanning) {
                this.timelineRuler.scrollLeft = this.timelineTracks.scrollLeft;
                this.updatePlayhead();
            }
        });
        
        this.timelineRuler.addEventListener('scroll', () => {
            if (!isPanning) {
                this.timelineTracks.scrollLeft = this.timelineRuler.scrollLeft;
                this.updatePlayhead();
            }
        });

        // Export/Import
        this.exportBtn.addEventListener('click', () => {
            this.exportModal.style.display = 'flex';
        });
        this.closeExportModal.addEventListener('click', () => {
            this.exportModal.style.display = 'none';
        });
        this.exportJsonBtn.addEventListener('click', () => this.exportToJson());
        this.importJsonBtn.addEventListener('click', () => this.importJsonInput.click());
        this.importJsonInput.addEventListener('change', (e) => this.importFromJson(e));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeydown(e));
        
        // Hide context menu on click elsewhere
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target)) {
                this.hideContextMenu();
            }
        });

        // Track controls for Camera (static)
        const toggleMapBtn = document.getElementById('toggleMapVisibility');
        if (toggleMapBtn) {
            toggleMapBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = toggleMapBtn.classList.toggle('hidden');
                toggleMapBtn.title = isHidden ? 'Show Base Map' : 'Hide Base Map';
                toggleMapBtn.innerHTML = isHidden 
                    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>'
                    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
                
                // Toggle MapLibre background visibility
                if (this.map) {
                    const visibility = isHidden ? 'none' : 'visible';
                    const style = this.map.getStyle();
                    if (style && style.layers) {
                        style.layers.forEach(layer => {
                            // Only hide background/base layers, not our custom layers
                            if (!layer.id.startsWith('layer-') && !layer.id.startsWith('source-')) {
                                this.map.setLayoutProperty(layer.id, 'visibility', visibility);
                            }
                        });
                    }
                }
            });
        }

        const resetViewBtn = document.getElementById('resetViewBtn');
        if (resetViewBtn) {
            resetViewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (this.map) {
                    this.map.flyTo({ center: [0, 20], zoom: 2, bearing: 0, pitch: 0, duration: 1000 });
                }
            });
        }

        // Camera Info Widget Toggle
        const cameraInfoHeader = document.getElementById('cameraInfoHeader');
        const cameraInfoWidget = document.getElementById('cameraInfoWidget');
        if (cameraInfoHeader && cameraInfoWidget) {
            cameraInfoHeader.addEventListener('click', () => {
                cameraInfoWidget.classList.toggle('collapsed');
            });
        }
    }

    initMap() {
        // Set RTL text plugin for proper Arabic support
        if (maplibregl.getRTLTextPluginStatus() === 'unavailable') {
            maplibregl.setRTLTextPlugin(
                'https://unpkg.com/@maplibre/maplibre-gl-rtl-text@0.2.3/dist/maplibre-gl-rtl-text.js',
                null,
                true // Lazy load the plugin
            );
        }

        // Use MapLibre GL JS with free OpenStreetMap-based tiles
        this.map = new maplibregl.Map({
            container: 'map',
            style: MAP_STYLES.dark,
            center: [0, 20],
            zoom: 2,
            pitch: 0,
            bearing: 0,
            attributionControl: true,
            preserveDrawingBuffer: true // Required for PNG export
        });

        // Add navigation controls
        this.map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
        this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');
        this.map.addControl(new maplibregl.FullscreenControl(), 'bottom-right');

        // Update camera info on map movement
        this.map.on('move', () => this.updateCameraInfo());
        this.map.on('load', () => {
            this.updateCameraInfo();
            console.log('🗺️ AniMaps loaded with MapLibre GL JS (Free & Open Source)');
            
            // Initialize layers manager after map is ready
            if (window.LayersManager) {
                this.layersManager = new LayersManager(this);
                this.layersManager.init(this.map);
            }
        });
    }

    changeMapStyle(styleName) {
        if (!this.map || !MAP_STYLES[styleName]) return;
        
        // Save current camera position
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const bearing = this.map.getBearing();
        const pitch = this.map.getPitch();

        // Change style
        this.currentStyle = styleName;
        this.map.setStyle(MAP_STYLES[styleName]);

        // Restore camera position and apply custom styling after style loads
        this.map.once('style.load', () => {
            this.map.jumpTo({ center, zoom, bearing, pitch });
            if (this.layersManager) {
                this.layersManager.reAddLayersToMap();
            }
            this.applyMapStyling();
            this.applyCustomStyles(); // Apply customization after style change
        });
    }

    applyMapStyling() {
        if (!this.map) return;

        const showLabels = this.showLabelsCheck ? this.showLabelsCheck.checked : true;
        const textSize = this.labelTextSizeRange ? parseFloat(this.labelTextSizeRange.value) : 12;
        const language = this.mapLanguageSelect ? this.mapLanguageSelect.value : 'native';
        const textColor = this.labelTextColorInput ? this.labelTextColorInput.value : '#ffffff';
        const haloColor = this.labelHaloColorInput ? this.labelHaloColorInput.value : '#000000';

        const style = this.map.getStyle();
        if (!style || !style.layers) return;

        style.layers.forEach(layer => {
            // Check if it's a label layer (symbol type)
            if (layer.type === 'symbol' && layer.layout && layer.layout['text-field']) {
                // Toggle visibility
                this.map.setLayoutProperty(layer.id, 'visibility', showLabels ? 'visible' : 'none');
                
                if (showLabels) {
                    // Update text size and colors
                    this.map.setLayoutProperty(layer.id, 'text-size', textSize);
                    this.map.setPaintProperty(layer.id, 'text-color', textColor);
                    this.map.setPaintProperty(layer.id, 'text-halo-color', haloColor);
                    this.map.setPaintProperty(layer.id, 'text-halo-width', 1);

                    // Update language
                    let textField = layer.layout['text-field'];
                    // Determine which property name we want: 'name' for native, 'name_en' for English, etc.
                    const targetProp = language === 'native' ? 'name' : `name_${language}`;

                    let newField = null;

                    if (Array.isArray(textField)) {
                        // MapLibre expression (e.g. ['get', 'name'] or ['coalesce', ...])
                        newField = this.replaceLanguageInExpression(textField, targetProp);
                    } else if (typeof textField === 'string') {
                        // String template like "{name}" or "{name_en}"
                        // We replace {name} or {name_...} with {targetProp}
                        newField = textField.replace(/{name(_[a-z]+)?}/g, `{${targetProp}}`);
                    }

                    // Only apply if changed
                    if (newField && JSON.stringify(newField) !== JSON.stringify(textField)) {
                        this.map.setLayoutProperty(layer.id, 'text-field', newField);
                    }
                }
            }
        });
    }

    replaceLanguageInExpression(expr, targetProp) {
        if (!Array.isArray(expr)) return expr;
        
        // Deep clone / map to create new expression structure
        return expr.map(item => {
            if (Array.isArray(item)) {
                return this.replaceLanguageInExpression(item, targetProp);
            }
            if (typeof item === 'string') {
                // Match exact 'name' OR 'name_xx' properties
                if (item === 'name' || (item.startsWith('name_') && item.length <= 8)) {
                    return targetProp;
                }
            }
            return item;
        });
    }

    // ==================== MAP CUSTOMIZATION (LAND/WATER) ====================
    
    updateLandWaterColor(type, color) {
        this.customization[type].color = color;
        this.applyCustomStyles();
    }

    async handleTextureUpload(type, file) {
        if (!this.map) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const textureId = `texture-${type}-${Date.now()}`;
                if (this.customization[type].textureId) {
                    // Remove old image if exists
                     if (this.map.hasImage(this.customization[type].textureId)) {
                        this.map.removeImage(this.customization[type].textureId);
                     }
                }
                
                this.map.addImage(textureId, img);
                this.customization[type].textureId = textureId;
                this.updateTextureLayer(type);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    removeTexture(type) {
        this.customization[type].textureId = null;
        
        // Remove texture layer
        const layerId = `custom-${type}-texture`;
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
        }
    }

    applyCustomStyles() {
        if (!this.map) return;
        const style = this.map.getStyle();
        if (!style || !style.layers) return;

        // Apply Colors
        const landColor = this.customization.land.color;
        const waterColor = this.customization.water.color;

        style.layers.forEach(layer => {
            // Identify layers
            const isWater = layer.id.includes('water') || (layer['source-layer'] && layer['source-layer'].includes('water'));
            // Land is trickier. Look for 'background', 'landcover', 'landuse'
            const isLand = layer.type === 'background' || 
                           layer.id.includes('land') || 
                           layer.id.includes('background') ||
                           (layer['source-layer'] && (layer['source-layer'].includes('land') || layer['source-layer'].includes('admin'))); 
                           // Admin sometimes defaults to land color in some styles? No, usually not.
                           // Be careful not to color styling lines/labels.

            // Only tint FILL or BACKGROUND layers
            if (layer.type !== 'fill' && layer.type !== 'background') return;

            if (isWater && waterColor) {
                if (layer.type === 'background') {
                    this.map.setPaintProperty(layer.id, 'background-color', waterColor);
                } else {
                    this.map.setPaintProperty(layer.id, 'fill-color', waterColor);
                }
            } else if (isLand && !isWater && landColor) {
                 if (layer.type === 'background') {
                    this.map.setPaintProperty(layer.id, 'background-color', landColor);
                } else {
                    // Avoid coloring buildings if possible, unless desired? User said "Land". 
                    // Usually 'landuse' or 'landcover' or 'background'. 
                    // Let's filter out 'building' explicitly if we can.
                    if (!layer.id.includes('building')) {
                         this.map.setPaintProperty(layer.id, 'fill-color', landColor);
                    }
                }
            }
        });

        // Re-apply textures if they exist (need to wait for layers to exist? They do.)
        this.updateTextureLayer('land');
        this.updateTextureLayer('water');
    }

    updateTextureLayer(type) {
        if (!this.map || !this.customization[type].textureId) return;
        
        const textureId = this.customization[type].textureId;
        const opacity = this.customization[type].opacity;
        const layerId = `custom-${type}-texture`;
        
        // Remove if exists to update position/properties
        if (this.map.getLayer(layerId)) {
            this.map.removeLayer(layerId);
        }

        // Find a reference layer to place text on top of
        // For water, find the top-most water layer
        // For land, find the top-most land layer
        let refLayerId = null;
        const style = this.map.getStyle();
        
        // iterate backwards to find the top-most matching layer to place our texture ON TOP of
        for (let i = style.layers.length - 1; i >= 0; i--) {
            const layer = style.layers[i];
            const isWater = layer.id.includes('water') || (layer['source-layer'] && layer['source-layer'].includes('water'));
            const isLand = !isWater && (layer.type === 'background' || layer.id.includes('land') || layer.id.includes('background'));
            
            if (type === 'water' && isWater && (layer.type === 'fill' || layer.type === 'background')) {
                // Insert AFTER this layer (so we need the layer ID *after* this one in the list? No, addLayer takes 'beforeId')
                // If we want it ON TOP of this layer, we need to find the layer *after* this one and use that as 'beforeId'.
                if (i < style.layers.length - 1) {
                    refLayerId = style.layers[i+1].id;
                }
                break; 
            }
            if (type === 'land' && isLand && (layer.type === 'fill' || layer.type === 'background') && !layer.id.includes('building')) {
                 if (i < style.layers.length - 1) {
                    refLayerId = style.layers[i+1].id;
                }
                break;
            }
        }
        
        // Create Texture Layer
        // We need a source. We can use the same source as the map's vector tiles if we want to mask it to land/water
        // BUT 'background' layers don't have sources. 
        // If it's a 'background' layer, we can't easily mask it to just land unless we have a land polygon source.
        // MapLibre styles usually have a 'background' color (ocean/land) and then 'water' polygons on top.
        // OR 'background' is land, and 'water' is polygons.
        
        // Strategy:
        // Water: Use the 'water' source-layer from the vector tiles.
        // Land: Use the 'landcover' source-layer OR if 'background' is used, we might just put a full-screen pattern? 
        // If we put full screen pattern for land, it will cover water unless under water.
        
        // Let's try to find a valid source for vectors.
        const vectorSourceId = Object.keys(style.sources).find(k => style.sources[k].type === 'vector');
        
        // Standard Mapbox/OpenMapTiles structure:
        // source-layer: 'water'
        // source-layer: 'landuse' or 'landcover'
        
        if (!vectorSourceId && type === 'water') {
             // Fallback if no vector source found (unlikely)
             return;
        }

        const paintProps = {
            'fill-pattern': textureId,
            'fill-opacity': opacity
        };

        if (type === 'water') {
            this.map.addLayer({
                id: layerId,
                type: 'fill',
                source: vectorSourceId,
                'source-layer': 'water', 
                paint: paintProps
            }, refLayerId); // insert before refLayerId (which is the one after the water layer, so effectively on top of water)
        } else {
            // Land
            // Try 'landcover' or 'landuse'
            // If we can't find a generic 'land' polygon layer, maybe just 'background' is used.
            // If background is used, we can't use fill-pattern easily unless we use a big polygon?
            // Actually, we can add a layer with type 'background' and use 'background-pattern'.
            
            // Check if there is a background layer
            const bgLayer = style.layers.find(l => l.type === 'background');
            if (bgLayer) {
                 this.map.addLayer({
                    id: layerId,
                    type: 'background',
                    paint: {
                        'background-pattern': textureId,
                        'background-opacity': opacity
                    }
                }, refLayerId); // insert on top of existing background
            } else {
                // Try treating as fill with landcover
                 this.map.addLayer({
                    id: layerId,
                    type: 'fill',
                    source: vectorSourceId,
                    'source-layer': 'landcover', // This might miss some areas depending on schema
                    paint: paintProps
                }, refLayerId);
            }
        }
    }

    updateCameraInfo() {
        if (!this.map) return;
        
        const center = this.map.getCenter();
        const zoom = this.map.getZoom();
        const bearing = this.map.getBearing();
        const pitch = this.map.getPitch();

        this.infoLat.textContent = center.lat.toFixed(4);
        this.infoLng.textContent = center.lng.toFixed(4);
        this.infoZoom.textContent = zoom.toFixed(2);
        this.infoBearing.textContent = bearing.toFixed(0) + '°';
        this.infoPitch.textContent = pitch.toFixed(0) + '°';
    }

    // ==================== CONTEXT MENU ====================
    initContextMenu() {
        let mouseDownPos = null;
        let isDragging = false;
        const dragThreshold = 5;

        const handleMouseDown = (e) => {
            if (e.button === 2) { // Right click
                mouseDownPos = { x: e.clientX, y: e.clientY };
                isDragging = false;
            }
        };

        const handleMouseMove = (e) => {
            if (mouseDownPos) {
                const dist = Math.hypot(e.clientX - mouseDownPos.x, e.clientY - mouseDownPos.y);
                if (dist > dragThreshold) {
                    isDragging = true;
                }
            }
        };

        const handleMouseUp = () => {
            mouseDownPos = null;
        };

        // Event listeners for drag detection
        document.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Right-click on timeline
        this.timelineTracks.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!isDragging) {
                this.showContextMenu(e.clientX, e.clientY, 'timeline', e.target);
            }
        });
        
        // Right-click on map
        this.mapContainer.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!isDragging) {
                this.showContextMenu(e.clientX, e.clientY, 'map', e.target);
            }
        });

        // Context menu item clicks
        this.contextMenu.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            });
        });
    }

    showContextMenu(x, y, targetType, targetElement) {
        this.contextMenuTarget = targetType;
        this.contextMenuData = { element: targetElement };
        
        // Check if right-clicked on a keyframe
         if (targetElement.classList.contains('timeline-keyframe') && targetElement.dataset.index) {
            this.contextMenuData.kfIndex = parseInt(targetElement.dataset.index);
        }

        // Check if right-clicked on a specific track
        const trackRow = targetElement.closest('.timeline-track-row');
        if (trackRow) {
            this.contextMenuData.trackType = trackRow.dataset.trackType;
            this.contextMenuData.trackIndex = parseInt(trackRow.dataset.trackIndex);
        }

        // Update menu item visibility based on context
        const addLayerKfItem = this.contextMenu.querySelector('[data-action="addLayerKeyframe"]');
        const deleteLayerItem = this.contextMenu.querySelector('[data-action="deleteLayer"]');
        const editCurveItem = this.contextMenu.querySelector('[data-action="editCurve"]');
        
        if (addLayerKfItem) {
            addLayerKfItem.style.display = (this.contextMenuData.trackType === 'layer') ? 'flex' : 'none';
        }
        if (deleteLayerItem) {
            deleteLayerItem.style.display = (this.contextMenuData.trackType === 'layer') ? 'flex' : 'none';
        }
        
        // Show edit curve only for camera keyframes
        if (editCurveItem) {
             // Show if right-clicked a specific keyframe OR if global context menu on timeline
             if (this.contextMenuData.kfIndex !== undefined) {
                 editCurveItem.style.display = 'flex';
             } else {
                 editCurveItem.style.display = 'none';
             }
        }

        // Position the menu
        const menuWidth = 200;
        const menuHeight = 300;
        const adjustedX = Math.min(x, window.innerWidth - menuWidth);
        const adjustedY = Math.min(y, window.innerHeight - menuHeight);
        
        this.contextMenu.style.left = adjustedX + 'px';
        this.contextMenu.style.top = adjustedY + 'px';
        this.contextMenu.style.display = 'block';
    }

    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
        this.contextMenuData = null;
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'addKeyframe':
                this.addKeyframe();
                break;
            case 'deleteKeyframe':
                this.deleteSelectedKeyframe();
                break;
            case 'play':
                this.togglePlayback();
                break;
            case 'goToStart':
                this.goToTime(0);
                break;
            case 'goToEnd':
                this.goToTime(this.duration);
                break;
            case 'addLayerKeyframe':
                if (this.contextMenuData && this.contextMenuData.trackIndex !== undefined && this.layersManager) {
                    const layerIndex = this.contextMenuData.trackIndex;
                    if (this.layersManager.layers[layerIndex]) {
                        this.layersManager.addLayerKeyframe(this.layersManager.layers[layerIndex]);
                        this.renderLayerTracks();
                    }
                }
                break;
            case 'deleteLayer':
                if (this.contextMenuData && this.contextMenuData.trackIndex !== undefined && this.layersManager) {
                    this.layersManager.deleteLayer(this.contextMenuData.trackIndex);
                    this.renderLayerTracks();
                }
                break;
            case 'zoomToFit':
                if (this.map) {
                    this.map.easeTo({ center: [0, 20], zoom: 2, duration: 500 });
                }
                break;
            case 'export':
                this.exportModal.style.display = 'flex';
                break;
            case 'editCurve':
                if (this.contextMenuData && this.contextMenuData.kfIndex !== undefined) {
                    this.openCurveEditor(this.contextMenuData.kfIndex);
                } else if (this.selectedKeyframeIndex >= 0) {
                     this.openCurveEditor(this.selectedKeyframeIndex);
                }
                break;
        }
    }

    // ==================== KEYFRAME MANAGEMENT ====================
    addKeyframe() {
        if (!this.map) return;

        const center = this.map.getCenter();
        const keyframe = {
            time: this.currentTime,
            center: [((center.lng + 180) % 360 + 360) % 360 - 180, center.lat],
            zoom: this.map.getZoom(),
            bearing: this.map.getBearing(),
            pitch: this.map.getPitch(),
            easing: {
                pan: [0, 0.84, 0.06, 0.99], // Exaggerated Ease Out
                zoom: [0.42, 0, 0.58, 1] // Ease In Out
            }
        };

        // Check if keyframe exists at this time
        const existingIndex = this.keyframes.findIndex(kf => 
            Math.abs(kf.time - this.currentTime) < 0.01
        );

        if (existingIndex >= 0) {
            this.keyframes[existingIndex] = keyframe;
        } else {
            this.keyframes.push(keyframe);
            this.keyframes.sort((a, b) => a.time - b.time);
        }

        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        this.selectKeyframe(this.keyframes.findIndex(kf => kf.time === keyframe.time));
    }

    deleteSelectedKeyframe() {
        if (this.selectedKeyframeIndex < 0) return;
        
        this.keyframes.splice(this.selectedKeyframeIndex, 1);
        this.selectedKeyframeIndex = -1;
        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        this.updateKeyframeEditor();
    }

    selectKeyframe(index) {
        this.selectedKeyframeIndex = index;
        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        this.updateKeyframeEditor();

        if (index >= 0 && this.keyframes[index]) {
            this.goToTime(this.keyframes[index].time);
            this.flyToKeyframe(this.keyframes[index]);
        }
    }

    flyToKeyframe(keyframe) {
        if (!this.map) return;
        
        this.map.flyTo({
            center: keyframe.center,
            zoom: keyframe.zoom,
            bearing: keyframe.bearing,
            pitch: keyframe.pitch,
            duration: 500
        });
    }

    renderKeyframeList() {
        if (this.keyframes.length === 0) {
            this.keyframeList.innerHTML = '<p class="empty-state">No keyframes yet. Click "Add Keyframe" to start.</p>';
            return;
        }

        this.keyframeList.innerHTML = this.keyframes.map((kf, i) => `
            <div class="keyframe-item ${i === this.selectedKeyframeIndex ? 'selected' : ''}" data-index="${i}">
                <div class="keyframe-dot"></div>
                <div class="keyframe-details">
                    <div class="keyframe-time">${this.formatTime(kf.time)}</div>
                    <div class="keyframe-coords">
                        ${kf.center[1].toFixed(2)}, ${kf.center[0].toFixed(2)} • Z${kf.zoom.toFixed(1)}
                    </div>
                </div>
            </div>
        `).join('');

        this.keyframeList.querySelectorAll('.keyframe-item').forEach(item => {
            item.addEventListener('click', () => {
                this.selectKeyframe(parseInt(item.dataset.index));
            });
        });
    }

    renderTimelineKeyframes() {
        this.keyframesContainer.innerHTML = this.keyframes.map((kf, i) => {
            const percent = (kf.time / this.duration) * 100;
            return `<div class="timeline-keyframe ${i === this.selectedKeyframeIndex ? 'selected' : ''}" 
                        style="left: ${percent}%" 
                        data-index="${i}"></div>`;
        }).join('');

        this.keyframesContainer.querySelectorAll('.timeline-keyframe').forEach(kfEl => {
            // Click to select
            kfEl.addEventListener('click', (e) => {
                e.stopPropagation();
                this.selectKeyframe(parseInt(kfEl.dataset.index));
            });

            // Drag to move keyframe in time
            kfEl.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startKeyframeDrag(e, parseInt(kfEl.dataset.index));
            });
        });
    }

    // ==================== LAYER TRACKS IN TIMELINE ====================
    renderLayerTracks() {
        if (!this.layersManager) return;
        
        // Remove existing layer tracks (keep camera track)
        const existingLayerTracks = this.timelineTracks.querySelectorAll('[data-track-type="layer"]');
        existingLayerTracks.forEach(track => track.remove());
        
        // Add tracks for each layer
        this.layersManager.layers.forEach((layer, index) => {
            const trackRow = document.createElement('div');
            trackRow.className = 'timeline-track-row';
            trackRow.dataset.trackType = 'layer';
            trackRow.dataset.trackIndex = index;
            
            // Create layer color indicator
            const layerColor = layer.style.fillColor || '#8b5cf6';
            
            const zoom = parseFloat(this.timelineZoom.value || 1);
            const totalWidth = this.duration * 100 * zoom;
            
            trackRow.innerHTML = `
                <div class="track-label" title="${layer.name}">
                    <button class="track-visibility-btn ${!layer.visible ? 'hidden' : ''}" title="${layer.visible ? 'Hide Layer' : 'Show Layer'}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            ${layer.visible 
                                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
                                : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'
                            }
                        </svg>
                    </button>
                    <svg viewBox="0 0 24 24" fill="${layerColor}" stroke="none" width="12" height="12">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                    </svg>
                    <input type="text" class="track-name-input" value="${layer.name}" title="Click to rename">
                    <button class="track-zoom-btn" title="Zoom to Layer">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                    </button>
                </div>
                <div class="track-content" style="width: ${totalWidth}px">
                    <div class="keyframes-container" data-layer-index="${index}"></div>
                </div>
            `;
            
            this.timelineTracks.appendChild(trackRow);
            
            // Bind track controls
            const visibilityBtn = trackRow.querySelector('.track-visibility-btn');
            visibilityBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.layersManager.toggleLayerVisibility(index);
                this.renderLayerTracks();
            });

            const nameInput = trackRow.querySelector('.track-name-input');
            nameInput.addEventListener('mousedown', (e) => e.stopPropagation()); // Prevent scrubbing when clicking input
            nameInput.addEventListener('change', (e) => {
                layer.name = e.target.value;
                this.layersManager.renderLayersList();
                this.layersManager.renderLayerEditor();
            });

            const trackLabel = trackRow.querySelector('.track-label');
            trackLabel.addEventListener('click', (e) => {
                if (!e.target.closest('button') && !e.target.closest('input')) {
                    this.layersManager.selectLayer(index);
                }
            });

            const zoomBtn = trackRow.querySelector('.track-zoom-btn');
            zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.layersManager.zoomToLayer(index);
            });

            // Render layer keyframes
            const layerKfContainer = trackRow.querySelector('.keyframes-container');
            layer.keyframes.forEach((kf, kfIndex) => {
                const percent = (kf.time / this.duration) * 100;
                const kfEl = document.createElement('div');
                kfEl.className = 'timeline-keyframe layer-keyframe';
                kfEl.style.left = `${percent}%`;
                kfEl.dataset.layerIndex = index;
                kfEl.dataset.kfIndex = kfIndex;
                
                // Click to select layer and keyframe
                kfEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.layersManager.selectLayer(index);
                    this.goToTime(kf.time);
                });
                
                // Drag to move keyframe
                kfEl.addEventListener('mousedown', (e) => {
                    e.stopPropagation();
                    this.startLayerKeyframeDrag(e, index, kfIndex);
                });
                
                layerKfContainer.appendChild(kfEl);
            });
            
        });
    }

    startLayerKeyframeDrag(e, layerIndex, kfIndex) {
        e.preventDefault();
        
        const layer = this.layersManager.layers[layerIndex];
        let kf = layer.keyframes[kfIndex];
        let trackContent = e.target.closest('.track-content');
        if (!trackContent) return;
        
        if (e.altKey) {
            const newKf = JSON.parse(JSON.stringify(kf));
            layer.keyframes.push(newKf);
            layer.keyframes.sort((a, b) => a.time - b.time);
            
            // Update reference to the new keyframe
            kfIndex = layer.keyframes.indexOf(newKf);
            kf = newKf;
            
            // Re-render tracks to show new keyframe
            this.renderLayerTracks();
            
            // Re-acquire the track content element since DOM was updated
            const trackRow = this.timelineTracks.querySelector(`.timeline-track-row[data-track-index="${layerIndex}"]`);
            if (trackRow) {
                trackContent = trackRow.querySelector('.track-content');
            }
        }

        if (!trackContent) return;
        
        const rect = trackContent.getBoundingClientRect();
        
        const onMove = (e) => {
            const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            const newTime = percent * this.duration;
            
            kf.time = Math.round(newTime * 100) / 100;
            
            // Update visual position
            const kfEl = trackContent.querySelector(`[data-kf-index="${kfIndex}"]`);
            if (kfEl) {
                kfEl.style.left = `${percent * 100}%`;
            }
            
            this.goToTime(kf.time);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            
            // Re-sort keyframes by time
            layer.keyframes.sort((a, b) => a.time - b.time);
            this.renderLayerTracks();
            this.layersManager.renderLayerEditor();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // Drag keyframe on timeline to change its time
    startKeyframeDrag(e, keyframeIndex) {
        e.preventDefault();

        // Handle Alt-Click to Duplicate
        if (e.altKey) {
            const kfToCopy = this.keyframes[keyframeIndex];
            // Deep copy the keyframe object
            const newKf = JSON.parse(JSON.stringify(kfToCopy));
            
            // Add to array
            this.keyframes.push(newKf);
            
            // Sort to ensure order
            this.keyframes.sort((a, b) => a.time - b.time);
            
            // Update index to point to the new duplicate
            keyframeIndex = this.keyframes.indexOf(newKf);
        }
        
        // Select the keyframe being dragged
        this.selectKeyframe(keyframeIndex);
        
        const trackContent = document.getElementById('cameraTrack');
        if (!trackContent) return;
        
        const rect = trackContent.getBoundingClientRect();
        const kf = this.keyframes[keyframeIndex];
        
        const onMove = (e) => {
            const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            const newTime = percent * this.duration;
            
            // Update keyframe time
            kf.time = Math.round(newTime * 100) / 100; // Round to 2 decimal places
            
            // Update visual position
            const kfEl = this.keyframesContainer.querySelector(`[data-index="${keyframeIndex}"]`);
            if (kfEl) {
                kfEl.style.left = `${percent * 100}%`;
            }
            
            // Update the editor if it's showing this keyframe
            const timeInput = document.getElementById('editTime');
            if (timeInput) {
                timeInput.value = kf.time.toFixed(2);
            }
            
            // Update the keyframe list item
            this.renderKeyframeList();
            
            // Move playhead to keyframe position
            this.goToTime(kf.time);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            
            // Re-sort keyframes by time and re-render
            this.keyframes.sort((a, b) => a.time - b.time);
            this.selectedKeyframeIndex = this.keyframes.indexOf(kf);
            this.renderTimelineKeyframes();
            this.renderKeyframeList();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    updateKeyframeEditor() {
        if (this.selectedKeyframeIndex < 0 || !this.keyframes[this.selectedKeyframeIndex]) {
            this.keyframeEditor.innerHTML = '<p class="empty-state">Select a keyframe to edit or add a new one</p>';
            return;
        }

        const kf = this.keyframes[this.selectedKeyframeIndex];
        this.keyframeEditor.innerHTML = `
            <div class="keyframe-editor-content">
                <div class="editor-row">
                    <div class="editor-field">
                        <label>Time (s)</label>
                        <input type="number" id="editTime" value="${kf.time.toFixed(2)}" step="0.1" min="0" max="${this.duration}">
                    </div>
                    <div class="editor-field">
                        <label>Zoom</label>
                        <input type="number" id="editZoom" value="${kf.zoom.toFixed(2)}" step="0.1" min="0" max="22">
                    </div>
                </div>
                <div class="editor-row">
                    <div class="editor-field">
                        <label>Latitude</label>
                        <input type="number" id="editLat" value="${kf.center[1].toFixed(6)}" step="0.001">
                    </div>
                    <div class="editor-field">
                        <label>Longitude</label>
                        <input type="number" id="editLng" value="${kf.center[0].toFixed(6)}" step="0.001">
                    </div>
                </div>
                <div class="editor-row">
                    <div class="editor-field">
                        <label>Bearing</label>
                        <input type="number" id="editBearing" value="${kf.bearing.toFixed(1)}" step="1" min="-180" max="180">
                    </div>
                    <div class="editor-field">
                        <label>Pitch</label>
                        <input type="number" id="editPitch" value="${kf.pitch.toFixed(1)}" step="1" min="0" max="85">
                    </div>
                </div>
                <div class="editor-actions">
                    <button class="btn btn-secondary" id="goToKeyframeBtn">Go To View</button>
                    <button class="btn btn-secondary" id="captureCurrentBtn">Capture Current</button>
                </div>
            </div>
        `;

        // Auto-update on input change (no Update button needed)
        const inputs = ['editTime', 'editZoom', 'editLat', 'editLng', 'editBearing', 'editPitch'];
        inputs.forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.autoUpdateKeyframe());
                input.addEventListener('change', () => this.autoUpdateKeyframe());
            }
        });

        document.getElementById('goToKeyframeBtn').addEventListener('click', () => this.flyToKeyframe(kf));
        document.getElementById('captureCurrentBtn').addEventListener('click', () => this.captureCurrentView());
    }

    // Auto-update keyframe when any input changes
    autoUpdateKeyframe() {
        if (this.selectedKeyframeIndex < 0) return;

        const kf = this.keyframes[this.selectedKeyframeIndex];
        
        const timeInput = document.getElementById('editTime');
        const zoomInput = document.getElementById('editZoom');
        const latInput = document.getElementById('editLat');
        const lngInput = document.getElementById('editLng');
        const bearingInput = document.getElementById('editBearing');
        const pitchInput = document.getElementById('editPitch');

        if (timeInput) kf.time = parseFloat(timeInput.value) || 0;
        if (zoomInput) kf.zoom = parseFloat(zoomInput.value) || 1;
        if (latInput && lngInput) {
            kf.center = [
                parseFloat(lngInput.value) || 0,
                parseFloat(latInput.value) || 0
            ];
        }
        if (bearingInput) kf.bearing = parseFloat(bearingInput.value) || 0;
        if (pitchInput) kf.pitch = parseFloat(pitchInput.value) || 0;

        // Re-sort keyframes by time
        this.keyframes.sort((a, b) => a.time - b.time);
        this.selectedKeyframeIndex = this.keyframes.indexOf(kf);
        
        // Update UI
        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        
        // Move playhead to keyframe position
        this.goToTime(kf.time);
    }

    // Capture current map view to the selected keyframe
    captureCurrentView() {
        if (this.selectedKeyframeIndex < 0 || !this.map) return;

        const kf = this.keyframes[this.selectedKeyframeIndex];
        const center = this.map.getCenter();
        
        kf.center = [((center.lng + 180) % 360 + 360) % 360 - 180, center.lat];
        kf.zoom = this.map.getZoom();
        kf.bearing = this.map.getBearing();
        kf.pitch = this.map.getPitch();

        // Update editor inputs
        this.updateKeyframeEditor();
        this.renderKeyframeList();
        this.renderTimelineKeyframes();
    }

    updateKeyframeFromEditor() {
        // This method is kept for compatibility but auto-update now handles changes
        this.autoUpdateKeyframe();
    }

    // ==================== PLAYBACK ====================
    togglePlayback() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (this.keyframes.length < 2) {
            alert('Add at least 2 keyframes to play animation');
            return;
        }

        if (this.map) this.map.stop();
        
        this.isPlaying = true;
        this.lastFrameTime = performance.now();
        this.playIcon.style.display = 'none';
        this.pauseIcon.style.display = 'block';
        
        this.animate();
    }

    pause() {
        this.isPlaying = false;
        this.playIcon.style.display = 'block';
        this.pauseIcon.style.display = 'none';
        
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }

    animate() {
        if (!this.isPlaying) return;

        const now = performance.now();
        const delta = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        this.currentTime += delta;

        if (this.currentTime >= this.duration) {
            // Stop at end when recording, otherwise loop
            if (this.isRecording) {
                this.currentTime = this.duration;
                this.updatePlayhead();
                this.interpolateCamera();
                if (this.layersManager) {
                    this.layersManager.updateLayerAnimations(this.currentTime);
                }
                this.pause();
                return;
            }
            this.currentTime = 0;
        }

        this.updatePlayhead();
        this.interpolateCamera();

        // Update layer animations if layers manager exists
        if (this.layersManager) {
            this.layersManager.updateLayerAnimations(this.currentTime);
        }

        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    interpolateCamera() {
        if (!this.map || this.keyframes.length < 2) return;

        let prevKf = this.keyframes[0];
        let nextKf = this.keyframes[this.keyframes.length - 1];

        for (let i = 0; i < this.keyframes.length - 1; i++) {
            if (this.currentTime >= this.keyframes[i].time && this.currentTime <= this.keyframes[i + 1].time) {
                prevKf = this.keyframes[i];
                nextKf = this.keyframes[i + 1];
                break;
            }
        }

        if (this.currentTime <= this.keyframes[0].time) {
            prevKf = nextKf = this.keyframes[0];
        } else if (this.currentTime >= this.keyframes[this.keyframes.length - 1].time) {
            prevKf = nextKf = this.keyframes[this.keyframes.length - 1];
        }

        const timeDiff = nextKf.time - prevKf.time;
        // Base normalized time t in [0, 1]
        let t = timeDiff > 0 ? (this.currentTime - prevKf.time) / timeDiff : 1;
        
        // Default curve points (linear or global easing based)
        // Actually applyEasing returns a mapped T, we want to know what the 'points' would be if we were using solveCubicBezier
        // But simplified: we compute tPan and tZoom separately.
        
        let tPan = t;
        let tZoom = t;

        // Check if keyframe has separate easing properties
        if (prevKf.easing && (prevKf.easing.pan || prevKf.easing.zoom)) {
            // New structure: prevKf.easing = { pan: [p1x, p1y, p2x, p2y], zoom: [...] }
            if (prevKf.easing.pan) {
                const ce = prevKf.easing.pan;
                tPan = this.solveCubicBezier(ce[0], ce[1], ce[2], ce[3], t);
            } else {
                tPan = this.applyEasing(t);
            }

            if (prevKf.easing.zoom) {
                const ce = prevKf.easing.zoom;
                tZoom = this.solveCubicBezier(ce[0], ce[1], ce[2], ce[3], t);
            } else {
                tZoom = this.applyEasing(t);
            }
        } 
        else if (prevKf.customEasing) {
            // Fallback to legacy single custom easing
            const ce = prevKf.customEasing;
            const tCustom = this.solveCubicBezier(ce[0], ce[1], ce[2], ce[3], t);
            tPan = tCustom;
            tZoom = tCustom;
        } 
        else {
            // Global easing
            const tGlobal = this.applyEasing(t);
            tPan = tGlobal;
            tZoom = tGlobal;
        }

        // Use Mercator coordinates for interpolation to ensure a straight visual path
        // (Mercator Y is non-linear with Latitude, so linear Lat interpolation looks curved/swerved)
        const coordA = maplibregl.MercatorCoordinate.fromLngLat(prevKf.center);
        const coordB = maplibregl.MercatorCoordinate.fromLngLat(nextKf.center);

        // Interpolate X (Longitude) with wrapping support
        let x;
        let diffX = coordB.x - coordA.x;
        if (diffX > 0.5) diffX -= 1.0;
        if (diffX < -0.5) diffX += 1.0;
        
        // Use tPan for coordinate interpolation
        x = coordA.x + diffX * tPan;
        x = (x % 1 + 1) % 1; // Keep in [0, 1]

        // Interpolate Y (Latitude) using tPan
        const y = this.lerp(coordA.y, coordB.y, tPan);

        const center = new maplibregl.MercatorCoordinate(x, y).toLngLat();
        
        // Use tZoom for zoom interpolation
        let zoom = this.lerp(prevKf.zoom, nextKf.zoom, tZoom);
        
        // Apply export zoom offset if set (for high-res export)
        if (this.exportZoomOffset) {
            zoom += this.exportZoomOffset;
        }

        // Use tPan for bearing/pitch as they relate to camera orientation/position
        const bearing = this.lerpAngle(prevKf.bearing, nextKf.bearing, tPan);
        const pitch = this.lerp(prevKf.pitch, nextKf.pitch, tPan);

        this.map.jumpTo({ center, zoom, bearing, pitch, animate: false });
    }

    lerp(a, b, t) {
        return a + (b - a) * t;
    }

    lerpAngle(a, b, t) {
        let diff = b - a;
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return a + diff * t;
    }

    applyEasing(t) {
        switch (this.easing) {
            case 'linear': return t;
            case 'easeIn': return t * t;
            case 'easeOut': return 1 - (1 - t) * (1 - t);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
            case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'easeInOutQuint': return t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;
            default: return t;
        }
    }

    goToTime(time) {
        this.currentTime = Math.max(0, Math.min(this.duration, time));
        this.updatePlayhead();
        if (!this.isPlaying && this.keyframes.length >= 2) {
            this.interpolateCamera();
        }
        // Update layer animations when scrubbing
        if (this.layersManager) {
            this.layersManager.updateLayerAnimations(this.currentTime);
        }
    }

    stepFrame(direction) {
        const frameDuration = 1 / this.fps;
        this.goToTime(this.currentTime + frameDuration * direction);
    }

    jumpToKeyframe(direction) {
        // Collect all keyframe times
        let allTimes = this.keyframes.map(kf => kf.time);
        
        // Add layer keyframe times if manager exists
        if (this.layersManager && this.layersManager.layers) {
            this.layersManager.layers.forEach(layer => {
                if (layer.keyframes) {
                    layer.keyframes.forEach(lkf => {
                        if (!allTimes.some(t => Math.abs(t - lkf.time) < 0.001)) {
                            allTimes.push(lkf.time);
                        }
                    });
                }
            });
        }

        allTimes.sort((a, b) => a - b);

        if (direction > 0) {
            // Find the first keyframe strictly after current time
            const next = allTimes.find(t => t > this.currentTime + 0.001);
            if (next !== undefined) {
                this.goToTime(next);
            } else if (this.currentTime < this.duration) {
                this.goToTime(this.duration);
            }
        } else {
            // Find the last keyframe strictly before current time
            const prev = [...allTimes].reverse().find(t => t < this.currentTime - 0.001);
            if (prev !== undefined) {
                this.goToTime(prev);
            } else {
                this.goToTime(0);
            }
        }
    }

    updatePlayhead() {
        // Get the camera track to calculate proper positioning
        const cameraTrack = document.getElementById('cameraTrack');
        if (!cameraTrack) return;
        
        const trackRect = cameraTrack.getBoundingClientRect();
        const wrapperRect = this.timelineWrapper.getBoundingClientRect();
        
        // Calculate the pixel offset from the wrapper's left edge
        const trackLeftOffset = trackRect.left - wrapperRect.left;
        const trackWidth = trackRect.width;
        
        // Calculate playhead position in pixels and as percentage
        const percent = this.currentTime / this.duration;
        const pixelPosition = trackLeftOffset + (percent * trackWidth);
        
        // Update playhead position using pixels
        const playheadHandle = this.timelinePlayhead.querySelector('.playhead-handle');
        const playheadLine = this.timelinePlayhead.querySelector('.playhead-line');
        
        if (playheadHandle) {
            playheadHandle.style.left = `${pixelPosition}px`;
        }
        if (playheadLine) {
            playheadLine.style.left = `${pixelPosition}px`;
        }
        
        if (this.currentTimeDisplay) {
            this.currentTimeDisplay.textContent = this.formatTime(this.currentTime);
        }
    }

    startScrubbing(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const wasPlaying = this.isPlaying;
        if (wasPlaying) this.pause();

        // Use camera track or any track-content as the reference for position calculation
        const cameraTrack = document.getElementById('cameraTrack');
        if (!cameraTrack) return;
        
        const rect = cameraTrack.getBoundingClientRect();
        
        const onMove = (moveEvent) => {
            const clientX = moveEvent.clientX || moveEvent.touches?.[0]?.clientX;
            const x = clientX - rect.left;
            const percent = Math.max(0, Math.min(1, x / rect.width));
            
            // Snap to frame ticks
            let targetTime = percent * this.duration;
            targetTime = Math.round(targetTime * this.fps) / this.fps;
            
            this.goToTime(targetTime);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        onMove(e);
    }

    updateRuler() {
        const zoom = parseFloat(this.timelineZoom.value);
        // Build ruler with spacer (matches track label width) and content area
        const basePixelsPerSecond = 100;
        const totalWidth = this.duration * basePixelsPerSecond * zoom;
        
        const effectivePixelsPerSecond = basePixelsPerSecond * zoom;
        let markerInterval = 1;
        if (effectivePixelsPerSecond > 100) markerInterval = 0.5;
        if (effectivePixelsPerSecond > 200) markerInterval = 0.25;
        if (effectivePixelsPerSecond < 30) markerInterval = 2;
        if (effectivePixelsPerSecond < 15) markerInterval = 5;

        let html = '<div class="ruler-spacer"></div>';
        html += `<div class="ruler-content" style="width: ${totalWidth}px; min-width: 100%;">`;
        
        // Add time markers
        const frameInterval = 1 / this.fps;
        
        for (let t = 0; t <= this.duration; t += markerInterval) {
            const percent = (t / this.duration) * 100;
            const isMajor = t % 1 === 0;
            
            html += `
                <div class="ruler-mark ${isMajor ? 'major' : ''}" style="left: ${percent}%">
                    <div class="ruler-mark-line"></div>
                    ${isMajor ? `<span class="ruler-mark-label">${t}s</span>` : ''}
                </div>
            `;
            
            // Add frame ticks between markers
            const nextMarker = t + markerInterval;
            for (let f = t + frameInterval; f < nextMarker && f <= this.duration; f += frameInterval) {
                const fPercent = (f / this.duration) * 100;
                html += `
                    <div class="ruler-mark frame-tick" style="left: ${fPercent}%">
                        <div class="ruler-mark-line"></div>
                    </div>
                `;
            }
        }
        
        html += '</div>';
        this.timelineRuler.innerHTML = html;
        
        // Update widths of track content areas
        document.querySelectorAll('.track-content').forEach(tc => {
            tc.style.width = `${totalWidth}px`;
        });
    }

    updateTotalTime() {
        this.totalTimeDisplay.textContent = this.formatTime(this.duration);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
    }

    handleKeydown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                this.togglePlayback();
                break;
            case 'KeyK':
                this.addKeyframe();
                break;
            case 'Delete':
            case 'Backspace':
                if (this.selectedKeyframeIndex >= 0) {
                    e.preventDefault();
                    this.deleteSelectedKeyframe();
                }
                break;
            case 'ArrowLeft':
                this.stepFrame(-1);
                break;
            case 'ArrowRight':
                this.stepFrame(1);
                break;
            case 'Home':
                this.goToTime(0);
                break;
            case 'End':
                this.goToTime(this.duration);
                break;
        }
    }

    // ==================== CURVE EDITOR ====================
    initCurveEditor() {
        this.curveEditorOverlay = document.getElementById('curveEditorOverlay');
        this.curveCanvas = document.getElementById('curveCanvas');
        this.ctx = this.curveCanvas.getContext('2d');
        this.handle1 = document.getElementById('handle1');
        this.handle2 = document.getElementById('handle2');
        this.curvePropertyTabs = document.querySelectorAll('.tab-btn');
        this.currentCurveProperty = 'pan'; // 'pan' or 'zoom'
        
        // Close
        const closeBtn = document.getElementById('closeCurveEditor');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.curveEditorOverlay.style.display = 'none';
            });
        }
        
        // Save Button -> Just Close now, since we have auto-save
        const saveBtn = document.getElementById('saveCurveBtn');
        if (saveBtn) {
            saveBtn.textContent = 'Close';
            saveBtn.addEventListener('click', () => {
                this.curveEditorOverlay.style.display = 'none';
            });
        }

        // Tabs
        this.curvePropertyTabs.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.curvePropertyTabs.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentCurveProperty = e.target.dataset.property;
                
                // Update label text (removed apply button label update since it's just 'Close' now)
                
                // Load the curve for this property
                this.loadCurveForProperty(this.currentCurveProperty);
            });
        });

        // Presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Handle button click or SVG click inside button
                const target = e.target.closest('.preset-btn');
                const preset = target.dataset.preset;
                switch(preset) {
                    case 'linear': this.setCurveHandles(0, 0, 1, 1); break;
                    case 'easeIn': this.setCurveHandles(0.42, 0, 1, 1); break;
                    case 'easeOut': this.setCurveHandles(0, 0, 0.58, 1); break;
                    case 'easeInOut': this.setCurveHandles(0.42, 0, 0.58, 1); break;
                }
                this.saveCurve(); // Auto-save on preset
            });
        });

        // Handle dragging
        this.draggingHandle = null;
        [this.handle1, this.handle2].forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                this.draggingHandle = handle;
                e.preventDefault();
                e.stopPropagation(); // Prevent map interaction if underlying
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.draggingHandle) return;
            
            const rect = this.curveCanvas.getBoundingClientRect();
            let x = (e.clientX - rect.left) / rect.width;
            let y = 1 - (e.clientY - rect.top) / rect.height; // Invert Y (0 at bottom)
            
            // Constrain X to 0-1, Y can overshoot slightly for elastic effects
            x = Math.max(0, Math.min(1, x));
            y = Math.min(2, Math.max(-1, y)); // Reasonable limits

            if (this.draggingHandle === this.handle1) {
                this.currentWrapperCp1 = [x, y];
            } else {
                this.currentWrapperCp2 = [x, y];
            }
            
            this.updateCurveUI();
            this.saveCurve(); // Auto-save on drag
        });

        document.addEventListener('mouseup', () => {
            this.draggingHandle = null;
        });
        
        // Input changes
        const inputIds = ['p1x', 'p1y', 'p2x', 'p2y'];
        inputIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // Change listener
                el.addEventListener('change', () => {
                    this.currentWrapperCp1 = [
                        parseFloat(document.getElementById('p1x').value) || 0,
                        parseFloat(document.getElementById('p1y').value) || 0
                    ];
                    this.currentWrapperCp2 = [
                        parseFloat(document.getElementById('p2x').value) || 0,
                        parseFloat(document.getElementById('p2y').value) || 0
                    ];
                    this.updateCurveUI();
                    this.saveCurve(); // Auto-save on input change
                });
                
                // Initialize number scrubbing
                this.initNumberScrubbing(el, 0.01, (val) => {
                     // Callback when scrubbing updates value
                     // Trigger change event manually or just run logic
                     el.dispatchEvent(new Event('change'));
                });
            }
        });
        
        // Handle Map Resize / Overlay Resize
        window.addEventListener('resize', () => {
            if (this.curveEditorOverlay.style.display !== 'none') {
                this.updateCurveUI();
            }
        });
    }

    // Number Scrubbing Helper
    initNumberScrubbing(input, step = 0.1, onUpdate) {
        let isDragging = false;
        let startX, startY, startValue;

        input.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startValue = parseFloat(input.value) || 0;
            
            document.body.style.cursor = 'ew-resize';
            e.preventDefault(); // Prevent text selection
        });

        const onMove = (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            // Use X movement for scrubbing. 
            // Optional: Use Y for finetuning? keeping it simple for now.
            
            const change = deltaX * step; // Scale sensitivity
            
            // let newValue = startValue + change;
            // Fix float precision issues
            let newValue = Math.round((startValue + change) * 1000) / 1000;
            
            // Respect min/max if present
            if (input.min) newValue = Math.max(parseFloat(input.min), newValue);
            if (input.max) newValue = Math.min(parseFloat(input.max), newValue);
            
            input.value = newValue;
            
            if (onUpdate) onUpdate(newValue);
        };

        const onUp = () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.cursor = '';
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    openCurveEditor(keyframeIndex) {
        if (keyframeIndex < 0 || keyframeIndex >= this.keyframes.length - 1) {
            alert('Cannot edit curve for the last keyframe (nothing follows it).');
            return;
        }

        this.editingCurveKfIndex = keyframeIndex;
        const kf = this.keyframes[keyframeIndex];
        
        // Ensure standard object structure for easing if not present (migration)
        if (!kf.easing) {
            kf.easing = {};
            // If legacy array exists, assume it was for both or just use default
            if (kf.customEasing && Array.isArray(kf.customEasing)) {
                kf.easing.pan = [...kf.customEasing];
                kf.easing.zoom = [...kf.customEasing];
                // Delete legacy to avoid confusion or keep it? 
                // Let's migrate fully eventually, but keeping it in sync is hard.
                // We'll prioritize `easing` object in interpolate.
            }
        }
        
        // Show overlay
        this.curveEditorOverlay.style.display = 'flex';
        
        // Reset Tabs to default (Pan)
        this.currentCurveProperty = 'pan';
        this.curvePropertyTabs.forEach(b => {
             if (b.dataset.property === 'pan') b.classList.add('active');
             else b.classList.remove('active');
        });
         // Label update removed
        
        // Initial Load
        this.loadCurveForProperty('pan');
        
        // Force a resize check/redraw
        requestAnimationFrame(() => this.updateCurveUI());
    }

    loadCurveForProperty(prop) {
        if (this.editingCurveKfIndex < 0) return;
        const kf = this.keyframes[this.editingCurveKfIndex];
        
        let cp = [0.42, 0, 0.58, 1]; // Default easeInOut
        
        if (kf.easing && kf.easing[prop]) {
            cp = kf.easing[prop];
        } else if (kf.customEasing && Array.isArray(kf.customEasing)) {
            // Fallback to legacy
            cp = kf.customEasing;
        }
        
        this.currentWrapperCp1 = [cp[0], cp[1]];
        this.currentWrapperCp2 = [cp[2], cp[3]];
        
        this.updateCurveUI();
    }

    setCurveHandles(x1, y1, x2, y2) {
        this.currentWrapperCp1 = [x1, y1];
        this.currentWrapperCp2 = [x2, y2];
        this.updateCurveUI();
    }

    updateCurveUI() {
        // Resize canvas to match display size
        const rect = this.curveCanvas.getBoundingClientRect();
        if (this.curveCanvas.width !== rect.width || this.curveCanvas.height !== rect.height) {
            this.curveCanvas.width = rect.width;
            this.curveCanvas.height = rect.height;
        }

        const w = this.curveCanvas.width;
        const h = this.curveCanvas.height;
        
        // Avoid errors if size is 0 (hidden)
        if (w === 0 || h === 0) return;

        // Update inputs
        document.getElementById('p1x').value = this.currentWrapperCp1[0].toFixed(2);
        document.getElementById('p1y').value = this.currentWrapperCp1[1].toFixed(2);
        document.getElementById('p2x').value = this.currentWrapperCp2[0].toFixed(2);
        document.getElementById('p2y').value = this.currentWrapperCp2[1].toFixed(2);

        // Position handles
        // Canvas coords: (0,0) is top-left. Graph origin (0,0) is bottom-left.
        // X = val * w
        // Y = (1 - val) * h
        const h1x = this.currentWrapperCp1[0] * w;
        const h1y = (1 - this.currentWrapperCp1[1]) * h;
        const h2x = this.currentWrapperCp2[0] * w;
        const h2y = (1 - this.currentWrapperCp2[1]) * h;

        this.handle1.style.left = `${h1x}px`;
        this.handle1.style.top = `${h1y}px`;
        this.handle2.style.left = `${h2x}px`;
        this.handle2.style.top = `${h2y}px`;

        // Draw curve
        this.ctx.clearRect(0, 0, w, h);
        
        // Grid lines
        this.ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        this.ctx.lineWidth = 1;
        // Grid 0, 0.25, 0.5, 0.75, 1
        for(let i=0; i<=4; i++) {
             let y = (1 - i*0.25) * h;
             this.ctx.beginPath(); this.ctx.moveTo(0, y); this.ctx.lineTo(w, y); this.ctx.stroke();
             let x = i*0.25 * w;
             this.ctx.beginPath(); this.ctx.moveTo(x, 0); this.ctx.lineTo(x, h); this.ctx.stroke();
        }

        // Reference linear line
        this.ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, h); this.ctx.lineTo(w, 0); 
        this.ctx.stroke();

        // Control lines
        this.ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        this.ctx.setLineDash([2, 5]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.lineTo(h1x, h1y);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(w, 0);
        this.ctx.lineTo(h2x, h2y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Cubic Bezier Curve
        this.ctx.strokeStyle = '#6366f1';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.moveTo(0, h);
        this.ctx.bezierCurveTo(h1x, h1y, h2x, h2y, w, 0);
        this.ctx.stroke();
    }

    saveCurve() {
        if (this.editingCurveKfIndex >= 0 && this.keyframes[this.editingCurveKfIndex]) {
            const kf = this.keyframes[this.editingCurveKfIndex];
            if (!kf.easing) kf.easing = {};
            
            // Save current controls to basic array
            // Round to reasonable precision to save interpolation noise
            const c1x = parseFloat(this.currentWrapperCp1[0].toFixed(3));
            const c1y = parseFloat(this.currentWrapperCp1[1].toFixed(3));
            const c2x = parseFloat(this.currentWrapperCp2[0].toFixed(3));
            const c2y = parseFloat(this.currentWrapperCp2[1].toFixed(3));
            
            kf.easing[this.currentCurveProperty] = [c1x, c1y, c2x, c2y];

            console.log(`Saved ${this.currentCurveProperty} curve for KF ${this.editingCurveKfIndex}`);
        }
    }

    // Bezier Math Helper
    solveCubicBezier(p1x, p1y, p2x, p2y, t) {
        // Tref equals x for time. We need to find T_curve such that X(T_curve) = t
        // Then return Y(T_curve).
        // Using sample-based approximation for simplicity (Newton's is better but complex)
        
        // Simple 1D bezier for X and Y components separately? No, standard bezier easing defines y = f(x)
        // where x is time.
        
        // Fast approximation (if Newton-Raphson is too much code)
        // Or essentially: Y(t) where X(t) = input_time.
        
        let cx = 3 * p1x;
        let bx = 3 * (p2x - p1x) - cx;
        let ax = 1 - cx - bx;
        
        let cy = 3 * p1y;
        let by = 3 * (p2y - p1y) - cy;
        let ay = 1 - cy - by;
        
        function sampleCurveX(t) { return ((ax * t + bx) * t + cx) * t; }
        function sampleCurveY(t) { return ((ay * t + by) * t + cy) * t; }
        function sampleCurveDerivativeX(t) { return (3 * ax * t + 2 * bx) * t + cx; }
        
        // Solve for X(t) = x using Newton-Raphson
        let t0, t1, t2, x2, d2, i;
        // First guess
        for (t2 = t, i = 0; i < 8; i++) {
            x2 = sampleCurveX(t2) - t;
            if (Math.abs(x2) < 1e-6) return sampleCurveY(t2);
            d2 = sampleCurveDerivativeX(t2);
            if (Math.abs(d2) < 1e-6) break;
            t2 = t2 - x2 / d2;
        }
        
        // Fallback to bisection if Newton fails
        t0 = 0; t1 = 1; t2 = t;
        if (t2 < t0) return sampleCurveY(t0);
        if (t2 > t1) return sampleCurveY(t1);
        
        while (t0 < t1) {
            x2 = sampleCurveX(t2);
            if (Math.abs(x2 - t) < 1e-6) return sampleCurveY(t2);
            if (t > x2) t0 = t2;
            else t1 = t2;
            t2 = (t1 - t0) * 0.5 + t0;
        }
        
        return sampleCurveY(t2);
    }
    // ==================== PROJECT MANAGEMENT ====================
    initProjectManagement() {
        this.currentProjectId = null;
        this.currentProjectName = 'Untitled Project';
        this.autoSaveInterval = null;
        this.STORAGE_KEY = 'animaps_projects';
        this.MAX_RECENT_PROJECTS = 10;

        // Bind elements
        this.projectNameInput = document.getElementById('projectNameInput');
        this.saveProjectBtn = document.getElementById('saveProjectBtn');
        this.saveAsCopyBtn = document.getElementById('saveAsCopyBtn');
        this.newProjectBtn = document.getElementById('newProjectBtn');
        this.recentProjectsList = document.getElementById('recentProjectsList');

        // Bind events
        if (this.saveProjectBtn) {
            this.saveProjectBtn.addEventListener('click', () => this.saveProject());
        }
        if (this.saveAsCopyBtn) {
            this.saveAsCopyBtn.addEventListener('click', () => this.saveProjectAsCopy());
        }
        if (this.newProjectBtn) {
            this.newProjectBtn.addEventListener('click', () => this.newProject());
        }
        if (this.projectNameInput) {
            this.projectNameInput.addEventListener('change', (e) => {
                this.currentProjectName = e.target.value || 'Untitled Project';
            });
        }

        // Start auto-save (every 30 seconds)
        this.startAutoSave();

        // Load last project or start fresh
        this.loadLastProject();
    }

    startAutoSave() {
        if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = setInterval(() => {
            this.autoSaveProject();
        }, 30000); // 30 seconds
    }

    getProjectData() {
        return {
            version: '1.0',
            name: this.currentProjectName,
            duration: this.duration,
            fps: this.fps,
            easing: this.easing,
            mapStyle: this.currentStyle,
            keyframes: this.keyframes,
            layers: this.layersManager ? this.layersManager.exportLayers() : [],
            savedAt: new Date().toISOString()
        };
    }

    getProjects() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load projects:', e);
            return [];
        }
    }

    saveProjects(projects) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(projects));
        } catch (e) {
            console.error('Failed to save projects:', e);
        }
    }

    saveProject() {
        const projectData = this.getProjectData();
        const projects = this.getProjects();

        // Update name from input
        if (this.projectNameInput) {
            this.currentProjectName = this.projectNameInput.value || 'Untitled Project';
            projectData.name = this.currentProjectName;
        }

        // Generate ID if new project
        if (!this.currentProjectId) {
            this.currentProjectId = 'proj_' + Date.now();
        }
        projectData.id = this.currentProjectId;

        // Find existing project to remove it (so we can move it to top)
        const existingIndex = projects.findIndex(p => p.id === this.currentProjectId);
        if (existingIndex >= 0) {
            projects.splice(existingIndex, 1);
        }
        
        // Add to top (most recent)
        projects.unshift(projectData);

        // Keep only the most recent projects
        if (projects.length > this.MAX_RECENT_PROJECTS) {
            projects.length = this.MAX_RECENT_PROJECTS;
        }

        this.saveProjects(projects);
        this.renderRecentProjects();
        
        // Visual feedback
        if (this.saveProjectBtn) {
            const originalText = this.saveProjectBtn.innerHTML;
            this.saveProjectBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Saved!';
            this.saveProjectBtn.classList.add('btn-success');
            setTimeout(() => {
                this.saveProjectBtn.innerHTML = originalText;
                this.saveProjectBtn.classList.remove('btn-success');
            }, 2000);
        }
    }

    saveProjectAsCopy() {
        // Generate new ID
        this.currentProjectId = 'proj_' + Date.now();
        
        // Update name to indicate it's a copy if unchanged, or use current input value
        // Note: The input value is already synced to currentProjectName via 'change' event/save logic
        // But if user typed new name and clicked Save Copy immediately, currentProjectName might not be updated yet
        // if the 'change' event hasn't fired. However, our saveProject reads this.currentProjectName.
        // Let's ensure we use the input value if present.
        if (this.projectNameInput) {
            this.currentProjectName = this.projectNameInput.value || 'Untitled Project';
        }
        
        // Append "Copy" if the name matches the previously loaded name? 
        // Logic: if user explicitly clicks "Save Copy", they might want to fork.
        // Let's assume they might have renamed it. If they didn't, we can append "Copy".
        // But simpler logic is just: New ID -> Save. It will appear as a new entry.
        // If they changed the name to "Project B", it will save as "Project B" (new ID).
        // If they kept "Project A", it will save as "Project A" (new ID).
        
        // Let's visual feedback that this is a NEW project reference
        this.saveProject();
        
        // Show specific feedback for Copy
        if (this.saveAsCopyBtn) {
            const originalText = this.saveAsCopyBtn.innerHTML;
            this.saveAsCopyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            this.saveAsCopyBtn.classList.add('btn-success');
            setTimeout(() => {
                this.saveAsCopyBtn.innerHTML = originalText;
                this.saveAsCopyBtn.classList.remove('btn-success');
            }, 2000);
        }
    }

    autoSaveProject() {
        if (this.keyframes.length === 0 && (!this.layersManager || this.layersManager.layers.length === 0)) {
            return; // Don't auto-save empty projects
        }
        
        const projectData = this.getProjectData();
        const projects = this.getProjects();

        if (!this.currentProjectId) {
            this.currentProjectId = 'proj_' + Date.now();
        }
        projectData.id = this.currentProjectId;

        // Find existing project to remove it (so we can move it to top)
        const existingIndex = projects.findIndex(p => p.id === this.currentProjectId);
        if (existingIndex >= 0) {
            projects.splice(existingIndex, 1);
        }
        
        // Add to top
        projects.unshift(projectData);

        if (projects.length > this.MAX_RECENT_PROJECTS) {
            projects.length = this.MAX_RECENT_PROJECTS;
        }

        this.saveProjects(projects);
    }

    loadProject(projectId) {
        const projects = this.getProjects();
        const project = projects.find(p => p.id === projectId);
        
        if (!project) return;

        this.loadProjectData(project);
        this.exportModal.style.display = 'none';
    }

    loadProjectData(data) {
        // Clear existing
        if (this.layersManager) {
            this.layersManager.clearAllLayers();
        }
        this.keyframes = [];

        // Load project data
        this.currentProjectId = data.id || null;
        this.currentProjectName = data.name || 'Untitled Project';
        this.keyframes = data.keyframes || [];
        this.duration = data.duration || 10;
        this.fps = data.fps || 30;
        this.easing = data.easing || 'easeInOut';

        // Update UI
        this.durationInput.value = this.duration;
        this.fpsSelect.value = this.fps;
        this.easingSelect.value = this.easing;
        if (this.projectNameInput) {
            this.projectNameInput.value = this.currentProjectName;
        }

        // Change map style if needed
        if (data.mapStyle && MAP_STYLES[data.mapStyle]) {
            this.mapStyleSelect.value = data.mapStyle;
            this.changeMapStyle(data.mapStyle);
        }

        // Import layers
        if (data.layers && this.layersManager) {
            this.layersManager.importLayers(data.layers);
            this.renderLayerTracks();
        }

        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        this.updateRuler();
        this.updateTotalTime();
        this.goToTime(0);

        if (this.keyframes.length > 0) {
            this.flyToKeyframe(this.keyframes[0]);
        }
    }

    loadLastProject() {
        const projects = this.getProjects();
        if (projects.length > 0) {
            // Don't auto-load, just render the list
            this.renderRecentProjects();
        }
    }

    deleteProject(projectId) {
        const projects = this.getProjects();
        const index = projects.findIndex(p => p.id === projectId);
        if (index >= 0) {
            projects.splice(index, 1);
            this.saveProjects(projects);
            this.renderRecentProjects();
            
            // If deleting the currently open project, detach the ID so future saves create a new entry
            if (this.currentProjectId === projectId) {
                this.currentProjectId = null;
            }
        }
    }

    newProject() {
        if (this.keyframes.length > 0 || (this.layersManager && this.layersManager.layers.length > 0)) {
            if (!confirm('Create a new project? Unsaved changes will be auto-saved.')) {
                return;
            }
            this.autoSaveProject();
        }

        // Reset state
        this.currentProjectId = null;
        this.currentProjectName = 'Untitled Project';
        this.keyframes = [];
        this.duration = 10;
        this.fps = 30;
        this.easing = 'easeInOut';

        // Clear layers
        if (this.layersManager) {
            this.layersManager.clearAllLayers();
        }

        // Reset UI
        this.durationInput.value = this.duration;
        this.fpsSelect.value = this.fps;
        this.easingSelect.value = this.easing;
        if (this.projectNameInput) {
            this.projectNameInput.value = '';
        }

        this.renderKeyframeList();
        this.renderTimelineKeyframes();
        this.renderLayerTracks();
        this.updateRuler();
        this.updateTotalTime();
        this.goToTime(0);

        this.exportModal.style.display = 'none';
    }

    renderRecentProjects() {
        if (!this.recentProjectsList) return;

        const projects = this.getProjects();
        
        if (projects.length === 0) {
            this.recentProjectsList.innerHTML = '<p class="empty-state small">No recent projects found.</p>';
            return;
        }

        this.recentProjectsList.innerHTML = projects.map(project => {
            const savedDate = new Date(project.savedAt);
            const timeAgo = this.formatTimeAgo(savedDate);
            const layerCount = project.layers ? project.layers.length : 0;
            const kfCount = project.keyframes ? project.keyframes.length : 0;

            return `
                <div class="project-item" data-project-id="${project.id}">
                    <div class="project-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z"/>
                        </svg>
                    </div>
                    <div class="project-info">
                        <div class="project-name">${project.name || 'Untitled Project'}</div>
                        <div class="project-meta">${timeAgo} • ${kfCount} keyframes • ${layerCount} layers</div>
                    </div>
                    <div class="project-actions">
                        <button class="project-action-btn load" title="Load Project">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                            </svg>
                        </button>
                        <button class="project-action-btn delete" title="Delete Project">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Bind events
        this.recentProjectsList.querySelectorAll('.project-item').forEach(item => {
            const projectId = item.dataset.projectId;

            const loadBtn = item.querySelector('.load');
            if (loadBtn) {
                loadBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.loadProject(projectId);
                });
            }

            const deleteBtn = item.querySelector('.delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (confirm('Delete this project?')) {
                        this.deleteProject(projectId);
                    }
                });
            }

            // Clicking on the item also loads
            item.addEventListener('click', () => {
                this.loadProject(projectId);
            });
        });
    }

    formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return date.toLocaleDateString();
    }

    exportToJson() {
        const data = this.getProjectData();
        const name = this.currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'animaps_project';

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importFromJson(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                
                // Set as new project
                data.id = 'proj_' + Date.now();
                this.loadProjectData(data);
                this.saveProject(); // Save to recent projects
                
                this.exportModal.style.display = 'none';
            } catch (err) {
                alert('Failed to import JSON file: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    }

    // ==================== VIDEO EXPORT ====================
    initVideoExport() {
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.originalMapSize = null;

        // Bind elements
        this.recordWebmBtn = document.getElementById('recordWebmBtn');
        this.exportPngBtn = document.getElementById('exportPngBtn');
        this.recordingIndicator = document.getElementById('recordingIndicator');
        this.exportProgress = document.getElementById('exportProgress');
        this.exportProgressFill = document.getElementById('exportProgressFill');
        this.exportProgressText = document.getElementById('exportProgressText');

        // Export settings elements
        this.exportResolution = document.getElementById('exportResolution');
        this.customResolutionRow = document.getElementById('customResolutionRow');
        this.exportWidth = document.getElementById('exportWidth');
        this.exportHeight = document.getElementById('exportHeight');
        this.exportFps = document.getElementById('exportFps');
        this.exportQuality = document.getElementById('exportQuality');

        // Resolution presets
        this.resolutionPresets = {
            '720p': { width: 1280, height: 720 },
            '1080p': { width: 1920, height: 1080 },
            '1440p': { width: 2560, height: 1440 },
            '4k': { width: 3840, height: 2160 }
        };

        // Quality bitrate mapping
        this.qualityBitrates = {
            'low': 2000000,      // 2 Mbps
            'medium': 5000000,   // 5 Mbps
            'high': 10000000,    // 10 Mbps
            'ultra': 20000000    // 20 Mbps
        };

        // Check browser support
        this.supportsWebM = typeof MediaRecorder !== 'undefined' && 
            MediaRecorder.isTypeSupported('video/webm; codecs=vp9');

        // Bind events
        if (this.exportResolution) {
            this.exportResolution.addEventListener('change', () => {
                this.customResolutionRow.style.display = 
                    this.exportResolution.value === 'custom' ? 'flex' : 'none';
            });
        }

        if (this.recordWebmBtn) {
            if (this.supportsWebM) {
                this.recordWebmBtn.addEventListener('click', () => this.startRecording());
            } else {
                this.recordWebmBtn.disabled = true;
                this.recordWebmBtn.title = 'WebM recording not supported in this browser';
            }
        }

        if (this.exportPngBtn) {
            this.exportPngBtn.addEventListener('click', () => this.exportPngSequence());
        }

        this.exportSvgBtn = document.getElementById('exportSvgBtn');
        if (this.exportSvgBtn) {
            this.exportSvgBtn.addEventListener('click', () => this.exportSvgSequence());
        }
    }

    getExportSettings() {
        const resolution = this.exportResolution?.value || '1080p';
        let width, height;

        if (resolution === 'current') {
            const canvas = this.map.getCanvas();
            width = canvas.width;
            height = canvas.height;
        } else if (resolution === 'custom') {
            width = parseInt(this.exportWidth?.value) || 1920;
            height = parseInt(this.exportHeight?.value) || 1080;
        } else {
            const preset = this.resolutionPresets[resolution];
            width = preset.width;
            height = preset.height;
        }

        const fps = parseInt(this.exportFps?.value) || 30;
        const quality = this.exportQuality?.value || 'high';
        const bitrate = this.qualityBitrates[quality] || 10000000;

        return { width, height, fps, quality, bitrate };
    }

    async resizeMapForExport(width, height) {
        const mapContainer = this.map.getContainer();
        const currentWidth = mapContainer.clientWidth;
        
        // Calculate zoom offset to maintain the same field of view
        // Zoom increases by log2(scale ratio)
        if (currentWidth > 0 && width > 0) {
            this.exportZoomOffset = Math.log2(width / currentWidth);
        } else {
            this.exportZoomOffset = 0;
        }
        
        // Store original size
        this.originalMapSize = {
            width: mapContainer.style.width,
            height: mapContainer.style.height
        };

        // Resize container
        mapContainer.style.width = `${width}px`;
        mapContainer.style.height = `${height}px`;
        
        // Trigger map resize
        this.map.resize();
        
        // Wait for resize to complete
        await this.waitForRender();
        await new Promise(r => setTimeout(r, 200));
    }

    restoreMapSize() {
        // Reset zoom offset
        this.exportZoomOffset = 0;

        if (this.originalMapSize) {
            const mapContainer = this.map.getContainer();
            mapContainer.style.width = this.originalMapSize.width || '100%';
            mapContainer.style.height = this.originalMapSize.height || '100%';
            this.map.resize();
            this.originalMapSize = null;
        }
    }

    async startRecording() {
        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        if (this.keyframes.length < 2) {
            alert('Add at least 2 keyframes to record an animation.');
            return;
        }

        try {
            const settings = this.getExportSettings();
            
            // Resize map to export resolution
            await this.resizeMapForExport(settings.width, settings.height);

            const canvas = this.map.getCanvas();
            const stream = canvas.captureStream(settings.fps);
            
            this.mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'video/webm; codecs=vp9',
                videoBitsPerSecond: settings.bitrate
            });

            this.recordedChunks = [];
            this.exportSettings = settings; // Store for finishRecording
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.recordedChunks.push(e.data);
                }
            };

            this.mediaRecorder.onstop = () => {
                this.finishRecording();
            };

            // Update UI
            this.isRecording = true;
            this.recordingIndicator.style.display = 'flex';
            this.recordWebmBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <rect x="6" y="6" width="12" height="12" fill="currentColor"/>
                </svg>
                Stop Recording
            `;
            this.recordWebmBtn.classList.add('btn-danger');

            // Start recording
            this.mediaRecorder.start(100); // Collect data every 100ms

            // Go to start and play
            this.goToTime(0);
            await this.waitForRender();
            this.play();

            // Wait for animation to complete
            const checkComplete = setInterval(() => {
                if (this.currentTime >= this.duration || !this.isPlaying) {
                    clearInterval(checkComplete);
                    if (this.isRecording) {
                        this.stopRecording();
                    }
                }
            }, 100);

        } catch (err) {
            console.error('Recording failed:', err);
            alert('Failed to start recording: ' + err.message);
            this.resetRecordingUI();
            this.restoreMapSize();
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.pause();
            this.mediaRecorder.stop();
        }
    }

    finishRecording() {
        this.isRecording = false;
        this.resetRecordingUI();
        this.restoreMapSize();

        if (this.recordedChunks.length === 0) {
            alert('No video data was recorded.');
            return;
        }

        const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const name = this.currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'animaps';
        const settings = this.exportSettings || { width: 1920, height: 1080 };
        a.download = `${name}_${settings.width}x${settings.height}_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);

        this.recordedChunks = [];
    }

    resetRecordingUI() {
        this.recordingIndicator.style.display = 'none';
        this.recordWebmBtn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="12" r="3" fill="currentColor"/>
            </svg>
            Record WebM Video
        `;
        this.recordWebmBtn.classList.remove('btn-danger');
    }

    async exportPngSequence() {
        if (this.keyframes.length < 2) {
            alert('Add at least 2 keyframes to export an animation.');
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded. Please refresh the page.');
            return;
        }

        const settings = this.getExportSettings();
        const totalFrames = Math.ceil(this.duration * settings.fps);
        const zip = new JSZip();
        const imgFolder = zip.folder('frames');

        // Show progress
        this.exportProgress.style.display = 'flex';
        this.exportPngBtn.disabled = true;

        try {
            // Resize map to export resolution
            await this.resizeMapForExport(settings.width, settings.height);

            for (let frame = 0; frame <= totalFrames; frame++) {
                const time = frame / settings.fps;
                this.goToTime(time);
                
                // Wait for map to render
                await this.waitForRender();

                // Capture frame
                const canvas = this.map.getCanvas();
                const dataUrl = canvas.toDataURL('image/png');
                const base64Data = dataUrl.split(',')[1];
                
                const frameNum = frame.toString().padStart(5, '0');
                imgFolder.file(`frame_${frameNum}.png`, base64Data, { base64: true });

                // Update progress
                const progress = Math.round((frame / totalFrames) * 100);
                this.exportProgressFill.style.width = `${progress}%`;
                this.exportProgressText.textContent = `${progress}%`;
            }

            // Generate and download ZIP
            this.exportProgressText.textContent = 'Creating ZIP...';
            const content = await zip.generateAsync({ type: 'blob' });
            
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            const name = this.currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'animaps';
            a.download = `${name}_${settings.width}x${settings.height}_frames_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('PNG export failed:', err);
            alert('Failed to export PNG sequence: ' + err.message);
        } finally {
            // Reset UI and restore map size
            this.exportProgress.style.display = 'none';
            this.exportProgressFill.style.width = '0%';
            this.exportProgressText.textContent = '0%';
            this.exportPngBtn.disabled = false;
            this.restoreMapSize();
        }
    }

    waitForRender() {
        return new Promise(resolve => {
            this.map.once('render', () => {
                // Extra delay for complex layers
                setTimeout(resolve, 50);
            });
            this.map.triggerRepaint();
        });
    }

    async exportSvgSequence() {
        if (this.keyframes.length < 2) {
            alert('Add at least 2 keyframes to export an animation.');
            return;
        }

        if (typeof JSZip === 'undefined') {
            alert('JSZip library not loaded. Please refresh the page.');
            return;
        }

        const settings = this.getExportSettings();
        const totalFrames = Math.ceil(this.duration * settings.fps);
        const zip = new JSZip();
        const svgFolder = zip.folder('frames');

        // Show progress
        this.exportProgress.style.display = 'flex';
        this.exportSvgBtn.disabled = true;

        try {
            // Resize map to export resolution
            await this.resizeMapForExport(settings.width, settings.height);

            for (let frame = 0; frame <= totalFrames; frame++) {
                const time = frame / settings.fps;
                this.goToTime(time);
                
                // Wait for map to render
                await this.waitForRender();

                // Capture frame as PNG then wrap in SVG
                const canvas = this.map.getCanvas();
                const pngDataUrl = canvas.toDataURL('image/png');
                
                // Create SVG that embeds the PNG
                const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" 
     width="${settings.width}" height="${settings.height}" viewBox="0 0 ${settings.width} ${settings.height}">
    <image width="${settings.width}" height="${settings.height}" xlink:href="${pngDataUrl}"/>
</svg>`;
                
                const frameNum = frame.toString().padStart(5, '0');
                svgFolder.file(`frame_${frameNum}.svg`, svgContent);

                // Update progress
                const progress = Math.round((frame / totalFrames) * 100);
                this.exportProgressFill.style.width = `${progress}%`;
                this.exportProgressText.textContent = `${progress}%`;
            }

            // Generate and download ZIP
            this.exportProgressText.textContent = 'Creating ZIP...';
            const content = await zip.generateAsync({ type: 'blob' });
            
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            const name = this.currentProjectName.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'animaps';
            a.download = `${name}_${settings.width}x${settings.height}_svg_${Date.now()}.zip`;
            a.click();
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error('SVG export failed:', err);
            alert('Failed to export SVG sequence: ' + err.message);
        } finally {
            // Reset UI and restore map size
            this.exportProgress.style.display = 'none';
            this.exportProgressFill.style.width = '0%';
            this.exportProgressText.textContent = '0%';
            this.exportSvgBtn.disabled = false;
            this.restoreMapSize();
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.animaps = new AniMaps();
});
