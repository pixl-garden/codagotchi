<script context="module">
    import lootTableConfig from './lootTableConfig.json';
    import { weightedRandomSelection } from './LootGenerator.svelte';
    import { Item } from './Inventory.svelte';
    import { ObjectGrid, GeneratedObject, Object } from './Object.svelte';
    import { spriteReaderFromStore } from './SpriteReader.svelte';
    import objectConfig from './objectConfig.json';
    import { scale } from 'svelte/types/runtime/transition';
    
    export class MiningManager extends ObjectGrid{
        constructor(x = 0, y = 0, z = 0, rows = 2, columns = 8, numBlocks, blockTypes) {
            // const config = objectConfig["mineOres"];
            // if( !config ) throw new Error(`Item ${itemName} not found in itemConfig.json`);

            const ores = spriteReaderFromStore(16, 16, "mineOres.png");
            let {objects, blocks} = constructBlockItems(numBlocks, blockTypes, ores);
            console.log("constructObjects=" + objects);
            console.log("thing")
            super(columns, 0, rows, 0, x, y, z, objects);
            this.columns = columns;
            this.rows = 1;
            this.objects = objects;
            this.blocks = blocks;

            this.blocks.forEach(block => {
            console.log(`Name: ${block.name}}`);
             });

            this.abortController = null;
            this.cancelFlag = false;
            this.miningActive = false;
            this.sprites = ores;
            this.numBlocks = columns * rows;
            this.blockTypes = blockTypes;
            this.spriteWidth = 16;
            this.spriteHeight = 16;
            this.abortController = null;
            this.cancelFlag = false;
            this.scaledProbabilities = findScaledProbabilties(blockTypes);
            this.nextBlocks = blocks;
            console.log("next blocks", this.nextBlocks);
        }

        constructBlockItem() {
            let scaledProbabilities = this.scaledProbabilities.scaledProbabilities;
            let max = this.scaledProbabilities.max;
            let random = Math.floor(Math.random() * (max + 1));  // Generates a number between 0 and max
            let found = scaledProbabilities.find(scaledProb => random < scaledProb.upperBound);
            let object = new GeneratedObject(this.sprites, found.states, 0, 0)
            this.objects.push(object)
            this.blocks.push(found);
            // this.updateObjects();
        }


        startMining() {
            this.miningActive = true;
            mineBlocks();
        }

        stopMining() {
            this.miningActive = false;
        }

        // generateObjects() {
        //     let objects = [];
        //     let i = 0;
        //     this.nextBlocks.forEach(block => {
        //         let ore = this.blockTypes.find(ore => ore.name === block);
        //         let sprite = spriteReaderFromStore.getSprite(ore.sprite);
        //         objects.push(new GeneratedObject([sprite], { "default": 0 }, this.x + i * this.spriteWidth, this.y, this.z));
        //         i++;
        //     })
        //     return objects;
        // }

        async mineBlocksss() {
            while (miningActive) {
                let currentBlock = this.blockTypes.find(block => block.name === this.nextBlocks[0]);
                let timeout = currentBlock.duration;
                this.nextBlocks.shift(); // remove first item
                this.nextBlocks.push(generateBlock());
                await new Promise(resolve => setTimeout(resolve, timeout));
                let oreString = this.getOre();
                gameReference.addStackableItem(oreString, 1);
                // this.children = this.generateObjects(); // Add new block every 0.5 seconds
            }
        }
        mineBlocks(gameReference) {
            if (this.abortController) {
                this.abortController.abort();  // Abort previous request if still running
            }
            this.abortController = new AbortController();  // Create a new controller for the new operation
            const { signal } = this.abortController;

            console.log("Mining first block...");
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
                        let ore = new Item(itemString, 7, 6, 13);
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
            console.log("block.items="+block.items)
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
        console.log("scaledProbabilities=" + scaledProbabilities);
        scaledProbabilities.forEach(prob => {
            console.log(`Name: ${prob.name}, Upper bound: ${prob.upperBound}, states: ${prob.states}`);
        });
        let blocks = [];
        let objects = [];
        let random;
        while(objects.length < numBlocks) {
            random = Math.floor(Math.random() * (max));  // Generates a number between 0 and max
            console.log("random="+random, "max="+max)
            let found = scaledProbabilities.find(scaledProb => random < scaledProb.upperBound);
            console.log("found="+found)
            console.log("found.name="+found.name)
            console.log("found.states="+found.states);
            console.log("found.duration="+found.duration);

            // console.log("found: name=" + found.name, "weight=" + found.upperBound, "sprite=" + found.sprite)
            let object = new GeneratedObject(sprites, found.states, 0, 0)
            objects.push(object)
            blocks.push(found);
        }
        console.log("123blocks.duration="+blocks[0].duration);
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
        console.log("CUMULATIVE PROB:", cumulativeProbability)
        // return scaledProbability, cumulativeProbability;
        return {
            scaledProbabilities: scaledProbabilities,
            max: cumulativeProbability
        };
    }


    function setCustomTimeout(callback, delay) {
        let timeoutId;
        let start = Date.now();
        let remaining = delay;

        const pause = () => {
            clearTimeout(timeoutId);
            remaining -= Date.now() - start;
        };

        const resume = () => {
            start = Date.now();
            clearTimeout(timeoutId);
            timeoutId = setTimeout(callback, remaining);
        };

        const getRemainingTime = () => {
            if (timeoutId) {
            return remaining - (Date.now() - start);
            }
            return remaining;
        };

        resume();

        return { pause, resume, getRemainingTime };
    }

</script>