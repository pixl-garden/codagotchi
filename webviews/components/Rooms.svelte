<script context='module'>
    import { game } from './Game.svelte';
    import { Plane, MinRelativePlane, PannablePlane } from './Plane.svelte';
    import { ConfigObject } from './Object.svelte';
    import { get } from 'svelte/store';
    import { generateStatusBarClass } from './ObjectGenerators.svelte';
    import * as constants from './constants.js';

    export function preloadObjects() {
        let plane2 = new PannablePlane("plane2");
        plane2.setDimensions(128, 128)
        plane2.ratio = 1;
        plane2.z = 100;
        plane2.width = 128;
        get(game).addActivePlane("plane2");
        const obj = new ConfigObject("paintBackground", 0, 0, -1);
        const obj2 = new ConfigObject("sendPostcardButton", 20, 20, 100000);
        const obj3 = new ConfigObject("sendPostcardButton", 50, 50, 100010);
        obj.addChild(obj2);
        obj2.addChild(obj3);
        obj.hoverWithChildren = true;
        obj2.hoverWithChildren = true;
        plane2.addObject(obj);

        const StatusBar = generateStatusBarClass(
            50,             // width
            7,              // height
            constants.offBlack,       // borderColor
            constants.grey,           // bgColor
            [
                { base: constants.red, highlight: constants.lightRed, shadow: constants.darkRed },
                { base: constants.orange, highlight: constants.lightOrange, shadow: constants.darkOrange },
                { base: constants.green, highlight: constants.lightGreen, shadow: constants.darkGreen }
            ],
            1  // roundness
        );

        const hungerBar = new StatusBar(12, 1, 200000);
        hungerBar.setPercentage(.2);
        plane2.addObject(hungerBar)
    }

    export function roomMain(){
        for(let plane of get(game).activePlanes) {
            plane.update();
            for(let obj of plane.getAllObjects()){
                obj.nextFrame();
            }
        }
    }
</script>