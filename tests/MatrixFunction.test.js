const {
    generateRectangleMatrix,
    overlayMatrix,
    concatenateMatrixes,
    replaceMatrixColor,
    generateButtonMatrix,
  } = require('./MatrixFunctions.testfile.js');
  
  describe('generateRectangleMatrix', () => {
    test('creates a matrix of the correct size and color', () => {
      const width = 5;
      const height = 3;
      const color = 'red';
      const expectedMatrix = [
        ['red', 'red', 'red', 'red', 'red'],
        ['red', 'red', 'red', 'red', 'red'],
        ['red', 'red', 'red', 'red', 'red']
      ];
      expect(generateRectangleMatrix(width, height, color)).toEqual(expectedMatrix);
    });
  });
  
  describe('overlayMatrix', () => {
    test('correctly overlays one matrix on top of another', () => {
      const baseSprite = generateRectangleMatrix(5, 5, 'blue');
      const overlaySprite = generateRectangleMatrix(3, 3, 'red');
      const startX = 1;
      const startY = 1;
      const expectedSprite = [
        ['blue', 'blue', 'blue', 'blue', 'blue'],
        ['blue', 'red', 'red', 'red', 'blue'],
        ['blue', 'red', 'red', 'red', 'blue'],
        ['blue', 'red', 'red', 'red', 'blue'],
        ['blue', 'blue', 'blue', 'blue', 'blue']
      ];
      expect(overlayMatrix(baseSprite, overlaySprite, startX, startY)).toEqual(expectedSprite);
    });
  });
  
  describe('concatenateMatrixes', () => {
    test('concatenates two matrices of the same height', () => {
      const matrix1 = [['a', 'a'], ['a', 'a']];
      const matrix2 = [['b', 'b'], ['b', 'b']];
      const expectedMatrix = [['a', 'a', 'b', 'b'], ['a', 'a', 'b', 'b']];
      expect(concatenateMatrixes(matrix1, matrix2)).toEqual(expectedMatrix);
    });
  
    test('throws an error when matrices have different heights', () => {
      const matrix1 = [['a', 'a'], ['a', 'a']];
      const matrix2 = [['b', 'b']];
      expect(() => concatenateMatrixes(matrix1, matrix2)).toThrow('Both matrices must have the same number of rows');
    });
  });
  
  describe('replaceMatrixColor', () => {
    test('replaces the specified color in a matrix', () => {
      const matrix = [['red', 'blue'], ['red', 'green']];
      const colorToReplace = 'red';
      const replacementColor = 'yellow';
      const expectedMatrix = [['yellow', 'blue'], ['yellow', 'green']];
      expect(replaceMatrixColor(matrix, colorToReplace, replacementColor)).toEqual(expectedMatrix);
    });
  
    test('does nothing when the color to replace is not found', () => {
      const matrix = [['red', 'blue'], ['red', 'green']];
      const colorToReplace = 'black';
      const replacementColor = 'yellow';
      expect(replaceMatrixColor(matrix, colorToReplace, replacementColor)).toEqual(matrix);
    });
  });
  
  /* describe('generateButtonMatrix', () => {
    test('generates a button matrix with a border, background, and text', () => {
      const width = 10;
      const height = 4;
      const bgColor = 'white';
      const borderColor = 'black';
      const textSprite = [[' ', ' ', 'T', 'E', 'S', 'T', ' ', ' ']];
      const expectedButtonMatrix = [
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'white', ' ', ' ', 'T', 'E', 'S', 'T', ' ', ' ', 'white', 'black'],
        ['black', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'white', 'black'],
        ['black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black', 'black'],
      ];
      expect(generateButtonMatrix(width, height, bgColor, borderColor, textSprite)).toEqual(expectedButtonMatrix);
    });
  }); */
  