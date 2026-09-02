<script context='module'>
    import { game } from './Game.svelte';
    import { Plane, MinRelativePlane, PannablePlane } from './Plane.svelte';
    import { ConfigObject } from './Object.svelte';
    import { get } from 'svelte/store';

    export function preloadObjects() {
        let plane2 = new PannablePlane("plane2", false, false, () => {
            obj2.nextFrame();
        });
        plane2.setDimensions(128, 128)
        plane2.ratio = 1;
        plane2.z = 100;
        plane2.width = 128;
        get(game).addActivePlane("plane2");
        const obj = new ConfigObject("paintBackground", 0, 0, -1);
        const obj2 = new ConfigObject("sendPostcardButton", 50, 50, 100000);
        obj.addChild(obj2);
        plane2.addObject(obj);

        // const petObject = new Pet('pearguin', 40, 45, 31, get(game));
        // petObject.setPhysics(25.0, 0, 16.0)
        // mainPlane.addObject(petObject);
    }

    export function roomMain(){
        for(let plane of get(game).activePlanes) {
            plane.update();
        }
    }
</script>