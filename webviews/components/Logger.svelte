<script context="module">
    export class Logger {
        constructor(tag){
            this.tag = tag;
            this.enabled = true;
        }
        log(...message) {
            if (this.enabled) {
                for (let m of message) {
                    console.log(`[kododatchi][${this.tag}] ${m}`);
                }
            }
        }
        
        disable() {
            this.enabled = false;
        }
    }
</script>