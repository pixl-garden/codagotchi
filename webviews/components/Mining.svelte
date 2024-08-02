<script context="module">
    import lootTableConfig from './lootTableConfig.json';
    import { weightedRandomSelection } from './LootGenerator.svelte';
    import { InventoryItem } from './Inventory.svelte';
    import { ObjectGrid, GeneratedObject, ConfigObject } from './Object.svelte';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    
    export class MiningManager extends ObjectGrid{
        constructor(x = 0, y = 0, z = 0, rows = 2, columns = 8, numBlocks, blockTypes) {

            const ores = spriteReaderFromStore(16, 16, "mineOres.png");
            let {objects, blocks} = constructBlockItems(numBlocks, blockTypes, ores);
            super(columns, 0, rows, 0, x, y, z, objects);
            this.columns = columns;
            this.rows = 1;
            this.objects = objects;
            this.blocks = blocks;
            this.abortController = null;
            this.cancelFlag = false;
            this.sprites = ores;
            this.numBlocks = columns * rows;
            this.blockTypes = blockTypes;
            this.spriteWidth = 16;
            this.spriteHeight = 16;
            this.cancelFlag = false;
            this.scaledProbabilities = findScaledProbabilties(blockTypes);
        }

        constructBlockItem() {
            let scaledProbabilities = this.scaledProbabilities.scaledProbabilities;
            let max = this.scaledProbabilities.max;
            let random = Math.floor(Math.random() * max);  // Generates a number between 0 and max
            let found = scaledProbabilities.find(scaledProb => random < scaledProb.upperBound);
            let object = new GeneratedObject(this.sprites, found.states, 0, 0)
            this.objects.push(object)
            this.blocks.push(found);
        }


        mineBlocks(gameReference) {
            if (this.abortController) {
                this.abortController.abort();  // Abort previous request if still running
            }
            this.abortController = new AbortController();  // Create a new controller for the new operation
            const { signal } = this.abortController;

            // Return a promise that resolves when a fish is caught
            return new Promise((resolve, reject) => {
                // Generate a random time between 1 to 5 seconds for the fish to bite
                const duration = this.blocks[0].duration
                const timeoutId = setTimeout(() => {
                    if (signal.aborted) {
                        reject({ message: "Mining was cancelled" });
                    } else {
                        let block = this.blocks.shift();
                        let object = this.objects.shift();
                        const itemString = this.getOre(block);
                        let ore = new InventoryItem(itemString, 7, 6, 13);
                        gameReference.addStackableItem(itemString, 1);
                        this.constructBlockItem();
                        resolve(ore);
                    }
                }, duration);
                signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);  // Clear the timeout if aborted
                    reject({ message: "Mining was cancelled" });
                });
            });
        }

        // Determine which item was retrieved
        getOre(block) {
            return block.items[Math.floor(Math.random() * block.items.length)];
        }
        
        cancelMining() {
            if (this.abortController) {
                this.abortController.abort();
            }
            this.cancelFlag = true;
        }
    }

    function constructBlockItems(numBlocks, blockTypes, sprites) {
        const {scaledProbabilities, max} = findScaledProbabilties(blockTypes);
        // scaledProbabilities.forEach(prob => {
        //     console.log(`Name: ${prob.name}, Upper bound: ${prob.upperBound}, states: ${prob.states}`);
        // });
        let blocks = [];
        let objects = [];
        let random;
        while(objects.length < numBlocks) {
            random = Math.floor(Math.random() * max);  // Generates a number between 0 and max
            let found = scaledProbabilities.find(scaledProb => random < scaledProb.upperBound);

            let object = new GeneratedObject(sprites, found.states, 0, 0)
            objects.push(object)
            blocks.push(found);
        }
        return {
            objects: objects,
            blocks: blocks
        };
    }

    function findScaledProbabilties(blockTypes) {
        let cumulativeProbability = 0;
        let scaledProbabilities = blockTypes.map(blockType => {
            cumulativeProbability += blockType.weight;
            return { name: blockType.name, 
                items: blockType.items,
                duration: blockType.duration, 
                sprite: blockType.sprite, 
                states: blockType.states, 
                upperBound: cumulativeProbability,        
             };
        });
        return {
            scaledProbabilities: scaledProbabilities,
            max: cumulativeProbability
        };
    }

</script>