<script context='module'>
    import { game } from './Game.svelte';
    import { Plane, MinRelativePlane } from './Plane.svelte';
    import { Pet } from './Object.svelte';
    import { get } from 'svelte/store';

    export function preloadObjects() {
        let mainPlane = new MinRelativePlane("mainPlane");
        mainPlane.z = 0;
        get(game).addActivePlane("mainPlane");
        let plane2 = new MinRelativePlane("plane2");
        plane2.ratio = .5;
        plane2.z = 100;
        plane2.width = 256;
        get(game).addActivePlane("plane2");
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