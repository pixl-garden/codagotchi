var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
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
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
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

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
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

    /* webviews\components\Screen1.svelte generated by Svelte v3.59.2 */

    let frame$1 = 0;

    function createCheckerboard$1(rows, cols, frame) {
    	return Array(rows).fill().map((_, rowIndex) => Array(cols).fill().map((_, colIndex) => ({
    		pixel: null,
    		color: (rowIndex + colIndex + frame) % 2 === 0
    		? 'black'
    		: 'white'
    	})));
    }

    function getGrid$2() {
    	frame$1++;
    	return createCheckerboard$1(26, 36, frame$1);
    }

    /* webviews\components\Screen2.svelte generated by Svelte v3.59.2 */

    let frame = 0;

    function createCheckerboard(rows, cols, frame) {
    	return Array(rows).fill().map((_, rowIndex) => Array(cols).fill().map((_, colIndex) => ({
    		pixel: null,
    		color: (rowIndex + colIndex + frame) % 2 === 0
    		? 'blue'
    		: 'white'
    	})));
    }

    function getGrid$1() {
    	frame++;
    	return createCheckerboard(26, 36, frame);
    }

    /* webviews\components\Screen3.svelte generated by Svelte v3.59.2 */

    async function createGridFromImage(imageUri) {
    	return new Promise((resolve, reject) => {
    			let img = new Image();
    			img.src = imageUri;

    			img.onload = function () {
    				let canvas = document.createElement('canvas');
    				canvas.width = img.width;
    				canvas.height = img.height;
    				let ctx = canvas.getContext('2d');
    				ctx.drawImage(img, 0, 0, img.width, img.height);
    				let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    				let data = imageData.data;
    				let grid = [];

    				for (let y = 0; y < img.height; y++) {
    					let row = [];

    					for (let x = 0; x < img.width; x++) {
    						let i = (y * img.width + x) * 4;
    						let a = data[i + 3];
    						let color = a === 0 ? 'clear' : 'black';
    						row.push({ pixel: null, color });
    					}

    					grid.push(row);
    				}

    				resolve(grid);
    			};

    			img.onerror = function () {
    				reject(new Error('Failed to load image'));
    			};
    		});
    }

    async function getGrid(imageUri) {
    	return await createGridFromImage(imageUri);
    }

    /* webviews\components\Sidebar.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "webviews\\components\\Sidebar.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	child_ctx[22] = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	child_ctx[24] = list;
    	child_ctx[25] = i;
    	return child_ctx;
    }

    // (88:8) {#each row as cell, colIndex}
    function create_each_block_1(ctx) {
    	let div;
    	let each_value_1 = /*each_value_1*/ ctx[24];
    	let colIndex = /*colIndex*/ ctx[25];
    	const assign_div = () => /*div_binding*/ ctx[9](div, each_value_1, colIndex);
    	const unassign_div = () => /*div_binding*/ ctx[9](null, each_value_1, colIndex);

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "pixel");
    			set_style(div, "background-color", /*cell*/ ctx[23].color);
    			add_location(div, file, 88, 12, 2897);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			assign_div();
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*$gridStore*/ 2) {
    				set_style(div, "background-color", /*cell*/ ctx[23].color);
    			}

    			if (each_value_1 !== /*each_value_1*/ ctx[24] || colIndex !== /*colIndex*/ ctx[25]) {
    				unassign_div();
    				each_value_1 = /*each_value_1*/ ctx[24];
    				colIndex = /*colIndex*/ ctx[25];
    				assign_div();
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			unassign_div();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(88:8) {#each row as cell, colIndex}",
    		ctx
    	});

    	return block;
    }

    // (87:4) {#each $gridStore as row, rowIndex}
    function create_each_block(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*row*/ ctx[20];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$gridStore*/ 2) {
    				each_value_1 = /*row*/ ctx[20];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(87:4) {#each $gridStore as row, rowIndex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div0;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let button3;
    	let t7;
    	let img;
    	let img_src_value;
    	let t8;
    	let div1;
    	let t9;
    	let div2;
    	let button4;
    	let t11;
    	let button5;
    	let t13;
    	let button6;
    	let t15;
    	let button7;
    	let mounted;
    	let dispose;
    	let each_value = /*$gridStore*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "1";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "2";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "3";
    			t5 = space();
    			button3 = element("button");
    			button3.textContent = "4";
    			t7 = space();
    			img = element("img");
    			t8 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			div2 = element("div");
    			button4 = element("button");
    			button4.textContent = "5";
    			t11 = space();
    			button5 = element("button");
    			button5.textContent = "6";
    			t13 = space();
    			button6 = element("button");
    			button6.textContent = "7";
    			t15 = space();
    			button7 = element("button");
    			button7.textContent = "8";
    			add_location(button0, file, 78, 4, 2468);
    			add_location(button1, file, 79, 4, 2533);
    			add_location(button2, file, 80, 4, 2598);
    			add_location(button3, file, 81, 4, 2663);
    			attr_dev(div0, "class", "button-row");
    			add_location(div0, file, 77, 0, 2438);
    			if (!src_url_equal(img.src, img_src_value = /*$images*/ ctx[0]['pet.png'])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "1");
    			add_location(img, file, 83, 0, 2729);
    			attr_dev(div1, "class", "grid-container");
    			add_location(div1, file, 85, 0, 2775);
    			add_location(button4, file, 94, 4, 3070);
    			add_location(button5, file, 95, 4, 3132);
    			add_location(button6, file, 96, 4, 3194);
    			add_location(button7, file, 97, 4, 3256);
    			attr_dev(div2, "class", "button-row bottom-row");
    			add_location(div2, file, 93, 0, 3029);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			append_dev(div0, button0);
    			append_dev(div0, t1);
    			append_dev(div0, button1);
    			append_dev(div0, t3);
    			append_dev(div0, button2);
    			append_dev(div0, t5);
    			append_dev(div0, button3);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, img, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, div1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div1, null);
    				}
    			}

    			insert_dev(target, t9, anchor);
    			insert_dev(target, div2, anchor);
    			append_dev(div2, button4);
    			append_dev(div2, t11);
    			append_dev(div2, button5);
    			append_dev(div2, t13);
    			append_dev(div2, button6);
    			append_dev(div2, t15);
    			append_dev(div2, button7);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[7], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[8], false, false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[10], false, false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[11], false, false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[12], false, false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[13], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$images*/ 1 && !src_url_equal(img.src, img_src_value = /*$images*/ ctx[0]['pet.png'])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*$gridStore*/ 2) {
    				each_value = /*$gridStore*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div1, null);
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
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function handleButtonClick(buttonId) {
    	console.log(`Button ${buttonId} clicked`);
    }

    function instance($$self, $$props, $$invalidate) {
    	let $images;
    	let $gridStore;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Sidebar', slots, []);
    	let gridStore = writable([]);
    	validate_store(gridStore, 'gridStore');
    	component_subscribe($$self, gridStore, value => $$invalidate(1, $gridStore = value));

    	let screens = {
    		Screen1: getGrid$2,
    		Screen2: getGrid$1,
    		Screen3: getGrid
    	};

    	let currentScreen = 'Screen1';

    	function switchScreen(screenName) {
    		currentScreen = screenName;
    	}

    	//RESIZE HANDLING
    	let width = window.innerWidth;

    	let height = window.innerHeight;
    	let padding = (width - 146) / 2;
    	let images = writable({});
    	validate_store(images, 'images');
    	component_subscribe($$self, images, value => $$invalidate(0, $images = value));

    	onMount(async () => {
    		window.addEventListener('message', event => {
    			const message = event.data;
    			console.log('Received message:', message);

    			if (message.type === 'image-uris') {
    				images.set(message.uris);
    			}
    		});

    		tsvscode.postMessage({ type: 'webview-ready' });
    		window.addEventListener('resize', handleResize);

    		try {
    			// Initialize the grid
    			if (currentScreen === 'Screen3') {
    				gridStore.set(await screens[currentScreen]($images['pet.png']));
    			} else {
    				gridStore.set(await screens[currentScreen]());
    			}
    		} catch(error) {
    			console.error('Failed to load grid:', error);
    		}

    		// Update the grid every 250ms
    		setInterval(
    			async () => {
    				try {
    					if (currentScreen === 'Screen3') {
    						gridStore.set(await screens[currentScreen]($images['pet.png']));
    					} else {
    						gridStore.set(await screens[currentScreen]());
    					}
    				} catch(error) {
    					console.error('Failed to update grid:', error);
    				}
    			},
    			250
    		);
    	});

    	function handleResize() {
    		width = window.innerWidth;
    		height = window.innerHeight;
    		padding = (width - 146) / 2;
    		document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    	}

    	afterUpdate(() => {
    		document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Sidebar> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => switchScreen('Screen1');
    	const click_handler_1 = () => switchScreen('Screen2');
    	const click_handler_2 = () => switchScreen('Screen3');
    	const click_handler_3 = () => handleButtonClick(4);

    	function div_binding($$value, each_value_1, colIndex) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			each_value_1[colIndex].pixel = $$value;
    		});
    	}

    	const click_handler_4 = () => handleButtonClick(5);
    	const click_handler_5 = () => handleButtonClick(6);
    	const click_handler_6 = () => handleButtonClick(7);
    	const click_handler_7 = () => handleButtonClick(8);

    	$$self.$capture_state = () => ({
    		getGrid1: getGrid$2,
    		getGrid2: getGrid$1,
    		getGrid3: getGrid,
    		onMount,
    		afterUpdate,
    		writable,
    		gridStore,
    		screens,
    		currentScreen,
    		switchScreen,
    		width,
    		height,
    		padding,
    		images,
    		handleResize,
    		handleButtonClick,
    		$images,
    		$gridStore
    	});

    	$$self.$inject_state = $$props => {
    		if ('gridStore' in $$props) $$invalidate(2, gridStore = $$props.gridStore);
    		if ('screens' in $$props) screens = $$props.screens;
    		if ('currentScreen' in $$props) currentScreen = $$props.currentScreen;
    		if ('width' in $$props) width = $$props.width;
    		if ('height' in $$props) height = $$props.height;
    		if ('padding' in $$props) padding = $$props.padding;
    		if ('images' in $$props) $$invalidate(4, images = $$props.images);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		$images,
    		$gridStore,
    		gridStore,
    		switchScreen,
    		images,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		div_binding,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7
    	];
    }

    class Sidebar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Sidebar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new Sidebar({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=sidebar.js.map
