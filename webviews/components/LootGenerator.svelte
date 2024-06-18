<script context="module">

    export function weightedRandomSelection(itemTiers) {
        // Calculate the total weight
        let totalWeight = itemTiers.reduce((sum, tier) => sum + tier.weight, 0);

        // Generate a random number within the range of the total weight
        let randomWeight = Math.random() * totalWeight;

        // Determine the selected tier based on its weight
        let cumulativeWeight = 0;
        let selectedTier;
        for (let tier of itemTiers) {
            cumulativeWeight += tier.weight;
            if (randomWeight <= cumulativeWeight) {
                selectedTier = tier;
                break;
            }
        }

        // Randomly select an item from the chosen tier
        let selectedItem = selectedTier.items[Math.floor(Math.random() * selectedTier.items.length)];

        return selectedItem;
    }
</script>