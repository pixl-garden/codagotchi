<script>
    //RESIZE HANDLING
    import { onMount, afterUpdate } from 'svelte';
    let width = window.innerWidth;
    let height = window.innerHeight;
    let padding = (width - 146) / 2;

    onMount(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    });

    function handleResize() {
        width = window.innerWidth;
        height = window.innerHeight;
        padding = (width - 146) / 2;
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
        console.log('SVELTE: Height: ' + height + ' Width: ' + width);
    }

    afterUpdate(() => {
        document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    });

    let rows = 26;
    let cols = 36;
    let grid = Array(rows).fill().map(() => Array(cols).fill().map(() => ({pixel: null})));
  
    function handleButtonClick(buttonId) {
      console.log(`Button ${buttonId} clicked`);
    }
</script>
    
  <div class="button-row">
    <button on:click={() => handleButtonClick(1)}>1</button>
    <button on:click={() => handleButtonClick(2)}>2</button>
    <button on:click={() => handleButtonClick(3)}>3</button>
    <button on:click={() => handleButtonClick(4)}>4</button>
  </div>
  
  <div class="grid-container">
    {#each grid as row, rowIndex}
      {#each row as cell, colIndex}
        <div class="pixel" bind:this={cell.pixel}></div>
      {/each}
    {/each}
  </div>
  
  <div class="button-row bottom-row">
    <button on:click={() => handleButtonClick(5)}>5</button>
    <button on:click={() => handleButtonClick(6)}>6</button>
    <button on:click={() => handleButtonClick(7)}>7</button>
    <button on:click={() => handleButtonClick(8)}>8</button>
  </div>