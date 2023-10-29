const { spriteReader } = require('./SpriteReader.testfile.js');

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