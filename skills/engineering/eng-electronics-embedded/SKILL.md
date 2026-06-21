---
name: eng-electronics-embedded
provider: ORIRO.ai
copyright: Copyright (c) 2026 ORIRO.ai
description: >
  Electronics and embedded systems — microcontrollers, Arduino, Raspberry Pi,
  GPIO, ADC, serial protocols (UART, I2C, SPI), sensors, motor control, and
  3D printer firmware. Sources: Arduino docs (CC-BY-SA), Raspberry Pi Foundation (CC-BY).
---

# Electronics and Embedded Systems

## Microcontrollers

**Arduino (AVR/ARM):** Most beginner-friendly. C/C++ with abstracted hardware.
**STM32 (ARM Cortex-M):** Industrial-grade. More peripherals.
**ESP32:** WiFi + Bluetooth + dual-core ARM. For IoT.
**Raspberry Pi Pico:** RP2040 chip. MicroPython supported.

## GPIO (General Purpose Input/Output)

Digital I/O: Logic HIGH (3.3V or 5V) or LOW (0V).
Current limits: Arduino: 40mA per pin max. Don't drive motors directly.

```cpp
void setup() {
    pinMode(LED_BUILTIN, OUTPUT);
    pinMode(2, INPUT_PULLUP);
}
void loop() {
    if (digitalRead(2) == LOW) {
        digitalWrite(LED_BUILTIN, HIGH);
    } else {
        digitalWrite(LED_BUILTIN, LOW);
    }
}
```

## ADC (Analog to Digital Converter)

Arduino Uno: 10-bit ADC → 0-1023 for 0-5V. Resolution = 4.88mV/step.

```cpp
int sensorValue = analogRead(A0);
float voltage = sensorValue * (5.0/1023.0);
```

## Serial protocols

### UART

Two wires: TX and RX. Cross-connect.

```cpp
Serial.begin(115200);
Serial.println("Hello ORIRO");
```

### I2C

Two wires: SDA, SCL. Pull-up resistors (4.7kΩ). Up to 127 devices.

### SPI

Four wires: MOSI, MISO, SCLK, CS. Faster than I2C. Full duplex.

## Sensors

**Temperature:** DS18B20 (1-Wire, ±0.5°C), BME280 (I2C).
**IMU:** MPU-6050 (accel+gyro), BNO055 (absolute orientation).
**Distance:** HC-SR04 (ultrasonic, 2-400cm), VL53L0X (laser ToF).

## Motor control

**DC motors:** L298N or DRV8833 driver. PWM to control speed.
**Stepper motors:** A4988 driver. NEMA 17 for 3D printers.
**Servo motors:** PWM 50Hz, 1ms-2ms pulse = 0°-180°.

```cpp
#include <Servo.h>
Servo myservo;
myservo.attach(9);
myservo.write(90);
```

Sources: Arduino documentation (CC-BY-SA), Raspberry Pi Foundation (CC-BY),
Adafruit tutorials (CC-BY-SA)
