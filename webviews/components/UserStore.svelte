<script context ="module">
    import { writable } from 'svelte/store';
    import { listenToUserPublicData } from '../firebaseClientHelpers.js';

    export const user = writable(null);

    listenToUserPublicData('userId', (userData) => {
        user.set(userData);
    });
</script>