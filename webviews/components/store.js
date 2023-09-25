import { writable } from 'svelte/store';
import { spriteStore } from './Main.svelte';

export const preloadedSpriteSheets = writable({});
export const images = writable({});
export const spritesLoaded = writable(false);
export {spriteStore};