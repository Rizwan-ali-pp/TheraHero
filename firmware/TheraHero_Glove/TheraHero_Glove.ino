#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

Adafruit_MPU6050 mpu;

// NOTE: We are using ADC1 pins here instead of the ADC2 pins in your schematic.
// This ensures that if you decide to activate Bluetooth or Wi-Fi later,
// the analog pins will not stop working.
// Please rewire your 5 flex sensors to these pins:
const int flexPins[5] = {32, 33, 34, 35, 36}; 

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10); // Wait for Serial monitor to open

  Serial.println("Initializing TheraHero Smart Glove...");

  // Initialize I2C (SDA=21, SCL=22 is default on ESP32)
  Wire.begin();

  // Initialize MPU6050
  if (!mpu.begin()) {
    Serial.println("Failed to find MPU6050 chip. Check I2C wiring (SDA=21, SCL=22)!");
    while (1) delay(10); // Halt if not found
  }
  Serial.println("MPU6050 Found!");

  // Configure MPU6050 settings for smooth hand tracking
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // Setup Flex Sensor Pins
  for (int i = 0; i < 5; i++) {
    pinMode(flexPins[i], INPUT);
  }
  
  Serial.println("Initialization complete. Streaming data...");
}

void loop() {
  // 1. Get new sensor events from MPU6050
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);

  // 2. Read Flex Sensors (Values usually between 0 - 4095 on ESP32)
  int f1 = analogRead(flexPins[0]);
  int f2 = analogRead(flexPins[1]);
  int f3 = analogRead(flexPins[2]);
  int f4 = analogRead(flexPins[3]);
  int f5 = analogRead(flexPins[4]);

  // 3. Construct and print a JSON String containing all data
  // Using JSON makes it incredibly easy for the Web Browser (JavaScript) to parse!
  Serial.print("{");
  Serial.print("\"f1\":"); Serial.print(f1); Serial.print(",");
  Serial.print("\"f2\":"); Serial.print(f2); Serial.print(",");
  Serial.print("\"f3\":"); Serial.print(f3); Serial.print(",");
  Serial.print("\"f4\":"); Serial.print(f4); Serial.print(",");
  Serial.print("\"f5\":"); Serial.print(f5); Serial.print(",");
  
  // Acceleration (G-force in X, Y, Z)
  Serial.print("\"ax\":"); Serial.print(a.acceleration.x); Serial.print(",");
  Serial.print("\"ay\":"); Serial.print(a.acceleration.y); Serial.print(",");
  Serial.print("\"az\":"); Serial.print(a.acceleration.z); Serial.print(",");
  
  // Gyroscope (Rotation speed in X, Y, Z radians/sec)
  Serial.print("\"gx\":"); Serial.print(g.gyro.x); Serial.print(",");
  Serial.print("\"gy\":"); Serial.print(g.gyro.y); Serial.print(",");
  Serial.print("\"gz\":"); Serial.print(g.gyro.z);
  Serial.println("}");

  // Emit data every 50ms (20 frames per second). 
  // You can lower this to 16ms for 60fps, but 50ms is very stable for serial.
  delay(50); 
}
