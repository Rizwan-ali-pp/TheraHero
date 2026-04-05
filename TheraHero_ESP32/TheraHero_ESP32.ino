#include <Arduino.h>
#include <Wire.h>
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

/* --- DISPLAYS ------------ */
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

// I2C Display (RIGHT HAND)
#define I2C_ADDRESS 0x3C
Adafruit_SSD1306 display_i2c(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

// SPI Display (LEFT HAND)
#define SPI_DC    2
#define SPI_RST   4
#define SPI_CS    5   // Custom CS
Adafruit_SSD1306 display_spi(SCREEN_WIDTH, SCREEN_HEIGHT, &SPI, SPI_DC, SPI_RST, SPI_CS);

// Global State
int leftAngles[4] = {0, 0, 0, 0};
int rightAngles[4] = {0, 0, 0, 0};
bool newData = false;
String inputString = "";

// Displays the "Disconnected" splash screen text
void renderSplash(Adafruit_SSD1306 &display, String title) {
    display.clearDisplay();
    display.setTextSize(2);
    display.setTextColor(SSD1306_WHITE);
    
    // Centered Title
    int16_t x1, y1;
    uint16_t w, h;
    display.getTextBounds(title, 0, 0, &x1, &y1, &w, &h);
    display.setCursor((SCREEN_WIDTH - w) / 2, (SCREEN_HEIGHT - h) / 2);
    display.print(title);
    
    display.display();
}

// Renders both the graphical bars AND the raw numerical angle values
void renderHandDisplay(Adafruit_SSD1306 &display, String title, int angles[4]) {
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.print(title);

    // Draw bars for 4 fingers (0 to 180 degrees)
    for (int i = 0; i < 4; i++) {
        int val = angles[i];
        if (val < 0) val = 0;
        if (val > 180) val = 180;
        
        // Map degrees to pixel width (0 to 100 pixels, leaving 28 pixels on the right for text)
        int barWidth = map(val, 0, 180, 0, 100);
        int yPos = 16 + (i * 12);
        
        display.fillRect(0, yPos, barWidth, 10, SSD1306_WHITE);
        
        // Print the actual numerical angle next to the bar
        display.setCursor(105, yPos + 1); 
        display.print(val);
    }
    
    display.display();
}

void setup() {
    Serial.begin(115200);
    inputString.reserve(512);

    // Init I2C
    display_i2c.begin(SSD1306_SWITCHCAPVCC, I2C_ADDRESS);
    
    // Init SPI
    display_spi.begin(SSD1306_SWITCHCAPVCC);

    // Automatically draw the T-hero splash screens immediately when powered on
    renderSplash(display_i2c, "T-Hero:R");
    renderSplash(display_spi, "T-Hero:L");
}

void loop() {
    // Read USB buffer
    while (Serial.available()) {
        char inChar = (char)Serial.read();
        if (inChar == '\n') {
            newData = true;
            break; // CRITICAL FIX: Stop reading and instantly process the clean JSON string!
        } else {
            inputString += inChar;
        }
    }

    if (newData) {
        JsonDocument doc;
        DeserializationError error = deserializeJson(doc, inputString);
        
        if (!error) {
            // CHECK FOR DISCONNECT SIGNAL FROM BROWSER
            if (doc.containsKey("DISCONNECT")) {
                // Instantly swap back to the splash screens!
                renderSplash(display_i2c, "T-Hero:R");
                renderSplash(display_spi, "T-Hero:L");
            } 
            else {
                // Normal Angle Parsing
                if (doc.containsKey("L")) {
                    for (int i=0; i<4; i++) leftAngles[i] = doc["L"][i];
                }
                if (doc.containsKey("R")) {
                    for (int i=0; i<4; i++) rightAngles[i] = doc["R"][i];
                }
                
                // Real-time render frames
                renderHandDisplay(display_i2c, "RIGHT HAND", rightAngles);
                renderHandDisplay(display_spi, "LEFT HAND", leftAngles);
            }
        }
        
        // Reset buffer
        inputString = "";
        newData = false;
    }
}
