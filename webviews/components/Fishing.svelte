<script context="module">
    import lootTableConfig from './lootTableConfig.json';
    import { weightedRandomSelection } from './LootGenerator.svelte';
    import { Item } from './Inventory.svelte';
    
    export class Fishing {
        constructor() {
            this.abortController = null;
            this.cancelFlag = false;
        }

        // Simulate casting a fishing line asynchronously
        castLine(gameReference, maxDuration, minDuration) {
            if (this.abortController) {
                this.abortController.abort();  // Abort previous request if still running
            }
            this.abortController = new AbortController();  // Create a new controller for the new operation
            const { signal } = this.abortController;

            console.log("Casting the line...");
            // Return a promise that resolves when a fish is caught
            return new Promise((resolve, reject) => {
                // Generate a random time between 1 to 5 seconds for the fish to bite
                const timeToBite = Math.random() * (maxDuration - minDuration) + minDuration; // 1000 to 5000 milliseconds
                const timeoutId = setTimeout(() => {
                    if (signal.aborted) {
                        reject({ message: "Fishing was cancelled" });
                    } else {
                        const fishString = this.getFish();
                        let fish = new Item(fishString, 7, 6, 13);
                        gameReference.addStackableItem(fishString, 1);
                        resolve(fish);
                    }
                }, timeToBite);
                signal.addEventListener('abort', () => {
                    clearTimeout(timeoutId);  // Clear the timeout if aborted
                    reject({ message: "Fishing was cancelled" });
                });
            });
        }

        // Determine which fish was caught
        getFish() {
            return weightedRandomSelection(lootTableConfig["fishingTiers"])
        }
        
        cancelFishing() {
            if (this.abortController) {
                this.abortController.abort();
            }
            this.cancelFlag = true;
        }
    }


</script>