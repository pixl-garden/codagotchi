const { generateScreen } = require('./ScreenComponent.testfile.js');

// GENERATESCREEN TESTS
describe('generateScreen', () => {

    it('places a single sprite correctly on the screen', () => {
        const sprite = {
            x: 1,
            y: 1,
            getMatrix: () => [['red', 'blue'], ['green', 'yellow']],
            getZ: () => 0
        };
 
        const screen = generateScreen([sprite], 4, 4);
        expect(screen).toEqual([
            ["transparent", "transparent", "transparent", "transparent"],
            ["transparent", "red", "blue", "transparent"],
            ["transparent", "green", "yellow", "transparent"],
            ["transparent", "transparent", "transparent", "transparent"]
        ]);
    });
 
    it('should return an empty screen if no sprites are provided', () => {
     const screen = generateScreen([], 4, 4);
     expect(screen).toEqual([
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"]
     ]);
    });
 
    it('should not show a sprite if it is completely out of screen bounds', () => {
     const sprite = {
         x: 5,
         y: 5,
         getMatrix: () => [['red', 'blue'], ['green', 'yellow']],
         getZ: () => 0
     };
 
     const screen = generateScreen([sprite], 4, 4);
     expect(screen).toEqual([
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"]
     ]);
    });
 
    it('should only show the part of the sprite that is within screen bounds', () => {
     const sprite = {
         x: 2,
         y: 2,
         getMatrix: () => [['red', 'blue', 'green'], ['yellow', 'pink', 'cyan']],
         getZ: () => 0
     };
 
     const screen = generateScreen([sprite], 4, 4);
     expect(screen).toEqual([
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "transparent", "transparent"],
         ["transparent", "transparent", "red", "blue"],
         ["transparent", "transparent", "yellow", "pink"]
     ]); 
    });
 
 });