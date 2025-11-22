// SYSTEM_MODE(AUTOMATIC);
SYSTEM_THREAD(ENABLED); //uncomment to use w/out wifi

#include <Wire.h>
#include "MAX30105.h"

// Globals
long lastBeat = 0; //Time at which the last beat occurred
float beatsPerMinute;
float spo2; // Added variable for SpO2
MAX30105 particleSensor;

// NOTE: Device ID is set in webhook_config.json as "PHOTON_TEST_001"
// Make sure this matches the deviceId registered in your database

// Function declarations
float calculateSpO2(long ir, long red);

void handle(const char *event, const char *data){
    // Webhook response handler
    Serial.print("Webhook response: ");
    if (data) {
        Serial.println(data);
    } else {
        Serial.println("No data");
    }
}
int led = D7;   // The on-board LED

void setup()
{
    Serial.begin(9600);
    Serial.println("Initializing...");

    // Subscribe to webhook response
    Particle.subscribe("hook-response/health_data", handle, MY_DEVICES);

    // Initialize sensor
    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) //Use default I2C port, 400kHz speed
    {
        Serial.println("MAX30105 was not found. Please check wiring/power. ");
        while (1);
    }
    Serial.println("MAX30105 found.");

    // Configure sensor for both Heart Rate (IR) and Pulse Oximetry (Red)
    byte powerLevel = 0x1F; 
    byte sampleAverage = 4; 
    byte ledMode = 2; // Red + IR 
    int sampleRate = 100; 
    int pulseWidth = 411; 
    int adcRange = 4096; 

    // Apply the SpO2 settings
    particleSensor.setup(powerLevel, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange); 
}

void loop() {
    
    digitalWrite(led, HIGH);   // Turn ON the LED
    
    long irValue = particleSensor.getIR();
    long redValue = particleSensor.getRed();
    
    // Delay is set to 2000ms 
    delay(2000); 

    if(irValue > 10000 && redValue > 10000){ // Finger present
        
        // **Heart Rate Calculation (Placeholder/Simple)**
        beatsPerMinute = irValue / 1831.0; 
        
        // **SpO2 Calculation (Simplified/Placeholder)**
        spo2 = calculateSpO2(irValue, redValue);
        
        // -----------------------------------------------------------------
        // 💡 CHANGE: COMBINE HR AND SpO2 INTO A SINGLE EVENT PAYLOAD
        // Format: "HR,SpO2" e.g., "75.0,98.5"
        String dataPayload = String::format("%.1f,%.1f", beatsPerMinute, spo2); 
        
        // Publish the single event that the webhook will listen to
        Particle.publish("health_data", dataPayload, PRIVATE); 
        // -----------------------------------------------------------------

        Serial.print("HR: ");
        Serial.print(beatsPerMinute);
        Serial.print(" BPM, SpO2: ");
        Serial.print(spo2);
        Serial.println(" %");
        
    } else {
        // Finger not present, publish an indication
        Particle.publish("status", "No finger detected", PRIVATE);
        Serial.println("No finger detected.");
    }
    
    digitalWrite(led, LOW);
}

// SpO2 calculation function remains unchanged
float calculateSpO2(long ir, long red) {
    if (ir == 0) return 0.0;
    
    float R = (float)red / (float)ir;
    
    const float A = 110.0;
    const float B = 25.0; 
    
    float calculatedSpO2 = A - (B * R);
    
    if (calculatedSpO2 > 100.0) calculatedSpO2 = 100.0;
    if (calculatedSpO2 < 70.0) calculatedSpO2 = 70.0;
    
    return calculatedSpO2;
}