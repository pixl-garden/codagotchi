import * as vscode from 'vscode';

export function generateUpdates(globalContext: vscode.ExtensionContext): { inventoryUpdates: any; xp: number; petUpdates: any; customizationUpdates: any } {
    const globalState = globalContext.globalState.get('globalInfo', {}) as any;

    // Retrieve the pending updates
    const pendingUpdates = globalState.pendingUpdates || {
        inventory: {},
        xp: 0,
        pet: {},
        customization: {},
    };
    
    return {
        inventoryUpdates: Object.entries(pendingUpdates.inventory)
            .filter(([_, amount]) => amount !== 0)
            .map(([itemId, amount]) => ({ itemId, amount })),
        xp: pendingUpdates.xp,
        petUpdates: pendingUpdates.pet,
        customizationUpdates: pendingUpdates.customization,
    };
}