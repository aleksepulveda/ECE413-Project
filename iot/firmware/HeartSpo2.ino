#include "Particle.h"
#include <Wire.h>
#include "MAX30105.h"
#include <EEPROM.h>

SYSTEM_THREAD(ENABLED);

// =====================================================
// CONFIGURATION
// =====================================================
// #define DEFAULT_MEASUREMENT_INTERVAL  (30 * 60 * 1000UL)  // 30 minutes
#define DEFAULT_MEASUREMENT_INTERVAL  (0.1 * 60 * 1000UL)  // 30 seconds
#define REQUEST_TIMEOUT              (5 * 60 * 1000UL)   // 5 minutes
#define MAX_RECORDS                  300
#define RECORD_SIZE                  32
#define EEPROM_START                 0
#define EEPROM_COUNT_ADDR            2040

#define FINGER_THRESHOLD             10000

// =====================================================
// GLOBALS
// =====================================================
MAX30105 particleSensor;

enum DeviceState {
    IDLE,
    REQUESTING,
    MEASURING,
    WAITING_CONFIRMATION
};

DeviceState state = IDLE;

unsigned long lastMeasurementTime = 0;
unsigned long requestStartTime = 0;
unsigned long measurementInterval = DEFAULT_MEASUREMENT_INTERVAL;

struct Record {
    uint32_t timestamp;
    char payload[24];
};

int recordCount = 0;

// =====================================================
// FUNCTION DECLARATIONS
// =====================================================
float calculateSpO2(long ir, long red);
bool takeStableMeasurement(float &hr, float &spo2);
void requestMeasurement();
void flashGreen();
void flashYellow();
void storeRecord(const String &payload);
void flushStoredRecords();
void handleWebhook(const char *event, const char *data);

// =====================================================
// WEBHOOK RESPONSE HANDLER
// =====================================================
void handleWebhook(const char *event, const char *data) {
    Serial.println("[SERVER] Measurement recorded");

    flashGreen();
    state = IDLE;
}

// =====================================================
// SETUP
// =====================================================
void setup() {
    Serial.begin(9600);
    Serial.println("Starting up (DEBUG)");
    delay(2000);

    RGB.control(true);
    RGB.color(0, 0, 0);

    EEPROM.get(EEPROM_COUNT_ADDR, recordCount);
    if (recordCount < 0 || recordCount > MAX_RECORDS) {
        recordCount = 0;
    }

    Serial.println("===== DEVICE BOOT =====");
    Serial.printf("Stored records: %d\n", recordCount);

    Particle.subscribe("hook-response/health_data", handleWebhook, MY_DEVICES);

    if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
        Serial.println("MAX30105 not found");
        while (1);
    }

    particleSensor.setup(
        0x1F,   // LED power
        4,      // averaging
        2,      // red + IR
        100,    // sample rate
        411,    // pulse width
        4096    // ADC range
    );
}

// =====================================================
// LOOP
// =====================================================
void loop() {

    // -------------------------------
    // Replay stored data when online
    // -------------------------------
    if (Particle.connected() && recordCount > 0) {
        flushStoredRecords();
    }

    // -------------------------------
    // Schedule new measurement
    // -------------------------------
    if (state == IDLE &&
        millis() - lastMeasurementTime >= measurementInterval) {

        requestMeasurement();
    }

    // -------------------------------
    // Waiting for user
    // -------------------------------
    if (state == REQUESTING) {

        RGB.color(0, 0, 255); // BLUE prompt

        if (millis() - requestStartTime >= REQUEST_TIMEOUT) {
            Serial.println("[REQUEST] Timed out");
            RGB.color(0, 0, 0);
            state = IDLE;
        }

        long ir = particleSensor.getIR();
        long red = particleSensor.getRed();

        if (ir > FINGER_THRESHOLD && red > FINGER_THRESHOLD) {
            state = MEASURING;
        }
    }

    // -------------------------------
    // Measurement
    // -------------------------------
    if (state == MEASURING) {
        RGB.color(0, 0, 0);

        float hr, spo2;
        if (!takeStableMeasurement(hr, spo2)) {
            Serial.println("[MEASURE] Unstable measurement");
            state = IDLE;
            return;
        }

        String payload = String(hr, 1) + "," + String(spo2, 1);
        Serial.print("[MEASURE] ");
        Serial.println(payload);

        lastMeasurementTime = millis();

        if (Particle.connected()) {
            Particle.publish("health_data", payload, PRIVATE);
            state = WAITING_CONFIRMATION;
        } else {
            flashYellow();
            storeRecord(payload);
            state = IDLE;
        }
    }
}

// =====================================================
// MEASUREMENT LOGIC (STABILIZED)
// =====================================================
bool takeStableMeasurement(float &hr, float &spo2) {

    const unsigned long SAMPLE_TIME = 15000;
    const unsigned long DISCARD_TIME = 5000;

    unsigned long start = millis();
    int count = 0;
    float hrSum = 0;
    float spo2Sum = 0;

    while (millis() - start < SAMPLE_TIME) {

        long ir = particleSensor.getIR();
        long red = particleSensor.getRed();

        if (ir < FINGER_THRESHOLD || red < FINGER_THRESHOLD) {
            return false;
        }

        if (millis() - start > DISCARD_TIME) {
            hrSum += ir * 0.0006862121;
            spo2Sum += calculateSpO2(ir, red);
            count++;
        }

        delay(200);
    }

    if (count < 10) return false;

    hr = hrSum / count;
    spo2 = spo2Sum / count;
    return true;
}

// =====================================================
// EEPROM STORAGE
// =====================================================
void storeRecord(const String &payload) {

    if (recordCount >= MAX_RECORDS) {
        Serial.println("[EEPROM] Buffer full");
        return;
    }

    Record r;
    r.timestamp = Time.now();
    payload.toCharArray(r.payload, sizeof(r.payload));

    EEPROM.put(EEPROM_START + recordCount * RECORD_SIZE, r);
    recordCount++;

    EEPROM.put(EEPROM_COUNT_ADDR, recordCount);

    Serial.printf("[EEPROM] Stored #%d\n", recordCount);
}

void flushStoredRecords() {

    Serial.println("[EEPROM] Replaying stored data");

    for (int i = 0; i < recordCount; i++) {
        Record r;
        EEPROM.get(EEPROM_START + i * RECORD_SIZE, r);

        if (Time.now() - r.timestamp <= 86400) {
            Serial.print("[REPLAY] ");
            Serial.println(r.payload);

            Particle.publish("health_data", r.payload, PRIVATE);
            delay(1100);
        } else {
            Serial.println("[REPLAY] Expired record dropped");
        }
    }

    recordCount = 0;
    EEPROM.put(EEPROM_COUNT_ADDR, recordCount);

    Serial.println("[EEPROM] Replay complete");
}

// =====================================================
// LED HELPERS
// =====================================================
void requestMeasurement() {
    Serial.println("[REQUEST] Please take measurement");
    requestStartTime = millis();
    state = REQUESTING;
}

void flashGreen() {
    RGB.color(0, 255, 0);
    delay(300);
    RGB.color(0, 0, 0);
}

void flashYellow() {
    RGB.color(255, 255, 0);
    delay(300);
    RGB.color(0, 0, 0);
}

// =====================================================
// SpO2 CALCULATION
// =====================================================
float calculateSpO2(long ir, long red) {
    if (ir == 0) return 0.0;

    float R = (float)red / (float)ir;
    float spo2 = 110.0 - (25.0 * R);

    if (spo2 > 100.0) spo2 = 100.0;
    if (spo2 < 70.0) spo2 = 70.0;

    return spo2;
}
