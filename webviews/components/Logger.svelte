<script context="module">
    export class Logger {
        constructor(tag){
            this.tag = tag;
            this.enabled = true;
        }
        
        log(...message) {
            if (this.enabled) {
                console.log(`[kododatchi][${this.tag}]`, ...message);
            }
        }
        
        disable() {
            this.enabled = false;
        }
    }
</script>