<script context="module">
    let localState = {}

    export function getGlobalState() {
        tsvscode.postMessage({ type: 'getGlobalState'});

    };

    export function setGlobalState( stateInfo ) {
        tsvscode.postMessage({ type: 'setGlobalState', value: stateInfo });

    };

    export function setLocalState( stateInfo ) {
        localState = stateInfo
    }

    export function getLocalState () {
        return localState
    }
    
</script>