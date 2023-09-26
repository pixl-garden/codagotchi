var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function get_store_value(store) {
        let value;
        subscribe(store, _ => value = _)();
        return value;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately after the component has been updated.
     *
     * The first time the callback runs will be after the initial `onMount`
     */
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    /* webviews\components\ScreenComponent.svelte generated by Svelte v3.59.2 */

    function generateScreen(sprites, xSize, ySize) {
    	// Initialize an empty screen with the given size
    	let screen = Array(ySize).fill().map(() => Array(xSize).fill(0));

    	sprites.forEach(sprite => {
    		let spriteMatrix = sprite.getMatrix();

    		for (let y = 0; y < spriteMatrix.length; y++) {
    			for (let x = 0; x < spriteMatrix[y].length; x++) {
    				// Ensure we're within the bounds of the screen
    				if (sprite.y + y < ySize && sprite.x + x < xSize) {
    					screen[sprite.x + x][sprite.y + y] |= spriteMatrix[y][x];
    				}
    			}
    		}
    	});

    	return screen;
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const preloadedSpriteSheets = writable({});
    const images = writable({});

    /* webviews\components\SpriteReader.svelte generated by Svelte v3.59.2 */

    function spriteReader(spriteWidth, spriteHeight, spriteSheet) {
    	const binarySheet = get_store_value(preloadedSpriteSheets)[spriteSheet];

    	if (!binarySheet) {
    		console.error("Sprite sheet not preloaded:", spriteSheet);
    		return [];
    	}

    	let sprites = [];

    	for (let y = 0; y <= binarySheet.length - spriteHeight; y += spriteHeight) {
    		for (let x = 0; x <= (binarySheet[y] ? binarySheet[y].length : 0) - spriteWidth; x += spriteWidth) {
    			let sprite = [];

    			for (let sy = 0; sy < spriteHeight; sy++) {
    				if (binarySheet[y + sy]) {
    					sprite.push(binarySheet[y + sy].slice(x, x + spriteWidth));
    				} else {
    					console.warn(`Invalid index y:${y + sy} for spriteSheet:${spriteSheet}`);
    					break;
    				}
    			}

    			if (sprite.length === spriteHeight) {
    				sprites.push(sprite);
    			}
    		}
    	}

    	return sprites;
    }

    async function preloadAllSpriteSheets() {
    	for (let spriteSheet in get_store_value(images)) {
    		const binarySheet = await spriteSheetToBinary(spriteSheet);

    		preloadedSpriteSheets.update(sheets => {
    			sheets[spriteSheet] = binarySheet;
    			return sheets;
    		});
    	}
    }

    async function spriteSheetToBinary(spriteSheet) {
    	const canvas = document.createElement("canvas");
    	const ctx = canvas.getContext("2d", { willReadFrequently: true });

    	return new Promise((resolve, reject) => {
    			const img = new Image();
    			img.src = get_store_value(images)[spriteSheet];

    			img.onload = () => {
    				canvas.width = img.width;
    				canvas.height = img.height;
    				ctx.drawImage(img, 0, 0);
    				let binaryData = [];

    				for (let y = 0; y < img.height; y++) {
    					let row = [];

    					for (let x = 0; x < img.width; x++) {
    						const pixel = ctx.getImageData(x, y, 1, 1).data;

    						if (pixel[3] === 0 || pixel[0] > 250 && pixel[1] > 250 && pixel[2] > 250) {
    							row.push(0);
    						} else {
    							row.push(1);
    						}
    					}

    					binaryData.push(row);
    				}

    				resolve(binaryData);
    			};

    			img.onerror = () => reject("Failed to load image");
    		});
    }

    /* webviews\components\SpriteComponent.svelte generated by Svelte v3.59.2 */

    class Sprite {
    	constructor(matrix, x, y) {
    		this.matrix = matrix;
    		this.x = x;
    		this.y = y;
    	}

    	getPixelValueAt(x, y) {
    		return this.matrix[y][x];
    	}

    	getMatrix() {
    		return this.matrix;
    	}

    	setCoordinate(newX, newY) {
    		this.x = newX;
    		this.y = newY;
    	}
    }

    /* webviews\components\TextRenderer.svelte generated by Svelte v3.59.2 */

    function createTextRenderer(charmap, spriteWidth, spriteHeight, charMappingString) {
    	let charSprites = spriteReader(spriteWidth, spriteHeight, charmap);

    	// Create mapping from charMappingString
    	const charToSpriteIndex = {};

    	for (let i = 0; i < charMappingString.length; i++) {
    		charToSpriteIndex[charMappingString[i]] = i;
    	}

    	return function renderText(text, startX, startY) {
    		let x = startX;
    		let y = startY;
    		let newSprites = [];

    		for (const char of text) {
    			if (char === '\n') {
    				y += spriteHeight;
    				x = startX;
    				continue;
    			}

    			if (charToSpriteIndex[char] !== undefined) {
    				const spriteIndex = charToSpriteIndex[char];
    				const sprite = new Sprite(charSprites[spriteIndex], x, y);
    				newSprites.push(sprite);
    				x += spriteWidth;
    			}
    		}

    		return newSprites;
    	};
    }

    createTextRenderer('charmap1.png', 7, 9, ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`);

    /* webviews\components\Main.svelte generated by Svelte v3.59.2 */
    const spriteStore = writable([]);

    // This is your main game logic function
    function main() {
    	let sprites = spriteReader(7, 9, 'charmap1.png');
    	const sprite1 = new Sprite(sprites[4], 0, 0); // Example

    	// let sprites = renderBasicText("ABC", 0, 0);
    	// Update the store with new data
    	// console.log(sprites)
    	spriteStore.set([sprite1]);
    }

    // When Main.svelte is instantiated, start the game loop
    setInterval(main, 100); // Execute `main` 10 times a second (every 100ms)

    /* webviews\components\Sidebar.svelte generated by Svelte v3.59.2 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    // (50:12) {#each row as cell}
    function create_each_block_1(ctx) {
    	let div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "pixel");
    			set_style(div, "background-color", /*cell*/ ctx[8] ? 'white' : 'transparent');
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*screen*/ 1) {
    				set_style(div, "background-color", /*cell*/ ctx[8] ? 'white' : 'transparent');
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    		}
    	};
    }

    // (48:4) {#each screen as row}
    function create_each_block(ctx) {
    	let div;
    	let t;
    	let each_value_1 = /*row*/ ctx[5];
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t = space();
    			attr(div, "class", "row");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}

    			append(div, t);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*screen*/ 1) {
    				each_value_1 = /*row*/ ctx[5];
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, t);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let div;
    	let each_value = /*screen*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(div, "class", "grid-container");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*screen*/ 1) {
    				each_value = /*screen*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    const SCREENWIDTH = 146;

    function instance($$self, $$props, $$invalidate) {
    	let width = window.innerWidth;
    	let padding = (width - SCREENWIDTH) / 2;
    	let screen = [];

    	onMount(async () => {
    		window.addEventListener('message', async event => {
    			const message = event.data;

    			if (message.type === 'image-uris') {
    				images.set(message.uris);

    				await preloadAllSpriteSheets().then(() => {
    					const unsubscribe = spriteStore.subscribe(sprites => {
    						$$invalidate(0, screen = generateScreen(sprites, 26, 36));
    					});

    					// Unsubscribe when the component is destroyed
    					return () => unsubscribe();
    				});
    			}
    		});

    		tsvscode.postMessage({ type: 'webview-ready' });
    		window.addEventListener('resize', handleResize);
    	});

    	function handleResize() {
    		width = window.innerWidth;
    		padding = (width - SCREENWIDTH) / 2;
    		document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    	}

    	afterUpdate(() => {
    		document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    	});

    	return [screen];
    }

    class Sidebar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new Sidebar({
      target: document.body,
    });

    return app;

})();
//# sourceMappingURL=sidebar.js.map
