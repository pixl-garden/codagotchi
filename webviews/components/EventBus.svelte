
<script context="module">
    import { writable } from 'svelte/store';
    
    // Svelte store to manage events
    const events = writable({});
    
    export const EventBus = {
        // Subscribe to an event
        on: (eventName, callback) => {
            events.update(current => {
                if (!current[eventName]) {
                    current[eventName] = [];
                }
                current[eventName].push(callback);
                return current;
            });
            
            // Return unsubscribe function
            return () => {
                events.update(current => {
                    if (current[eventName]) {
                        current[eventName] = current[eventName].filter(cb => cb !== callback);
                    }
                    return current;
                });
            };
        },
        
        // Emit an event
        emit: (eventName, payload) => {
            let currentEvents;
            events.update(current => {
                currentEvents = current;
                return current;
            });
            
            if (currentEvents[eventName]) {
                currentEvents[eventName].forEach(callback => callback(payload));
            }
        }
    };
</script>