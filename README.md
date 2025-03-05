# LED Matrix Extension
This MakeCode extension lets you control an LED matrix.

## Blocks
- `initialize LED matrix`: Set up the matrix with a given number of rows and columns.
- `set LED`: Turn an LED on or off at a specific position.
- `clear LED matrix`: Turn off all LEDs.
- `update LED matrix`: Refresh the display.

## Example
```blocks
ledMatrix.initMatrix(5, 5)
ledMatrix.setLed(2, 2, true)
ledMatrix.update()
