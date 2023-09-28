import { writable } from 'svelte/store';

export const preloadedSpriteSheets = writable({});
export const images = writable({});
export const spritesLoaded = writable(false);