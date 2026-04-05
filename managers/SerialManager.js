class SerialManager {
    constructor() {
        this.port = null;
        this.writer = null;
        this.isConnected = false;
        
        // Throttling to prevent buffer overflow on ESP32
        // Update at ~6Hz (150ms gap) to allow slow I2C OLED rendering to finish
        this.lastSendTime = 0;
        this.throttleMs = 150; 
        this.isWriting = false; // Drop-frame lock
    }

    async connect() {
        // Checking for browser compatibility
        if (!("serial" in navigator)) {
            alert("Hardware Connection Failed: The Web Serial API is not supported in this browser. Please use Google Chrome or Microsoft Edge.");
            return false;
        }

        try {
            // Request selection menu
            this.port = await navigator.serial.requestPort();
            await this.port.open({ baudRate: 115200 });
            
            const textEncoder = new TextEncoderStream();
            const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
            this.writer = textEncoder.writable.getWriter();
            
            this.isConnected = true;
            this.isWriting = false;
            console.log("Hardware connected via Web Serial!");
            return true;
            
        } catch (error) {
            console.error("Serial connection error:", error);
            await this.disconnect();
            return false;
        }
    }

    async disconnect() {
        try {
            if (this.writer) {
                // Send a clear signal to instruct the ESP32 to show the T-hero splash screen
                await this.writer.write(JSON.stringify({ DISCONNECT: true }) + "\n").catch(() => {});
                
                // Give OS time to physically send the buffer out of the USB port
                await new Promise(resolve => setTimeout(resolve, 100));

                // Must release lock violently to prevent blocking
                await this.writer.abort().catch(() => {});
                this.writer.releaseLock();
            }
        } catch(e) {} finally {
            this.writer = null;
        }

        try {
            if (this.port) {
                await this.port.close().catch(() => {});
            }
        } catch(e) {} finally {
            this.port = null;
        }

        this.isConnected = false;
        this.isWriting = false;
        console.log("Hardware disconnected.");
    }

    async sendPayload(jsonString) {
        if (!this.isConnected || !this.writer) return;

        // If the ESP32 is lagging behind reading the serial buffer, DROP THE FRAME!
        // DO NOT queue await writes, as they will permanent-freeze the CameraManager loop
        if (this.isWriting) return;

        // Throttle updates
        const now = Date.now();
        if (now - this.lastSendTime < this.throttleMs) return;
        this.lastSendTime = now;

        this.isWriting = true;
        try {
            // The ESP32 is looking for a newline character \n to parse
            await this.writer.write(jsonString + "\n");
        } catch (error) {
            console.error("Error writing to hardware port:", error);
            // If the write fails (e.g., physically unplugged), violently crash the disconnect
            this.disconnect();
        } finally {
            this.isWriting = false;
        }
    }
}

// Global instance
const serialManager = new SerialManager();
