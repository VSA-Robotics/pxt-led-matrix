//% color="#AA278D" weight=100
namespace LedMatrix {
    // Global variables for pins and buffer
    let sckPin: DigitalPin;
    let dinPin: DigitalPin;
    let matrixBuffer: number[] = [];
    for (let i = 0; i < 16; i++) {
        matrixBuffer.push(0);
    }

    // Expanded font definition for scrolling text (5 columns per character)
    const font: { [key: string]: number[] } = {
        'A': [0x1C, 0x22, 0x22, 0x3E, 0x22],
        'B': [0x3C, 0x22, 0x3C, 0x22, 0x3C],
        'C': [0x1C, 0x22, 0x20, 0x22, 0x1C],
        'D': [0x3C, 0x22, 0x22, 0x22, 0x3C],
        'E': [0x3E, 0x20, 0x3C, 0x20, 0x3E],
        'H': [0x22, 0x22, 0x3E, 0x22, 0x22],
        'L': [0x20, 0x20, 0x20, 0x20, 0x3E],
        'O': [0x1C, 0x22, 0x22, 0x22, 0x1C],
        'W': [0x22, 0x22, 0x2A, 0x36, 0x22],
        'R': [0x3C, 0x22, 0x3C, 0x28, 0x24],
        ' ': [0x00, 0x00, 0x00, 0x00, 0x00]
    };

    // Low-level communication functions
    function sendBit(bit: number) {
        pins.digitalWritePin(sckPin, 0);
        pins.digitalWritePin(dinPin, bit);
        control.waitMicros(2);
        pins.digitalWritePin(sckPin, 1);
        control.waitMicros(2);
    }

    function sendByte(byte: number) {
        for (let i = 7; i >= 0; i--) {
            sendBit((byte >> i) & 1);
        }
    }

    function startSignal() {
        pins.digitalWritePin(sckPin, 0);
        control.waitMicros(1);
        pins.digitalWritePin(sckPin, 1);
        pins.digitalWritePin(dinPin, 1);
        pins.digitalWritePin(dinPin, 0);
    }

    function endSignal() {
        pins.digitalWritePin(sckPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(dinPin, 0);
        pins.digitalWritePin(sckPin, 1);
        control.waitMicros(1);
        pins.digitalWritePin(dinPin, 1);
    }

    function writeBytesToAddress(address: number, data: number[]) {
        if (address > 15 || data.length === 0) return;
        startSignal();
        sendByte(0b01000000); // Auto-increment mode
        endSignal();
        startSignal();
        sendByte(0b11000000); // Starting at address 0
        for (let k = 0; k < data.length; k++) {
            sendByte(data[k]);
        }
        endSignal();
        startSignal();
        sendByte(0b10001000); // Display on, default brightness
        endSignal();
    }

    function showRows(data: number[]) {
        writeBytesToAddress(0, data);
    }

    function clearScreen() {
        let data: number[] = [];
        for (let i = 0; i < 16; i++) {
            data.push(0);
        }
        writeBytesToAddress(0, data);
    }

    function turnOnScreen() {
        startSignal();
        sendByte(0b10001000); // Display on, default brightness
        endSignal();
        clearScreen();
    }

    // Private function to update the display
    function updateDisplay() {
        showRows(matrixBuffer);
    }

    // Exported block functions

    /**
     * Initialize the LED matrix with specified SCK and DIN pins
     * @param sck The clock pin (SCK)
     * @param din The data pin (DIN)
     */
    export function initialize(sck: DigitalPin, din: DigitalPin) {
        sckPin = sck;
        dinPin = din;
        pins.digitalWritePin(dinPin, 1);
        pins.digitalWritePin(sckPin, 1);
        turnOnScreen();
    }

    /**
     * Set the state of an LED at a specific row and column
     * @param row The row (0-7)
     * @param col The column (0-15)
     * @param state The state (0 = off, 1 = on)
     */
    export function setLed(row: number, col: number, state: number) {
        if (row < 0 || row >= 8 || col < 0 || col >= 16) return;
        const hardwareRow = col;
        const hardwareCol = row;
        if (state) {
            matrixBuffer[hardwareRow] |= (1 << hardwareCol);
        } else {
            matrixBuffer[hardwareRow] &= ~(1 << hardwareCol);
        }
        updateDisplay();
    }

    /**
     * Clear the entire LED matrix
     */
    export function clear() {
        matrixBuffer = [];
        for (let i = 0; i < 16; i++) {
            matrixBuffer.push(0);
        }
        updateDisplay();
    }

    /**
     * Scroll text across the LED matrix
     * @param text The text to scroll
     * @param speed The delay between frames in milliseconds
     * @param direction The direction (0 = left to right, 1 = right to left)
     */
    export function scrollText(text: string, speed: number, direction: number) {
        let textBuffer: number[] = [];
        for (let i = 0; i < text.length; i++) {
            let char = text.charAt(i).toUpperCase();
            let charData = font[char] || font[' '];
            textBuffer = textBuffer.concat(charData);
            textBuffer.push(0); // Space between characters
        }

        if (direction === 0) {
            // Left to right
            for (let offset = -16; offset < textBuffer.length; offset++) {
                clear();
                for (let col = 0; col < 16; col++) {
                    let textIndex = offset + col;
                    if (textIndex >= 0 && textIndex < textBuffer.length) {
                        let columnData = textBuffer[textIndex];
                        for (let row = 0; row < 8; row++) {
                            if (columnData & (1 << row)) {
                                setLed(row, col, 1);
                            }
                        }
                    }
                }
                updateDisplay();
                basic.pause(speed);
            }
        } else {
            // Right to left
            for (let offset = textBuffer.length; offset >= -16; offset--) {
                clear();
                for (let col = 0; col < 16; col++) {
                    let textIndex = offset + col;
                    if (textIndex >= 0 && textIndex < textBuffer.length) {
                        let columnData = textBuffer[textIndex];
                        for (let row = 0; row < 8; row++) {
                            if (columnData & (1 << row)) {
                                setLed(row, col, 1);
                            }
                        }
                    }
                }
                updateDisplay();
                basic.pause(speed);
            }
        }
    }

    /**
     * Draw a rectangle on the LED matrix
     * @param x The starting column (0-15)
     * @param y The starting row (0-7)
     * @param width The width of the rectangle
     * @param height The height of the rectangle
     * @param state The state (0 = off, 1 = on)
     */
    export function drawRectangle(x: number, y: number, width: number, height: number, state: number) {
        for (let c = x; c < x + width && c < 16; c++) {
            for (let r = y; r < y + height && r < 8; r++) {
                setLed(r, c, state);
            }
        }
        updateDisplay();
    }

    /**
     * Draw a line on the LED matrix
     * @param startRow The starting row (0-7)
     * @param startCol The starting column (0-15)
     * @param endRow The ending row (0-7)
     * @param endCol The ending column (0-15)
     */
    export function drawLine(startRow: number, startCol: number, endRow: number, endCol: number) {
        if (startRow === endRow) {
            // Horizontal line
            let minCol = Math.min(startCol, endCol);
            let maxCol = Math.max(startCol, endCol);
            for (let col = minCol; col <= maxCol; col++) {
                setLed(startRow, col, 1);
            }
        } else if (startCol === endCol) {
            // Vertical line
            let minRow = Math.min(startRow, endRow);
            let maxRow = Math.max(startRow, endRow);
            for (let row = minRow; row <= maxRow; row++) {
                setLed(row, startCol, 1);
            }
        }
        updateDisplay();
    }
}

// Test code
LedMatrix.initialize(DigitalPin.P15, DigitalPin.P16);

// Test 1: Scroll "HELLO WORLD"
LedMatrix.clear();
LedMatrix.scrollText("HELLO WORLD", 150, 0);
basic.pause(2000);

// Test 2: Draw a cross pattern
LedMatrix.clear();
LedMatrix.setLed(3, 7, 1); // Center
LedMatrix.setLed(0, 7, 1); // Top
LedMatrix.setLed(7, 7, 1); // Bottom
LedMatrix.setLed(3, 0, 1); // Left
LedMatrix.setLed(3, 15, 1); // Right
basic.pause(2000);

// Test 3: Draw a horizontal line
LedMatrix.clear();
LedMatrix.drawLine(0, 0, 0, 15);
basic.pause(1000);

// Test 4: Draw a vertical line
LedMatrix.clear();
LedMatrix.drawLine(0, 7, 7, 7);
basic.pause(1000);

// Test 5: Draw a rectangle
LedMatrix.clear();
LedMatrix.drawRectangle(2, 2, 4, 3, 1);
basic.pause(2000);

LedMatrix.clear();
