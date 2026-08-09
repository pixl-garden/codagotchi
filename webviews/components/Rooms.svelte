<script context='module'>
    import { game, Plane } from './Game.svelte';
    import { Pet } from './Object.svelte';
    import { get } from 'svelte/store';

    export function preloadObjects() {
        let mainPlane = new Plane("mainPlane");
        // get(game).addActivePlane(mainPlane);
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