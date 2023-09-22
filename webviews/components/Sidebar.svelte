<script>
    import { onMount, afterUpdate } from 'svelte';
    import { generateScreen } from './ScreenComponent.svelte';
    import { spriteReader, preloadAllSpriteSheets } from './spriteReader.svelte';
    import { images } from './store.js';
    import { spriteStore } from './Main.svelte';

    //RESIZE HANDLING
    const SCREENWIDTH = 146;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let padding = (width - SCREENWIDTH) / 2;
    let screen = []
    
    onMount(async () => {
        window.addEventListener('message', async (event) => {
            const message = event.data;
            if (message.type === 'image-uris') {
                images.set(message.uris);
                await preloadAllSpriteSheets().then( () => {
                        const unsubscribe = spriteStore.subscribe(sprites => {
                        screen = generateScreen(sprites, 26, 36);
                    });

                    // Unsubscribe when the component is destroyed
                    return () => unsubscribe();
                })
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
    });

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        padding = (width - SCREENWIDTH) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    }

    afterUpdate(() => {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    });

</script>

<div class="grid-container">
    {#each screen as row}
        <div class="row">
            {#each row as cell}
                <div class="pixel" style="background-color: {cell ? 'white' : 'transparent'};"></div>
            {/each}
        </div>
    {/each}
</div>