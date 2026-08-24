<script context='module'>
    import { game } from './Game.svelte';
    import { Plane, MinRelativePlane } from './Plane.svelte';
    import { Pet, ConfigObject } from './Object.svelte';
    import { get } from 'svelte/store';

    export function preloadObjects() {
        let plane2 = new Plane("plane2");
        plane2.ratio = 1;
        plane2.z = 100;
        plane2.width = 128;
        get(game).addActivePlane("plane2");
        const obj = new ConfigObject("paintBackground", 0, 0, 0);
        plane2.addObject(obj);
        const obj2 = new ConfigObject("sendPostcardButton", 10, 10, 1);
        plane2.addObject(obj2);
        // const petObject = new Pet('pearguin', 40, 45, 31, get(game));
        // petObject.setPhysics(25.0, 0, 16.0)
        // mainPlane.addObject(petObject);
    }

    export function roomMain(){
        // for(let plane of get(game).activePlanes) {
        //     plane.update();
        // }
    }
</script>