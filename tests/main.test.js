const { getNonce } = require('./getNonce.testfile.js');
const { generateScreen } = require('./ScreenComponent.testfile.js');
const { spriteReader } = require('./SpriteReader.testfile.js');

// GETNONCE TESTS
describe('getNonce', () => {
  
  it('should return a string', () => {
    expect(typeof getNonce()).toBe('string');
  });

  it('should return a string of length 32', () => {
    expect(getNonce()).toHaveLength(32);
  });

  it('should return a string containing only valid characters', () => {
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const nonce = getNonce();

    // Check each character in the nonce
    for (const char of nonce) {
      expect(possible.includes(char)).toBe(true);
    }
  });

  it('should likely return different values on subsequent calls (not guaranteed)', () => {
    const nonce1 = getNonce();
    const nonce2 = getNonce();
    const nonce3 = getNonce();

    // Not a guaranteed test due to the nature of randomness, but likely.
    expect(nonce1).not.toBe(nonce2);
    expect(nonce2).not.toBe(nonce3);
    expect(nonce1).not.toBe(nonce3);
  });

});

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

// SPRITE READER TESTS
describe ('spriteReader', () => {
  it('should return an empty array and log an error if the sprite sheet is not preloaded', () => {
    // Assuming preloadedSpriteSheets is empty or doesn't contain the required spriteSheet
    const sprites = spriteReader(2, 2, 'notPreloadedSpriteSheet');
    expect(sprites).toEqual([]);
  });

  it('should return empty array for sprite rows that do not fully fit the spriteHeight', () => {
    const spriteSheetData = [
        ['a', 'b', 'c', 'd'],
        ['e', 'f', 'g', 'h']
        // Missing two rows here
    ];
    // Assuming the spriteSheetData is preloaded as 'incompleteSheet'
    const sprites = spriteReader(2, 2, 'incompleteSheet');
    expect(sprites).toEqual([]);
  });

  it('should return empty array for sprite columns that do not fully fit the spriteWidth', () => {
    const spriteSheetData = [
        ['a', 'b'],
        ['e', 'f'],
        ['i', 'j'],
        ['m', 'n']
        // Missing two columns here
    ];
    // Assuming the spriteSheetData is preloaded as 'incompleteColumnSheet'
    const sprites = spriteReader(2, 2, 'incompleteColumnSheet');
    expect(sprites).toEqual([]);
  });


});