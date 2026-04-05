class CameraManager {
    constructor() {
        this.videoElement = document.getElementById("webcam-video");
        this.hands = null;
        this.cameraStream = null; // Replacing old mediapipe camera
        this.isHandDetected = false;
        
        // Camera Tracking State
        this.availableCameras = [];
        this.currentCameraIndex = 0;
        
        // Smoothing factor (0.45 heavily prioritizes speed over stabilization)
        this.smoothingFactor = 0.45; 

        // State machine for up to 2 hands (Red and Blue cursors)
        this.pointersState = [
            this.createStateObject("#ff0000"), // Hand 1
            this.createStateObject("#0088ff")  // Hand 2
        ];

        this.isInitialized = false;
    }

    createStateObject(color) {
        const cursorDiv = document.createElement("div");
        cursorDiv.style.position = "absolute";
        cursorDiv.style.width = "22px";
        cursorDiv.style.height = "22px";
        cursorDiv.style.borderRadius = "50%";
        cursorDiv.style.backgroundColor = color;
        cursorDiv.style.border = "3px solid #ffffff";
        cursorDiv.style.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
        cursorDiv.style.pointerEvents = "none";
        cursorDiv.style.zIndex = "999999";
        cursorDiv.style.transform = "translate(-50%, -50%)";
        cursorDiv.style.display = "none";
        document.body.appendChild(cursorDiv);

        return {
            pointerX: 0, pointerY: 0,
            smoothX: 0, smoothY: 0,
            frozenX: 0, frozenY: 0,
            isPinching: false, wasPinching: false,
            draggedObject: null,
            cursorDiv: cursorDiv,
            hoveredObjects: [],
            isActive: false,
            color: color
        };
    }

    async fetchCameras() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.error("enumerateDevices() not supported.");
            return;
        }
        try {
            // Must ask for permission first to get hardware labels
            const stream = await navigator.mediaDevices.getUserMedia({video: true});
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.availableCameras = devices.filter(device => device.kind === 'videoinput');
            stream.getTracks().forEach(t => t.stop()); // Free it up instantly
            console.log(`Detected ${this.availableCameras.length} Hardware Cameras!`);
        } catch(e) {
            console.error("Camera access denied.", e);
        }
    }

    async switchCamera() {
        if (this.availableCameras.length === 0) await this.fetchCameras();
        if (this.availableCameras.length <= 1) return false; // Cannot switch

        // Cycle through all plugged in devices
        this.currentCameraIndex = (this.currentCameraIndex + 1) % this.availableCameras.length;
        console.log("Switching to newly selected camera:", this.availableCameras[this.currentCameraIndex].label);

        // If currently running, brutally reboot the stream with the new ID
        if (this.isInitialized) {
            await this.stop();
            await this.init();
        }
        return true;
    }

    async init() {
        if (this.isInitialized) return;
        if (this.availableCameras.length === 0) await this.fetchCameras();
        
        console.log("Initializing MediaPipe ML Hand Tracking...");

        if (!this.hands) {
            this.hands = new Hands({locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }});
            
            this.hands.setOptions({
                maxNumHands: 2, // Enable two-hand tracking
                modelComplexity: 0, // Massively reduces ML CPU load, dramatically improving framerate
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));
        }

        // Extremely rigid hardware constraint to actively prevent USB Cams from sending 1080p+ streams!
        let constraints = { 
            video: { 
                width: { ideal: 640, max: 640 }, 
                height: { ideal: 480, max: 480 },
                frameRate: { ideal: 30, max: 30 }
            } 
        };
        
        if (this.availableCameras.length > 0) {
            constraints.video.deviceId = { exact: this.availableCameras[this.currentCameraIndex].deviceId };
        }

        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = this.cameraStream;
            await this.videoElement.play();
        } catch (error) {
            console.error("Error accessing hardware webcam:", error);
            return;
        }

        this.isInitialized = true;
        
        // High performance recursive frame pipeline
        const frameLoop = async () => {
            if (!this.isInitialized) return; // Break loop if stopped
            if (this.videoElement.videoWidth > 0) {
                await this.hands.send({image: this.videoElement});
            }
            if ('requestVideoFrameCallback' in this.videoElement) {
                this.videoElement.requestVideoFrameCallback(frameLoop);
            } else {
                requestAnimationFrame(frameLoop);
            }
        };
        
        // Start the infinite AI engine
        frameLoop();
        
        console.log("Custom ML Camera Pipeline successfully hooked to hardware!");
    }

    async stop() {
        if (!this.isInitialized) return;
        console.log("Stopping Custom ML Camera Pipeline...");
        
        // Terminate WebRTC streams to physically turn off the camera light
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        this.videoElement.srcObject = null;
        this.isInitialized = false;

        this.pointersState.forEach(p => {
            if (p.cursorDiv) p.cursorDiv.style.display = "none";
            p.isActive = false;
            p.isPinching = false;
            p.wasPinching = false;
            p.draggedObject = null;
            p.hoveredObjects = [];
        });
        
        // Safety release if pinching while camera stops
        if (window.game && window.game.scene) {
            const activeScene = window.game.scene.scenes.find(s => s.sys.isActive() && s.sys.isVisible());
            if (activeScene && activeScene.input) {
                const pointers = [activeScene.input.activePointer, activeScene.input.pointer1];
                pointers.forEach(ptr => { if(ptr) ptr.isDown = false; });
                
                this.pointersState.forEach((p, idx) => {
                    if (p.draggedObject && pointers[idx]) {
                        activeScene.input.emit('dragend', pointers[idx], p.draggedObject);
                    }
                });
            }
        }

        this.isHandDetected = false;
        this.isInitialized = false;
        console.log("Camera Stopped.");
    }

    onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.isHandDetected = true;
            
            // Mark all states as inactive initially
            this.pointersState.forEach(p => p.isActive = false);
            
            let serialPayload = {};
            let sendToSerial = false;
            
            results.multiHandLandmarks.forEach((landmarks, index) => {
                // We only support tracking up to 2 distinct cursors currently
                if (index > 1) return;
                
                const state = this.pointersState[index];
                state.isActive = true;

                // --- STABLE CURSOR ANCHOR ---
                const rawX = 1.0 - landmarks[5].x; // Index MCP
                const rawY = landmarks[5].y;        

                state.smoothX += this.smoothingFactor * (rawX - state.smoothX);
                state.smoothY += this.smoothingFactor * (rawY - state.smoothY);

                const justStartedPinch = state.isPinching && !state.wasPinching;

                if (justStartedPinch) {
                    state.frozenX = state.smoothX;
                    state.frozenY = state.smoothY;
                }

                if (state.isPinching && state.draggedObject) {
                    state.pointerX = state.smoothX;
                    state.pointerY = state.smoothY;
                } else if (state.isPinching) {
                    state.pointerX = state.frozenX;
                    state.pointerY = state.frozenY;
                } else {
                    state.pointerX = state.smoothX;
                    state.pointerY = state.smoothY;
                }

                // Simple Pinch Detection
                const dx = landmarks[8].x - landmarks[4].x;
                const dy = landmarks[8].y - landmarks[4].y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < 0.08) {
                    state.isPinching = true;
                } else if (distance > 0.12) {
                    state.isPinching = false;
                }
                const handedness = results.multiHandedness ? results.multiHandedness[index].label : "Right";
                
                // MediaPipe labels are mirrored by default for front-facing webcams. 
                // "Right" label usually means the physical Left hand of the user.
                const isPhysicalLeftHand = (handedness === "Right"); 
                
                // Hardware Integration: Calculate Finger Flexion Angles
                // Index(5,8), Middle(9,12), Ring(13,16), Pinky(17,20)
                const flexIndex = this.calculateFlexionAngle(landmarks, 5, 8);
                const flexMiddle = this.calculateFlexionAngle(landmarks, 9, 12);
                const flexRing = this.calculateFlexionAngle(landmarks, 13, 16);
                const flexPinky = this.calculateFlexionAngle(landmarks, 17, 20);

                if (isPhysicalLeftHand) {
                    serialPayload.L = [flexIndex, flexMiddle, flexRing, flexPinky];
                    sendToSerial = true;
                    
                    this.processFingerTap(landmarks, 'L_pinky', 20, 18, 0);
                    this.processFingerTap(landmarks, 'L_ring', 16, 14, 1);
                    this.processFingerTap(landmarks, 'L_middle', 12, 10, 2);
                    this.processFingerTap(landmarks, 'L_index', 8, 6, 3);
                } else {
                    serialPayload.R = [flexIndex, flexMiddle, flexRing, flexPinky];
                    sendToSerial = true;
                    
                    this.processFingerTap(landmarks, 'R_index', 8, 6, 4);
                    this.processFingerTap(landmarks, 'R_middle', 12, 10, 5);
                    this.processFingerTap(landmarks, 'R_ring', 16, 14, 6);
                    this.processFingerTap(landmarks, 'R_pinky', 20, 18, 7);
                }
            });

            // Dispatch to ESP32 Controllers if connected
            // Dispatch to ESP32 Controllers if connected
            if (sendToSerial && typeof serialManager !== 'undefined' && serialManager.isConnected) {
                serialManager.sendPayload(JSON.stringify(serialPayload));
            }

            // Process Synthetic DOM Drag/Clicks for Phaser using primary hand
            this.simulatePointerAction();

        } else {
            this.isHandDetected = false;
            this.pointersState.forEach(p => {
                p.isActive = false;
                p.isPinching = false;
            });
            this.simulatePointerAction(); // Trigger fadeouts/hiding
        }
    }

    simulatePointerAction() {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        
        if (!window.game || !window.game.scene) return;
        const activeScene = window.game.scene.scenes.find(s => s.sys.isActive() && s.sys.isVisible());
        if (!activeScene || !activeScene.input) return;

        // Crucial: Tell Phaser to enable Multi-Touch (Pointer 1) if tracking two hands!
        if (!activeScene.input.pointer1) {
            activeScene.input.addPointer(1);
        }

        const scenePointers = [
            activeScene.input.activePointer, 
            activeScene.input.pointer1
        ];

        this.pointersState.forEach((state, idx) => {
            const phaserPointer = scenePointers[idx];
            if (!phaserPointer) return;

            if (!state.isActive) {
                state.cursorDiv.style.display = "none";
                state.isPinching = false;
                state.wasPinching = false;
                phaserPointer.isDown = false;
                return;
            }

            const clientX = rect.left + (state.pointerX * rect.width);
            const clientY = rect.top + (state.pointerY * rect.height);
            state.cursorDiv.style.left = `${clientX}px`;
            state.cursorDiv.style.top = `${clientY}px`;
            state.cursorDiv.style.display = "block";
            state.cursorDiv.style.backgroundColor = state.isPinching ? "#00c853" : state.color;

            const px = state.pointerX * activeScene.scale.width;
            const py = state.pointerY * activeScene.scale.height;

            phaserPointer.x = px;
            phaserPointer.y = py;
            phaserPointer.position.x = px;
            phaserPointer.position.y = py;
            phaserPointer.isDown = state.isPinching;

            const hitObjects = activeScene.input.hitTestPointer(phaserPointer);
            
            if (!state.hoveredObjects) state.hoveredObjects = [];
            
            // 1. Hover Logic 
            hitObjects.forEach(obj => {
                if (!state.hoveredObjects.includes(obj)) {
                    if (obj.emit) obj.emit('pointerover', phaserPointer);
                    state.hoveredObjects.push(obj);
                }
            });
            
            // 2. Un-Hover Logic 
            state.hoveredObjects = state.hoveredObjects.filter(obj => {
                if (!hitObjects.includes(obj)) {
                    if (obj.emit) obj.emit('pointerout', phaserPointer);
                    return false;
                }
                return true; 
            });

            // 3. Click / Drag Start Logic
            if (state.isPinching && !state.wasPinching) {
                hitObjects.forEach(obj => {
                    if (obj.emit) obj.emit('pointerdown', phaserPointer);
                    if (obj.input && obj.input.draggable) {
                        state.draggedObject = obj;
                        activeScene.input.emit('dragstart', phaserPointer, obj);
                    }
                });
            } 
            
            // 4. Dragging Logic
            if (state.isPinching && state.wasPinching && state.draggedObject) {
                activeScene.input.emit('drag', phaserPointer, state.draggedObject, px, py);
            }

            // 5. Release / Drag End Logic
            if (!state.isPinching && state.wasPinching) {
                hitObjects.forEach(obj => {
                    if (obj.emit) obj.emit('pointerup', phaserPointer);
                });
                
                if (state.draggedObject) {
                    activeScene.input.emit('dragend', phaserPointer, state.draggedObject);
                    state.draggedObject = null;
                }
            }
            
            state.wasPinching = state.isPinching;
        });
    }

    calculateFlexionAngle(landmarks, mcpId, tipId) {
        const wrist = landmarks[0];
        const mcp = landmarks[mcpId];
        const tip = landmarks[tipId];

        // Vector 1 (Palm vector): Wrist -> MCP
        const v1 = {
            x: mcp.x - wrist.x,
            y: mcp.y - wrist.y,
            z: mcp.z - wrist.z
        };

        // Vector 2 (Finger vector): MCP -> Tip
        const v2 = {
            x: tip.x - mcp.x,
            y: tip.y - mcp.y,
            z: tip.z - mcp.z
        };

        // Magnitudes
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

        // Protect against zero division causing NaN
        if (mag1 < 0.0001 || mag2 < 0.0001) return 0;

        // Dot Product
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;

        // Angle in radians
        // Use Math.max and Math.min to prevent floating point inaccuracies sending acos out of domain [-1, 1]
        let cosTheta = dot / (mag1 * mag2);
        cosTheta = Math.max(-1.0, Math.min(1.0, cosTheta));
        const angleRad = Math.acos(cosTheta);

        // Convert to degrees
        let angleDeg = angleRad * (180.0 / Math.PI);
        
        // Since angle measures deviation from straight (0), let's round and clamp it 0-180
        angleDeg = Math.round(angleDeg);
        if (angleDeg < 0) angleDeg = 0;
        if (angleDeg > 180) angleDeg = 180;
        
        return angleDeg;
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
                if (activeScene && activeScene.inputManager && activeScene.scene.key === "EightFingerRushScene") {
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
