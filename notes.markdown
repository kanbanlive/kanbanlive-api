# Kanban Live

## Wireless Node

TI CC1110
Has no hardware I2C, so may need to use SPI

Will require 4 off MCP23017 / MCP23S017 to give a total of 64 inputs
MCP23017 - I2C
MCP223S017 - SPI

Real time clock

## Message format
`<message start><message type><message data><message end>`

message start - 0xAA
message end - `'--'`

message type - single nibble / byte to identify the type of the message
message data - the data for the message, depends on message type

wireless node id - 2 bytes, 0x0000 - 0xFFFF
input id - 1 byte, 0x00 - 0xFF
timestamp - 8 bytes, UNIX EPOCH format, e.g. 0x557805BC http://www.epochconverter.com/epoch/unix-hex-timestamp.php

### Message types

#### startup

Field | Value | Length
--- | --- | ---
message type | 0x01 | 1
wireless node id | fixed | 4
timestamp | generated | 8
battery status | generated | 1
rssi | generated | 1
input status | generated | 1

#### startup ack

Field | Value | Length
--- | --- | ---
message type | 0xA1 | 1
wireless node id | fixed | 4
timestamp | generated | 8
time to sleep (s) | generated | 4

#### shutdown

Field | Value | Length
--- | --- | ---
message type | 0x02 | 1
wireless node id | 0x0000 | 4
timestamp | generated | 8
battery status | generated | 1
rssi | generated | 1
input status | generated | 1

#### shutdown ack

Field | Value | Length
--- | --- | ---
message type | 0xA3 | 1
wireless node id | 0x0000 | 4
timestamp | generated | 8
time to sleep (s) | 0x0000 | 4

#### status

Field | Value | Length
--- | --- | ---
message type | 0x03 | 1
wireless node id | 0x0000 | 4
timestamp | generated | 8
battery status | generated | 1
rssi | generated | 1
input status | generated | 1

#### status ack

Field | Value | Length
--- | --- | ---
message type | 0xA3 | 1
wireless node id | 0x0000 | 4
timestamp | generated | 8
time to sleep (s) | generated | 4

