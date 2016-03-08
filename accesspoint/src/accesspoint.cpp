#include <stdio.h>
#include <Arduino.h>
#include <avr/sleep.h>
#include <avr/power.h>

#include "LLAPSerial.h"
#include <Wire.h>

// MCP23017 registers (everything except direction defaults to 0)

#define IODIRA   0x00   // IO direction  (0 = output, 1 = input (Default))
#define IODIRB   0x01
#define IOPOLA   0x02   // IO polarity   (0 = normal, 1 = inverse)
#define IOPOLB   0x03
#define GPINTENA 0x04   // Interrupt on change (0 = disable, 1 = enable)
#define GPINTENB 0x05
#define DEFVALA  0x06   // Default comparison for interrupt on change (interrupts on opposite)
#define DEFVALB  0x07
#define INTCONA  0x08   // Interrupt control (0 = interrupt on change from previous, 1 = interrupt on change from DEFVAL)
#define INTCONB  0x09
#define IOCON    0x0A   // IO Configuration: bank/mirror/seqop/disslw/haen/odr/intpol/notimp
//#define IOCON 0x0B  // same as 0x0A
#define GPPUA    0x0C   // Pull-up resistor (0 = disabled, 1 = enabled)
#define GPPUB    0x0D
#define INFTFA   0x0E   // Interrupt flag (read only) : (0 = no interrupt, 1 = pin caused interrupt)
#define INFTFB   0x0F
#define INTCAPA  0x10   // Interrupt capture (read only) : value of GPIO at time of last interrupt
#define INTCAPB  0x11
#define GPIOA    0x12   // Port value. Write to change, read to obtain value
#define GPIOB    0x13
#define OLLATA   0x14   // Output latch. Write to latch output.
#define OLLATB   0x15


#define port 0x20  // MCP23017 is on I2C port 0x20


const int SRF_RADIO_ENABLE = 8;
const int SRF_SLEEP = 4;
const int WAKE_INTERRUPT_PIN = 3;

const int EXPANDER_INTERRUPT_PIN = 2;
const int TEST_MODE_PIN = 5;



static uint8_t testMode = 0;
volatile boolean awakenByInterrupt = false;

/////////////////////////////////////////////////////////
// Battery monitoring
/////////////////////////////////////////////////////////

/** readVcc - Read the current battery voltage
 * @return Vcc in millivolts
 */
int readVcc() {
  // Read 1.1V reference against AVcc
  // set the reference to Vcc and the measurement to the internal 1.1V reference
  ADMUX = _BV(REFS0) | _BV(MUX3) | _BV(MUX2) | _BV(MUX1);

  delay(2); // Wait for Vref to settle
  ADCSRA |= _BV(ADSC); // Start conversion
  while (bit_is_set(ADCSRA,ADSC)); // measuring

  uint8_t low  = ADCL; // must read ADCL first - it then locks ADCH
  uint8_t high = ADCH; // unlocks both

  long result = (high<<8) | low;

  result = 1125300L / result; // Calculate Vcc (in mV); 1125300 = 1.1*1023*1000
  return (int)result; // Vcc in millivolts
}
// end of battery monitoring code


// MCP23017 expander code

// set register "reg" on expander to "data"
// for example, IO direction
void expanderWriteBoth (const byte reg, const byte data )
{
  Wire.beginTransmission (port);
  Wire.write (reg);
  Wire.write (data);  // port A
  Wire.write (data);  // port B
  Wire.endTransmission ();
}

// read a byte from the expander
uint8_t expanderRead (const byte reg)
{
  Wire.beginTransmission (port);
  Wire.write (reg);
  Wire.endTransmission ();
  Wire.requestFrom (port, 1);
  return Wire.read();
}

uint16_t readExpanderLastIntValue() {
  uint16_t value = 0;

  // Read port values, as required. Note that this re-arms the interrupts.
  if (expanderRead (INFTFA)) {
    value  &= 0x00FF;
    value  |= expanderRead (INTCAPA) << 8;    // read value at time of interrupt
  }

  if (expanderRead (INFTFB)) {
    value  &= 0xFF00;
    value  |= expanderRead (INTCAPB);        // port B is in low-order byte
  }

  return value;
}

uint16_t readExpanderValue()
{
  uint16_t value = expanderRead(GPIOA) << 8;
  value |= expanderRead(GPIOB);

  return value;
}

void clearExpanderInterrupts()
{
  readExpanderValue();
  expanderRead (INTCAPA);
  expanderRead (INTCAPB);
  EIFR=0x01;
  awakenByInterrupt = false;
}


// interrupt service routine, called when pin D2 goes from 1 to 0
void button_isr()
{
  Serial.println("button_isr");

  sleep_disable();
  detachInterrupt(0);
  awakenByInterrupt = true;
}

void sendMessage()
{
  uint16_t batteryLevel = readVcc();
  uint16_t value = readExpanderValue();

  char temp[9];
  sprintf(temp, "%04x%04x", batteryLevel, value);
  LLAP.sendMessage(temp);

  delay(50);
}

/////////////////////////////////////////////////////////
// SRF AT command handling
/////////////////////////////////////////////////////////

uint8_t checkOK(int timeout)
{
  static uint32_t time = millis();
  while (millis() - time < timeout)
  {
    if (Serial.available() >= 3)
    {
      if (Serial.read() != 'O') continue;
      if (Serial.read() != 'K') continue;
      if (Serial.read() != '\r') continue;
      return 1;
    }
  }
  return 0;
}

uint8_t enterCommandMode()
{
  delay(1200);
  Serial.print("+++");
  delay(500);
  while (Serial.available()) Serial.read();  // flush serial in
  delay(500);
  return checkOK(500);
}

uint8_t sendCommand(char* lpszCommand)
{
  Serial.print(lpszCommand);
  Serial.write('\r');
  return checkOK(100);
}

uint8_t setupSRF()  // set Sleep mode 2
{
  if (!enterCommandMode())  // if failed once then try again
  {
    if (!enterCommandMode()) return 1;
  }

  //if (!sendCommand("ATSD36EE80")) return 2; // 1 hour
  //if (!sendCommand("ATSD49E30")) return 2;  // 5 minutes
  if (!sendCommand("ATSDEA60")) return 2; // 1 minute
  //if (!sendCommand("ATSD4E20")) return 2; // 20 seconds
//  if (!sendCommand("ATSD2710")) return 2; // 10 seconds
//  if (!sendCommand("ATSD1388")) return 2; // 5 seconds
  if (!sendCommand("ATSM3")) return 3;
  if (!sendCommand("ATDN")) return 4;
  return 5;
}

// end of SRF sleep code

void setup ()
{
  Serial.begin(115200);     // start the serial port at 115200 baud (correct for XinoRF and RFu, if using XRF + Arduino you might need 9600)
  Wire.begin ();

  // initialise the radio
  pinMode(SRF_RADIO_ENABLE, OUTPUT);     // initialize pin 8 to control the radio
  digitalWrite(SRF_RADIO_ENABLE, HIGH);  // select the radio

  pinMode(SRF_SLEEP, OUTPUT);
  digitalWrite( SRF_SLEEP, LOW );

  pinMode(WAKE_INTERRUPT_PIN, INPUT);
  pinMode(EXPANDER_INTERRUPT_PIN, INPUT);
  pinMode(TEST_MODE_PIN, INPUT_PULLUP);

  // Initialise the LLAPSerial library
  LLAP.init( "01" );
  delay(400); // let everything start up

  // set up sleep mode 3 (low = awake)
  uint8_t val;
  while ((val = setupSRF()) != 5) {
    LLAP.sendInt("ERR",val); // Diagnostic
    delay(5000);  // try again in 5 seconds
  }

  LLAP.sendInt("START", 001);
  LLAP.sleepForaWhile(50);

 // expander configuration register
  expanderWriteBoth (IOCON, 0b01100000); // mirror interrupts, disable sequential mode

  // enable pull-up on switches
  expanderWriteBoth (GPPUA, 0xFF);   // pull-up resistor for switch - both ports

  // invert polarity
  expanderWriteBoth (IOPOLA, 0xFF);  // invert polarity of signal - both ports

  // read and send current state
  sendMessage();

  // enable all interrupts
  expanderWriteBoth (GPINTENA, 0xFF); // enable interrupts - both ports

  // read from interrupt capture ports to clear them
  clearExpanderInterrupts();
}


void loop ()
{
  // pin 19 of MCP23017 is plugged into D2 of the Arduino which is interrupt 0
  attachInterrupt(0, button_isr, FALLING);

  testMode = !digitalRead(TEST_MODE_PIN);

  // goto sleep
  if (testMode) {
    Serial.println("testMode");
    LLAP.sendMessage(F("TEST"));
    LLAP.sleepForaWhile(5000);
  }
  else {
    pinMode(SRF_SLEEP, INPUT); // sleep the radio
    LLAP.sleep(WAKE_INTERRUPT_PIN, RISING, false); // sleep until woken, no pullup (low power)
    pinMode(SRF_SLEEP, OUTPUT); // wake the radio
    delay(10);
  }

  sendMessage();
  clearExpanderInterrupts();
}
