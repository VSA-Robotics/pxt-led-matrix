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
        'M': [0x22, 0x36, 0x2A, 0x22, 0x22],
        'T': [0x3E, 0x08, 0x08, 0x08, 0x08],
        'R': [0x3C, 0x22, 0x3C, 0x28, 0x24],
        'I': [0x08, 0x08, 0x08, 0x08, 0x08],
        'X': [0x22, 0x14, 0x08, 0x14, 0x22],
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

    // Exported block functions

    /**
     * Initialize the LED matrix with specified SCK and DIN pins.
     * @param sck Serial clock pin
     * @param din Data in pin
     */
    //% block="initialize LED matrix with SCK %sck and DIN %din"
    export function initialize(sck: DigitalPin, din: DigitalPin) {
        sckPin = sck;
        dinPin = din;
        pins.digitalWritePin(dinPin, 1);
        pins.digitalWritePin(sckPin, 1);
        turnOnScreen();
    }

    /**
     * Set an individual LED in the 8x16 matrix.
     * @param row Logical row (0–7, top to bottom)
     * @param col Logical column (0–15, left to right)
     * @param state 1 to turn on, 0 to turn off
     */
    //% block="set LED at row %row|column %col|to %state"
    export function setLed(row: number, col: number, state: number) {
        if (row < 0 || row >= 8 || col < 0 || col >= 16) {
            console.log("Error: Row or column out of bounds");
            return;
        }
        const hardwareRow = col;
        const hardwareCol = row;
        if (state) {
            matrixBuffer[hardwareRow] |= (1 << hardwareCol);
        } else {
            matrixBuffer[hardwareRow] &= ~(1 << hardwareCol);
        }
    }

    /**
     * Update the display to reflect the current buffer.
     */
    //% block="update display"
    export function updateDisplay() {
        showRows(matrixBuffer);
    }

    /**
     * Clear the display, turning all LEDs off.
     */
    //% block="clear display"
    export function clear() {
        matrixBuffer = [];
        for (let i = 0; i < 16; i++) {
            matrixBuffer.push(0);
        }
        updateDisplay();
    }

    // Helper function for scrolling text
    function getMessageBitmap(text: string): number[] {
        let bitmap: number[] = [];
        for (let i = 0; i < 16; i++) {
            bitmap.push(0);
        }
        for (let char of text) {
            if (font[char]) {
                bitmap = bitmap.concat(font[char]);
            } else {
                bitmap = bitmap.concat(font[' ']);
            }
            bitmap.push(0); // Space between characters
        }
        if (text.length > 0) bitmap.pop(); // Remove extra space at end
        for (let i = 0; i < 16; i++) {
            bitmap.push(0); // Padding for smooth scrolling
        }
        return bitmap;
    }

    function displayMessage(bitmap: number[], startCol: number) {
        for (let c = 0; c < 16; c++) {
            let msgCol = startCol + c;
            matrixBuffer[c] = (msgCol >= 0 && msgCol < bitmap.length) ? bitmap[msgCol] : 0;
        }
        updateDisplay();
    }

    /**
     * Scroll text across the matrix.
     * @param text String to scroll
     * @param speed Delay between frames in milliseconds
     * @param direction Direction to scroll: 0 for left, 1 for right
     */
    //% block="scroll text %text|with speed %speed|direction %direction"
    export function scrollText(text: string, speed: number, direction: number = 0) {
        let bitmap = getMessageBitmap(text);
        if (direction === 0) { // Scroll left
            let maxStartCol = bitmap.length - 16;
            for (let startCol = 0; startCol <= maxStartCol; startCol++) {
                displayMessage(bitmap, startCol);
                basic.pause(speed);
            }
        } else { // Scroll right
            let minStartCol = 0 - 16;
            for (let startCol = bitmap.length - 16; startCol >= minStartCol; startCol--) {
                displayMessage(bitmap, startCol);
                basic.pause(speed);
            }
        }
    }

    /**
     * Draw a rectangle on the matrix.
     * @param x Starting column (0–15)
     * @param y Starting row (0–7)
     * @param width Width of the rectangle
     * @param height Height of the rectangle
     * @param state 1 to turn on, 0 to turn off
     */
    //% block="draw rectangle at x %x|y %y|width %width|height %height|state %state"
    export function drawRectangle(x: number, y: number, width: number, height: number, state: number) {
        for (let c = x; c < x + width && c < 16; c++) {
            for (let r = y; r < y + height && r < 8; r++) {
                setLed(r, c, state);
            }
        }
        updateDisplay();
    }
}
