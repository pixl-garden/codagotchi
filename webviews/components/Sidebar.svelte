<script>
    import { getGrid as getGrid1 } from './Screen1.svelte';
    import { getGrid as getGrid2 } from './Screen2.svelte';
    import { getGrid as getGrid3 } from './Screen3.svelte';
    import { onMount, afterUpdate } from 'svelte';
    import { writable } from 'svelte/store';

    let gridStore = writable([]);
    let screens = {
        Screen1: getGrid1,
        Screen2: getGrid2,
        Screen3: getGrid3
    };
    let currentScreen = 'Screen1';

    function switchScreen(screenName) {
        currentScreen = screenName;
    }

    //RESIZE HANDLING
    let width = window.innerWidth;
    let height = window.innerHeight;
    let padding = (width - 146) / 2;

    let images = writable({});

    onMount(async () => {
        window.addEventListener('message', (event) => {
            const message = event.data;
            console.log('Received message:', message);
            if (message.type === 'image-uris') {
                images.set(message.uris);
            }
        });
        tsvscode.postMessage({ type: 'webview-ready' });
        window.addEventListener('resize', handleResize);
        try {
            // Initialize the grid
            if (currentScreen === 'Screen3') {
        gridStore.set(await screens[currentScreen]($images['pet.png']));
    } else {
        gridStore.set(await screens[currentScreen]());
    }
        } catch (error) {
            console.error('Failed to load grid:', error);
        }

        // Update the grid every 250ms
        setInterval(async () => {
        try {
            if (currentScreen === 'Screen3') {
                gridStore.set(await screens[currentScreen]($images['pet.png']));
            } else {
                gridStore.set(await screens[currentScreen]());
            }
        } catch (error) {
            console.error('Failed to update grid:', error);
        }
    }, 250);
    });

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        padding = (width - 146) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    }

    afterUpdate(() => {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    });

    function handleButtonClick(buttonId) {
      console.log(`Button ${buttonId} clicked`);
    }
</script>
    
<div class="button-row">
    <button on:click={() => switchScreen('Screen1')}>1</button>
    <button on:click={() => switchScreen('Screen2')}>2</button>
    <button on:click={() => switchScreen('Screen3')}>3</button>
    <button on:click={() => handleButtonClick(4)}>4</button>
</div>
<img src={$images['pet.png']} alt="1" />
  
<div class="grid-container">
    {#each $gridStore as row, rowIndex}
        {#each row as cell, colIndex}
            <div class="pixel" bind:this={cell.pixel} style="background-color: {cell.color};"></div>
        {/each}
    {/each}
</div>
  
<div class="button-row bottom-row">
    <button on:click={() => handleButtonClick(5)}>5</button>
    <button on:click={() => handleButtonClick(6)}>6</button>
    <button on:click={() => handleButtonClick(7)}>7</button>
    <button on:click={() => handleButtonClick(8)}>8</button>
</div>