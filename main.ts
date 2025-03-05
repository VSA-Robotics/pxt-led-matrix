//% color="#AA278D" weight=100
namespace LedMatrix {
    // Global variables for pins and buffer
    let sckPin: DigitalPin;  // Serial clock pin for LED matrix
    let dinPin: DigitalPin;  // Data in pin for LED matrix
    let matrixBuffer: number[] = [];
    for (let i = 0; i < 16; i++) {
        matrixBuffer.push(0);  // Initialize 16-column buffer for 8x16 matrix
    }

    // Font definition for scrolling text (5 columns per character, 8 rows high)
    const font: { [key: string]: number[] } = {
        'A': [0x1C, 0x22, 0x22, 0x3E, 0x22],
        'B': [0x3C, 0x22, 0x3C, 0x22, 0x3C],
        'C': [0x1C, 0x22, 0x20, 0x22, 0x1C],
        'D': [0x3C, 0x22, 0x22, 0x22, 0x3C],
        'E': [0x3E, 0x20, 0x3C, 0x20, 0x3E],
        'H': [0x22, 0x22, 0x3E, 0x22, 0x22],
        'L': [0x20, 0x20, 0x20, 0x20, 0x3E],
        'O': [0x1C, 0x22, 0x22, 0x22, 0x1C],
        ' ': [0x00, 0x00, 0x00, 0x00, 0x00]
    };

    // Placeholder function to update the LED matrix display
    function updateDisplay() {
        // This function should send matrixBuffer to the LED matrix hardware
        // Example using SPI (adjust based on your hardware setup):
        // pins.spiFrequency(1000000);
        // for (let col = 0; col < 16; col++) {
        //     pins.spiWrite(matrixBuffer[col]);
        // }
        // Add latch or clock pulse if required by your driver
    }

    /**
     * Scroll text across the 8x16 LED matrix.
     * @param text The string to scroll
     * @param speed Delay between frames in milliseconds
     */
    //% block="scroll text %text|with speed %speed"
    export function scrollText(text: string, speed: number) {
        let bitmap: number[] = [];
        // Convert text to bitmap using font definitions
        for (let char of text) {
            if (font[char]) {
                bitmap = bitmap.concat(font[char]);
                bitmap.push(0); // Add a blank column between characters
            }
        }
        let totalColumns = bitmap.length;
        // Scroll the bitmap across the matrix
        for (let startCol = 0; startCol < totalColumns; startCol++) {
            for (let i = 0; i < 16; i++) {
                let col = startCol + i;
                matrixBuffer[i] = (col < totalColumns) ? bitmap[col] : 0;
            }
            updateDisplay();
            basic.pause(speed); // Control scrolling speed
        }
    }

    /**
     * Set an individual LED on the 8x16 matrix.
     * @param row Row number (0-7, top to bottom)
     * @param col Column number (0-15, left to right)
     * @param state True to turn on, false to turn off
     */
    //% block="set LED at row %row|column %col|to %state"
    export function setLed(row: number, col: number, state: boolean) {
        if (row >= 0 && row < 8 && col >= 0 && col < 16) {
            if (state) {
                matrixBuffer[col] |= (1 << row); // Set bit to turn LED on
            } else {
                matrixBuffer[col] &= ~(1 << row); // Clear bit to turn LED off
            }
            updateDisplay();
        }
    }

    /**
     * Clear the entire display.
     */
    //% block="clear display"
    export function clear() {
        for (let i = 0; i < 16; i++) {
            matrixBuffer[i] = 0;
        }
        updateDisplay();
    }

    /**
     * Draw a horizontal or vertical line on the matrix.
     * @param startRow Starting row (0-7)
     * @param startCol Starting column (0-15)
     * @param endRow Ending row (0-7)
     * @param endCol Ending column (0-15)
     */
    //% block="draw line from row %startRow|col %startCol|to row %endRow|col %endCol"
    export function drawLine(startRow: number, startCol: number, endRow: number, endCol: number) {
        if (startRow === endRow) {
            // Horizontal line
            let minCol = Math.min(startCol, endCol);
            let maxCol = Math.max(startCol, endCol);
            for (let col = minCol; col <= maxCol; col++) {
                setLed(startRow, col, true);
            }
        } else if (startCol === endCol) {
            // Vertical line
            let minRow = Math.min(startRow, endRow);
            let maxRow = Math.max(startRow, endRow);
            for (let row = minRow; row <= maxRow; row++) {
                setLed(row, startCol, true);
            }
        }
        updateDisplay();
    }
}

// Example usage in main.ts
basic.forever(function () {
    LedMatrix.scrollText("HELLO", 200); // Scroll "HELLO" with 200ms delay
    LedMatrix.clear();
    LedMatrix.drawLine(0, 0, 0, 15); // Draw a horizontal line across the top
    basic.pause(1000);
    LedMatrix.clear();
    LedMatrix.drawLine(0, 7, 7, 7); // Draw a vertical line in the middle
    basic.pause(1000);
    LedMatrix.clear();
});
