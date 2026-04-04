class CameraManager {
    constructor() {
        this.videoElement = document.getElementById("webcam-video");
        this.hands = null;
        this.camera = null;

        // Active tracking data
        this.landmarks = null; // Holds the 21 3D coordinates if a hand is detected
        this.isHandDetected = false;

        // Commonly needed tracking points (Normalized 0.0 to 1.0)
        this.pointerX = 0;
        this.pointerY = 0;
        this.isPinching = false;
        
        // Smoothing data
        this.smoothX = 0;
        this.smoothY = 0;
        this.smoothingFactor = 0.15; // Set lower (0.15) to aggressively kill jitter and flicker

        // Frozen cursor position used during a pinch (so finger bend doesn't drift the cursor)
        this.frozenX = 0;
        this.frozenY = 0;

        // Interaction memory
        this.wasPinching = false;
        this.draggedObject = null;

        this.createGlobalCursor();
        this.isInitialized = false;
    }

    createGlobalCursor() {
        this.cursorDiv = document.createElement("div");
        this.cursorDiv.style.position = "absolute";
        this.cursorDiv.style.width = "22px";
        this.cursorDiv.style.height = "22px";
        this.cursorDiv.style.borderRadius = "50%";
        this.cursorDiv.style.backgroundColor = "#ff0000";
        this.cursorDiv.style.border = "3px solid #ffffff";
        this.cursorDiv.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
        this.cursorDiv.style.pointerEvents = "none";
        this.cursorDiv.style.zIndex = "999999";
        this.cursorDiv.style.transform = "translate(-50%, -50%)";
        this.cursorDiv.style.display = "none";
        document.body.appendChild(this.cursorDiv);
    }

    async init() {
        if (this.isInitialized) return;
        
        console.log("Initializing MediaPipe ML Hand Tracking...");

        // Only create the complex ML model once in memory
        if (!this.hands) {
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            
            this.hands.setOptions({
                maxNumHands: 2, // Enable two-hand bilateral tracking!
                modelComplexity: 1, // 1 is balanced accuracy/speed
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.65
            });

            this.hands.onResults(this.onResults.bind(this));
        }

        // Only create the camera stream hook once
        if (!this.camera) {
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                    if (this.isInitialized && this.videoElement.videoWidth > 0) {
                        await this.hands.send({image: this.videoElement});
                    }
                },
                width: 640,
                height: 480
            });
        }

        this.camera.start();
        this.isInitialized = true;
        console.log("MediaPipe Camera Started!");
    }

    async stop() {
        if (!this.isInitialized) return;
        console.log("Stopping MediaPipe ML Hand Tracking...");
        
        if (this.camera) {
            this.camera.stop();
        }
        if (this.cursorDiv) {
            this.cursorDiv.style.display = "none";
        }
        
        // Safety release if pinching while camera stops
        if (window.game && window.game.scene) {
            const activeScene = window.game.scene.scenes.find(s => s.sys.isActive() && s.sys.isVisible());
            if (activeScene && activeScene.input) {
                activeScene.input.activePointer.isDown = false;
                if (this.draggedObject) {
                    activeScene.input.emit('dragend', activeScene.input.activePointer, this.draggedObject);
                }
            }
        }

        this.isHandDetected = false;
        this.isPinching = false;
        this.wasPinching = false;
        this.draggedObject = null;
        
        this.isInitialized = false;
        console.log("Camera Stopped.");
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.isHandDetected = true;
            this.landmarks = results.multiHandLandmarks[0];

            // MediaPipe Landmarks map:
            // 8: Index Finger Tip
            // 4: Thumb Tip
            // 0: Wrist
            
            // --- STABLE CURSOR ANCHOR ---
            // Track the index knuckle base (landmark 5) — far more stable than the fingertip
            // since it barely moves when the finger bends during a pinch gesture.
            const rawX = 1.0 - this.landmarks[5].x; // Index MCP (knuckle base) X
            const rawY = this.landmarks[5].y;        // Index MCP (knuckle base) Y

            // Always update the smooth tracking position
            this.smoothX += this.smoothingFactor * (rawX - this.smoothX);
            this.smoothY += this.smoothingFactor * (rawY - this.smoothY);

            const justStartedPinch = this.isPinching && !this.wasPinching;

            if (justStartedPinch) {
                // Freeze cursor at the exact position pinch began — ensures click lands accurately
                this.frozenX = this.smoothX;
                this.frozenY = this.smoothY;
            }

            if (this.isPinching && this.draggedObject) {
                // Dragging an object: let cursor follow the hand so the object moves with you
                this.pointerX = this.smoothX;
                this.pointerY = this.smoothY;
            } else if (this.isPinching) {
                // Pinching on a button/non-draggable: keep cursor frozen so it doesn't drift
                this.pointerX = this.frozenX;
                this.pointerY = this.frozenY;
            } else {
                // Hand is open: normal smooth tracking
                this.pointerX = this.smoothX;
                this.pointerY = this.smoothY;
            }


            // Simple Pinch Detection (Distance between thumb tip and index tip)
            const dx = this.landmarks[8].x - this.landmarks[4].x;
            const dy = this.landmarks[8].y - this.landmarks[4].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // Hysteresis: applies a massive improvement to hold-click stability!
            if (distance < 0.08) {
                // Generous tolerance to start a click
                this.isPinching = true;
            } else if (distance > 0.12) {
                // Must pull fingers apart significantly to release click
                this.isPinching = false;
            }

            // For FourFingerScene (8-Finger Rush), iterate over ALL hands detected!
            results.multiHandLandmarks.forEach((landmarks, index) => {
                const handedness = results.multiHandedness ? results.multiHandedness[index].label : "Right";
                
                // MediaPipe labels are mirrored by default for front-facing webcams. 
                // "Right" label usually means the physical Left hand of the user.
                const isPhysicalLeftHand = (handedness === "Right"); 
                
                // Mapping left-to-right on the physical screen:
                // Left Hand: Pinky(0), Ring(1), Middle(2), Index(3)
                // Right Hand: Index(4), Middle(5), Ring(6), Pinky(7)
                const prefix = isPhysicalLeftHand ? "L_" : "R_";

                if (isPhysicalLeftHand) {
                    this.processFingerTap(landmarks, prefix + 'pinky', 20, 18, 0);
                    this.processFingerTap(landmarks, prefix + 'ring', 16, 14, 1);
                    this.processFingerTap(landmarks, prefix + 'middle', 12, 10, 2);
                    this.processFingerTap(landmarks, prefix + 'index', 8, 6, 3);
                } else {
                    this.processFingerTap(landmarks, prefix + 'index', 8, 6, 4);
                    this.processFingerTap(landmarks, prefix + 'middle', 12, 10, 5);
                    this.processFingerTap(landmarks, prefix + 'ring', 16, 14, 6);
                    this.processFingerTap(landmarks, prefix + 'pinky', 20, 18, 7);
                }
            });

            // Process Synthetic DOM Drag/Clicks for Phaser using primary hand
            this.simulatePointerAction();

        } else {
            this.isHandDetected = false;
            this.landmarks = null;
            this.isPinching = false;
        }
    }

    simulatePointerAction() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;

        // Display global DOM cursor
        const rect = canvas.getBoundingClientRect();
        const clientX = rect.left + (this.pointerX * rect.width);
        const clientY = rect.top + (this.pointerY * rect.height);
        this.cursorDiv.style.left = `${clientX}px`;
        this.cursorDiv.style.top = `${clientY}px`;
        this.cursorDiv.style.display = this.isHandDetected ? "block" : "none";
        this.cursorDiv.style.backgroundColor = this.isPinching ? "#00c853" : "#ff0000";

        if (!window.game || !window.game.scene) return;
        
        // Find whichever Phaser Scene is currently running
        const activeScene = window.game.scene.scenes.find(s => s.sys.isActive() && s.sys.isVisible());
        if (!activeScene || !activeScene.input) return;

        // Convert camera coordinates to the game's canvas dimensions
        const px = this.pointerX * activeScene.scale.width;
        const py = this.pointerY * activeScene.scale.height;
        
        // Update Phaser's internal "Active Pointer" to our hand coordinates
        activeScene.input.activePointer.x = px;
        activeScene.input.activePointer.y = py;
        activeScene.input.activePointer.position.x = px;
        activeScene.input.activePointer.position.y = py;
        activeScene.input.activePointer.isDown = this.isPinching;

        // Ask Phaser: "Which game objects are currently sitting under this X/Y coordinate?"
        const hitObjects = activeScene.input.hitTestPointer(activeScene.input.activePointer);
        
        // Ensure hovered tracking array exists
        if (!this.hoveredObjects) this.hoveredObjects = [];
        
        // 1. Hover Logic (trigger 'pointerover')
        hitObjects.forEach(obj => {
            if (!this.hoveredObjects.includes(obj)) {
                if (obj.emit) obj.emit('pointerover', activeScene.input.activePointer);
                this.hoveredObjects.push(obj);
            }
        });
        
        // 2. Un-Hover Logic (trigger 'pointerout')
        this.hoveredObjects = this.hoveredObjects.filter(obj => {
            if (!hitObjects.includes(obj)) {
                if (obj.emit) obj.emit('pointerout', activeScene.input.activePointer);
                return false; // Remove from hovered list
            }
            return true; // Keep in hovered list
        });

        // 3. Click / Drag Start Logic
        if (this.isPinching && !this.wasPinching) {
            // Hand just pinched! Click any objects under the pointer
            hitObjects.forEach(obj => {
                if (obj.emit) obj.emit('pointerdown', activeScene.input.activePointer);
                
                // If the object is draggable, initialize the drag sequence
                if (obj.input && obj.input.draggable) {
                    this.draggedObject = obj;
                    activeScene.input.emit('dragstart', activeScene.input.activePointer, obj);
                }
            });
        } 
        
        // 4. Dragging Logic
        if (this.isPinching && this.wasPinching && this.draggedObject) {
            activeScene.input.emit('drag', activeScene.input.activePointer, this.draggedObject, px, py);
        }

        // 5. Release / Drag End Logic
        if (!this.isPinching && this.wasPinching) {
            // Hand just released pinch!
            hitObjects.forEach(obj => {
                if (obj.emit) obj.emit('pointerup', activeScene.input.activePointer);
            });
            
            // Release the dragged object
            if (this.draggedObject) {
                activeScene.input.emit('dragend', activeScene.input.activePointer, this.draggedObject);
                this.draggedObject = null;
            }
        }
        
        this.wasPinching = this.isPinching;
    }

    processFingerTap(landmarks, fingerName, tipId, pipId, padIndex) {
        if (!this.wasFingersDown) {
            this.wasFingersDown = {};
        }
        
        const tip = landmarks[tipId];
        const pip = landmarks[pipId];
        const wrist = landmarks[0];
        
        // Calculate the distance from the wrist to the fingertip and to the knuckle
        const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
        const dPip = Math.hypot(pip.x - wrist.x, pip.y - wrist.y);
        
        // If the tip distance falls below the PIP knuckle distance (plus a tiny tolerance buffer), 
        // it means the finger is violently curled / folded downwards towards the palm!
        const isFolded = dTip < (dPip * 1.05);
        const wasFolded = this.wasFingersDown[fingerName];
        
        if (isFolded && !wasFolded) {
            // FIRE TAP EVENT!
            if (window.game && window.game.scene) {
                const activeScene = window.game.scene.scenes.find(s => s.sys.isActive() && s.sys.isVisible());
                if (activeScene && activeScene.inputManager && activeScene.scene.key === "FourFingerScene") {
                    console.log(`FourFinger: ${fingerName} tapped!`);
                    activeScene.inputManager.emit("PAD_PRESSED", padIndex);
                }
            }
        }
        
        this.wasFingersDown[fingerName] = isFolded;
    }
}

// Global instance to be used across all Phaser Scenes
const cameraManager = new CameraManager();
