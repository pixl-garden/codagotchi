import { writable } from 'svelte/store';

// Initialize the store with a checkerboard pattern
export const gridStore = writable(createCheckerboard(26, 36));

function createCheckerboard(rows, cols) {
  return Array(rows).fill().map((_, rowIndex) =>
    Array(cols).fill().map((_, colIndex) => ({
      pixel: null,
      color: (rowIndex + colIndex) % 2 === 0 ? 'white' : 'clear'
    }))
  );
}