const { writable } = require('svelte/store');

const preloadedSpriteSheets = writable({});
const images = writable({});
const spritesLoaded = writable(false);

module.exports = {
    preloadedSpriteSheets: preloadedSpriteSheets,
    images: images,
    spritesLoaded: spritesLoaded,
};
