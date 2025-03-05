// main.ts for Me LED Matrix 8x16 MakeCode Extension

namespace ledMatrix {
    // **Global Variables**
    let dinPin: DigitalPin = DigitalPin.P16;  // Default DIN pin
    let sckPin: DigitalPin = DigitalPin.P15;  // Default SCK pin

    // Current pattern being edited (8 rows x 16 columns)
    let currentPattern: string[] = [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................"
    ];
    let cursorRow = 0;  // Cursor row position (0-7)
    let cursorCol = 0;  // Cursor column position (0-15)

    // Font dictionary for scrolling text (A-Z and space, 8x8 pixels)
    const font: { [key: string]: number[] } = {
        "A": [0x38, 0x44, 0x44, 0x7C, 0x44, 0x44, 0x44, 0x00],
        "B": [0x78, 0x44, 0x44, 0x78, 0x44, 0x44, 0x78, 0x00],
        "C": [0x38, 0x44, 0x40, 0x40, 0x40, 0x44, 0x38, 0x00],
        "D": [0x78, 0x44, 0x44, 0x44, 0x44, 0x44, 0x78, 0x00],
        "E": [0x7C, 0x40, 0x40, 0x78, 0x40, 0x40, 0x7C, 0x00],
        "F": [0x7C, 0x40, 0x40, 0x78, 0x40, 0x40, 0x40, 0x00],
        "G": [0x38, 0x44, 0x40, 0x40, 0x4C, 0x44, 0x38, 0x00],
        "H": [0x44, 0x44, 0x44, 0x7C, 0x44, 0x44, 0x44, 0x00],
        "I": [0x38, 0x10, 0x10, 0x10, 0x10, 0x10, 0x38, 0x00],
        "J": [0x04, 0x04, 0x04, 0x04, 0x44, 0x44, 0x38, 0x00],
        "K": [0x44, 0x48, 0x50, 0x60, 0x50, 0x48, 0x44, 0x00],
        "L": [0x40, 0x40, 0x40, 0x40, 0x40, 0x40, 0x7C, 0x00],
        "M": [0x44, 0x6C, 0x54, 0x44, 0x44, 0x44, 0x44, 0x00],
        "N": [0x44, 0x44, 0x64, 0x54, 0x4C, 0x44, 0x44, 0x00],
        "O": [0x38, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38, 0x00],
        "P": [0x78, 0x44, 0x44, 0x78, 0x40, 0x40, 0x40, 0x00],
        "Q": [0x38, 0x44, 0x44, 0x44, 0x54, 0x48, 0x34, 0x00],
        "R": [0x78, 0x44, 0x44, 0x78, 0x50, 0x48, 0x44, 0x00],
        "S": [0x38, 0x44, 0x40, 0x38, 0x04, 0x44, 0x38, 0x00],
        "T": [0x7C, 0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x00],
        "U": [0x44, 0x44, 0x44, 0x44, 0x44, 0x44, 0x38, 0x00],
        "V": [0x44, 0x44, 0x44, 0x44, 0x28, 0x10, 0x00, 0x00],
        "W": [0x44, 0x44, 0x44, 0x54, 0x6C, 0x44, 0x44, 0x00],
        "X": [0x44, 0x44, 0x28, 0x10, 0x28, 0x44, 0x44, 0x00],
        "Y": [0x44, 0x44, 0x28, 0x10, 0x10, 0x10, 0x10, 0x00],
        "Z": [0x7C, 0x04, 0x08, 0x10, 0x20, 0x40, 0x7C, 0x00],
        " ": [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    };

    // Predefined patterns (16 bytes each for 8x16 matrix)
    const patterns: { [key: string]: number[] } = {
        "heart": [
            0b00000000, 0b01100110, 0b11111111, 0b11111111,
            0b11111111, 0b01111110, 0b00111100, 0b00011000,
            0b00000000, 0b00000000, 0b00000000, 0b00000000,
            0b00000000, 0b00000000, 0b00000000, 0b00000000
        ],
        "smiley": [
            0b00000000, 0b00000000, 0b00011000, 0b00011000,
            0b00000000, 0b00100100, 0b00011000, 0b00000000,
            0b00000000, 0b00000000, 0b00000000, 0b00000000,
            0b00000000, 0b00000000, 0b00000000, 0b00000000
        ],
        "arrow": [
            0b00001000, 0b00011100, 0b00111110, 0b01111111,
            0b00011100, 0b00011100, 0b00011100, 0b00011100,
            0b00011100, 0b00011100, 0b00011100, 0b00011100,
            0b00011100, 0b00011100, 0b00011100, 0b00000000
        ]
    };

    // **Low-Level Communication Functions**
    function sendBit(bit: number): void {
        pins.digitalWritePin(sckPin, 0);
        pins.digitalWritePin(dinPin, bit);
        control.waitMicros(2);
        pins.digitalWritePin(sckPin, 1);
        control.waitMicros(2);
    }

    function sendByte(byte: number): void {
        for (let i = 7; i >= 0; i--) {
            sendBit((byte >> i) & 1);
        }
    }

    function startSignal(): void {
        pins.digitalWritePin(sckPin, 0);
        control.waitMicros(1);
        pins.digitalWritePin(sckPin, 1);
        pins.digitalWritePin(dinPin, 1);
        pins.digitalWritePin(dinPin, 0);
    }

    function endSignal(): void {
        pins.digitalWritePin(sckPin, 0);
        control.waitMicros(2);
        pins.digitalWritePin(dinPin, 0);
        pins.digitalWritePin(sckPin, 1);
        control.waitMicros(1);
        pins.digitalWritePin(dinPin, 1);
    }

    function writeBytesToAddress(address: number, data: number[]): void {
        if (address > 15 || data.length === 0) return;
        startSignal();
        sendByte(0b01000000); // Auto-increment mode
        endSignal();
        startSignal();
        sendByte(0b11000000); // Grid Address
        for (let k = 0; k < data.length; k++) {
            sendByte(data[k]);
        }
        endSignal();
        startSignal();
        sendByte(0b10001000); // Display command
        endSignal();
    }

    // **High-Level Exported Functions**

    /**
     * Initialize the LED matrix with specified pins.
     * @param dinPinParam The data input pin (default P16).
     * @param sckPinParam The clock pin (default P15).
     */
    //% block="initialize LED matrix with DIN %dinPinParam|SCK %sckPinParam"
    export function initMatrix(dinPinParam: DigitalPin = DigitalPin.P16, sckPinParam: DigitalPin = DigitalPin.P15): void {
        dinPin = dinPinParam;
        sckPin = sckPinParam;
        let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        startSignal();
        sendByte(0b10100000); // Turn-on command
        writeBytesToAddress(0, data);
        endSignal();
    }

    /**
     * Display a static pattern on the LED matrix.
     * @param pattern Array of 16 bytes representing the pattern.
     */
    //% block="display static pattern %pattern"
    export function displayStaticPattern(pattern: number[]): void {
        if (!pattern || pattern.length !== 16) {
            serial.writeLine("Error: Pattern must be a 16-byte array.");
            return;
        }
        writeBytesToAddress(0, pattern);
    }

    /**
     * Clear the LED matrix screen.
     */
    //% block="clear LED matrix screen"
    export function clearScreen(): void {
        let data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        writeBytesToAddress(0, data);
    }

    /**
     * Display scrolling text on the LED matrix.
     * @param text The text to scroll.
     * @param speed The speed of scrolling in milliseconds.
     */
    //% block="scroll text %text|at speed %speed"
    export function displayScrollingText(text: string, speed: number): void {
        if (!text || speed < 0) {
            serial.writeLine("Error: Invalid text or speed.");
            return;
        }
        let textPattern: number[] = [];
        for (let char of text.toUpperCase()) {
            textPattern = textPattern.concat(font[char] || font[" "]);
        }
        let totalColumns = textPattern.length / 8;
        let columnData = transposePattern(textPattern, totalColumns);
        for (let startCol = 0; startCol <= columnData.length - 16; startCol++) {
            let displayData = columnData.slice(startCol, startCol + 16);
            while (displayData.length < 16) displayData.push(0);
            displayStaticPattern(displayData);
            basic.pause(speed);
        }
    }

    /**
     * Display a predefined pattern (heart, smiley, arrow).
     * @param patternName The name of the pattern.
     */
    //% block="display pattern %patternName"
    export function displayPattern(patternName: string): void {
        if (!patterns[patternName]) {
            serial.writeLine("Error: Pattern '" + patternName + "' not found.");
            return;
        }
        displayStaticPattern(patterns[patternName]);
    }

    /**
     * Set the brightness of the LED matrix (0-7).
     * @param level Brightness level.
     */
    //% block="set brightness to %level"
    export function setBrightness(level: number): void {
        if (level < 0 || level > 7) {
            serial.writeLine("Error: Brightness must be between 0 and 7.");
            return;
        }
        startSignal();
        sendByte(0b10001000 | level); // Brightness command
        endSignal();
    }

    /**
     * Turn off the LED matrix screen.
     */
    //% block="turn off LED matrix screen"
    export function turnOffScreen(): void {
        startSignal();
        sendByte(0b10000000); // Turn-off command
        endSignal();
    }

    /**
     * Create a pattern from a string (8 rows x 16 cols, "*" for on, "." for off).
     * @param patternStr The pattern string.
     */
    //% block="create pattern from string %patternStr"
    export function createPatternFromString(patternStr: string): number[] {
        if (!patternStr) {
            serial.writeLine("Error: Pattern string is required.");
            return [];
        }
        let rows = patternStr.trim().split("\n");
        if (rows.length !== 8) {
            serial.writeLine("Error: Pattern must have exactly 8 rows.");
            return [];
        }
        let pattern: number[] = [];
        for (let col = 0; col < 16; col++) {
            let byte = 0;
            for (let row = 0; row < 8; row++) {
                let line = rows[row].trim();
                if (line.length !== 16) {
                    serial.writeLine("Error: Each row must have 16 characters.");
                    return [];
                }
                if (line[col] === "*") byte |= (1 << row);
            }
            pattern.push(byte);
        }
        return pattern;
    }

    /**
     * Display a sequence of patterns with a delay.
     * @param sequence Array of patterns (each 16 bytes).
     * @param delayMs Delay between patterns in milliseconds.
     */
    //% block="display pattern sequence %sequence|with delay %delayMs ms"
    export function displayPatternSequence(sequence: number[][], delayMs: number): void {
        if (!sequence || sequence.length === 0 || delayMs < 0) {
            serial.writeLine("Error: Invalid sequence or delay.");
            return;
        }
        for (let pattern of sequence) {
            if (pattern.length !== 16) {
                serial.writeLine("Error: Each pattern must have 16 bytes.");
                return;
            }
            displayStaticPattern(pattern);
            basic.pause(delayMs);
        }
    }

    /**
     * Edit an 8x16 pattern using a text grid.
     * @param patternStr Initial pattern string (optional).
     */
    //% block="edit 8x16 pattern %patternStr"
    export function editPattern(patternStr: string = `
................        
................        
................        
................        
................        
................        
................        
................`): void {
        let rows = patternStr.trim().split("\n");
        if (rows.length !== 8) {
            serial.writeLine("Error: Pattern must have 8 rows.");
            return;
        }
        let normalizedPattern = rows.map(line => {
            if (line.length !== 16) return "................".substr(0, 16);
            // Replace non-* characters with dots (avoiding RegExp)
            let result = "";
            for (let i = 0; i < 16; i++) {
                result += (line[i] === "*") ? "*" : ".";
            }
            return result;
        });

        serial.writeLine("Edit 8x16 pattern (use * for on, . for off):");
        serial.writeLine("Press A to submit, B to cancel.");
        serial.writeLine(normalizedPattern.join("\n"));

        currentPattern = normalizedPattern;
        let editing = true;
        while (editing) {
            if (input.buttonIsPressed(Button.A)) {
                let finalPattern = createPatternFromString(currentPattern.join("\n"));
                displayStaticPattern(finalPattern);
                serial.writeLine("Pattern submitted!");
                editing = false;
            } else if (input.buttonIsPressed(Button.B)) {
                serial.writeLine("Pattern editing canceled.");
                editing = false;
            }
            basic.pause(50);
        }
    }

    /**
     * Start the pattern editor with an empty grid.
     */
    //% block="start pattern editor"
    export function startPatternEditor(): void {
        currentPattern = [
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................",
            "................"
        ];
        cursorRow = 0;
        cursorCol = 0;
        updatePreview();
    }

    /**
     * Move the cursor up in the pattern grid.
     */
    //% block="move cursor up"
    export function moveCursorUp(): void {
        if (cursorRow > 0) cursorRow--;
        updatePreview();
    }

    /**
     * Move the cursor down in the pattern grid.
     */
    //% block="move cursor down"
    export function moveCursorDown(): void {
        if (cursorRow < 7) cursorRow++;
        updatePreview();
    }

    /**
     * Move the cursor left in the pattern grid.
     */
    //% block="move cursor left"
    export function moveCursorLeft(): void {
        if (cursorCol > 0) cursorCol--;
        updatePreview();
    }

    /**
     * Move the cursor right in the pattern grid.
     */
    //% block="move cursor right"
    export function moveCursorRight(): void {
        if (cursorCol < 15) cursorCol++;
        updatePreview();
    }

    /**
     * Toggle the LED at the cursor position.
     */
    //% block="toggle LED at cursor"
    export function toggleLedAtCursor(): void {
        let row = currentPattern[cursorRow];
        currentPattern[cursorRow] = row.substr(0, cursorCol) +
            (row[cursorCol] === "*" ? "." : "*") +
            row.substr(cursorCol + 1);
        updatePreview();
    }

    /**
     * Display the current pattern on the matrix.
     */
    //% block="display current pattern"
    export function displayCurrentPattern(): void {
        let pattern = createPatternFromString(currentPattern.join("\n"));
        displayStaticPattern(pattern);
    }

    // **Helper Functions**

    // Transpose pattern for scrolling text
    function transposePattern(pattern: number[], totalColumns: number): number[] {
        let columnData: number[] = [];
        for (let col = 0; col < totalColumns * 8; col++) {
            let byte = 0;
            for (let row = 0; row < 8; row++) {
                if ((pattern[row * totalColumns + (col >> 3)] & (1 << (7 - (col % 8)))) !== 0) {
                    byte |= (1 << row);
                }
            }
            columnData.push(byte);
        }
        return columnData;
    }

    // Update preview on micro:bit 5x5 LED grid
    function updatePreview(): void {
        // Initialize 5x5 preview array manually
        let preview: boolean[][] = [];
        for (let i = 0; i < 5; i++) {
            let row: boolean[] = [];
            for (let j = 0; j < 5; j++) {
                row.push(false);
            }
            preview.push(row);
        }

        // Scale 8x16 pattern to 5x5
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                let matrixRow = Math.floor(row * 8 / 5);
                let matrixCol = Math.floor(col * 16 / 5);
                if (matrixRow < 8 && matrixCol < 16) {
                    preview[row][col] = currentPattern[matrixRow][matrixCol] === "*";
                }
            }
        }

        // Display on micro:bit 5x5 LED
        basic.clearScreen();
        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                if (preview[row][col]) led.plot(col, row);
            }
        }
        led.plotBrightness(cursorCol % 5, cursorRow % 5, 255); // Show cursor
    }

    // **Initial Setup**
    basic.forever(() => {
        input.onButtonPressed(Button.A, moveCursorLeft);
        input.onButtonPressed(Button.B, moveCursorRight);
        input.onButtonPressed(Button.AB, toggleLedAtCursor);
        input.onGesture(Gesture.Shake, moveCursorUp);
        input.onGesture(Gesture.TiltLeft, moveCursorDown);
    });
}
