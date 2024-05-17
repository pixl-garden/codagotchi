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
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function action_destroyer(action_result) {
        return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
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
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
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

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    var store$1 = {};

    var internal = {};

    (function (exports) {

    	Object.defineProperty(exports, '__esModule', { value: true });

    	function noop() { }
    	const identity = x => x;
    	function assign(tar, src) {
    	    // @ts-ignore
    	    for (const k in src)
    	        tar[k] = src[k];
    	    return tar;
    	}
    	// Adapted from https://github.com/then/is-promise/blob/master/index.js
    	// Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
    	function is_promise(value) {
    	    return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
    	}
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
    	function not_equal(a, b) {
    	    return a != a ? b == b : a !== b;
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
    	function get_store_value(store) {
    	    let value;
    	    subscribe(store, _ => value = _)();
    	    return value;
    	}
    	function component_subscribe(component, store, callback) {
    	    component.$$.on_destroy.push(subscribe(store, callback));
    	}
    	function create_slot(definition, ctx, $$scope, fn) {
    	    if (definition) {
    	        const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
    	        return definition[0](slot_ctx);
    	    }
    	}
    	function get_slot_context(definition, ctx, $$scope, fn) {
    	    return definition[1] && fn
    	        ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
    	        : $$scope.ctx;
    	}
    	function get_slot_changes(definition, $$scope, dirty, fn) {
    	    if (definition[2] && fn) {
    	        const lets = definition[2](fn(dirty));
    	        if ($$scope.dirty === undefined) {
    	            return lets;
    	        }
    	        if (typeof lets === 'object') {
    	            const merged = [];
    	            const len = Math.max($$scope.dirty.length, lets.length);
    	            for (let i = 0; i < len; i += 1) {
    	                merged[i] = $$scope.dirty[i] | lets[i];
    	            }
    	            return merged;
    	        }
    	        return $$scope.dirty | lets;
    	    }
    	    return $$scope.dirty;
    	}
    	function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
    	    if (slot_changes) {
    	        const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
    	        slot.p(slot_context, slot_changes);
    	    }
    	}
    	function update_slot(slot, slot_definition, ctx, $$scope, dirty, get_slot_changes_fn, get_slot_context_fn) {
    	    const slot_changes = get_slot_changes(slot_definition, $$scope, dirty, get_slot_changes_fn);
    	    update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn);
    	}
    	function get_all_dirty_from_scope($$scope) {
    	    if ($$scope.ctx.length > 32) {
    	        const dirty = [];
    	        const length = $$scope.ctx.length / 32;
    	        for (let i = 0; i < length; i++) {
    	            dirty[i] = -1;
    	        }
    	        return dirty;
    	    }
    	    return -1;
    	}
    	function exclude_internal_props(props) {
    	    const result = {};
    	    for (const k in props)
    	        if (k[0] !== '$')
    	            result[k] = props[k];
    	    return result;
    	}
    	function compute_rest_props(props, keys) {
    	    const rest = {};
    	    keys = new Set(keys);
    	    for (const k in props)
    	        if (!keys.has(k) && k[0] !== '$')
    	            rest[k] = props[k];
    	    return rest;
    	}
    	function compute_slots(slots) {
    	    const result = {};
    	    for (const key in slots) {
    	        result[key] = true;
    	    }
    	    return result;
    	}
    	function once(fn) {
    	    let ran = false;
    	    return function (...args) {
    	        if (ran)
    	            return;
    	        ran = true;
    	        fn.call(this, ...args);
    	    };
    	}
    	function null_to_empty(value) {
    	    return value == null ? '' : value;
    	}
    	function set_store_value(store, ret, value) {
    	    store.set(value);
    	    return ret;
    	}
    	const has_prop = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    	function action_destroyer(action_result) {
    	    return action_result && is_function(action_result.destroy) ? action_result.destroy : noop;
    	}
    	function split_css_unit(value) {
    	    const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
    	    return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
    	}
    	const contenteditable_truthy_values = ['', true, 1, 'true', 'contenteditable'];

    	const is_client = typeof window !== 'undefined';
    	exports.now = is_client
    	    ? () => window.performance.now()
    	    : () => Date.now();
    	exports.raf = is_client ? cb => requestAnimationFrame(cb) : noop;
    	// used internally for testing
    	function set_now(fn) {
    	    exports.now = fn;
    	}
    	function set_raf(fn) {
    	    exports.raf = fn;
    	}

    	const tasks = new Set();
    	function run_tasks(now) {
    	    tasks.forEach(task => {
    	        if (!task.c(now)) {
    	            tasks.delete(task);
    	            task.f();
    	        }
    	    });
    	    if (tasks.size !== 0)
    	        exports.raf(run_tasks);
    	}
    	/**
    	 * For testing purposes only!
    	 */
    	function clear_loops() {
    	    tasks.clear();
    	}
    	/**
    	 * Creates a new task that runs on each raf frame
    	 * until it returns a falsy value or is aborted
    	 */
    	function loop(callback) {
    	    let task;
    	    if (tasks.size === 0)
    	        exports.raf(run_tasks);
    	    return {
    	        promise: new Promise(fulfill => {
    	            tasks.add(task = { c: callback, f: fulfill });
    	        }),
    	        abort() {
    	            tasks.delete(task);
    	        }
    	    };
    	}

    	const globals = (typeof window !== 'undefined'
    	    ? window
    	    : typeof globalThis !== 'undefined'
    	        ? globalThis
    	        : commonjsGlobal);

    	/**
    	 * Resize observer singleton.
    	 * One listener per element only!
    	 * https://groups.google.com/a/chromium.org/g/blink-dev/c/z6ienONUb5A/m/F5-VcUZtBAAJ
    	 */
    	class ResizeObserverSingleton {
    	    constructor(options) {
    	        this.options = options;
    	        this._listeners = 'WeakMap' in globals ? new WeakMap() : undefined;
    	    }
    	    observe(element, listener) {
    	        this._listeners.set(element, listener);
    	        this._getObserver().observe(element, this.options);
    	        return () => {
    	            this._listeners.delete(element);
    	            this._observer.unobserve(element); // this line can probably be removed
    	        };
    	    }
    	    _getObserver() {
    	        var _a;
    	        return (_a = this._observer) !== null && _a !== void 0 ? _a : (this._observer = new ResizeObserver((entries) => {
    	            var _a;
    	            for (const entry of entries) {
    	                ResizeObserverSingleton.entries.set(entry.target, entry);
    	                (_a = this._listeners.get(entry.target)) === null || _a === void 0 ? void 0 : _a(entry);
    	            }
    	        }));
    	    }
    	}
    	// Needs to be written like this to pass the tree-shake-test
    	ResizeObserverSingleton.entries = 'WeakMap' in globals ? new WeakMap() : undefined;

    	// Track which nodes are claimed during hydration. Unclaimed nodes can then be removed from the DOM
    	// at the end of hydration without touching the remaining nodes.
    	let is_hydrating = false;
    	function start_hydrating() {
    	    is_hydrating = true;
    	}
    	function end_hydrating() {
    	    is_hydrating = false;
    	}
    	function upper_bound(low, high, key, value) {
    	    // Return first index of value larger than input value in the range [low, high)
    	    while (low < high) {
    	        const mid = low + ((high - low) >> 1);
    	        if (key(mid) <= value) {
    	            low = mid + 1;
    	        }
    	        else {
    	            high = mid;
    	        }
    	    }
    	    return low;
    	}
    	function init_hydrate(target) {
    	    if (target.hydrate_init)
    	        return;
    	    target.hydrate_init = true;
    	    // We know that all children have claim_order values since the unclaimed have been detached if target is not <head>
    	    let children = target.childNodes;
    	    // If target is <head>, there may be children without claim_order
    	    if (target.nodeName === 'HEAD') {
    	        const myChildren = [];
    	        for (let i = 0; i < children.length; i++) {
    	            const node = children[i];
    	            if (node.claim_order !== undefined) {
    	                myChildren.push(node);
    	            }
    	        }
    	        children = myChildren;
    	    }
    	    /*
    	    * Reorder claimed children optimally.
    	    * We can reorder claimed children optimally by finding the longest subsequence of
    	    * nodes that are already claimed in order and only moving the rest. The longest
    	    * subsequence of nodes that are claimed in order can be found by
    	    * computing the longest increasing subsequence of .claim_order values.
    	    *
    	    * This algorithm is optimal in generating the least amount of reorder operations
    	    * possible.
    	    *
    	    * Proof:
    	    * We know that, given a set of reordering operations, the nodes that do not move
    	    * always form an increasing subsequence, since they do not move among each other
    	    * meaning that they must be already ordered among each other. Thus, the maximal
    	    * set of nodes that do not move form a longest increasing subsequence.
    	    */
    	    // Compute longest increasing subsequence
    	    // m: subsequence length j => index k of smallest value that ends an increasing subsequence of length j
    	    const m = new Int32Array(children.length + 1);
    	    // Predecessor indices + 1
    	    const p = new Int32Array(children.length);
    	    m[0] = -1;
    	    let longest = 0;
    	    for (let i = 0; i < children.length; i++) {
    	        const current = children[i].claim_order;
    	        // Find the largest subsequence length such that it ends in a value less than our current value
    	        // upper_bound returns first greater value, so we subtract one
    	        // with fast path for when we are on the current longest subsequence
    	        const seqLen = ((longest > 0 && children[m[longest]].claim_order <= current) ? longest + 1 : upper_bound(1, longest, idx => children[m[idx]].claim_order, current)) - 1;
    	        p[i] = m[seqLen] + 1;
    	        const newLen = seqLen + 1;
    	        // We can guarantee that current is the smallest value. Otherwise, we would have generated a longer sequence.
    	        m[newLen] = i;
    	        longest = Math.max(newLen, longest);
    	    }
    	    // The longest increasing subsequence of nodes (initially reversed)
    	    const lis = [];
    	    // The rest of the nodes, nodes that will be moved
    	    const toMove = [];
    	    let last = children.length - 1;
    	    for (let cur = m[longest] + 1; cur != 0; cur = p[cur - 1]) {
    	        lis.push(children[cur - 1]);
    	        for (; last >= cur; last--) {
    	            toMove.push(children[last]);
    	        }
    	        last--;
    	    }
    	    for (; last >= 0; last--) {
    	        toMove.push(children[last]);
    	    }
    	    lis.reverse();
    	    // We sort the nodes being moved to guarantee that their insertion order matches the claim order
    	    toMove.sort((a, b) => a.claim_order - b.claim_order);
    	    // Finally, we move the nodes
    	    for (let i = 0, j = 0; i < toMove.length; i++) {
    	        while (j < lis.length && toMove[i].claim_order >= lis[j].claim_order) {
    	            j++;
    	        }
    	        const anchor = j < lis.length ? lis[j] : null;
    	        target.insertBefore(toMove[i], anchor);
    	    }
    	}
    	function append(target, node) {
    	    target.appendChild(node);
    	}
    	function append_styles(target, style_sheet_id, styles) {
    	    const append_styles_to = get_root_for_style(target);
    	    if (!append_styles_to.getElementById(style_sheet_id)) {
    	        const style = element('style');
    	        style.id = style_sheet_id;
    	        style.textContent = styles;
    	        append_stylesheet(append_styles_to, style);
    	    }
    	}
    	function get_root_for_style(node) {
    	    if (!node)
    	        return document;
    	    const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
    	    if (root && root.host) {
    	        return root;
    	    }
    	    return node.ownerDocument;
    	}
    	function append_empty_stylesheet(node) {
    	    const style_element = element('style');
    	    append_stylesheet(get_root_for_style(node), style_element);
    	    return style_element.sheet;
    	}
    	function append_stylesheet(node, style) {
    	    append(node.head || node, style);
    	    return style.sheet;
    	}
    	function append_hydration(target, node) {
    	    if (is_hydrating) {
    	        init_hydrate(target);
    	        if ((target.actual_end_child === undefined) || ((target.actual_end_child !== null) && (target.actual_end_child.parentNode !== target))) {
    	            target.actual_end_child = target.firstChild;
    	        }
    	        // Skip nodes of undefined ordering
    	        while ((target.actual_end_child !== null) && (target.actual_end_child.claim_order === undefined)) {
    	            target.actual_end_child = target.actual_end_child.nextSibling;
    	        }
    	        if (node !== target.actual_end_child) {
    	            // We only insert if the ordering of this node should be modified or the parent node is not target
    	            if (node.claim_order !== undefined || node.parentNode !== target) {
    	                target.insertBefore(node, target.actual_end_child);
    	            }
    	        }
    	        else {
    	            target.actual_end_child = node.nextSibling;
    	        }
    	    }
    	    else if (node.parentNode !== target || node.nextSibling !== null) {
    	        target.appendChild(node);
    	    }
    	}
    	function insert(target, node, anchor) {
    	    target.insertBefore(node, anchor || null);
    	}
    	function insert_hydration(target, node, anchor) {
    	    if (is_hydrating && !anchor) {
    	        append_hydration(target, node);
    	    }
    	    else if (node.parentNode !== target || node.nextSibling != anchor) {
    	        target.insertBefore(node, anchor || null);
    	    }
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
    	function element_is(name, is) {
    	    return document.createElement(name, { is });
    	}
    	function object_without_properties(obj, exclude) {
    	    const target = {};
    	    for (const k in obj) {
    	        if (has_prop(obj, k)
    	            // @ts-ignore
    	            && exclude.indexOf(k) === -1) {
    	            // @ts-ignore
    	            target[k] = obj[k];
    	        }
    	    }
    	    return target;
    	}
    	function svg_element(name) {
    	    return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    	function comment(content) {
    	    return document.createComment(content);
    	}
    	function listen(node, event, handler, options) {
    	    node.addEventListener(event, handler, options);
    	    return () => node.removeEventListener(event, handler, options);
    	}
    	function prevent_default(fn) {
    	    return function (event) {
    	        event.preventDefault();
    	        // @ts-ignore
    	        return fn.call(this, event);
    	    };
    	}
    	function stop_propagation(fn) {
    	    return function (event) {
    	        event.stopPropagation();
    	        // @ts-ignore
    	        return fn.call(this, event);
    	    };
    	}
    	function stop_immediate_propagation(fn) {
    	    return function (event) {
    	        event.stopImmediatePropagation();
    	        // @ts-ignore
    	        return fn.call(this, event);
    	    };
    	}
    	function self(fn) {
    	    return function (event) {
    	        // @ts-ignore
    	        if (event.target === this)
    	            fn.call(this, event);
    	    };
    	}
    	function trusted(fn) {
    	    return function (event) {
    	        // @ts-ignore
    	        if (event.isTrusted)
    	            fn.call(this, event);
    	    };
    	}
    	function attr(node, attribute, value) {
    	    if (value == null)
    	        node.removeAttribute(attribute);
    	    else if (node.getAttribute(attribute) !== value)
    	        node.setAttribute(attribute, value);
    	}
    	/**
    	 * List of attributes that should always be set through the attr method,
    	 * because updating them through the property setter doesn't work reliably.
    	 * In the example of `width`/`height`, the problem is that the setter only
    	 * accepts numeric values, but the attribute can also be set to a string like `50%`.
    	 * If this list becomes too big, rethink this approach.
    	 */
    	const always_set_through_set_attribute = ['width', 'height'];
    	function set_attributes(node, attributes) {
    	    // @ts-ignore
    	    const descriptors = Object.getOwnPropertyDescriptors(node.__proto__);
    	    for (const key in attributes) {
    	        if (attributes[key] == null) {
    	            node.removeAttribute(key);
    	        }
    	        else if (key === 'style') {
    	            node.style.cssText = attributes[key];
    	        }
    	        else if (key === '__value') {
    	            node.value = node[key] = attributes[key];
    	        }
    	        else if (descriptors[key] && descriptors[key].set && always_set_through_set_attribute.indexOf(key) === -1) {
    	            node[key] = attributes[key];
    	        }
    	        else {
    	            attr(node, key, attributes[key]);
    	        }
    	    }
    	}
    	function set_svg_attributes(node, attributes) {
    	    for (const key in attributes) {
    	        attr(node, key, attributes[key]);
    	    }
    	}
    	function set_custom_element_data_map(node, data_map) {
    	    Object.keys(data_map).forEach((key) => {
    	        set_custom_element_data(node, key, data_map[key]);
    	    });
    	}
    	function set_custom_element_data(node, prop, value) {
    	    if (prop in node) {
    	        node[prop] = typeof node[prop] === 'boolean' && value === '' ? true : value;
    	    }
    	    else {
    	        attr(node, prop, value);
    	    }
    	}
    	function set_dynamic_element_data(tag) {
    	    return (/-/.test(tag)) ? set_custom_element_data_map : set_attributes;
    	}
    	function xlink_attr(node, attribute, value) {
    	    node.setAttributeNS('http://www.w3.org/1999/xlink', attribute, value);
    	}
    	function get_binding_group_value(group, __value, checked) {
    	    const value = new Set();
    	    for (let i = 0; i < group.length; i += 1) {
    	        if (group[i].checked)
    	            value.add(group[i].__value);
    	    }
    	    if (!checked) {
    	        value.delete(__value);
    	    }
    	    return Array.from(value);
    	}
    	function init_binding_group(group) {
    	    let _inputs;
    	    return {
    	        /* push */ p(...inputs) {
    	            _inputs = inputs;
    	            _inputs.forEach(input => group.push(input));
    	        },
    	        /* remove */ r() {
    	            _inputs.forEach(input => group.splice(group.indexOf(input), 1));
    	        }
    	    };
    	}
    	function init_binding_group_dynamic(group, indexes) {
    	    let _group = get_binding_group(group);
    	    let _inputs;
    	    function get_binding_group(group) {
    	        for (let i = 0; i < indexes.length; i++) {
    	            group = group[indexes[i]] = group[indexes[i]] || [];
    	        }
    	        return group;
    	    }
    	    function push() {
    	        _inputs.forEach(input => _group.push(input));
    	    }
    	    function remove() {
    	        _inputs.forEach(input => _group.splice(_group.indexOf(input), 1));
    	    }
    	    return {
    	        /* update */ u(new_indexes) {
    	            indexes = new_indexes;
    	            const new_group = get_binding_group(group);
    	            if (new_group !== _group) {
    	                remove();
    	                _group = new_group;
    	                push();
    	            }
    	        },
    	        /* push */ p(...inputs) {
    	            _inputs = inputs;
    	            push();
    	        },
    	        /* remove */ r: remove
    	    };
    	}
    	function to_number(value) {
    	    return value === '' ? null : +value;
    	}
    	function time_ranges_to_array(ranges) {
    	    const array = [];
    	    for (let i = 0; i < ranges.length; i += 1) {
    	        array.push({ start: ranges.start(i), end: ranges.end(i) });
    	    }
    	    return array;
    	}
    	function children(element) {
    	    return Array.from(element.childNodes);
    	}
    	function init_claim_info(nodes) {
    	    if (nodes.claim_info === undefined) {
    	        nodes.claim_info = { last_index: 0, total_claimed: 0 };
    	    }
    	}
    	function claim_node(nodes, predicate, processNode, createNode, dontUpdateLastIndex = false) {
    	    // Try to find nodes in an order such that we lengthen the longest increasing subsequence
    	    init_claim_info(nodes);
    	    const resultNode = (() => {
    	        // We first try to find an element after the previous one
    	        for (let i = nodes.claim_info.last_index; i < nodes.length; i++) {
    	            const node = nodes[i];
    	            if (predicate(node)) {
    	                const replacement = processNode(node);
    	                if (replacement === undefined) {
    	                    nodes.splice(i, 1);
    	                }
    	                else {
    	                    nodes[i] = replacement;
    	                }
    	                if (!dontUpdateLastIndex) {
    	                    nodes.claim_info.last_index = i;
    	                }
    	                return node;
    	            }
    	        }
    	        // Otherwise, we try to find one before
    	        // We iterate in reverse so that we don't go too far back
    	        for (let i = nodes.claim_info.last_index - 1; i >= 0; i--) {
    	            const node = nodes[i];
    	            if (predicate(node)) {
    	                const replacement = processNode(node);
    	                if (replacement === undefined) {
    	                    nodes.splice(i, 1);
    	                }
    	                else {
    	                    nodes[i] = replacement;
    	                }
    	                if (!dontUpdateLastIndex) {
    	                    nodes.claim_info.last_index = i;
    	                }
    	                else if (replacement === undefined) {
    	                    // Since we spliced before the last_index, we decrease it
    	                    nodes.claim_info.last_index--;
    	                }
    	                return node;
    	            }
    	        }
    	        // If we can't find any matching node, we create a new one
    	        return createNode();
    	    })();
    	    resultNode.claim_order = nodes.claim_info.total_claimed;
    	    nodes.claim_info.total_claimed += 1;
    	    return resultNode;
    	}
    	function claim_element_base(nodes, name, attributes, create_element) {
    	    return claim_node(nodes, (node) => node.nodeName === name, (node) => {
    	        const remove = [];
    	        for (let j = 0; j < node.attributes.length; j++) {
    	            const attribute = node.attributes[j];
    	            if (!attributes[attribute.name]) {
    	                remove.push(attribute.name);
    	            }
    	        }
    	        remove.forEach(v => node.removeAttribute(v));
    	        return undefined;
    	    }, () => create_element(name));
    	}
    	function claim_element(nodes, name, attributes) {
    	    return claim_element_base(nodes, name, attributes, element);
    	}
    	function claim_svg_element(nodes, name, attributes) {
    	    return claim_element_base(nodes, name, attributes, svg_element);
    	}
    	function claim_text(nodes, data) {
    	    return claim_node(nodes, (node) => node.nodeType === 3, (node) => {
    	        const dataStr = '' + data;
    	        if (node.data.startsWith(dataStr)) {
    	            if (node.data.length !== dataStr.length) {
    	                return node.splitText(dataStr.length);
    	            }
    	        }
    	        else {
    	            node.data = dataStr;
    	        }
    	    }, () => text(data), true // Text nodes should not update last index since it is likely not worth it to eliminate an increasing subsequence of actual elements
    	    );
    	}
    	function claim_space(nodes) {
    	    return claim_text(nodes, ' ');
    	}
    	function claim_comment(nodes, data) {
    	    return claim_node(nodes, (node) => node.nodeType === 8, (node) => {
    	        node.data = '' + data;
    	        return undefined;
    	    }, () => comment(data), true);
    	}
    	function find_comment(nodes, text, start) {
    	    for (let i = start; i < nodes.length; i += 1) {
    	        const node = nodes[i];
    	        if (node.nodeType === 8 /* comment node */ && node.textContent.trim() === text) {
    	            return i;
    	        }
    	    }
    	    return nodes.length;
    	}
    	function claim_html_tag(nodes, is_svg) {
    	    // find html opening tag
    	    const start_index = find_comment(nodes, 'HTML_TAG_START', 0);
    	    const end_index = find_comment(nodes, 'HTML_TAG_END', start_index);
    	    if (start_index === end_index) {
    	        return new HtmlTagHydration(undefined, is_svg);
    	    }
    	    init_claim_info(nodes);
    	    const html_tag_nodes = nodes.splice(start_index, end_index - start_index + 1);
    	    detach(html_tag_nodes[0]);
    	    detach(html_tag_nodes[html_tag_nodes.length - 1]);
    	    const claimed_nodes = html_tag_nodes.slice(1, html_tag_nodes.length - 1);
    	    for (const n of claimed_nodes) {
    	        n.claim_order = nodes.claim_info.total_claimed;
    	        nodes.claim_info.total_claimed += 1;
    	    }
    	    return new HtmlTagHydration(claimed_nodes, is_svg);
    	}
    	function set_data(text, data) {
    	    data = '' + data;
    	    if (text.data === data)
    	        return;
    	    text.data = data;
    	}
    	function set_data_contenteditable(text, data) {
    	    data = '' + data;
    	    if (text.wholeText === data)
    	        return;
    	    text.data = data;
    	}
    	function set_data_maybe_contenteditable(text, data, attr_value) {
    	    if (~contenteditable_truthy_values.indexOf(attr_value)) {
    	        set_data_contenteditable(text, data);
    	    }
    	    else {
    	        set_data(text, data);
    	    }
    	}
    	function set_input_value(input, value) {
    	    input.value = value == null ? '' : value;
    	}
    	function set_input_type(input, type) {
    	    try {
    	        input.type = type;
    	    }
    	    catch (e) {
    	        // do nothing
    	    }
    	}
    	function set_style(node, key, value, important) {
    	    if (value == null) {
    	        node.style.removeProperty(key);
    	    }
    	    else {
    	        node.style.setProperty(key, value, important ? 'important' : '');
    	    }
    	}
    	function select_option(select, value, mounting) {
    	    for (let i = 0; i < select.options.length; i += 1) {
    	        const option = select.options[i];
    	        if (option.__value === value) {
    	            option.selected = true;
    	            return;
    	        }
    	    }
    	    if (!mounting || value !== undefined) {
    	        select.selectedIndex = -1; // no option should be selected
    	    }
    	}
    	function select_options(select, value) {
    	    for (let i = 0; i < select.options.length; i += 1) {
    	        const option = select.options[i];
    	        option.selected = ~value.indexOf(option.__value);
    	    }
    	}
    	function select_value(select) {
    	    const selected_option = select.querySelector(':checked');
    	    return selected_option && selected_option.__value;
    	}
    	function select_multiple_value(select) {
    	    return [].map.call(select.querySelectorAll(':checked'), option => option.__value);
    	}
    	// unfortunately this can't be a constant as that wouldn't be tree-shakeable
    	// so we cache the result instead
    	let crossorigin;
    	function is_crossorigin() {
    	    if (crossorigin === undefined) {
    	        crossorigin = false;
    	        try {
    	            if (typeof window !== 'undefined' && window.parent) {
    	                void window.parent.document;
    	            }
    	        }
    	        catch (error) {
    	            crossorigin = true;
    	        }
    	    }
    	    return crossorigin;
    	}
    	function add_iframe_resize_listener(node, fn) {
    	    const computed_style = getComputedStyle(node);
    	    if (computed_style.position === 'static') {
    	        node.style.position = 'relative';
    	    }
    	    const iframe = element('iframe');
    	    iframe.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ' +
    	        'overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: -1;');
    	    iframe.setAttribute('aria-hidden', 'true');
    	    iframe.tabIndex = -1;
    	    const crossorigin = is_crossorigin();
    	    let unsubscribe;
    	    if (crossorigin) {
    	        iframe.src = "data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>";
    	        unsubscribe = listen(window, 'message', (event) => {
    	            if (event.source === iframe.contentWindow)
    	                fn();
    	        });
    	    }
    	    else {
    	        iframe.src = 'about:blank';
    	        iframe.onload = () => {
    	            unsubscribe = listen(iframe.contentWindow, 'resize', fn);
    	            // make sure an initial resize event is fired _after_ the iframe is loaded (which is asynchronous)
    	            // see https://github.com/sveltejs/svelte/issues/4233
    	            fn();
    	        };
    	    }
    	    append(node, iframe);
    	    return () => {
    	        if (crossorigin) {
    	            unsubscribe();
    	        }
    	        else if (unsubscribe && iframe.contentWindow) {
    	            unsubscribe();
    	        }
    	        detach(iframe);
    	    };
    	}
    	const resize_observer_content_box = /* @__PURE__ */ new ResizeObserverSingleton({ box: 'content-box' });
    	const resize_observer_border_box = /* @__PURE__ */ new ResizeObserverSingleton({ box: 'border-box' });
    	const resize_observer_device_pixel_content_box = /* @__PURE__ */ new ResizeObserverSingleton({ box: 'device-pixel-content-box' });
    	function toggle_class(element, name, toggle) {
    	    element.classList[toggle ? 'add' : 'remove'](name);
    	}
    	function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
    	    const e = document.createEvent('CustomEvent');
    	    e.initCustomEvent(type, bubbles, cancelable, detail);
    	    return e;
    	}
    	function query_selector_all(selector, parent = document.body) {
    	    return Array.from(parent.querySelectorAll(selector));
    	}
    	function head_selector(nodeId, head) {
    	    const result = [];
    	    let started = 0;
    	    for (const node of head.childNodes) {
    	        if (node.nodeType === 8 /* comment node */) {
    	            const comment = node.textContent.trim();
    	            if (comment === `HEAD_${nodeId}_END`) {
    	                started -= 1;
    	                result.push(node);
    	            }
    	            else if (comment === `HEAD_${nodeId}_START`) {
    	                started += 1;
    	                result.push(node);
    	            }
    	        }
    	        else if (started > 0) {
    	            result.push(node);
    	        }
    	    }
    	    return result;
    	}
    	class HtmlTag {
    	    constructor(is_svg = false) {
    	        this.is_svg = false;
    	        this.is_svg = is_svg;
    	        this.e = this.n = null;
    	    }
    	    c(html) {
    	        this.h(html);
    	    }
    	    m(html, target, anchor = null) {
    	        if (!this.e) {
    	            if (this.is_svg)
    	                this.e = svg_element(target.nodeName);
    	            /** #7364  target for <template> may be provided as #document-fragment(11) */
    	            else
    	                this.e = element((target.nodeType === 11 ? 'TEMPLATE' : target.nodeName));
    	            this.t = target.tagName !== 'TEMPLATE' ? target : target.content;
    	            this.c(html);
    	        }
    	        this.i(anchor);
    	    }
    	    h(html) {
    	        this.e.innerHTML = html;
    	        this.n = Array.from(this.e.nodeName === 'TEMPLATE' ? this.e.content.childNodes : this.e.childNodes);
    	    }
    	    i(anchor) {
    	        for (let i = 0; i < this.n.length; i += 1) {
    	            insert(this.t, this.n[i], anchor);
    	        }
    	    }
    	    p(html) {
    	        this.d();
    	        this.h(html);
    	        this.i(this.a);
    	    }
    	    d() {
    	        this.n.forEach(detach);
    	    }
    	}
    	class HtmlTagHydration extends HtmlTag {
    	    constructor(claimed_nodes, is_svg = false) {
    	        super(is_svg);
    	        this.e = this.n = null;
    	        this.l = claimed_nodes;
    	    }
    	    c(html) {
    	        if (this.l) {
    	            this.n = this.l;
    	        }
    	        else {
    	            super.c(html);
    	        }
    	    }
    	    i(anchor) {
    	        for (let i = 0; i < this.n.length; i += 1) {
    	            insert_hydration(this.t, this.n[i], anchor);
    	        }
    	    }
    	}
    	function attribute_to_object(attributes) {
    	    const result = {};
    	    for (const attribute of attributes) {
    	        result[attribute.name] = attribute.value;
    	    }
    	    return result;
    	}
    	function get_custom_elements_slots(element) {
    	    const result = {};
    	    element.childNodes.forEach((node) => {
    	        result[node.slot || 'default'] = true;
    	    });
    	    return result;
    	}
    	function construct_svelte_component(component, props) {
    	    return new component(props);
    	}

    	// we need to store the information for multiple documents because a Svelte application could also contain iframes
    	// https://github.com/sveltejs/svelte/issues/3624
    	const managed_styles = new Map();
    	let active = 0;
    	// https://github.com/darkskyapp/string-hash/blob/master/index.js
    	function hash(str) {
    	    let hash = 5381;
    	    let i = str.length;
    	    while (i--)
    	        hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
    	    return hash >>> 0;
    	}
    	function create_style_information(doc, node) {
    	    const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
    	    managed_styles.set(doc, info);
    	    return info;
    	}
    	function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
    	    const step = 16.666 / duration;
    	    let keyframes = '{\n';
    	    for (let p = 0; p <= 1; p += step) {
    	        const t = a + (b - a) * ease(p);
    	        keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
    	    }
    	    const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
    	    const name = `__svelte_${hash(rule)}_${uid}`;
    	    const doc = get_root_for_style(node);
    	    const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
    	    if (!rules[name]) {
    	        rules[name] = true;
    	        stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
    	    }
    	    const animation = node.style.animation || '';
    	    node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
    	    active += 1;
    	    return name;
    	}
    	function delete_rule(node, name) {
    	    const previous = (node.style.animation || '').split(', ');
    	    const next = previous.filter(name
    	        ? anim => anim.indexOf(name) < 0 // remove specific animation
    	        : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
    	    );
    	    const deleted = previous.length - next.length;
    	    if (deleted) {
    	        node.style.animation = next.join(', ');
    	        active -= deleted;
    	        if (!active)
    	            clear_rules();
    	    }
    	}
    	function clear_rules() {
    	    exports.raf(() => {
    	        if (active)
    	            return;
    	        managed_styles.forEach(info => {
    	            const { ownerNode } = info.stylesheet;
    	            // there is no ownerNode if it runs on jsdom.
    	            if (ownerNode)
    	                detach(ownerNode);
    	        });
    	        managed_styles.clear();
    	    });
    	}

    	function create_animation(node, from, fn, params) {
    	    if (!from)
    	        return noop;
    	    const to = node.getBoundingClientRect();
    	    if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
    	        return noop;
    	    const { delay = 0, duration = 300, easing = identity, 
    	    // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
    	    start: start_time = exports.now() + delay, 
    	    // @ts-ignore todo:
    	    end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
    	    let running = true;
    	    let started = false;
    	    let name;
    	    function start() {
    	        if (css) {
    	            name = create_rule(node, 0, 1, duration, delay, easing, css);
    	        }
    	        if (!delay) {
    	            started = true;
    	        }
    	    }
    	    function stop() {
    	        if (css)
    	            delete_rule(node, name);
    	        running = false;
    	    }
    	    loop(now => {
    	        if (!started && now >= start_time) {
    	            started = true;
    	        }
    	        if (started && now >= end) {
    	            tick(1, 0);
    	            stop();
    	        }
    	        if (!running) {
    	            return false;
    	        }
    	        if (started) {
    	            const p = now - start_time;
    	            const t = 0 + 1 * easing(p / duration);
    	            tick(t, 1 - t);
    	        }
    	        return true;
    	    });
    	    start();
    	    tick(0, 1);
    	    return stop;
    	}
    	function fix_position(node) {
    	    const style = getComputedStyle(node);
    	    if (style.position !== 'absolute' && style.position !== 'fixed') {
    	        const { width, height } = style;
    	        const a = node.getBoundingClientRect();
    	        node.style.position = 'absolute';
    	        node.style.width = width;
    	        node.style.height = height;
    	        add_transform(node, a);
    	    }
    	}
    	function add_transform(node, a) {
    	    const b = node.getBoundingClientRect();
    	    if (a.left !== b.left || a.top !== b.top) {
    	        const style = getComputedStyle(node);
    	        const transform = style.transform === 'none' ? '' : style.transform;
    	        node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
    	    }
    	}

    	function set_current_component(component) {
    	    exports.current_component = component;
    	}
    	function get_current_component() {
    	    if (!exports.current_component)
    	        throw new Error('Function called outside component initialization');
    	    return exports.current_component;
    	}
    	/**
    	 * Schedules a callback to run immediately before the component is updated after any state change.
    	 *
    	 * The first time the callback runs will be before the initial `onMount`
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-beforeupdate
    	 */
    	function beforeUpdate(fn) {
    	    get_current_component().$$.before_update.push(fn);
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
    	/**
    	 * Schedules a callback to run immediately before the component is unmounted.
    	 *
    	 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
    	 * only one that runs inside a server-side component.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-ondestroy
    	 */
    	function onDestroy(fn) {
    	    get_current_component().$$.on_destroy.push(fn);
    	}
    	/**
    	 * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
    	 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
    	 *
    	 * Component events created with `createEventDispatcher` create a
    	 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
    	 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
    	 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
    	 * property and can contain any type of data.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
    	 */
    	function createEventDispatcher() {
    	    const component = get_current_component();
    	    return (type, detail, { cancelable = false } = {}) => {
    	        const callbacks = component.$$.callbacks[type];
    	        if (callbacks) {
    	            // TODO are there situations where events could be dispatched
    	            // in a server (non-DOM) environment?
    	            const event = custom_event(type, detail, { cancelable });
    	            callbacks.slice().forEach(fn => {
    	                fn.call(component, event);
    	            });
    	            return !event.defaultPrevented;
    	        }
    	        return true;
    	    };
    	}
    	/**
    	 * Associates an arbitrary `context` object with the current component and the specified `key`
    	 * and returns that object. The context is then available to children of the component
    	 * (including slotted content) with `getContext`.
    	 *
    	 * Like lifecycle functions, this must be called during component initialisation.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-setcontext
    	 */
    	function setContext(key, context) {
    	    get_current_component().$$.context.set(key, context);
    	    return context;
    	}
    	/**
    	 * Retrieves the context that belongs to the closest parent component with the specified `key`.
    	 * Must be called during component initialisation.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-getcontext
    	 */
    	function getContext(key) {
    	    return get_current_component().$$.context.get(key);
    	}
    	/**
    	 * Retrieves the whole context map that belongs to the closest parent component.
    	 * Must be called during component initialisation. Useful, for example, if you
    	 * programmatically create a component and want to pass the existing context to it.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-getallcontexts
    	 */
    	function getAllContexts() {
    	    return get_current_component().$$.context;
    	}
    	/**
    	 * Checks whether a given `key` has been set in the context of a parent component.
    	 * Must be called during component initialisation.
    	 *
    	 * https://svelte.dev/docs#run-time-svelte-hascontext
    	 */
    	function hasContext(key) {
    	    return get_current_component().$$.context.has(key);
    	}
    	// TODO figure out if we still want to support
    	// shorthand events, or if we want to implement
    	// a real bubbling mechanism
    	function bubble(component, event) {
    	    const callbacks = component.$$.callbacks[event.type];
    	    if (callbacks) {
    	        // @ts-ignore
    	        callbacks.slice().forEach(fn => fn.call(this, event));
    	    }
    	}

    	const dirty_components = [];
    	const intros = { enabled: false };
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
    	function tick() {
    	    schedule_update();
    	    return resolved_promise;
    	}
    	function add_render_callback(fn) {
    	    render_callbacks.push(fn);
    	}
    	function add_flush_callback(fn) {
    	    flush_callbacks.push(fn);
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
    	    const saved_component = exports.current_component;
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

    	let promise;
    	function wait() {
    	    if (!promise) {
    	        promise = Promise.resolve();
    	        promise.then(() => {
    	            promise = null;
    	        });
    	    }
    	    return promise;
    	}
    	function dispatch(node, direction, kind) {
    	    node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    	}
    	const outroing = new Set();
    	let outros;
    	function group_outros() {
    	    outros = {
    	        r: 0,
    	        c: [],
    	        p: outros // parent group
    	    };
    	}
    	function check_outros() {
    	    if (!outros.r) {
    	        run_all(outros.c);
    	    }
    	    outros = outros.p;
    	}
    	function transition_in(block, local) {
    	    if (block && block.i) {
    	        outroing.delete(block);
    	        block.i(local);
    	    }
    	}
    	function transition_out(block, local, detach, callback) {
    	    if (block && block.o) {
    	        if (outroing.has(block))
    	            return;
    	        outroing.add(block);
    	        outros.c.push(() => {
    	            outroing.delete(block);
    	            if (callback) {
    	                if (detach)
    	                    block.d(1);
    	                callback();
    	            }
    	        });
    	        block.o(local);
    	    }
    	    else if (callback) {
    	        callback();
    	    }
    	}
    	const null_transition = { duration: 0 };
    	function create_in_transition(node, fn, params) {
    	    const options = { direction: 'in' };
    	    let config = fn(node, params, options);
    	    let running = false;
    	    let animation_name;
    	    let task;
    	    let uid = 0;
    	    function cleanup() {
    	        if (animation_name)
    	            delete_rule(node, animation_name);
    	    }
    	    function go() {
    	        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
    	        if (css)
    	            animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
    	        tick(0, 1);
    	        const start_time = exports.now() + delay;
    	        const end_time = start_time + duration;
    	        if (task)
    	            task.abort();
    	        running = true;
    	        add_render_callback(() => dispatch(node, true, 'start'));
    	        task = loop(now => {
    	            if (running) {
    	                if (now >= end_time) {
    	                    tick(1, 0);
    	                    dispatch(node, true, 'end');
    	                    cleanup();
    	                    return running = false;
    	                }
    	                if (now >= start_time) {
    	                    const t = easing((now - start_time) / duration);
    	                    tick(t, 1 - t);
    	                }
    	            }
    	            return running;
    	        });
    	    }
    	    let started = false;
    	    return {
    	        start() {
    	            if (started)
    	                return;
    	            started = true;
    	            delete_rule(node);
    	            if (is_function(config)) {
    	                config = config(options);
    	                wait().then(go);
    	            }
    	            else {
    	                go();
    	            }
    	        },
    	        invalidate() {
    	            started = false;
    	        },
    	        end() {
    	            if (running) {
    	                cleanup();
    	                running = false;
    	            }
    	        }
    	    };
    	}
    	function create_out_transition(node, fn, params) {
    	    const options = { direction: 'out' };
    	    let config = fn(node, params, options);
    	    let running = true;
    	    let animation_name;
    	    const group = outros;
    	    group.r += 1;
    	    function go() {
    	        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
    	        if (css)
    	            animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
    	        const start_time = exports.now() + delay;
    	        const end_time = start_time + duration;
    	        add_render_callback(() => dispatch(node, false, 'start'));
    	        loop(now => {
    	            if (running) {
    	                if (now >= end_time) {
    	                    tick(0, 1);
    	                    dispatch(node, false, 'end');
    	                    if (!--group.r) {
    	                        // this will result in `end()` being called,
    	                        // so we don't need to clean up here
    	                        run_all(group.c);
    	                    }
    	                    return false;
    	                }
    	                if (now >= start_time) {
    	                    const t = easing((now - start_time) / duration);
    	                    tick(1 - t, t);
    	                }
    	            }
    	            return running;
    	        });
    	    }
    	    if (is_function(config)) {
    	        wait().then(() => {
    	            // @ts-ignore
    	            config = config(options);
    	            go();
    	        });
    	    }
    	    else {
    	        go();
    	    }
    	    return {
    	        end(reset) {
    	            if (reset && config.tick) {
    	                config.tick(1, 0);
    	            }
    	            if (running) {
    	                if (animation_name)
    	                    delete_rule(node, animation_name);
    	                running = false;
    	            }
    	        }
    	    };
    	}
    	function create_bidirectional_transition(node, fn, params, intro) {
    	    const options = { direction: 'both' };
    	    let config = fn(node, params, options);
    	    let t = intro ? 0 : 1;
    	    let running_program = null;
    	    let pending_program = null;
    	    let animation_name = null;
    	    function clear_animation() {
    	        if (animation_name)
    	            delete_rule(node, animation_name);
    	    }
    	    function init(program, duration) {
    	        const d = (program.b - t);
    	        duration *= Math.abs(d);
    	        return {
    	            a: t,
    	            b: program.b,
    	            d,
    	            duration,
    	            start: program.start,
    	            end: program.start + duration,
    	            group: program.group
    	        };
    	    }
    	    function go(b) {
    	        const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
    	        const program = {
    	            start: exports.now() + delay,
    	            b
    	        };
    	        if (!b) {
    	            // @ts-ignore todo: improve typings
    	            program.group = outros;
    	            outros.r += 1;
    	        }
    	        if (running_program || pending_program) {
    	            pending_program = program;
    	        }
    	        else {
    	            // if this is an intro, and there's a delay, we need to do
    	            // an initial tick and/or apply CSS animation immediately
    	            if (css) {
    	                clear_animation();
    	                animation_name = create_rule(node, t, b, duration, delay, easing, css);
    	            }
    	            if (b)
    	                tick(0, 1);
    	            running_program = init(program, duration);
    	            add_render_callback(() => dispatch(node, b, 'start'));
    	            loop(now => {
    	                if (pending_program && now > pending_program.start) {
    	                    running_program = init(pending_program, duration);
    	                    pending_program = null;
    	                    dispatch(node, running_program.b, 'start');
    	                    if (css) {
    	                        clear_animation();
    	                        animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
    	                    }
    	                }
    	                if (running_program) {
    	                    if (now >= running_program.end) {
    	                        tick(t = running_program.b, 1 - t);
    	                        dispatch(node, running_program.b, 'end');
    	                        if (!pending_program) {
    	                            // we're done
    	                            if (running_program.b) {
    	                                // intro — we can tidy up immediately
    	                                clear_animation();
    	                            }
    	                            else {
    	                                // outro — needs to be coordinated
    	                                if (!--running_program.group.r)
    	                                    run_all(running_program.group.c);
    	                            }
    	                        }
    	                        running_program = null;
    	                    }
    	                    else if (now >= running_program.start) {
    	                        const p = now - running_program.start;
    	                        t = running_program.a + running_program.d * easing(p / running_program.duration);
    	                        tick(t, 1 - t);
    	                    }
    	                }
    	                return !!(running_program || pending_program);
    	            });
    	        }
    	    }
    	    return {
    	        run(b) {
    	            if (is_function(config)) {
    	                wait().then(() => {
    	                    // @ts-ignore
    	                    config = config(options);
    	                    go(b);
    	                });
    	            }
    	            else {
    	                go(b);
    	            }
    	        },
    	        end() {
    	            clear_animation();
    	            running_program = pending_program = null;
    	        }
    	    };
    	}

    	function handle_promise(promise, info) {
    	    const token = info.token = {};
    	    function update(type, index, key, value) {
    	        if (info.token !== token)
    	            return;
    	        info.resolved = value;
    	        let child_ctx = info.ctx;
    	        if (key !== undefined) {
    	            child_ctx = child_ctx.slice();
    	            child_ctx[key] = value;
    	        }
    	        const block = type && (info.current = type)(child_ctx);
    	        let needs_flush = false;
    	        if (info.block) {
    	            if (info.blocks) {
    	                info.blocks.forEach((block, i) => {
    	                    if (i !== index && block) {
    	                        group_outros();
    	                        transition_out(block, 1, 1, () => {
    	                            if (info.blocks[i] === block) {
    	                                info.blocks[i] = null;
    	                            }
    	                        });
    	                        check_outros();
    	                    }
    	                });
    	            }
    	            else {
    	                info.block.d(1);
    	            }
    	            block.c();
    	            transition_in(block, 1);
    	            block.m(info.mount(), info.anchor);
    	            needs_flush = true;
    	        }
    	        info.block = block;
    	        if (info.blocks)
    	            info.blocks[index] = block;
    	        if (needs_flush) {
    	            flush();
    	        }
    	    }
    	    if (is_promise(promise)) {
    	        const current_component = get_current_component();
    	        promise.then(value => {
    	            set_current_component(current_component);
    	            update(info.then, 1, info.value, value);
    	            set_current_component(null);
    	        }, error => {
    	            set_current_component(current_component);
    	            update(info.catch, 2, info.error, error);
    	            set_current_component(null);
    	            if (!info.hasCatch) {
    	                throw error;
    	            }
    	        });
    	        // if we previously had a then/catch block, destroy it
    	        if (info.current !== info.pending) {
    	            update(info.pending, 0);
    	            return true;
    	        }
    	    }
    	    else {
    	        if (info.current !== info.then) {
    	            update(info.then, 1, info.value, promise);
    	            return true;
    	        }
    	        info.resolved = promise;
    	    }
    	}
    	function update_await_block_branch(info, ctx, dirty) {
    	    const child_ctx = ctx.slice();
    	    const { resolved } = info;
    	    if (info.current === info.then) {
    	        child_ctx[info.value] = resolved;
    	    }
    	    if (info.current === info.catch) {
    	        child_ctx[info.error] = resolved;
    	    }
    	    info.block.p(child_ctx, dirty);
    	}

    	function destroy_block(block, lookup) {
    	    block.d(1);
    	    lookup.delete(block.key);
    	}
    	function outro_and_destroy_block(block, lookup) {
    	    transition_out(block, 1, 1, () => {
    	        lookup.delete(block.key);
    	    });
    	}
    	function fix_and_destroy_block(block, lookup) {
    	    block.f();
    	    destroy_block(block, lookup);
    	}
    	function fix_and_outro_and_destroy_block(block, lookup) {
    	    block.f();
    	    outro_and_destroy_block(block, lookup);
    	}
    	function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
    	    let o = old_blocks.length;
    	    let n = list.length;
    	    let i = o;
    	    const old_indexes = {};
    	    while (i--)
    	        old_indexes[old_blocks[i].key] = i;
    	    const new_blocks = [];
    	    const new_lookup = new Map();
    	    const deltas = new Map();
    	    const updates = [];
    	    i = n;
    	    while (i--) {
    	        const child_ctx = get_context(ctx, list, i);
    	        const key = get_key(child_ctx);
    	        let block = lookup.get(key);
    	        if (!block) {
    	            block = create_each_block(key, child_ctx);
    	            block.c();
    	        }
    	        else if (dynamic) {
    	            // defer updates until all the DOM shuffling is done
    	            updates.push(() => block.p(child_ctx, dirty));
    	        }
    	        new_lookup.set(key, new_blocks[i] = block);
    	        if (key in old_indexes)
    	            deltas.set(key, Math.abs(i - old_indexes[key]));
    	    }
    	    const will_move = new Set();
    	    const did_move = new Set();
    	    function insert(block) {
    	        transition_in(block, 1);
    	        block.m(node, next);
    	        lookup.set(block.key, block);
    	        next = block.first;
    	        n--;
    	    }
    	    while (o && n) {
    	        const new_block = new_blocks[n - 1];
    	        const old_block = old_blocks[o - 1];
    	        const new_key = new_block.key;
    	        const old_key = old_block.key;
    	        if (new_block === old_block) {
    	            // do nothing
    	            next = new_block.first;
    	            o--;
    	            n--;
    	        }
    	        else if (!new_lookup.has(old_key)) {
    	            // remove old block
    	            destroy(old_block, lookup);
    	            o--;
    	        }
    	        else if (!lookup.has(new_key) || will_move.has(new_key)) {
    	            insert(new_block);
    	        }
    	        else if (did_move.has(old_key)) {
    	            o--;
    	        }
    	        else if (deltas.get(new_key) > deltas.get(old_key)) {
    	            did_move.add(new_key);
    	            insert(new_block);
    	        }
    	        else {
    	            will_move.add(old_key);
    	            o--;
    	        }
    	    }
    	    while (o--) {
    	        const old_block = old_blocks[o];
    	        if (!new_lookup.has(old_block.key))
    	            destroy(old_block, lookup);
    	    }
    	    while (n)
    	        insert(new_blocks[n - 1]);
    	    run_all(updates);
    	    return new_blocks;
    	}
    	function validate_each_keys(ctx, list, get_context, get_key) {
    	    const keys = new Set();
    	    for (let i = 0; i < list.length; i++) {
    	        const key = get_key(get_context(ctx, list, i));
    	        if (keys.has(key)) {
    	            throw new Error('Cannot have duplicate keys in a keyed each');
    	        }
    	        keys.add(key);
    	    }
    	}

    	function get_spread_update(levels, updates) {
    	    const update = {};
    	    const to_null_out = {};
    	    const accounted_for = { $$scope: 1 };
    	    let i = levels.length;
    	    while (i--) {
    	        const o = levels[i];
    	        const n = updates[i];
    	        if (n) {
    	            for (const key in o) {
    	                if (!(key in n))
    	                    to_null_out[key] = 1;
    	            }
    	            for (const key in n) {
    	                if (!accounted_for[key]) {
    	                    update[key] = n[key];
    	                    accounted_for[key] = 1;
    	                }
    	            }
    	            levels[i] = n;
    	        }
    	        else {
    	            for (const key in o) {
    	                accounted_for[key] = 1;
    	            }
    	        }
    	    }
    	    for (const key in to_null_out) {
    	        if (!(key in update))
    	            update[key] = undefined;
    	    }
    	    return update;
    	}
    	function get_spread_object(spread_props) {
    	    return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    	}

    	const _boolean_attributes = [
    	    'allowfullscreen',
    	    'allowpaymentrequest',
    	    'async',
    	    'autofocus',
    	    'autoplay',
    	    'checked',
    	    'controls',
    	    'default',
    	    'defer',
    	    'disabled',
    	    'formnovalidate',
    	    'hidden',
    	    'inert',
    	    'ismap',
    	    'loop',
    	    'multiple',
    	    'muted',
    	    'nomodule',
    	    'novalidate',
    	    'open',
    	    'playsinline',
    	    'readonly',
    	    'required',
    	    'reversed',
    	    'selected'
    	];
    	/**
    	 * List of HTML boolean attributes (e.g. `<input disabled>`).
    	 * Source: https://html.spec.whatwg.org/multipage/indices.html
    	 */
    	const boolean_attributes = new Set([..._boolean_attributes]);

    	/** regex of all html void element names */
    	const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
    	function is_void(name) {
    	    return void_element_names.test(name) || name.toLowerCase() === '!doctype';
    	}

    	const invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
    	// https://html.spec.whatwg.org/multipage/syntax.html#attributes-2
    	// https://infra.spec.whatwg.org/#noncharacter
    	function spread(args, attrs_to_add) {
    	    const attributes = Object.assign({}, ...args);
    	    if (attrs_to_add) {
    	        const classes_to_add = attrs_to_add.classes;
    	        const styles_to_add = attrs_to_add.styles;
    	        if (classes_to_add) {
    	            if (attributes.class == null) {
    	                attributes.class = classes_to_add;
    	            }
    	            else {
    	                attributes.class += ' ' + classes_to_add;
    	            }
    	        }
    	        if (styles_to_add) {
    	            if (attributes.style == null) {
    	                attributes.style = style_object_to_string(styles_to_add);
    	            }
    	            else {
    	                attributes.style = style_object_to_string(merge_ssr_styles(attributes.style, styles_to_add));
    	            }
    	        }
    	    }
    	    let str = '';
    	    Object.keys(attributes).forEach(name => {
    	        if (invalid_attribute_name_character.test(name))
    	            return;
    	        const value = attributes[name];
    	        if (value === true)
    	            str += ' ' + name;
    	        else if (boolean_attributes.has(name.toLowerCase())) {
    	            if (value)
    	                str += ' ' + name;
    	        }
    	        else if (value != null) {
    	            str += ` ${name}="${value}"`;
    	        }
    	    });
    	    return str;
    	}
    	function merge_ssr_styles(style_attribute, style_directive) {
    	    const style_object = {};
    	    for (const individual_style of style_attribute.split(';')) {
    	        const colon_index = individual_style.indexOf(':');
    	        const name = individual_style.slice(0, colon_index).trim();
    	        const value = individual_style.slice(colon_index + 1).trim();
    	        if (!name)
    	            continue;
    	        style_object[name] = value;
    	    }
    	    for (const name in style_directive) {
    	        const value = style_directive[name];
    	        if (value) {
    	            style_object[name] = value;
    	        }
    	        else {
    	            delete style_object[name];
    	        }
    	    }
    	    return style_object;
    	}
    	const ATTR_REGEX = /[&"]/g;
    	const CONTENT_REGEX = /[&<]/g;
    	/**
    	 * Note: this method is performance sensitive and has been optimized
    	 * https://github.com/sveltejs/svelte/pull/5701
    	 */
    	function escape(value, is_attr = false) {
    	    const str = String(value);
    	    const pattern = is_attr ? ATTR_REGEX : CONTENT_REGEX;
    	    pattern.lastIndex = 0;
    	    let escaped = '';
    	    let last = 0;
    	    while (pattern.test(str)) {
    	        const i = pattern.lastIndex - 1;
    	        const ch = str[i];
    	        escaped += str.substring(last, i) + (ch === '&' ? '&amp;' : (ch === '"' ? '&quot;' : '&lt;'));
    	        last = i + 1;
    	    }
    	    return escaped + str.substring(last);
    	}
    	function escape_attribute_value(value) {
    	    // keep booleans, null, and undefined for the sake of `spread`
    	    const should_escape = typeof value === 'string' || (value && typeof value === 'object');
    	    return should_escape ? escape(value, true) : value;
    	}
    	function escape_object(obj) {
    	    const result = {};
    	    for (const key in obj) {
    	        result[key] = escape_attribute_value(obj[key]);
    	    }
    	    return result;
    	}
    	function each(items, fn) {
    	    let str = '';
    	    for (let i = 0; i < items.length; i += 1) {
    	        str += fn(items[i], i);
    	    }
    	    return str;
    	}
    	const missing_component = {
    	    $$render: () => ''
    	};
    	function validate_component(component, name) {
    	    if (!component || !component.$$render) {
    	        if (name === 'svelte:component')
    	            name += ' this={...}';
    	        throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules. Otherwise you may need to fix a <${name}>.`);
    	    }
    	    return component;
    	}
    	function debug(file, line, column, values) {
    	    console.log(`{@debug} ${file ? file + ' ' : ''}(${line}:${column})`); // eslint-disable-line no-console
    	    console.log(values); // eslint-disable-line no-console
    	    return '';
    	}
    	let on_destroy;
    	function create_ssr_component(fn) {
    	    function $$render(result, props, bindings, slots, context) {
    	        const parent_component = exports.current_component;
    	        const $$ = {
    	            on_destroy,
    	            context: new Map(context || (parent_component ? parent_component.$$.context : [])),
    	            // these will be immediately discarded
    	            on_mount: [],
    	            before_update: [],
    	            after_update: [],
    	            callbacks: blank_object()
    	        };
    	        set_current_component({ $$ });
    	        const html = fn(result, props, bindings, slots);
    	        set_current_component(parent_component);
    	        return html;
    	    }
    	    return {
    	        render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
    	            on_destroy = [];
    	            const result = { title: '', head: '', css: new Set() };
    	            const html = $$render(result, props, {}, $$slots, context);
    	            run_all(on_destroy);
    	            return {
    	                html,
    	                css: {
    	                    code: Array.from(result.css).map(css => css.code).join('\n'),
    	                    map: null // TODO
    	                },
    	                head: result.title + result.head
    	            };
    	        },
    	        $$render
    	    };
    	}
    	function add_attribute(name, value, boolean) {
    	    if (value == null || (boolean && !value))
    	        return '';
    	    const assignment = (boolean && value === true) ? '' : `="${escape(value, true)}"`;
    	    return ` ${name}${assignment}`;
    	}
    	function add_classes(classes) {
    	    return classes ? ` class="${classes}"` : '';
    	}
    	function style_object_to_string(style_object) {
    	    return Object.keys(style_object)
    	        .filter(key => style_object[key])
    	        .map(key => `${key}: ${escape_attribute_value(style_object[key])};`)
    	        .join(' ');
    	}
    	function add_styles(style_object) {
    	    const styles = style_object_to_string(style_object);
    	    return styles ? ` style="${styles}"` : '';
    	}

    	function bind(component, name, callback) {
    	    const index = component.$$.props[name];
    	    if (index !== undefined) {
    	        component.$$.bound[index] = callback;
    	        callback(component.$$.ctx[index]);
    	    }
    	}
    	function create_component(block) {
    	    block && block.c();
    	}
    	function claim_component(block, parent_nodes) {
    	    block && block.l(parent_nodes);
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
    	    const parent_component = exports.current_component;
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
    	            start_hydrating();
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
    	        end_hydrating();
    	        flush();
    	    }
    	    set_current_component(parent_component);
    	}
    	if (typeof HTMLElement === 'function') {
    	    exports.SvelteElement = class extends HTMLElement {
    	        constructor() {
    	            super();
    	            this.attachShadow({ mode: 'open' });
    	        }
    	        connectedCallback() {
    	            const { on_mount } = this.$$;
    	            this.$$.on_disconnect = on_mount.map(run).filter(is_function);
    	            // @ts-ignore todo: improve typings
    	            for (const key in this.$$.slotted) {
    	                // @ts-ignore todo: improve typings
    	                this.appendChild(this.$$.slotted[key]);
    	            }
    	        }
    	        attributeChangedCallback(attr, _oldValue, newValue) {
    	            this[attr] = newValue;
    	        }
    	        disconnectedCallback() {
    	            run_all(this.$$.on_disconnect);
    	        }
    	        $destroy() {
    	            destroy_component(this, 1);
    	            this.$destroy = noop;
    	        }
    	        $on(type, callback) {
    	            // TODO should this delegate to addEventListener?
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
    	    };
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
    	function append_hydration_dev(target, node) {
    	    dispatch_dev('SvelteDOMInsert', { target, node });
    	    append_hydration(target, node);
    	}
    	function insert_dev(target, node, anchor) {
    	    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    	    insert(target, node, anchor);
    	}
    	function insert_hydration_dev(target, node, anchor) {
    	    dispatch_dev('SvelteDOMInsert', { target, node, anchor });
    	    insert_hydration(target, node, anchor);
    	}
    	function detach_dev(node) {
    	    dispatch_dev('SvelteDOMRemove', { node });
    	    detach(node);
    	}
    	function detach_between_dev(before, after) {
    	    while (before.nextSibling && before.nextSibling !== after) {
    	        detach_dev(before.nextSibling);
    	    }
    	}
    	function detach_before_dev(after) {
    	    while (after.previousSibling) {
    	        detach_dev(after.previousSibling);
    	    }
    	}
    	function detach_after_dev(before) {
    	    while (before.nextSibling) {
    	        detach_dev(before.nextSibling);
    	    }
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
    	function prop_dev(node, property, value) {
    	    node[property] = value;
    	    dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    	}
    	function dataset_dev(node, property, value) {
    	    node.dataset[property] = value;
    	    dispatch_dev('SvelteDOMSetDataset', { node, property, value });
    	}
    	function set_data_dev(text, data) {
    	    data = '' + data;
    	    if (text.data === data)
    	        return;
    	    dispatch_dev('SvelteDOMSetData', { node: text, data });
    	    text.data = data;
    	}
    	function set_data_contenteditable_dev(text, data) {
    	    data = '' + data;
    	    if (text.wholeText === data)
    	        return;
    	    dispatch_dev('SvelteDOMSetData', { node: text, data });
    	    text.data = data;
    	}
    	function set_data_maybe_contenteditable_dev(text, data, attr_value) {
    	    if (~contenteditable_truthy_values.indexOf(attr_value)) {
    	        set_data_contenteditable_dev(text, data);
    	    }
    	    else {
    	        set_data_dev(text, data);
    	    }
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
    	function validate_dynamic_element(tag) {
    	    const is_string = typeof tag === 'string';
    	    if (tag && !is_string) {
    	        throw new Error('<svelte:element> expects "this" attribute to be a string.');
    	    }
    	}
    	function validate_void_dynamic_element(tag) {
    	    if (tag && is_void(tag)) {
    	        console.warn(`<svelte:element this="${tag}"> is self-closing and cannot have content.`);
    	    }
    	}
    	function construct_svelte_component_dev(component, props) {
    	    const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
    	    try {
    	        const instance = new component(props);
    	        if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
    	            throw new Error(error_message);
    	        }
    	        return instance;
    	    }
    	    catch (err) {
    	        const { message } = err;
    	        if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
    	            throw new Error(error_message);
    	        }
    	        else {
    	            throw err;
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
    	/**
    	 * Base class to create strongly typed Svelte components.
    	 * This only exists for typing purposes and should be used in `.d.ts` files.
    	 *
    	 * ### Example:
    	 *
    	 * You have component library on npm called `component-library`, from which
    	 * you export a component called `MyComponent`. For Svelte+TypeScript users,
    	 * you want to provide typings. Therefore you create a `index.d.ts`:
    	 * ```ts
    	 * import { SvelteComponentTyped } from "svelte";
    	 * export class MyComponent extends SvelteComponentTyped<{foo: string}> {}
    	 * ```
    	 * Typing this makes it possible for IDEs like VS Code with the Svelte extension
    	 * to provide intellisense and to use the component like this in a Svelte file
    	 * with TypeScript:
    	 * ```svelte
    	 * <script lang="ts">
    	 * 	import { MyComponent } from "component-library";
    	 * </script>
    	 * <MyComponent foo={'bar'} />
    	 * ```
    	 *
    	 * #### Why not make this part of `SvelteComponent(Dev)`?
    	 * Because
    	 * ```ts
    	 * class ASubclassOfSvelteComponent extends SvelteComponent<{foo: string}> {}
    	 * const component: typeof SvelteComponent = ASubclassOfSvelteComponent;
    	 * ```
    	 * will throw a type error, so we need to separate the more strictly typed class.
    	 */
    	class SvelteComponentTyped extends SvelteComponentDev {
    	    constructor(options) {
    	        super(options);
    	    }
    	}
    	function loop_guard(timeout) {
    	    const start = Date.now();
    	    return () => {
    	        if (Date.now() - start > timeout) {
    	            throw new Error('Infinite loop detected');
    	        }
    	    };
    	}

    	exports.HtmlTag = HtmlTag;
    	exports.HtmlTagHydration = HtmlTagHydration;
    	exports.ResizeObserverSingleton = ResizeObserverSingleton;
    	exports.SvelteComponent = SvelteComponent;
    	exports.SvelteComponentDev = SvelteComponentDev;
    	exports.SvelteComponentTyped = SvelteComponentTyped;
    	exports.action_destroyer = action_destroyer;
    	exports.add_attribute = add_attribute;
    	exports.add_classes = add_classes;
    	exports.add_flush_callback = add_flush_callback;
    	exports.add_iframe_resize_listener = add_iframe_resize_listener;
    	exports.add_location = add_location;
    	exports.add_render_callback = add_render_callback;
    	exports.add_styles = add_styles;
    	exports.add_transform = add_transform;
    	exports.afterUpdate = afterUpdate;
    	exports.append = append;
    	exports.append_dev = append_dev;
    	exports.append_empty_stylesheet = append_empty_stylesheet;
    	exports.append_hydration = append_hydration;
    	exports.append_hydration_dev = append_hydration_dev;
    	exports.append_styles = append_styles;
    	exports.assign = assign;
    	exports.attr = attr;
    	exports.attr_dev = attr_dev;
    	exports.attribute_to_object = attribute_to_object;
    	exports.beforeUpdate = beforeUpdate;
    	exports.bind = bind;
    	exports.binding_callbacks = binding_callbacks;
    	exports.blank_object = blank_object;
    	exports.bubble = bubble;
    	exports.check_outros = check_outros;
    	exports.children = children;
    	exports.claim_comment = claim_comment;
    	exports.claim_component = claim_component;
    	exports.claim_element = claim_element;
    	exports.claim_html_tag = claim_html_tag;
    	exports.claim_space = claim_space;
    	exports.claim_svg_element = claim_svg_element;
    	exports.claim_text = claim_text;
    	exports.clear_loops = clear_loops;
    	exports.comment = comment;
    	exports.component_subscribe = component_subscribe;
    	exports.compute_rest_props = compute_rest_props;
    	exports.compute_slots = compute_slots;
    	exports.construct_svelte_component = construct_svelte_component;
    	exports.construct_svelte_component_dev = construct_svelte_component_dev;
    	exports.contenteditable_truthy_values = contenteditable_truthy_values;
    	exports.createEventDispatcher = createEventDispatcher;
    	exports.create_animation = create_animation;
    	exports.create_bidirectional_transition = create_bidirectional_transition;
    	exports.create_component = create_component;
    	exports.create_in_transition = create_in_transition;
    	exports.create_out_transition = create_out_transition;
    	exports.create_slot = create_slot;
    	exports.create_ssr_component = create_ssr_component;
    	exports.custom_event = custom_event;
    	exports.dataset_dev = dataset_dev;
    	exports.debug = debug;
    	exports.destroy_block = destroy_block;
    	exports.destroy_component = destroy_component;
    	exports.destroy_each = destroy_each;
    	exports.detach = detach;
    	exports.detach_after_dev = detach_after_dev;
    	exports.detach_before_dev = detach_before_dev;
    	exports.detach_between_dev = detach_between_dev;
    	exports.detach_dev = detach_dev;
    	exports.dirty_components = dirty_components;
    	exports.dispatch_dev = dispatch_dev;
    	exports.each = each;
    	exports.element = element;
    	exports.element_is = element_is;
    	exports.empty = empty;
    	exports.end_hydrating = end_hydrating;
    	exports.escape = escape;
    	exports.escape_attribute_value = escape_attribute_value;
    	exports.escape_object = escape_object;
    	exports.exclude_internal_props = exclude_internal_props;
    	exports.fix_and_destroy_block = fix_and_destroy_block;
    	exports.fix_and_outro_and_destroy_block = fix_and_outro_and_destroy_block;
    	exports.fix_position = fix_position;
    	exports.flush = flush;
    	exports.flush_render_callbacks = flush_render_callbacks;
    	exports.getAllContexts = getAllContexts;
    	exports.getContext = getContext;
    	exports.get_all_dirty_from_scope = get_all_dirty_from_scope;
    	exports.get_binding_group_value = get_binding_group_value;
    	exports.get_current_component = get_current_component;
    	exports.get_custom_elements_slots = get_custom_elements_slots;
    	exports.get_root_for_style = get_root_for_style;
    	exports.get_slot_changes = get_slot_changes;
    	exports.get_spread_object = get_spread_object;
    	exports.get_spread_update = get_spread_update;
    	exports.get_store_value = get_store_value;
    	exports.globals = globals;
    	exports.group_outros = group_outros;
    	exports.handle_promise = handle_promise;
    	exports.hasContext = hasContext;
    	exports.has_prop = has_prop;
    	exports.head_selector = head_selector;
    	exports.identity = identity;
    	exports.init = init;
    	exports.init_binding_group = init_binding_group;
    	exports.init_binding_group_dynamic = init_binding_group_dynamic;
    	exports.insert = insert;
    	exports.insert_dev = insert_dev;
    	exports.insert_hydration = insert_hydration;
    	exports.insert_hydration_dev = insert_hydration_dev;
    	exports.intros = intros;
    	exports.invalid_attribute_name_character = invalid_attribute_name_character;
    	exports.is_client = is_client;
    	exports.is_crossorigin = is_crossorigin;
    	exports.is_empty = is_empty;
    	exports.is_function = is_function;
    	exports.is_promise = is_promise;
    	exports.is_void = is_void;
    	exports.listen = listen;
    	exports.listen_dev = listen_dev;
    	exports.loop = loop;
    	exports.loop_guard = loop_guard;
    	exports.merge_ssr_styles = merge_ssr_styles;
    	exports.missing_component = missing_component;
    	exports.mount_component = mount_component;
    	exports.noop = noop;
    	exports.not_equal = not_equal;
    	exports.null_to_empty = null_to_empty;
    	exports.object_without_properties = object_without_properties;
    	exports.onDestroy = onDestroy;
    	exports.onMount = onMount;
    	exports.once = once;
    	exports.outro_and_destroy_block = outro_and_destroy_block;
    	exports.prevent_default = prevent_default;
    	exports.prop_dev = prop_dev;
    	exports.query_selector_all = query_selector_all;
    	exports.resize_observer_border_box = resize_observer_border_box;
    	exports.resize_observer_content_box = resize_observer_content_box;
    	exports.resize_observer_device_pixel_content_box = resize_observer_device_pixel_content_box;
    	exports.run = run;
    	exports.run_all = run_all;
    	exports.safe_not_equal = safe_not_equal;
    	exports.schedule_update = schedule_update;
    	exports.select_multiple_value = select_multiple_value;
    	exports.select_option = select_option;
    	exports.select_options = select_options;
    	exports.select_value = select_value;
    	exports.self = self;
    	exports.setContext = setContext;
    	exports.set_attributes = set_attributes;
    	exports.set_current_component = set_current_component;
    	exports.set_custom_element_data = set_custom_element_data;
    	exports.set_custom_element_data_map = set_custom_element_data_map;
    	exports.set_data = set_data;
    	exports.set_data_contenteditable = set_data_contenteditable;
    	exports.set_data_contenteditable_dev = set_data_contenteditable_dev;
    	exports.set_data_dev = set_data_dev;
    	exports.set_data_maybe_contenteditable = set_data_maybe_contenteditable;
    	exports.set_data_maybe_contenteditable_dev = set_data_maybe_contenteditable_dev;
    	exports.set_dynamic_element_data = set_dynamic_element_data;
    	exports.set_input_type = set_input_type;
    	exports.set_input_value = set_input_value;
    	exports.set_now = set_now;
    	exports.set_raf = set_raf;
    	exports.set_store_value = set_store_value;
    	exports.set_style = set_style;
    	exports.set_svg_attributes = set_svg_attributes;
    	exports.space = space;
    	exports.split_css_unit = split_css_unit;
    	exports.spread = spread;
    	exports.src_url_equal = src_url_equal;
    	exports.start_hydrating = start_hydrating;
    	exports.stop_immediate_propagation = stop_immediate_propagation;
    	exports.stop_propagation = stop_propagation;
    	exports.subscribe = subscribe;
    	exports.svg_element = svg_element;
    	exports.text = text;
    	exports.tick = tick;
    	exports.time_ranges_to_array = time_ranges_to_array;
    	exports.to_number = to_number;
    	exports.toggle_class = toggle_class;
    	exports.transition_in = transition_in;
    	exports.transition_out = transition_out;
    	exports.trusted = trusted;
    	exports.update_await_block_branch = update_await_block_branch;
    	exports.update_keyed_each = update_keyed_each;
    	exports.update_slot = update_slot;
    	exports.update_slot_base = update_slot_base;
    	exports.validate_component = validate_component;
    	exports.validate_dynamic_element = validate_dynamic_element;
    	exports.validate_each_argument = validate_each_argument;
    	exports.validate_each_keys = validate_each_keys;
    	exports.validate_slots = validate_slots;
    	exports.validate_store = validate_store;
    	exports.validate_void_dynamic_element = validate_void_dynamic_element;
    	exports.xlink_attr = xlink_attr; 
    } (internal));

    (function (exports) {

    	Object.defineProperty(exports, '__esModule', { value: true });

    	var internal$1 = internal;

    	const subscriber_queue = [];
    	/**
    	 * Creates a `Readable` store that allows reading by subscription.
    	 * @param value initial value
    	 * @param {StartStopNotifier} [start]
    	 */
    	function readable(value, start) {
    	    return {
    	        subscribe: writable(value, start).subscribe
    	    };
    	}
    	/**
    	 * Create a `Writable` store that allows both updating and reading by subscription.
    	 * @param {*=}value initial value
    	 * @param {StartStopNotifier=} start
    	 */
    	function writable(value, start = internal$1.noop) {
    	    let stop;
    	    const subscribers = new Set();
    	    function set(new_value) {
    	        if (internal$1.safe_not_equal(value, new_value)) {
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
    	    function subscribe(run, invalidate = internal$1.noop) {
    	        const subscriber = [run, invalidate];
    	        subscribers.add(subscriber);
    	        if (subscribers.size === 1) {
    	            stop = start(set) || internal$1.noop;
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
    	function derived(stores, fn, initial_value) {
    	    const single = !Array.isArray(stores);
    	    const stores_array = single
    	        ? [stores]
    	        : stores;
    	    const auto = fn.length < 2;
    	    return readable(initial_value, (set) => {
    	        let started = false;
    	        const values = [];
    	        let pending = 0;
    	        let cleanup = internal$1.noop;
    	        const sync = () => {
    	            if (pending) {
    	                return;
    	            }
    	            cleanup();
    	            const result = fn(single ? values[0] : values, set);
    	            if (auto) {
    	                set(result);
    	            }
    	            else {
    	                cleanup = internal$1.is_function(result) ? result : internal$1.noop;
    	            }
    	        };
    	        const unsubscribers = stores_array.map((store, i) => internal$1.subscribe(store, (value) => {
    	            values[i] = value;
    	            pending &= ~(1 << i);
    	            if (started) {
    	                sync();
    	            }
    	        }, () => {
    	            pending |= (1 << i);
    	        }));
    	        started = true;
    	        sync();
    	        return function stop() {
    	            internal$1.run_all(unsubscribers);
    	            cleanup();
    	            // We need to set this to false because callbacks can still happen despite having unsubscribed:
    	            // Callbacks might already be placed in the queue which doesn't know it should no longer
    	            // invoke this derived store.
    	            started = false;
    	        };
    	    });
    	}
    	/**
    	 * Takes a store and returns a new one derived from the old one that is readable.
    	 *
    	 * @param store - store to make readonly
    	 */
    	function readonly(store) {
    	    return {
    	        subscribe: store.subscribe.bind(store)
    	    };
    	}

    	Object.defineProperty(exports, 'get', {
    		enumerable: true,
    		get: function () {
    			return internal$1.get_store_value;
    		}
    	});
    	exports.derived = derived;
    	exports.readable = readable;
    	exports.readonly = readonly;
    	exports.writable = writable; 
    } (store$1));

    const { writable: writable$1 } = store$1;

    const preloadedSpriteSheets = writable$1({});
    const images = writable$1({});
    const spritesLoaded = writable$1(false);

    var store = {
        preloadedSpriteSheets: preloadedSpriteSheets,
        images: images,
        spritesLoaded: spritesLoaded,
    };

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

    /* webviews\components\SpriteReader.svelte generated by Svelte v3.59.2 */

    function spriteReader(spriteWidth, spriteHeight, pixelMatrix) {
    	if (!pixelMatrix || !Array.isArray(pixelMatrix) || pixelMatrix.length === 0) {
    		console.error('Invalid sprite matrix provided:', pixelMatrix);
    		return [];
    	}

    	// Check if pixelMatrix[0] is defined and is an array
    	if (!pixelMatrix[0] || !Array.isArray(pixelMatrix[0])) {
    		console.error('Invalid sprite matrix[0] provided:', pixelMatrix[0]);
    		return [];
    	}

    	let sprites = [];
    	const spriteCountWidth = Math.floor(pixelMatrix[0].length / spriteWidth); // Use Math.floor() here
    	const spriteCountHeight = Math.floor(pixelMatrix.length / spriteHeight); // Optional: Also here for consistency

    	// Loop over each sprite
    	for (let y = 0; y < spriteCountHeight; y++) {
    		for (let x = 0; x < spriteCountWidth; x++) {
    			let sprite = [];

    			// Each y level of sprite
    			for (let sy = 0; sy < spriteHeight; sy++) {
    				if (pixelMatrix[y * spriteHeight + sy]) {
    					// Add the x level of sprite as an array
    					sprite.push(pixelMatrix[y * spriteHeight + sy].slice(x * spriteWidth, (x + 1) * spriteWidth));
    				} else {
    					console.warn(`Invalid index y:${y + sy}`);
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

    function spriteReaderFromStore(spriteWidth, spriteHeight, spriteSheetFile) {
    	const preloaded = get_store_value(store.preloadedSpriteSheets);

    	if (!preloaded) {
    		console.error('preloadedSpriteSheets is undefined');
    		return [];
    	}

    	const pixelSheet = preloaded[spriteSheetFile];

    	if (!pixelSheet) {
    		console.error('Sprite sheet not preloaded:', spriteSheetFile);
    		return [];
    	}

    	return spriteReader(spriteWidth, spriteHeight, pixelSheet);
    }

    async function preloadAllSpriteSheets() {
    	for (let spriteSheet in get_store_value(store.images)) {
    		const pixelSheet = await spriteSheetToPixels(spriteSheet);

    		store.preloadedSpriteSheets.update(sheets => {
    			sheets[spriteSheet] = pixelSheet;
    			return sheets;
    		});
    	}
    }

    async function spriteSheetToPixels(spriteSheet) {
    	const canvas = document.createElement('canvas');
    	const ctx = canvas.getContext('2d', { willReadFrequently: true });
    	const imgs = get_store_value(store.images);

    	if (!imgs) {
    		console.error('images store is undefined');
    		return [];
    	}

    	const src = imgs[spriteSheet];

    	if (!src) {
    		console.error('Image not found in images store:', spriteSheet);
    		return [];
    	}

    	return new Promise((resolve, reject) => {
    			const img = new Image();
    			img.src = get_store_value(store.images)[spriteSheet];

    			img.onload = () => {
    				canvas.width = img.width;
    				canvas.height = img.height;
    				ctx.drawImage(img, 0, 0);
    				let colorData = [];

    				for (let y = 0; y < img.height; y++) {
    					let row = [];

    					for (let x = 0; x < img.width; x++) {
    						const pixel = ctx.getImageData(x, y, 1, 1).data;

    						if (pixel[3] === 0) {
    							row.push('transparent');
    						} else {
    							const hexColor = '#' + ((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1).toUpperCase();
    							row.push(hexColor);
    						}
    					}

    					colorData.push(row);
    				}

    				resolve(colorData);
    			};

    			img.onerror = () => reject('Failed to load image');
    		});
    }

    /* webviews\components\MatrixFunctions.svelte generated by Svelte v3.59.2 */

    function generateEmptyMatrix(width, height) {
    	const sprite = [];

    	for (let i = 0; i < height; i++) {
    		const row = Array(width).fill('transparent');
    		sprite.push(row);
    	}

    	return sprite;
    }

    function generateRectangleMatrix(width, height, color) {
    	const sprite = [];

    	for (let i = 0; i < height; i++) {
    		const row = Array(width).fill(color);
    		sprite.push(row);
    	}

    	return sprite;
    }

    function generateRoundedRectangleMatrix(width, height, color, rounding) {
    	const sprite = [];

    	// Cap the rounding to half the width or height, whichever is smallest
    	rounding = Math.min(rounding, height / 2, width / 2);

    	// Function to check if a pixel should be colored based on rounded corners
    	function shouldColorPixel(x, y) {
    		// Check for corners
    		if (x < rounding && y < rounding) {
    			// Top-left corner
    			return (x - rounding) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
    		}

    		if (x >= width - rounding && y < rounding) {
    			// Top-right corner
    			return (x - (width - 1 - rounding)) ** 2 + (y - rounding) ** 2 <= rounding ** 2;
    		}

    		if (x < rounding && y >= height - rounding) {
    			// Bottom-left corner
    			return (x - rounding) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
    		}

    		if (x >= width - rounding && y >= height - rounding) {
    			// Bottom-right corner
    			return (x - (width - 1 - rounding)) ** 2 + (y - (height - 1 - rounding)) ** 2 <= rounding ** 2;
    		}

    		return true; // All non-corner cases
    	}

    	// Fill the sprite matrix
    	for (let y = 0; y < height; y++) {
    		const row = [];

    		for (let x = 0; x < width; x++) {
    			row.push(shouldColorPixel(x, y) ? color : 'transparent');
    		}

    		sprite.push(row);
    	}

    	return sprite;
    }

    function overlayMatrix(
    	baseSprite,
    overlaySprite,
    baseXOffset = 0,
    baseYOffset = 0,
    overlayXOffset = 0,
    overlayYOffset = 0
    ) {
    	// Define size of result sprite
    	const outWidth = Math.max(baseSprite[0].length + baseXOffset, overlaySprite[0].length + overlayXOffset);

    	const outHeight = Math.max(baseSprite.length + baseYOffset, overlaySprite.length + overlayYOffset);
    	let outSprite = generateEmptyMatrix(outWidth, outHeight);

    	for (let y = 0; y < outHeight; y++) {
    		for (let x = 0; x < outWidth; x++) {
    			// Calculate coordinates in base and overlay sprites
    			const baseX = x - baseXOffset;

    			const baseY = y - baseYOffset;
    			const overlayX = x - overlayXOffset;
    			const overlayY = y - overlayYOffset;

    			// Check if we are within the bounds of the overlay sprite
    			if (overlayX >= 0 && overlayX < overlaySprite[0].length && overlayY >= 0 && overlayY < overlaySprite.length && overlaySprite[overlayY][overlayX] !== 'transparent') {
    				outSprite[y][x] = overlaySprite[overlayY][overlayX];
    			} else // Check if we are within the bounds of the base sprite
    			if (baseX >= 0 && baseX < baseSprite[0].length && baseY >= 0 && baseY < baseSprite.length) {
    				outSprite[y][x] = baseSprite[baseY][baseX];
    			} else // Otherwise, set to transparent
    			{
    				outSprite[y][x] = 'transparent';
    			}
    		}
    	}

    	return outSprite;
    }

    function concatenateMatrixes(matrix1, matrix2) {
    	//Function used to create sprite sheets (adds matrix2 to the right of matrix1)
    	if (matrix1.length !== matrix2.length) {
    		throw new Error('Both matrices must have the same number of rows');
    	}

    	const concatenated = [];

    	for (let i = 0; i < matrix1.length; i++) {
    		concatenated.push([...matrix1[i], ...matrix2[i]]);
    	}

    	return concatenated;
    }

    function replaceMatrixColor(matrix, colorToReplace, replacementColor) {
    	//Deep copy the matrix to avoid modifying the original (because javascript is stupid)
    	let outputMatrix = JSON.parse(JSON.stringify(matrix));

    	if (!matrix || !Array.isArray(matrix)) {
    		console.error('Invalid matrix provided:', matrix);
    		return;
    	}

    	for (let y = 0; y < matrix.length; y++) {
    		for (let x = 0; x < matrix[y].length; x++) {
    			if (matrix[y][x] === colorToReplace) {
    				outputMatrix[y][x] = replacementColor;
    			}
    		}
    	}

    	return outputMatrix;
    }

    function generateButtonMatrix(
    	width,
    height,
    bgColor,
    borderColor,
    displaySprite,
    bottomShadowColor = null,
    topShadowColor = null,
    layout = "center",
    offset = 0
    ) {
    	const outerSprite = generateRectangleMatrix(width, height, borderColor);
    	const innerWidth = width - 2;
    	const innerHeight = height - 2;
    	const innerSprite = generateRectangleMatrix(innerWidth, innerHeight, bgColor);

    	// Overlay the inner sprite onto the outer sprite to create the button
    	let buttonSprite = overlayMatrix(outerSprite, innerSprite, 0, 0, 1, 1);

    	// If top shadow color is provided, generate a shadow strip and overlay it
    	if (topShadowColor) {
    		const topShadowHorizontal = generateRectangleMatrix(innerWidth, 1, topShadowColor);
    		const topShadowVertical = generateRectangleMatrix(1, innerHeight, topShadowColor); // Extend to the full height
    		buttonSprite = overlayMatrix(buttonSprite, topShadowHorizontal, 0, 0, 1, 1);
    		buttonSprite = overlayMatrix(buttonSprite, topShadowVertical, 0, 0, 1, 1);
    	}

    	// If bottom shadow color is provided, generate a shadow strip and overlay it
    	if (bottomShadowColor) {
    		const bottomShadowHorizontal = generateRectangleMatrix(innerWidth, 1, bottomShadowColor);
    		const bottomShadowVertical = generateRectangleMatrix(1, innerHeight, bottomShadowColor); // Extend to the full height
    		buttonSprite = overlayMatrix(buttonSprite, bottomShadowHorizontal, 0, 0, 1, height - 2);
    		buttonSprite = overlayMatrix(buttonSprite, bottomShadowVertical, 0, 0, width - 2, 1);
    	}

    	let displaySpriteX;

    	if (layout === "center") {
    		displaySpriteX = Math.floor((innerWidth - displaySprite[0].length) / 2) + 1;
    	} else if (layout === "left") {
    		displaySpriteX = 1 + offset;
    	} else if (layout === "right") {
    		displaySpriteX = innerWidth - displaySprite[0].length - offset;
    	} else {
    		displaySpriteX = Math.floor((innerWidth - displaySprite[0].length) / 2) + 1;
    	}

    	let displaySpriteY = Math.floor((innerHeight - displaySprite.length) / 2) + 1;

    	// Overlay the sprite in the center of the button
    	const finalButtonSprite = overlayMatrix(buttonSprite, displaySprite, 0, 0, displaySpriteX, displaySpriteY);

    	return finalButtonSprite;
    }

    function generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, filledWidth, roundness) {
    	const backgroundSprite = generateRoundedRectangleMatrix(width, height, borderColor, roundness);
    	const innerBackground = generateRoundedRectangleMatrix(width - 2, height - 2, bgColor, roundness);
    	let statusBarSprite = overlayMatrix(backgroundSprite, innerBackground, 0, 0, 1, 1);

    	// Create the border overlay sprite by replacing the background color with transparent
    	let borderSprite = replaceMatrixColor(statusBarSprite, bgColor, 'transparent');

    	if (filledWidth > 0) {
    		// Adjust the filledWidth to account for the border
    		filledWidth = Math.min(filledWidth, width - 2);

    		let filledStatusBarSprite = generateRoundedRectangleMatrix(filledWidth, height - 2, statusBarColor, roundness);

    		// Overlay the filled status bar onto the combined border and background sprite
    		statusBarSprite = overlayMatrix(statusBarSprite, filledStatusBarSprite, 0, 0, 1, 1);

    		// Overlay the border onto the filled status bar sprite to cover up overlaps
    		statusBarSprite = overlayMatrix(statusBarSprite, borderSprite, 0, 0, 0, 0);
    	}

    	return statusBarSprite;
    }

    function generateStatusBarSpriteSheet(width, height, borderColor, bgColor, statusBarColor, roundness) {
    	let spriteSheet = [];

    	for (let i = 0; i < width - 2; i++) {
    		const statusBarSprite = generateStatusBarSprite(width, height, borderColor, bgColor, statusBarColor, i, roundness);

    		if (i === 0) {
    			spriteSheet = statusBarSprite;
    		} else {
    			spriteSheet = concatenateMatrixes(spriteSheet, statusBarSprite);
    		}
    	}

    	return spriteReader(width, height, spriteSheet);
    }

    function generateTextInputMatrix(
    	width,
    height,
    bgColor,
    borderColor,
    textSprite,
    roundness,
    textXOffset,
    borderThickness = 1
    ) {
    	// Ensure the border thickness doesn't exceed half the width or height of the sprite
    	borderThickness = Math.min(borderThickness, Math.floor(width / 2), Math.floor(height / 2));

    	// Create the outer rounded rectangle sprite for the border
    	const outerSprite = generateRoundedRectangleMatrix(width, height, borderColor, roundness);

    	// Adjust the innerWidth and innerHeight based on the border thickness
    	const innerWidth = width - borderThickness * 2;

    	const innerHeight = height - borderThickness * 2;

    	// Create the inner rounded rectangle sprite for the input field background and cap roundness to half the width or height, whichever is smallest
    	const innerRoundness = Math.min(roundness, Math.floor(innerWidth / 2), Math.floor(innerHeight / 2));

    	const innerSprite = generateRoundedRectangleMatrix(innerWidth, innerHeight, bgColor, innerRoundness);

    	// Overlay the inner sprite onto the outer sprite to create the text input background and offset it by the border thickness
    	let textInputSprite = overlayMatrix(outerSprite, innerSprite, 0, 0, borderThickness, borderThickness);

    	// Calculate the Y offset for the text
    	const textYOffset = Math.floor((innerHeight - textSprite.length) / 2) + borderThickness;

    	// Overlay the text sprite on the left side of the text input, starting after the border thickness
    	textInputSprite = overlayMatrix(textInputSprite, textSprite, 0, 0, textXOffset + borderThickness, textYOffset);

    	return textInputSprite;
    }

    function generateTooltipSprite(titleText, borderColor, backgroundColor, rounding, padding, textRenderer) {
    	// Use the textRenderer to get the text sprite matrix for the titleText
    	const textSprite = textRenderer(titleText);

    	// Calculate the tooltip background dimensions based on the text dimensions and padding
    	const backgroundWidth = textSprite[0].length + padding * 2 + 1;

    	const backgroundHeight = textSprite.length + padding * 2;

    	// Generate the rounded rectangle matrix for the tooltip background
    	const backgroundSprite = generateRoundedRectangleMatrix(backgroundWidth, backgroundHeight, backgroundColor, rounding);

    	// Overlay the text sprite onto the background sprite, centered
    	const textXOffset = padding;

    	const textYOffset = padding;
    	const tooltipSprite = overlayMatrix(backgroundSprite, textSprite, 0, 0, textXOffset, textYOffset);

    	// Optionally, if you want a border around the tooltip, you can first generate a larger background for the border
    	const borderBackgroundSprite = generateRoundedRectangleMatrix(backgroundWidth + 2, backgroundHeight + 2, borderColor, rounding + 1);

    	// Then overlay the tooltip sprite (background + text) onto this border sprite
    	const finalTooltipSprite = overlayMatrix(borderBackgroundSprite, tooltipSprite, 0, 0, 1, 1);

    	return finalTooltipSprite;
    }

    /* webviews\components\TextRenderer.svelte generated by Svelte v3.59.2 */

    function createTextRenderer(
    	charmap,
    spriteWidth,
    spriteHeight,
    backgroundColor,
    renderColor,
    letterSpacing = 0,
    charMappingString,
    textShadowColor = null,
    textShadowXOffset = 0,
    textShadowYOffset = 0
    ) {
    	let charSprites = spriteReaderFromStore(spriteWidth, spriteHeight, charmap);
    	const charsArray = Array.from(charMappingString);
    	const charToSpriteIndex = {};

    	for (let i = 0; i < charsArray.length; i++) {
    		charToSpriteIndex[charsArray[i]] = i;
    	}

    	return function renderText(text) {
    		if (typeof text !== 'string') {
    			throw new Error('renderText: Text must be a string');
    		}

    		// Create a larger matrix to accommodate shadows
    		const matrixWidth = text.length * (spriteWidth + letterSpacing);

    		const matrixHeight = spriteHeight + Math.abs(textShadowYOffset);
    		const matrix = Array(matrixHeight).fill(null).map(() => Array(matrixWidth).fill(backgroundColor));

    		for (let i = 0; i < text.length; i++) {
    			const char = text[i];

    			if (charToSpriteIndex[char] !== undefined) {
    				const spriteIndex = charToSpriteIndex[char];
    				const sprite = charSprites[spriteIndex];

    				// Render shadow first if enabled
    				if (textShadowColor !== null) {
    					for (let y = 0; y < spriteHeight; y++) {
    						for (let x = 0; x < spriteWidth; x++) {
    							// Calculate position for shadow
    							const posX = i * (spriteWidth + letterSpacing) + x + textShadowXOffset;

    							const posY = y + textShadowYOffset;

    							// Apply shadow color if the current pixel is not transparent
    							if (sprite[y][x] !== backgroundColor) {
    								matrix[posY][posX] = textShadowColor;
    							}
    						}
    					}
    				}

    				// Then render the character itself
    				for (let y = 0; y < spriteHeight; y++) {
    					for (let x = 0; x < spriteWidth; x++) {
    						// Calculate position for character
    						const posX = i * (spriteWidth + letterSpacing) + x;

    						const posY = y;

    						// Apply character color if the current pixel is not transparent
    						if (sprite[y][x] !== backgroundColor) {
    							matrix[posY][posX] = renderColor;
    						}
    					}
    				}
    			}
    		}

    		// Finally, convert all backgroundColor pixels to 'transparent'
    		for (let y = 0; y < matrixHeight; y++) {
    			for (let x = 0; x < matrixWidth; x++) {
    				if (matrix[y][x] === backgroundColor) {
    					matrix[y][x] = 'transparent';
    				}
    			}
    		}

    		// Now trim the empty columns from the matrix
    		let firstNonEmptyColumn = 0;

    		let lastNonEmptyColumn = matrixWidth - 1;

    		// Find the first non-empty column from the left
    		while (firstNonEmptyColumn < matrixWidth && isColumnEmpty(matrix, firstNonEmptyColumn)) {
    			firstNonEmptyColumn++;
    		}

    		// Find the first non-empty column from the right
    		while (lastNonEmptyColumn >= 0 && isColumnEmpty(matrix, lastNonEmptyColumn)) {
    			lastNonEmptyColumn--;
    		}

    		// If there are empty columns on either side, slice the matrix to exclude them
    		if (firstNonEmptyColumn > 0 || lastNonEmptyColumn < matrixWidth - 1) {
    			for (let i = 0; i < matrix.length; i++) {
    				matrix[i] = matrix[i].slice(firstNonEmptyColumn, lastNonEmptyColumn + 1);
    			}
    		}

    		return matrix;
    	};
    }

    // Function to check if a column is empty (transparent)
    function isColumnEmpty(matrix, columnIndex) {
    	for (let i = 0; i < matrix.length; i++) {
    		if (matrix[i][columnIndex] !== 'transparent') {
    			return false;
    		}
    	}

    	return true;
    }

    /* webviews\components\SpriteComponent.svelte generated by Svelte v3.59.2 */

    class Sprite {
    	constructor(matrix, x, y, z = 0) {
    		this.matrix = matrix;
    		this.x = x;
    		this.y = y;
    		this.z = z;
    	}

    	getZ() {
    		return this.z;
    	}

    	getPixelValueAt(x, y) {
    		return this.matrix[y][x];
    	}

    	getMatrix() {
    		return this.matrix;
    	}

    	setCoordinate(newX, newY, newZ) {
    		this.x = newX;
    		this.y = newY;
    		this.z = newZ;
    	}
    }

    /* webviews\components\ScreenManager.svelte generated by Svelte v3.59.2 */

    const GRIDWIDTH$1 = 128;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const pixelSize = Math.min(width / GRIDWIDTH$1, height / GRIDWIDTH$1);
    let screenWidth$1 = GRIDWIDTH$1 * pixelSize;

    function generateScreen(sprites, xSize, ySize) {
    	// Initialize an empty screen with the given size
    	let screen = Array(ySize).fill().map(() => Array(xSize).fill('transparent'));

    	sprites.sort((a, b) => a.getZ() - b.getZ());

    	sprites.forEach(sprite => {
    		let spriteMatrix = sprite.getMatrix();

    		// Calculate the bounds for y and x within the screen and sprite matrix
    		if (spriteMatrix !== undefined || spriteMatrix !== null) {
    			let spriteMatrixYLen = spriteMatrix ? spriteMatrix.length : 0;
    			let spriteMatrixXLen = spriteMatrix ? spriteMatrix[0].length : 0;
    			let startY = Math.max(0, sprite.y);
    			let endY = Math.min(ySize, sprite.y + spriteMatrixYLen);
    			let startX = Math.max(0, sprite.x);
    			let endX = Math.min(xSize, sprite.x + spriteMatrixXLen);

    			for (let y = startY; y < endY; y++) {
    				let matrixY = y - sprite.y;

    				for (let x = startX; x < endX; x++) {
    					let matrixX = x - sprite.x;

    					if (spriteMatrix[matrixY][matrixX] !== 'transparent') {
    						screen[x][y] = spriteMatrix[matrixY][matrixX]; // Swap x and y here
    					}
    				}
    			}
    		}
    	});

    	return screen;
    }

    function handleResize() {
    	console.log("handleResize");
    	updateDimensions();
    	updateStyles();
    }

    function getPixelSize() {
    	return pixelSize;
    }

    function updateDimensions() {
    	width = window.innerWidth;
    	height = window.innerHeight;

    	// pixelSize = Math.min(width / GRIDWIDTH, height / GRIDWIDTH);
    	// screenWidth = Math.floor(GRIDWIDTH * pixelSize);
    	screenWidth$1 = width;
    } // console.log("width: " + width + " height: " + height + " pixelSize: " + pixelSize + " screenWidth: " + screenWidth);

    function updateStyles() {
    	// document.documentElement.style.setProperty('--container-padding', `${padding}px`);
    	document.documentElement.style.setProperty('--pixel-size', `${pixelSize}px`);

    	document.documentElement.style.setProperty('--screen-width', `${screenWidth$1}px`);
    }

    var tomatoSoup = {
    	type: "food",
    	displayName: "Tomato Soup",
    	spriteSheet: "testItems.png",
    	spriteIndex: 0,
    	description: "soup",
    	hunger: 5,
    	thirst: 1,
    	energy: 1
    };
    var coffee = {
    	type: "food",
    	displayName: "Coffee",
    	spriteSheet: "testItems.png",
    	spriteIndex: 1,
    	description: "mmmmm",
    	hunger: 0,
    	thirst: 2,
    	energy: 5
    };
    var fishingRod = {
    	type: "tool",
    	displayName: "Fishing Rod",
    	spriteSheet: "testItems.png",
    	spriteIndex: 2,
    	description: "rod",
    	hunger: 0,
    	thirst: 0,
    	energy: 0
    };
    var redHerring = {
    	type: "food",
    	displayName: "Red Herring",
    	spriteSheet: "testItems.png",
    	spriteIndex: 3,
    	description: "fish",
    	hunger: 3,
    	thirst: 1,
    	energy: 1
    };
    var tropicalFish = {
    	type: "food",
    	displayName: "Tropical Fish",
    	spriteSheet: "testItems.png",
    	spriteIndex: 4,
    	description: "fish",
    	hunger: 3,
    	thirst: 1,
    	energy: 1
    };
    var potion = {
    	type: "food",
    	displayName: "Potion",
    	spriteSheet: "testItem.png",
    	spriteIndex: 0,
    	description: "potion",
    	hunger: 0,
    	thirst: 0,
    	energy: 0
    };
    var itemConfig = {
    	tomatoSoup: tomatoSoup,
    	coffee: coffee,
    	fishingRod: fishingRod,
    	redHerring: redHerring,
    	tropicalFish: tropicalFish,
    	potion: potion
    };

    var spriteWidth = 32;
    var spriteHeight = 32;
    var spriteSheet = "hats.png";
    var leaf = {
    	anchorX: 8,
    	anchorY: 5,
    	spriteIndex: 0
    };
    var marge = {
    	anchorX: 14,
    	anchorY: 23,
    	spriteIndex: 1
    };
    var partyDots = {
    	anchorX: 15,
    	anchorY: 8,
    	spriteIndex: 2
    };
    var partySpiral = {
    	anchorX: 19,
    	anchorY: 13,
    	spriteIndex: 3
    };
    var superSaiyan = {
    	anchorX: 12,
    	anchorY: 15,
    	spriteIndex: 4
    };
    var hatConfig = {
    	spriteWidth: spriteWidth,
    	spriteHeight: spriteHeight,
    	spriteSheet: spriteSheet,
    	leaf: leaf,
    	marge: marge,
    	partyDots: partyDots,
    	partySpiral: partySpiral,
    	superSaiyan: superSaiyan
    };

    var pearguin = {
    	spriteWidth: 48,
    	spriteHeight: 48,
    	spriteSheet: "pearguin.png",
    	states: {
    		"default": [
    			0
    		],
    		flop: [
    			0,
    			"...",
    			23
    		]
    	},
    	stateGroups: {
    	}
    };
    var petConfig = {
    	pearguin: pearguin
    };

    var objectType1 = {
    	spriteWidth: 7,
    	spriteHeight: 9,
    	states: {
    		hidden: [
    			5
    		],
    		visible: [
    			1
    		]
    	}
    };
    var objectType2 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "dinowalk.png",
    	states: {
    		hidden: [
    			0,
    			1,
    			2,
    			3,
    			4,
    			5,
    			6,
    			7,
    			8,
    			9,
    			10,
    			11,
    			12,
    			13,
    			14,
    			15,
    			16
    		],
    		visible: [
    			1,
    			2,
    			3,
    			4,
    			5,
    			6,
    			7,
    			8,
    			9
    		]
    	}
    };
    var objectType3 = {
    	spriteWidth: 48,
    	spriteHeight: 48,
    	spriteSheet: "color_test.png",
    	states: {
    		"default": [
    			0,
    			"...",
    			14
    		],
    		visible: [
    			1,
    			2,
    			3,
    			4,
    			5,
    			6,
    			7,
    			8,
    			9
    		]
    	}
    };
    var buttonObject = {
    	spriteWidth: 24,
    	spriteHeight: 12,
    	spriteSheet: "buttontest.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var checkButton = {
    	spriteWidth: 16,
    	spriteHeight: 13,
    	spriteSheet: "checkButton.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var rejectButton = {
    	spriteWidth: 13,
    	spriteHeight: 13,
    	spriteSheet: "rejectButton.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var shopButton = {
    	spriteWidth: 32,
    	spriteHeight: 16,
    	spriteSheet: "shop.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var mainMenuButton = {
    	spriteWidth: 16,
    	spriteHeight: 16,
    	spriteSheet: "menuButtonSprite.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var vanityBackground = {
    	spriteWidth: 96,
    	spriteHeight: 96,
    	spriteSheet: "vanitySliding.png",
    	states: {
    		"default": [
    			0
    		],
    		slide: [
    			1,
    			"...",
    			25
    		],
    		open: [
    			25
    		],
    		slideBack: [
    			25,
    			24,
    			23,
    			22,
    			21,
    			20,
    			19,
    			18,
    			17,
    			16,
    			15,
    			14,
    			13,
    			12,
    			11,
    			10,
    			9,
    			8,
    			7,
    			6,
    			5,
    			4,
    			3,
    			2,
    			1
    		]
    	}
    };
    var customizeUI = {
    	spriteWidth: 77,
    	spriteHeight: 64,
    	spriteSheet: "customizeUI.png",
    	states: {
    		"default": [
    			0
    		]
    	}
    };
    var vendingBackground = {
    	spriteWidth: 96,
    	spriteHeight: 96,
    	spriteSheet: "vending.png",
    	states: {
    		"default": [
    			0
    		]
    	}
    };
    var postcardBackground = {
    	spriteWidth: 128,
    	spriteHeight: 128,
    	spriteSheet: "postcard.png",
    	states: {
    		"default": [
    			0
    		]
    	}
    };
    var itemSlot = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "itemSlot.png",
    	states: {
    		"default": [
    			0
    		],
    		hovered: [
    			1
    		]
    	}
    };
    var testItem = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItem.png",
    	states: {
    		"default": [
    			0
    		]
    	}
    };
    var testItem1 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItems.png",
    	states: {
    		"default": [
    			0
    		]
    	}
    };
    var testItem2 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItems.png",
    	states: {
    		"default": [
    			1
    		]
    	}
    };
    var testItem3 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItems.png",
    	states: {
    		"default": [
    			2
    		]
    	}
    };
    var testItem4 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItems.png",
    	states: {
    		"default": [
    			3
    		]
    	}
    };
    var testItem5 = {
    	spriteWidth: 32,
    	spriteHeight: 32,
    	spriteSheet: "testItems.png",
    	states: {
    		"default": [
    			4
    		]
    	}
    };
    var objectConfig = {
    	objectType1: objectType1,
    	objectType2: objectType2,
    	objectType3: objectType3,
    	buttonObject: buttonObject,
    	checkButton: checkButton,
    	rejectButton: rejectButton,
    	shopButton: shopButton,
    	mainMenuButton: mainMenuButton,
    	vanityBackground: vanityBackground,
    	customizeUI: customizeUI,
    	vendingBackground: vendingBackground,
    	postcardBackground: postcardBackground,
    	itemSlot: itemSlot,
    	testItem: testItem,
    	testItem1: testItem1,
    	testItem2: testItem2,
    	testItem3: testItem3,
    	testItem4: testItem4,
    	testItem5: testItem5
    };

    /* webviews\components\Object.svelte generated by Svelte v3.59.2 */

    class GeneratedObject {
    	constructor(sprites, states, x, y, z, actionOnClick = null) {
    		if (!sprites) {
    			console.error(`Sprite matrix not found for object with states: ${states}`);
    		}

    		if (!states) {
    			states = { default: [0] };
    		}

    		this.setCoordinate(x, y, z);
    		this.actionOnClick = actionOnClick;
    		this.scrollable = false;

    		// State and Sprite management variables
    		this.sprites = sprites;

    		this.spriteWidth = sprites[0][0].length;
    		this.spriteHeight = sprites[0].length;
    		this.states = processStates(states);
    		this.state = 'default';
    		this.currentStateIndex = 0;
    		this.currentSpriteIndex = this.states[this.state] ? this.states[this.state][0] : 0;
    		this.stateQueue = [];
    		this.isStateCompleted = false;
    		this.callbackQueue = [];
    		this.currentStateCallback = null;

    		// Constants for second-order dynamics
    		this.k1 = 7.0; // Damping ratio

    		this.k2 = .5; // Natural frequency
    		this.k3 = 2.0; // Reference input

    		// Variables for second-order dynamics
    		this.previousX = x;

    		this.previousY = y;
    		this.velocityX = 0;
    		this.velocityY = 0;
    		this.targetX = x; // Target position X
    		this.targetY = y; // Target position Y
    		this.accumulatedMoveX = 0;
    		this.accumulatedMoveY = 0;
    		this.isMoving = false;
    		this.framesPerSecond = 30; //this should probably be abstracted to a global variable
    		this.timeStep = 1 / this.framesPerSecond;
    		this.velocityThreshold = 0.2;

    		//Child object management variables
    		this.children = [];

    		this.hoverWithChildren = false; // If true, parent object will hover when children are hovered
    		this.renderChildren = true; // If true, parent object will render children, otherwise only parent will render
    		this.hoveredChild = null;

    		// Variables for passing mouse coordinates to object if needed
    		this.passMouseCoords = false;

    		this.mouseX = null;
    		this.mouseY = null;
    	}

    	// Function to start moving towards a target
    	startMovingTo(newTargetX, newTargetY) {
    		this.targetX = newTargetX;
    		this.targetY = newTargetY;
    		console.log();

    		// console.log("MOVING TO: ", this.targetX, this.targetY);
    		this.isMoving = true;
    	}

    	updatePosition() {
    		if (!this.isMoving) {
    			return; // No need to update if the object is not moving
    		}

    		// Calculate the estimated velocity
    		let estimatedVelocityX = this.x - this.previousX;

    		let estimatedVelocityY = this.y - this.previousY;

    		// Update previous positions
    		this.previousX = this.x;

    		this.previousY = this.y;

    		// Calculate the acceleration based on second-order dynamics
    		let accelerationX = this.k3 * (this.targetX - this.x) - this.k1 * estimatedVelocityX;

    		let accelerationY = this.k3 * (this.targetY - this.y) - this.k1 * estimatedVelocityY;

    		// Update velocities
    		this.velocityX += accelerationX * this.timeStep;

    		this.velocityY += accelerationY * this.timeStep;

    		// Accumulate sub-pixel movements
    		this.accumulatedMoveX += this.velocityX;

    		this.accumulatedMoveY += this.velocityY;

    		// Update positions by integer values if accumulated movement exceeds 1 pixel
    		let moveX = Math.round(this.accumulatedMoveX);

    		let moveY = Math.round(this.accumulatedMoveY);

    		// Apply the integer movement
    		this.x += moveX;

    		this.y += moveY;

    		// Subtract the integer movement from the accumulated movement
    		this.accumulatedMoveX -= moveX;

    		this.accumulatedMoveY -= moveY;
    		console.log(`X: ${this.x}, Y: ${this.y}, TargetX: ${this.targetX}, TargetY: ${this.targetY}`);
    		console.log(`VelocityX: ${this.velocityX}, VelocityY: ${this.velocityY}`);
    		console.log(`AccumulatedMoveX: ${this.accumulatedMoveX}, AccumulatedMoveY: ${this.accumulatedMoveY}`);

    		// Check if the object has reached (or overshot) the target position
    		if (Math.abs(this.targetX - this.x) < 1 && Math.abs(this.velocityX) < this.velocityThreshold && (Math.abs(this.targetY - this.y) < 1 && Math.abs(this.velocityY) < this.velocityThreshold)) {
    			console.log("REACHED TARGET");
    			this.x = this.targetX;
    			this.y = this.targetY;

    			// Explicitly reset velocities and accumulated movements
    			this.velocityX = 0;

    			this.velocityY = 0;
    			this.accumulatedMoveX = 0;
    			this.accumulatedMoveY = 0;
    			this.isMoving = false;
    		}
    	}

    	nextFrame() {
    		if (this.isMoving) {
    			this.updatePosition();
    		}

    		// Avoid unneccessary frame update if object has only one state and no queued states
    		if (this.state.length <= 1 && this.stateQueue.length == 0) {
    			return;
    		}

    		// Define sprites for current state
    		const stateSprites = this.config.states[this.state];

    		// If the state index exceeds the state length, reset to first sprite in state
    		if (this.currentStateIndex >= stateSprites.length) {
    			this.currentSpriteIndex = stateSprites[0];
    			this.currentStateIndex = 0;
    			this.isStateCompleted = true;
    			this.executeCurrentStateCallback();
    			this.nextState();
    		} else // Otherwise, set the current sprite to the next sprite in the state
    		{
    			this.currentSpriteIndex = stateSprites[this.currentStateIndex++];
    		}
    	}

    	onHover() {
    		
    	}

    	onStopHover() {
    		
    	}

    	whileHover() {
    		
    	}

    	clickAction(gridX, gridY) {
    		this.actionOnClick(gridX, gridY);
    	}

    	getWidth() {
    		return this.spriteWidth;
    	}

    	getHeight() {
    		return this.spriteHeight;
    	}

    	getZ() {
    		return this.z;
    	}

    	setCoordinate(newX, newY, newZ) {
    		this.x = newX;
    		this.y = newY;
    		this.z = newZ;
    	}

    	getSprite() {
    		return new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z);
    	}

    	getChildSprites() {
    		let childSprites = [];

    		const accumulateChildSprites = (parent, offsetX = 0, offsetY = 0) => {
    			for (let child of parent.children) {
    				let childSprite = child.getSprite();

    				if (childSprite != null) {
    					// Apply both the current parent's offset and any accumulated offset from ancestors
    					childSprite.x += offsetX + parent.x;

    					childSprite.y += offsetY + parent.y;
    					childSprites.push(childSprite);
    				}

    				// If the child has its own children, recursively accumulate their sprites too
    				if (child.children.length > 0) {
    					accumulateChildSprites(child, offsetX + parent.x, offsetY + parent.y);
    				}
    			}
    		};

    		// Start the recursive accumulation with the current object as the root
    		accumulateChildSprites(this);

    		return childSprites;
    	}

    	// Method to update the object's state
    	// callback is an optional function to be called when the state is completed
    	updateState(newState, callback = null) {
    		if (this.states[newState]) {
    			this.state = newState;
    			this.currentSpriteIndex = this.states[newState][0];
    			this.isStateCompleted = false;
    			this.currentStateCallback = callback; // Store the callback
    		}
    	}

    	getChildren() {
    		return this.children;
    	}

    	addChild(child) {
    		this.children.push(child);
    	}

    	// Method to register button parameters
    	// TODO: REMOVE THIS FUNCTION (replace with robust child system)
    	registerButtonParams(buttonParams) {
    		this.buttonParams = buttonParams;
    	}

    	//TODO: REMOVE THIS FUNCTION (replace with robust child system)
    	initializeButtons() {
    		this.buttonParams.forEach(param => {
    			const { xOffset, yOffset, zOffset, buttonObject, actionOnClick } = param;

    			// Calculate absolute positions by adding offsets to the object's position
    			const buttonX = xOffset;

    			const buttonY = yOffset;
    			const buttonZ = zOffset;
    			buttonObject.action = actionOnClick;
    			buttonObject.setCoordinate(buttonX, buttonY, buttonZ);
    			this.children.push(buttonObject);
    		});
    	}

    	queueState(state, callback = null) {
    		this.stateQueue.push({ state, callback });

    		if (!this.state || this.isStateCompleted) {
    			this.nextState();
    		}
    	}

    	nextState() {
    		if (this.stateQueue.length > 0) {
    			const { state, callback } = this.stateQueue.shift();
    			this.updateState(state, callback);
    		}
    	}

    	executeCurrentStateCallback() {
    		if (this.currentStateCallback) {
    			this.currentStateCallback();
    			this.currentStateCallback = null; // Reset the callback
    		}
    	}
    }

    class activeTextRenderer extends GeneratedObject {
    	constructor(textRenderer, x, y, z, actionOnClick = null) {
    		const emptyMatrix = generateEmptyMatrix(1, 1);
    		super([emptyMatrix], { default: [0] }, x, y, z, actionOnClick);
    		this.textRenderer = textRenderer;
    		this.text = "";
    		this.stateQueue = [];
    		this.isStateCompleted = false;
    		this.updateState("default");
    	}

    	setText(text) {
    		this.text = text;
    	}

    	getSprite() {
    		return new Sprite(this.textRenderer(this.text), this.x, this.y, this.z);
    	}
    }

    class Pet extends GeneratedObject {
    	//TODO: abstract state groups into a separate class
    	constructor(petType, x, y, z, hat) {
    		const config = petConfig[petType];

    		if (!config) {
    			throw new Error(`No configuration found for pet type: ${petType}`);
    		}

    		const petSpriteArray = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet); //GeneratedObject(sprites, states, x, y, z, actionOnClick)

    		super(petSpriteArray, config.states, x, y, z, () => {
    			this.queueState('flop');
    			this.queueState('flop');
    			this.queueState('default');
    		});

    		if (config.stateGroups) {
    			this.stateGroups = this.processStateGroups(config.stateGroups);
    		} else {
    			this.stateGroups = {};
    		}

    		this.config = config;

    		//TODO: map hat anchor from pet spritesheet
    		this.petAnchorX = 24;

    		this.petAnchorY = 12;
    		this.stateQueue = [];
    		this.isStateCompleted = false;
    		this.updateState("default");
    		this.hatConfig = hatConfig;
    		this.hat;
    	}

    	getSprite() {
    		let petSprite = new Sprite(this.sprites[this.currentSpriteIndex], this.x, this.y, this.z);
    		let hatSprite = this.getHat();
    		return [petSprite, hatSprite];
    	}

    	setHat(hat) {
    		this.hat = hat;
    		this.currentHatConfig = this.hatConfig[hat];
    		this.hatSprite = spriteReaderFromStore(this.hatConfig.spriteWidth, this.hatConfig.spriteHeight, this.hatConfig.spriteSheet)[this.currentHatConfig.spriteIndex];
    		this.hatAnchorX = this.currentHatConfig.anchorX;
    		this.hatAnchorY = this.currentHatConfig.anchorY;
    		get_store_value(game).pushToGlobalState({ "hat": this.hat });
    	}

    	getHat() {
    		if (this.hat == null && get_store_value(game).getLocalState().hat != null) {
    			this.setHat(get_store_value(game).getLocalState().hat);
    		}

    		return new Sprite(this.hatSprite, this.x + this.petAnchorX - this.hatAnchorX, this.y + this.petAnchorY - this.hatAnchorY);
    	}

    	processStateGroups(stateGroups) {
    		const processedGroups = {};

    		for (const groupKey in stateGroups) {
    			let group = stateGroups[groupKey];
    			processedGroups[groupKey] = [];

    			for (const stateKey in group) {
    				let odds = group[stateKey];

    				for (let i = 0; i < odds; i++) {
    					processedGroups[groupKey].push({
    						stateName: stateKey,
    						frames: this.states[stateKey]
    					});
    				}
    			}
    		}

    		return processedGroups;
    	}

    	selectRandomStateInGroup(groupName) {
    		const stateGroup = this.stateGroups[groupName];

    		if (!stateGroup) {
    			console.error(`State group '${groupName}' not found.`);
    			return null;
    		}

    		const randomIndex = Math.floor(Math.random() * stateGroup.length);
    		return stateGroup[randomIndex];
    	}

    	updateState(newState, callback = null) {
    		if (this.stateGroups[newState]) {
    			// newState is a state group
    			const randomState = this.selectRandomStateInGroup(newState);

    			if (randomState) {
    				this.state = randomState.stateName;
    				this.currentSpriteIndex = this.state[randomState][0];
    				this.isStateCompleted = false;
    				this.currentStateCallback = callback;
    			}
    		} else if (this.states[newState]) {
    			// newState is a top-level state
    			this.state = newState;

    			this.currentSpriteIndex = this.states[newState][0]; // set to the first sprite of the new state
    			this.isStateCompleted = false;
    			this.currentStateCallback = callback;
    		} else {
    			console.error(`State '${newState}' not found.`);
    			return;
    		}
    	}
    }

    class PixelCanvas extends GeneratedObject {
    	constructor(x, y, z, width, height) {
    		const emptyMatrix = generateEmptyMatrix(width, height);

    		super([emptyMatrix], { default: [0] }, x, y, z, (gridX, gridY) => {
    			this.savedFutureCanvas = [];
    			this.paintPixel(gridX, gridY);
    		});

    		this.canvasWidth = width;
    		this.canvasHeight = height;
    		this.pixelMatrix = emptyMatrix;
    		this.color = 'white';
    		this.pencilColor = 'white';
    		this.lastX = null;
    		this.lastY = null;
    		this.offsetX = x;
    		this.offsetY = y;
    		this.brushSize = 10;
    		this.brushShape = "circle";
    		this.savedPastCanvas = [];
    		this.savedFutureCanvas = [];
    	}

    	setBrushSize(size) {
    		this.brushSize = size;
    	}

    	paintPixel(x, y) {
    		// Adjust x and y based on the canvas offset
    		const adjustedX = x - this.offsetX;

    		const adjustedY = y - this.offsetY;

    		if (this.brushShape === 'square') {
    			// Square brush logic (unchanged)
    			const halfBrushSize = Math.floor(this.brushSize / 2);

    			for (let offsetY = -halfBrushSize; offsetY <= halfBrushSize; offsetY++) {
    				for (let offsetX = -halfBrushSize; offsetX <= halfBrushSize; offsetX++) {
    					this.paintAt(adjustedX + offsetX, adjustedY + offsetY);
    				}
    			}
    		} else if (this.brushShape === 'circle') {
    			// Circle brush logic
    			const radius = this.brushSize / 2;

    			const radiusSquared = radius * radius;
    			const minX = Math.ceil(adjustedX - radius);
    			const maxX = Math.floor(adjustedX + radius);
    			const minY = Math.ceil(adjustedY - radius);
    			const maxY = Math.floor(adjustedY + radius);

    			for (let paintY = minY; paintY <= maxY; paintY++) {
    				for (let paintX = minX; paintX <= maxX; paintX++) {
    					// Calculate distance from the center of the circle to this point
    					const dx = paintX + 0.5 - adjustedX; // Add 0.5 to target the center of pixels

    					const dy = paintY + 0.5 - adjustedY; // Add 0.5 to target the center of pixels

    					if (dx * dx + dy * dy <= radiusSquared) {
    						this.paintAt(paintX, paintY);
    					}
    				}
    			}
    		} else {
    			console.error('Unknown brush shape:', this.brushShape);
    		}
    	}

    	paintAt(x, y) {
    		// Ensure the coordinates are within the canvas bounds
    		if (x >= 0 && x < this.canvasWidth && y >= 0 && y < this.canvasHeight) {
    			this.pixelMatrix[y][x] = this.color;
    		}
    	}

    	setBrushShape(shape) {
    		if (['square', 'circle'].includes(shape)) {
    			this.brushShape = shape;
    		} else {
    			console.error('Invalid brush shape:', shape);
    		}
    	}

    	setEraser() {
    		this.setColor("transparent");
    	}

    	getSprite() {
    		return new Sprite(this.pixelMatrix, this.x, this.y, this.z);
    	}

    	rotateSize() {
    		if (this.brushSize < 20) {
    			this.brushSize += 2;
    		} else {
    			this.brushSize = 2;
    		}
    	}

    	incrementSize() {
    		if (this.brushSize < 20) {
    			this.brushSize += 2;
    		}
    	}

    	decrementSize() {
    		if (this.brushSize > 2) {
    			this.brushSize -= 2;
    		}
    	}

    	rotateBrushShape() {
    		if (this.brushShape == "circle") {
    			this.brushShape = "square";
    		} else {
    			this.brushShape = "circle";
    		}
    	}

    	setColor(color) {
    		this.color = color;

    		if (this.color != 'transparent') {
    			console.log("changing from", this.pencilColor, "to", color);
    			this.pencilColor = color;
    		}
    	}

    	setToPencilColor() {
    		this.color = this.pencilColor;
    	}

    	clearCanvas() {
    		if (this.pixelMatrix.some(row => row.some(pixel => pixel !== 'transparent'))) {
    			console.log('cleared');
    			this.saveCurrentCanvas();
    			this.pixelMatrix = this.pixelMatrix.map(row => row.fill('transparent'));
    		}
    	}

    	getIntermediatePoints(x0, y0, x1, y1) {
    		let points = [];
    		const dx = Math.abs(x1 - x0);
    		const dy = Math.abs(y1 - y0);
    		const sx = x0 < x1 ? 1 : -1;
    		const sy = y0 < y1 ? 1 : -1;
    		let err = dx - dy;

    		while (true) {
    			points.push({ x: x0, y: y0 });
    			if (x0 === x1 && y0 === y1) break;
    			let e2 = 2 * err;

    			if (e2 > -dy) {
    				err -= dy;
    				x0 += sx;
    			}

    			if (e2 < dx) {
    				err += dx;
    				y0 += sy;
    			}
    		}

    		return points;
    	}

    	drawLine(x0, y0, x1, y1) {
    		const points = this.getIntermediatePoints(x0, y0, x1, y1);

    		points.forEach(point => {
    			this.paintPixel(point.x, point.y);
    		});
    	}

    	saveCurrentCanvas() {
    		console.log("SAVING CANVAS");
    		let deepCopy = this.pixelMatrix.map(row => row.slice());
    		this.savedPastCanvas.push(deepCopy);
    	}

    	retrievePastCanvas() {
    		if (this.savedPastCanvas.length > 0) {
    			this.saveFutureCanvas();
    			let lastCanvas = this.savedPastCanvas.pop();
    			console.log("LAST CANVAS: ", lastCanvas);
    			this.pixelMatrix = lastCanvas;
    		}
    	}

    	saveFutureCanvas() {
    		console.log("SAVING FUTURE CANVAS");
    		let deepCopy = this.pixelMatrix.map(row => row.slice());
    		this.savedFutureCanvas.push(deepCopy);
    	}

    	retrieveFutureCanvas() {
    		if (this.savedFutureCanvas.length > 0) {
    			this.saveCurrentCanvas();
    			let lastCanvas = this.savedFutureCanvas.pop();
    			console.log("NEXT CANVAS: ", lastCanvas);
    			this.pixelMatrix = lastCanvas;
    		}
    	}
    }

    class Object$1 extends GeneratedObject {
    	constructor(objectName, x, y, z = 0, actionOnClick = null) {
    		const config = objectConfig[objectName];

    		// console.log(config);
    		if (!config) {
    			throw new Error(`No configuration found for object type: ${objectName}`);
    		}

    		for (const state in config.states) {
    			config.states[state] = processStateFrames(config.states[state]);
    		}

    		const spriteMatrix = spriteReaderFromStore(config.spriteWidth, config.spriteHeight, config.spriteSheet);

    		// console.log('SPRITE MATRIX: ', spriteMatrix);
    		super(spriteMatrix, config.states, x, y, z, actionOnClick);

    		this.spriteWidth = config.spriteWidth;
    		this.spriteHeight = config.spriteHeight;
    		this.objectType = objectName;
    		this.config = config;
    		this.children = [];
    	}

    	getChildren() {
    		return this.children;
    	}

    	addChild(child) {
    		this.children.push(child);
    	}

    	onHover() {
    		if (this.states["hovered"]) {
    			this.updateState("hovered");
    		}
    	}

    	onStopHover() {
    		if (this.states["hovered"]) {
    			this.updateState("default");
    		}
    	}
    }

    class Button extends Object$1 {
    	constructor(objectName, x, y, actionOnClick, z = 0) {
    		super(objectName, x, y, z, actionOnClick);

    		this.action = actionOnClick || (() => {
    			
    		});

    		this.updateState("default");
    	}

    	onHover() {
    		// console.log('Button is hovered!');
    		this.updateState('hovered');
    	} // Add any button-specific hover effects or logic here

    	onStopHover() {
    		// console.log('Button hover stopped!');
    		this.updateState('default');
    	} // Reset any button-specific hover effects here
    }

    class Background extends Object$1 {
    	constructor(objectName, x, y, z, actionOnClick = () => {
    		
    	}) {
    		super(objectName, x, y, z, () => {
    			actionOnClick();
    		});

    		this.stateQueue = [];
    		this.isStateCompleted = false;
    		this.updateState("default");
    	}
    }

    function processStates(states) {
    	for (const key in states) {
    		states[key] = processStateFrames(states[key]);
    	}

    	return states;
    }

    function processStateFrames(frames) {
    	if (frames.length === 3 && frames[1] === '...') {
    		const start = frames[0];
    		const end = frames[2];
    		return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    	}

    	return frames;
    }

    class objectGrid extends GeneratedObject {
    	constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, visibleX = 0, visibleY = 0, scrollDirection = "vertical", scrollSpeed = 5) {
    		super(generateEmptyMatrix(120, 120), null, x, y, z);
    		this.columns = columns > 0 ? columns : objects.length;
    		this.columnSpacing = columnSpacing;

    		this.rows = rows > 0
    		? rows
    		: Math.ceil(objects.length / this.columns);

    		this.rowSpacing = rowSpacing;
    		this.x = x;
    		this.y = y;
    		this.z = z;
    		this.children = objects;
    		this.visibleX = visibleX;
    		this.visibleY = visibleY;
    		this.scrollDirection = scrollDirection;
    		this.scrollSpeed = scrollSpeed;
    		this.scrollOffsetX = 0;
    		this.scrollOffsetY = 0;
    		this.renderChildren = false;
    		this.scrollable = true;
    		this.spriteWidth = 120;
    		this.spriteHeight = 120;
    		this.hoverWithChildren = true;
    		this.passMouseCoords = true;
    		this.mouseX = null;
    		this.mouseY = null;
    		this.renderChildren = true;
    		this.generateObjectGrid();
    	}

    	getSprite() {
    		
    	}

    	// getSprite() {
    	//     let spritesOut = [];
    	//     if(this.children.length > 0) {
    	//         this.getChildSprites().forEach((sprite) => {
    	//             // console.log("Child sprite: ", sprite)
    	//             if (Array.isArray(sprite)) {
    	//                 spritesOut.push(...sprite);
    	//             //if not an array, push sprite
    	//             } else {
    	//                 spritesOut.push(sprite);
    	//             }
    	//         });
    	//     }
    	//     return spritesOut;
    	// }
    	onScrollUp() {
    		if (this.scrollDirection === "horizontal") {
    			this.scrollOffsetX += this.scrollSpeed;
    		} else {
    			// Assuming horizontal scrolling
    			this.scrollOffsetY += this.scrollSpeed;
    		}

    		this.generateObjectGrid(); // Re-generate grid to reflect new positions
    	}

    	onScrollDown() {
    		if (this.scrollDirection === "horizontal") {
    			this.scrollOffsetX -= this.scrollSpeed;
    		} else {
    			// Assuming horizontal scrolling
    			this.scrollOffsetY -= this.scrollSpeed;
    		}

    		this.generateObjectGrid(); // Re-generate grid to reflect new positions
    	}

    	generateObjectGrid() {
    		let currentX = this.scrollOffsetX;
    		let currentY = this.scrollOffsetY;
    		const spriteWidth = this.children[0].getWidth();
    		const spriteHeight = this.children[0].getHeight();

    		// console.log("CURRENTX: ", currentX, "CURRENTY: ", currentY);
    		for (let row = 0; row < this.rows; row++) {
    			for (let column = 0; column < this.columns; column++) {
    				let index = row * this.columns + column;
    				if (index >= this.children.length) break;
    				let objectX = currentX + column * (spriteWidth + this.columnSpacing);
    				let objectY = currentY + row * (spriteHeight + this.rowSpacing);
    				this.children[index].setCoordinate(objectX, objectY, this.z);
    			}
    		}

    		this.spriteWidth = (spriteWidth + this.columnSpacing) * this.columns;
    		this.spriteHeight = (spriteHeight + this.rowSpacing) * this.rows;
    	}
    }

    class toolTip extends GeneratedObject {
    	constructor(borderColor, backgroundColor, roundness, padding, textRenderer) {
    		const emptyMatrix = generateEmptyMatrix(1, 1);
    		super([emptyMatrix], { default: [0] }, 10, 90, 20);
    		this.item;
    		this.currentTitle = "";
    		this.currentDescription = "";
    		this.currentSprite;
    		this.borderColor = borderColor;
    		this.backgroundColor = backgroundColor;
    		this.roundness = roundness;
    		this.padding = padding;
    		this.textRenderer = textRenderer;
    	}

    	generateSprite() {
    		this.currentSprite = generateTooltipSprite(this.currentTitle, this.borderColor, this.backgroundColor, this.roundness, this.padding, this.textRenderer);
    	}

    	setItem(item) {
    		this.item = item;
    		this.currentTitle = item.getName();
    		this.currentDescription = item.getDescription();
    		this.generateSprite();
    	}

    	getSprite() {
    		return new Sprite(this.currentSprite, this.x, this.y, this.z);
    	}
    }

    class buttonList extends objectGrid {
    	constructor(buttonTexts, buttonFunctions, buttonConstructor, buttonWidth, buttonHeight, spacing, x, y, z, orientation = "vertical", scroll = false, scrollSpeed = 0, visibleX = 0, visibleY = 0) {
    		let buttons = [];

    		for (let i = 0; i < buttonTexts.length; i++) {
    			let button = new buttonConstructor(buttonTexts[i], 0, 0, buttonFunctions[i], buttonWidth, buttonHeight);
    			button.setCoordinate(x, y, z);
    			buttons.push(button);
    		}

    		if (buttonFunctions.length > buttonTexts.length) {
    			throw new Error("There are more button functions than button texts");
    		}

    		if (orientation === "horizontal") {
    			super(buttons.length, spacing, 1, 0, x, y, z, buttons, visibleX, visibleY, "horizontal", scrollSpeed);
    		} else {
    			super(1, 0, buttons.length, spacing, x, y, z, buttons, visibleX, visibleY, "vertical", scrollSpeed);
    		}
    	}
    }

    class Menu extends GeneratedObject {
    	constructor(x, y, z, width, height, borderColor, backgroundColor, roundness) {
    		const backgroundMatrix = generateStatusBarSprite(width, height, borderColor, backgroundColor, '#000000', 0, roundness);
    		super([backgroundMatrix], { default: [0] }, x, y, z);
    		this.width = width;
    		this.height = height;
    	}
    }

    class ColorButton extends GeneratedObject {
    	constructor(color, x, y, z, actionOnClick, width, height) {
    		const defaultSprite = generateRectangleMatrix(width, height, color);
    		const hoverSprite = generateRectangleMatrix(width, height, color);
    		super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
    		this.color = color;
    		this.width = width;
    		this.height = height;
    	}
    }

    class ColorMenu extends Menu {
    	constructor(x, y, z, width, height, borderColor, backgroundColor, roundness, colorSize, colorSpacing, columns, rows, colorArray, colorFunction) {
    		super(x, y, z, width, height, borderColor, backgroundColor, roundness);
    		this.colorSize = colorSize;
    		this.colorArray = colorArray;
    		this.colorFunction = colorFunction;
    		this.colorSpacing = colorSpacing;
    		this.columns = columns;
    		this.rows = rows;
    		this.buttons = [];
    		this.children = [];
    		this.generateColorButtons();
    		this.generateColorGrid();
    	}

    	generateColorButtons() {
    		for (let i = 0; i < this.colorArray.length; i++) {
    			let color = this.colorArray[i]; // Store the current color in a variable to avoid issues with closures in loops

    			let button = new ColorButton(color,
    			0,
    			0,
    			0,
    			() => {
    					this.colorFunction(color);
    				},
    			this.colorSize,
    			this.colorSize);

    			// button.setCoordinate(this.x, this.y, this.z);
    			this.buttons.push(button);
    		}
    	}

    	//constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, objects, visibleX = 0, visibleY = 0, scrollDirection = "vertical", scrollSpeed = 5) {
    	generateColorGrid() {
    		let colorGrid = new objectGrid(this.columns, this.colorSpacing, this.rows, this.colorSpacing, 3, 3, 10, this.buttons, 0, 0, "horizontal", 0);
    		this.children.push(colorGrid);
    	}
    } // getSprite() {

    /* webviews\components\Inventory.svelte generated by Svelte v3.59.2 */
    const ITEMWIDTH = 32;
    const stackableTypes = ["food"];

    class Item extends GeneratedObject {
    	constructor(itemName) {
    		// maybe add an item count parameter?
    		const config = itemConfig[itemName];

    		if (!config) throw new Error(`Item ${itemName} not found in itemConfig.json`);
    		const objState = { default: [config.spriteIndex] };
    		const spriteMatrix = spriteReaderFromStore(ITEMWIDTH, ITEMWIDTH, config.spriteSheet);
    		super(spriteMatrix, objState, 0, 0, 0);
    		this.itemName = itemName;
    		this.stackable = false;
    		this.itemCount = 1;
    		this.spriteHeight = ITEMWIDTH;
    		this.spriteWidth = ITEMWIDTH;
    		this.config = config;
    		this.displayName = config.displayName;
    		this.description = config.description;
    		this.itemType = config.type;
    		this.inventoryId;
    		this.properties = {};
    	}

    	getName() {
    		return this.displayName;
    	}

    	getDescription() {
    		return this.description;
    	}

    	getInventoryId() {
    		return this.inventoryId;
    	}

    	//base serialization for backend
    	serialize() {
    		return {
    			[this.inventoryId]: {
    				itemName: this.itemName,
    				itemCount: this.itemCount,
    				properties: this.properties
    			}
    		};
    	}
    }

    class Inventory {
    	constructor() {
    		this.items = new Map(); // Stores inventoryId -> item instance

    		// stackable items is redundant but is used for quick access to stackable items
    		this.stackableItems = new Map(); // Stores itemIdString -> inventoryId for stackable items
    	}

    	// Get the first available ID for a new item
    	// could be optimized by storing the last used ID or using a seperate set
    	// or could keep track of free IDs and process them during low load times
    	getFirstAvailableId() {
    		let id = 0;

    		while (this.items.has(id)) {
    			id++;
    		}

    		return id;
    	}

    	addStackableItemToInstance(itemIdString, quantity = 1) {
    		let item;

    		if (this.stackableItems.has(itemIdString)) {
    			const inventoryId = this.stackableItems.get(itemIdString);
    			item = this.items.get(inventoryId);
    			item.itemCount += quantity;
    		} else {
    			const newId = this.getFirstAvailableId();
    			item = new Item(itemIdString);
    			item.inventoryId = newId; // Assign the first available inventory ID
    			item.itemCount = quantity;
    			item.stackable = true;
    			this.items.set(newId, item);
    			this.stackableItems.set(itemIdString, newId);
    		}

    		return item;
    	}

    	subtractStackableItemFromInstance(itemIdString, quantity = 1) {
    		let item;

    		if (this.stackableItems.has(itemIdString)) {
    			const inventoryId = this.stackableItems.get(itemIdString);
    			item = this.items.get(inventoryId);
    			item.itemCount -= quantity;

    			if (item.itemCount <= 0) {
    				item.itemCount = 0;
    			}
    		} else {
    			throw new Error(`Item ${itemIdString} not found in inventory`);
    		}

    		return item;
    	}

    	addUnstackableItemToInstance(itemIdString, properties) {
    		const newId = this.getFirstAvailableId();
    		const newItem = new Item(itemIdString, properties);
    		newItem.inventoryId = newId; // Assign the first available inventory ID
    		newItem.itemCount = 1;
    		newItem.stackable = false;
    		this.items.set(newId, newItem);
    	}

    	removeItemByIdFromInstance(inventoryId) {
    		if (this.items.has(inventoryId)) {
    			const item = this.items.get(inventoryId);

    			if (item.stackable) {
    				item.itemCount--;

    				if (item.itemCount <= 0) {
    					this.stackableItems.delete(item.itemName);
    					this.items.delete(inventoryId);
    				}
    			} else {
    				this.items.delete(inventoryId);
    			}

    			return true; // Item found and removed
    		}

    		return false; // Item not found
    	}

    	hasItemInInstance(itemIdString) {
    		return this.items.has(itemIdString);
    	}

    	hasStackableItemsInInstance(itemIdString, quantity = 1) {
    		if (this.stackableItems.has(itemIdString)) {
    			const inventoryId = this.stackableItems.get(itemIdString);
    			const item = this.items.get(inventoryId);
    			return item.itemCount >= quantity;
    		}

    		return false;
    	}

    	serializedInventory() {
    		let serializedInventory = {};

    		this.items.forEach((item, inventoryId) => {
    			serializedInventory[inventoryId] = item.serialize();
    		});

    		return JSON.stringify(serializedInventory);
    	}

    	getItemsArray() {
    		// Convert the Map values to an array
    		return Array.from(this.items.values());
    	}
    }

    // Function to reconstruct items from serialized data
    function reconstructItem(itemData) {
    	console.log("Item Data: ", itemData);
    	const config = itemConfig[itemData.itemName];
    	if (!config) throw new Error(`Configuration for item ${itemData.itemName} not found`);
    	const item = new Item(itemData.itemName, itemData.properties);
    	item.inventoryId = itemData.inventoryId;
    	item.itemCount = itemData.itemCount || 1;
    	item.properties = itemData.properties || {};
    	item.itemType = config.type;
    	return item;
    }

    function createInventoryFromSave(savedData) {
    	const inventory = new Inventory();

    	// Iterate over each key in savedData, which are inventoryIds
    	Object.keys(savedData).forEach(inventoryId => {
    		const itemData = savedData[inventoryId];
    		const item = reconstructItem(itemData);
    		item.inventoryId = parseInt(inventoryId); // Ensure the inventoryId is treated as a number if needed
    		inventory.items.set(item.inventoryId, item);

    		if (stackableTypes.includes(item.itemType)) {
    			inventory.stackableItems.set(item.itemName, item.inventoryId);
    		}
    	});

    	return inventory;
    }

    class inventoryGrid extends objectGrid {
    	constructor(columns, columnSpacing, rows, rowSpacing, x, y, z, items, totalSlots, itemSlotConstructor, toolTip, numberTextRenderer) {
    		let constructedItems = constructInventoryObjects(itemSlotConstructor, items, totalSlots, numberTextRenderer);
    		console.log("Constructed items: ", constructedItems);
    		super(columns, columnSpacing, rows, rowSpacing, x, y, z, constructedItems, 0, 0, "vertical", 3);
    		this.toolTip = toolTip;
    		this.toolTip.setCoordinate(0, 0, 30);
    		this.displayToolTip = false;
    		this.hoverWithChildren = true;

    		this.children.forEach(itemSlot => {
    			//while itemSlot hover, set coordinate of tooltip to mouse
    			itemSlot.whileHover = () => {
    				this.toolTip.setCoordinate(this.mouseX, this.mouseY, 30);
    			};

    			//on itemSlot hover, display the tooltip and set the toop tip item to the item in the slot
    			itemSlot.onHover = () => {
    				if (this.hoveredChild?.children[0]) {
    					this.toolTip.setItem(this.hoveredChild.children[0]);
    					this.displayToolTip = true;
    				}

    				itemSlot.updateState("hovered");
    			};

    			//on itemSlot stop hover, hide the tooltip
    			itemSlot.onStopHover = () => {
    				this.displayToolTip = false;
    				itemSlot.updateState("default");
    			};
    		});

    		function constructInventoryObjects(createSlotInstance, items, totalSlots, numberTextRenderer) {
    			let inventoryGrid = [];

    			for (let i = 0; i < totalSlots; i++) {
    				let item = items[i];
    				let slotInstance = createSlotInstance(); // Use the factory function to create a new instance

    				// console.log("Slot Instance: ", slotInstance); // Check the instance
    				// console.log(slotInstance instanceof GeneratedObject);
    				if (item) {
    					// console.log("Item: ", item); // Check the item (should be a GeneratedObject instance
    					let numberRenderer = new activeTextRenderer(numberTextRenderer, 25, 23, 0);

    					numberRenderer.setText(item.itemCount.toString());
    					slotInstance.addChild(item);
    					slotInstance.addChild(numberRenderer);
    				}

    				inventoryGrid.push(slotInstance);
    			}

    			return inventoryGrid;
    		}
    	}

    	//called when buttons are hovered (item grid stops being hovered)
    	//its a bit redundant and more of a failsafe but if not included it stops working fairly quickly
    	onStopHover() {
    		if (this.hoveredChild != null && this.hoveredChild.children.length > 0) {
    			this.toolTip.setItem(this.hoveredChild.children[0]);
    			this.toolTip.setCoordinate(this.mouseX, this.mouseY, 30);
    			this.displayToolTip = true;
    		}

    		if (this.hoveredChild == null) {
    			this.displayToolTip = false;
    		}
    	}

    	getSprite() {
    		let spritesOut = [];

    		//output all children sprites (item slots and items)
    		if (this.children.length > 0) {
    			this.getChildSprites().forEach(sprite => {
    				if (Array.isArray(sprite)) {
    					spritesOut.push(...sprite);
    				} else {
    					spritesOut.push(sprite); //if not an array, push sprite
    				}
    			});
    		}

    		//output tooltip sprite if displayToolTip is true
    		if (this.displayToolTip) {
    			spritesOut.push(this.toolTip.getSprite());
    		}

    		return spritesOut;
    	}
    }

    /* webviews\components\Game.svelte generated by Svelte v3.59.2 */

    class Game {
    	constructor() {
    		if (Game.instance) {
    			return Game.instance;
    		}

    		this.rooms = {};
    		this.currentRoom = null;
    		this.localState = {};
    		Game.instance = this;
    		this.syncLocalToGlobalState();
    		this.inventory;
    	}

    	updateRooms(roomName, roomObj) {
    		this.rooms[roomName] = roomObj;
    	}

    	setCurrentRoom(name) {
    		if (this.rooms[name]) {
    			this.currentRoom = this.rooms[name];
    			this.currentRoomName = name;
    		} else {
    			console.error(`Room ${name} does not exist!`);
    		}
    	}

    	getCurrentRoom() {
    		return this.currentRoom;
    	}

    	getObjectsOfCurrentRoom() {
    		return this.rooms[this.currentRoomName].getObjects();
    	}

    	// synchronizes local state (game.localState) with global state (vscode API)
    	syncLocalToGlobalState() {
    		tsvscode.postMessage({ type: 'getGlobalState' });
    	}

    	// pushes new state info to global state (vscode API)
    	pushToGlobalState(stateInfo) {
    		tsvscode.postMessage({
    			type: 'pushToGlobalState',
    			value: stateInfo
    		});
    	}

    	clearGlobalState() {
    		tsvscode.postMessage({ type: 'clearGlobalState' });
    	}

    	removeItemFromGlobalState(key, itemIdToRemove) {
    		console.log("Removing item from global state: ", itemIdToRemove);

    		if (this.inventory.hasItemInInstance(itemIdToRemove)) {
    			this.inventory.removeItemByIdFromInstance(itemIdToRemove);

    			tsvscode.postMessage({
    				type: 'removeItemFromState',
    				key,
    				itemIdToRemove
    			});
    		}
    	}

    	// push new data to global state and synchronize local and global states
    	pushToSaveData(stateInfo) {
    		this.pushToGlobalState(stateInfo);
    		this.syncLocalToGlobalState();
    	}

    	// sets local state (game.localState) to the state info (called when syncLocalToGlobalState is called)
    	setLocalState(stateInfo) {
    		console.log("Setting local state: ", stateInfo);
    		game.localState = stateInfo;
    	}

    	getLocalState() {
    		return game.localState;
    	}

    	constructInventory() {
    		this.inventory = createInventoryFromSave(this.getLocalState().inventory || {});
    	} // console.log("Constructed inventory: ", this.inventory);

    	addStackableItem(itemIdString, quantity = 1) {
    		this.pushToSaveData({
    			"inventory": this.inventory.addStackableItemToInstance(itemIdString, quantity).serialize()
    		});
    	}

    	addUnstackableItem(itemIdString, properties) {
    		this.pushToSaveData({
    			"inventory": this.inventory.addUnstackableItemToInstance(itemIdString, properties).serialize()
    		});
    	}

    	hasStackableItems(itemIdString, quantity = 1) {
    		return this.inventory.hasStackableItemsInInstance(itemIdString, quantity);
    	}

    	subtractStackableItem(itemIdString, quantity = 1) {
    		let itemInstance = this.inventory.subtractStackableItemFromInstance(itemIdString, quantity);

    		if (itemInstance) {
    			console.log("subtracted item count: ", itemInstance.itemCount);

    			if (itemInstance.itemCount <= 0) {
    				this.removeItemFromGlobalState("inventory", itemInstance.inventoryId);
    			} else {
    				this.pushToSaveData({ "inventory": itemInstance.serialize() });
    			}
    		} else {
    			console.error("subtractStackableItem: Item not found in inventory: ", itemIdString);
    		}
    	}
    }

    const game = writable(new Game());

    function handleGitHubLogin() {
    	tsvscode.postMessage({
    		type: 'openOAuthURL',
    		value: '${O_AUTH_URL}'
    	});
    }

    class Room {
    	constructor(roomName, enterLogic = false, exitLogic = false, updateLogic = () => {
    		
    	}) {
    		this.name = roomName;
    		this.adjacentRooms = new Set(); // Set ensures no duplicate rooms in list
    		this.objects = [];
    		this.enter = enterLogic || this.enter;
    		this.exit = exitLogic || this.exit;
    		this.update = updateLogic || this.update;
    		get_store_value(game).updateRooms(roomName, this); // Add room to game object
    	}

    	addAdjacentRoom(room) {
    		this.adjacentRooms.add(room);
    	}

    	getName() {
    		return this.name;
    	}

    	addObject(...objects) {
    		//allows for multiple object parameters to be added at once
    		for (let object of objects) {
    			this.objects.push(object);
    		}
    	}

    	getObjects() {
    		return this.objects;
    	}

    	enter() {
    		
    	} // Default logic when entering the room

    	exit() {
    		
    	} // Default logic when exiting the room

    	update() {
    		// Default room-specific logic and updates
    		this.update();
    	}

    	removeObject(...objects) {
    		for (let object of objects) {
    			this.objects = this.objects.filter(obj => obj !== object);
    		}
    	}
    }

    const shouldFocus = writable(false);
    const inputValue = writable('');

    /* webviews\components\MouseEvents.svelte generated by Svelte v3.59.2 */
    let lastHoveredObject = null;
    let lastHoveredChild = null;
    let isMouseDown = false;
    let activeDragObject = null;
    let newHoveredObject = null;
    let lastCoordinates = { x: undefined, y: undefined };
    const GRIDWIDTH = 128;

    // Utility function for repetitive calculations
    function getEventDetails(event, gridWidth) {
    	const boundingBox = event.currentTarget.getBoundingClientRect();
    	const pixelSize = Math.min(boundingBox.width / gridWidth, boundingBox.height / gridWidth);
    	const gridX = Math.ceil(event.clientX / pixelSize);
    	const gridY = Math.ceil(event.clientY / pixelSize);
    	return { gridX, gridY, pixelSize };
    }

    // Get the object at the given coordinates
    function getObjectAt(x, y, gameInstance) {
    	// maybe switch to a hashmap for faster object lookup
    	let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());

    	let foundObjects = [];
    	let foundObjectFlag = false;

    	const findObjectsRecursively = (obj, parent = null, parentX = 0, parentY = 0) => {
    		let objX = parentX + obj.x;
    		let objY = parentY + obj.y;
    		let childFound = false;

    		if (parent != null) {
    			parent.hoveredChild = obj;
    		}

    		// Check if the coordinates are within the object's bounds
    		if (x >= objX && x <= objX + obj.spriteWidth && y >= objY && y <= objY + obj.spriteHeight) {
    			if (parent && parent.hoverWithChildren) {
    				// If a parent has hoverWithChildren, add both the child and the parent to foundObjects
    				if (!foundObjects.includes(parent)) foundObjects.push(parent);
    			} // if (parent.passMouseCoords) {
    			//     parent.mouseX = x;

    			//     parent.mouseY = y;
    			// }
    			// Add the object if it's directly hovered or if it's a hovered child with hoverWithChildren parent
    			foundObjects.unshift(obj);

    			foundObjectFlag = true;

    			if (parent !== null) {
    				childFound = true;
    			}

    			if (obj.passMouseCoords) {
    				obj.mouseX = x;
    				obj.mouseY = y;
    			}
    		}

    		// Recursively check children if they exist
    		if (obj.getChildren().length > 0) {
    			let children = obj.getChildren().sort((a, b) => b.getZ() - a.getZ());

    			for (let child of children) {
    				// Recursively check each child
    				if (findObjectsRecursively(child, obj, objX, objY)) {
    					childFound = true; // A child (or deeper descendant) is hovered, no need to check further siblings
    					break;
    				}
    			}
    		}

    		return childFound;
    	};

    	// Loop through all objects and initiate the recursive search
    	// objects.forEach(obj => findObjectsRecursively(obj));
    	for (let i = 0; i < objects.length; i++) {
    		findObjectsRecursively(objects[i]);
    		if (foundObjectFlag) break;
    	}

    	foundObjects = foundObjects.sort((a, b) => b.getZ() - a.getZ());

    	// console.log("FOUND OBJECTS: ", foundObjects)
    	// Return based on the returnMultiple flag
    	return foundObjects;
    }

    // Simplifying hover logic
    function updateHoverState({ xPixelCoord, yPixelCoord, event, gameInstance }) {
    	let foundObjects = getObjectAt(xPixelCoord, yPixelCoord, gameInstance);
    	newHoveredObject = foundObjects.length > 0 ? foundObjects[0] : null;
    	let childObjects = foundObjects.slice(1); // Assuming child objects are returned after the parent

    	// Determine if the new hovered object is different from the last hovered object or if the child object has changed
    	let newHoveredChild = childObjects.length > 0 ? childObjects[0] : null; // Simplification for handling one child

    	let hoveredObjectChanged = newHoveredObject !== lastHoveredObject;
    	let hoveredChildChanged = newHoveredChild !== lastHoveredChild;

    	//Check if hovered object 
    	if (hoveredObjectChanged || hoveredChildChanged) {
    		if (lastHoveredObject) {
    			lastHoveredObject.onStopHover?.();
    			lastHoveredChild?.onStopHover?.(); // Ensure last hovered child's onStopHover is called
    			lastHoveredObject.hoveredChild = null;
    		}

    		if (newHoveredObject) {
    			newHoveredObject.onHover?.();
    			newHoveredChild?.onHover?.(); // Call onHover for the new hovered child, if any
    			newHoveredObject.hoveredChild = newHoveredChild;
    		}

    		event.currentTarget.style.cursor = newHoveredObject instanceof Button
    		? 'pointer'
    		: 'default';

    		lastHoveredObject = newHoveredObject;
    		lastHoveredChild = newHoveredChild; // Update lastHoveredChild to reflect the new state
    	} else {
    		newHoveredObject.whileHover();

    		for (let i = 0; i < childObjects.length; i++) {
    			childObjects[i].whileHover();
    		}
    	}

    	// console.log(foundObjects);
    	for (let i = 0; i < foundObjects.length; i++) {
    		
    	} // if(foundObjects[i].passMouseCoords){
    	//     foundObjects[i].mouseX = xPixelCoord;
    } //     foundObjects[i].mouseY = yPixelCoord;
    // }

    function handleClick(event, gameInstance) {
    	let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
    	let clickedObject = getObjectAt(gridX, gridY, gameInstance)[0];

    	if (clickedObject && isMouseDown && !activeDragObject) {
    		activeDragObject = clickedObject;
    		clickedObject.clickAction(gridX, gridY);
    	}
    }

    function handleMouseDown(event, gameInstance) {
    	if (newHoveredObject instanceof PixelCanvas) {
    		newHoveredObject.saveCurrentCanvas();
    	} // console.log()

    	event.preventDefault();
    	isMouseDown = true;
    	let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);
    	lastCoordinates = { x: gridX, y: gridY };
    	handleClick(event, gameInstance); // Initial click handling
    }

    function handleMouseUp() {
    	isMouseDown = false;
    	lastCoordinates = { x: undefined, y: undefined };
    	activeDragObject = null; // Reset drag object
    }

    function handleMouseMove(event, gameInstance) {
    	event.preventDefault();
    	let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);

    	updateHoverState({
    		xPixelCoord: gridX,
    		yPixelCoord: gridY,
    		event,
    		gameInstance
    	});

    	if (isMouseDown) {
    		// console.log("HOVERED OBJECT: ", newHoveredObject, "ACTIVE DRAG OBJECT: ", activeDragObject)
    		// Ensures hoveredObject is the one being dragged
    		if (newHoveredObject && newHoveredObject === activeDragObject) {
    			// console.log("DRAGGING")
    			// Check if hoveredObject is an instance of PixelCanvas
    			if (newHoveredObject instanceof PixelCanvas) {
    				// console.log("DRAGGING ON CANVS")
    				// For PixelCanvas, we use drawLine to handle dragging
    				if (lastCoordinates.x !== undefined && lastCoordinates.y !== undefined) {
    					// Draw line from last coordinates to current
    					newHoveredObject.drawLine(lastCoordinates.x, lastCoordinates.y, gridX, gridY);
    				}
    			} // Handle other objects that are not PixelCanvas, if necessary

    			// Update lastCoordinates with the current grid coordinates
    			lastCoordinates = { x: gridX, y: gridY };
    		}
    	}
    }

    function handleMouseOut(event) {
    	if (lastHoveredObject) {
    		lastHoveredObject.onStopHover?.();
    		lastHoveredObject.hoveredChild = null;
    		event.currentTarget.style.cursor = 'default';
    	}
    }

    function focus(node, enabled) {
    	if (enabled) node.focus(); else node.blur();

    	return {
    		update(newEnabled) {
    			if (newEnabled) node.focus(); else node.blur();
    		}
    	};
    }

    function getScrollableObjectAt(x, y, gameInstance) {
    	let objects = gameInstance.getObjectsOfCurrentRoom().sort((a, b) => b.getZ() - a.getZ());
    	let foundObjects = [];

    	const findScrollableObjectsRecursively = (obj, parent = null) => {
    		let objX = (parent ? parent.x : 0) + obj.x;
    		let objY = (parent ? parent.y : 0) + obj.y;

    		// Check if the coordinates are within the object's bounds
    		if (x >= objX && x <= objX + obj.spriteWidth && y >= objY && y <= objY + obj.spriteHeight) {
    			// Add the object if it's directly hovered or if it's a hovered child with hoverWithChildren parent
    			if (obj?.scrollable) {
    				foundObjects.push(obj);
    			}
    		}

    		// Recursively check children if they exist
    		if (obj.getChildren().length > 0) {
    			obj.getChildren().forEach(child => findScrollableObjectsRecursively(child, obj));
    		}
    	};

    	// Loop through all objects and initiate the recursive search
    	objects.forEach(obj => findScrollableObjectsRecursively(obj));

    	foundObjects = foundObjects.sort((a, b) => b.getZ() - a.getZ());
    	return foundObjects.slice(0, 1);
    }

    function handleScroll(event, gameInstance) {
    	event.preventDefault();
    	let { gridX, gridY } = getEventDetails(event, GRIDWIDTH);

    	getScrollableObjectAt(gridX, gridY, gameInstance).forEach(obj => {
    		if (event.deltaY < 0) obj.onScrollUp?.(); else if (event.deltaY > 0) obj.onScrollDown?.();
    	});
    }

    /* webviews\components\ObjectGenerators.svelte generated by Svelte v3.59.2 */

    function generateTextButtonClass(
    	width,
    height,
    bgColor,
    borderColor,
    bgColorHovered,
    borderColorHovered,
    textRenderer,
    topShadow = null,
    bottomShadow = null,
    topShadowHover = null,
    bottomShadowHover = null,
    layout = 'center',
    offset = 0
    ) {
    	return class Button extends GeneratedObject {
    		constructor(text, x, y, actionOnClick, z) {
    			const defaultSprite = generateButtonMatrix(width, height, bgColor, borderColor, textRenderer(text), topShadow, bottomShadow, layout, offset);
    			const hoverSprite = generateButtonMatrix(width, height, bgColorHovered, borderColorHovered, textRenderer(text), topShadowHover, bottomShadowHover, layout, offset);

    			// State management: 0 for default sprite and 1 for hover sprite
    			super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
    		}

    		onHover() {
    			super.onHover(); // Call parent's hover function
    			this.updateState('hovered');
    		}

    		onStopHover() {
    			super.onStopHover(); // Call parent's stop hover function
    			this.updateState('default');
    		}
    	};
    }

    function generateIconButtonClass(
    	width,
    height,
    bgColor,
    borderColor,
    bgColorHovered,
    borderColorHovered,
    topShadow = null,
    bottomShadow = null,
    topShadowHover = null,
    bottomShadowHover = null,
    layout = 'center',
    offset = 0
    ) {
    	return class Button extends GeneratedObject {
    		constructor(iconSprite, hoveredIconSprite, x, y, actionOnClick, z) {
    			console.log(iconSprite, hoveredIconSprite);
    			const defaultSprite = generateButtonMatrix(width, height, bgColor, borderColor, iconSprite, topShadow, bottomShadow, layout, offset);
    			const hoverSprite = generateButtonMatrix(width, height, bgColorHovered, borderColorHovered, hoveredIconSprite, topShadowHover, bottomShadowHover, layout, offset);

    			// State management: 0 for default sprite and 1 for hover sprite
    			super([defaultSprite, hoverSprite], { default: [0], hovered: [1] }, x, y, z, actionOnClick);
    		}

    		onHover() {
    			super.onHover(); // Call parent's hover function
    			this.updateState('hovered');
    		}

    		onStopHover() {
    			super.onStopHover(); // Call parent's stop hover function
    			this.updateState('default');
    		}
    	};
    }

    function generateStatusBarClass(width, height, borderColor, bgColor, statusBarColor, roundness) {
    	return class StatusBar extends GeneratedObject {
    		constructor(x, y, z) {
    			const spriteSheet = generateStatusBarSpriteSheet(width, height, borderColor, bgColor, statusBarColor, roundness);

    			// Initial state management
    			let states = {};

    			for (let i = 0; i < spriteSheet.length; i++) {
    				states[`state${i}`] = [i];
    			}

    			// Initialize with the empty state
    			super(spriteSheet, states, x, y, z, () => {
    				this.increment();
    			});

    			// Set initial state
    			this.currentState = 0; // Starts from empty

    			this.maxState = width - 1; // Total number of increments
    		}

    		whileHover() {
    			if (this.currentState < this.maxState) {
    				this.increment();
    			} else this.currentState = 0;
    		}

    		getSize() {
    			return this.maxState;
    		}

    		increment() {
    			if (this.currentState < this.maxState) {
    				this.currentState++;
    				this.updateState(`state${this.currentState}`);
    			}
    		}

    		decrement() {
    			if (this.currentState > 0) {
    				this.currentState--;
    				this.updateState(`state${this.currentState}`);
    			}
    		}
    	};
    }

    function generateTextInputBar(
    	width,
    height,
    borderColor,
    bgColor,
    roundness,
    textRenderer,
    textXOffset = 3,
    borderThickness = 1
    ) {
    	return class TextInputBar extends GeneratedObject {
    		constructor(x, y, z) {
    			const emptyMatrix = generateEmptyMatrix(width, height);

    			super([emptyMatrix], { default: [0] }, x, y, z, () => {
    				if (get_store_value(shouldFocus) === false) {
    					shouldFocus.set(true);
    				} else {
    					shouldFocus.set(false);
    				}
    			});
    		}

    		whileHover() {
    			
    		}

    		getSprite() {
    			return new Sprite(generateTextInputMatrix(width, height, bgColor, borderColor, textRenderer(get_store_value(inputValue)), roundness, textXOffset, borderThickness), this.x, this.y, this.z);
    		}
    	};
    }

    /* webviews\components\Rooms.svelte generated by Svelte v3.59.2 */

    function preloadObjects() {
    	//----------------FONT RENDERERS----------------
    	const standardCharMap = ` !"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_\`abcdefghijklmnopqrstuvwxyz{|}~`;

    	//createTextRenderer(image, charWidth, charHeight, backgroundColorOfSpriteSheet, 
    	//textColor, letterSpacing, charMap, textShadowColor, textShadowXOffset, textShadowYOffset)
    	let basic = createTextRenderer('charmap1.png', 7, 9, "#FFFFFF", "#000000", -1, standardCharMap);

    	createTextRenderer('gangsmallFont.png', 8, 10, "#FFFFFF", "#000000", -4, standardCharMap);
    	let retro = createTextRenderer('retrocomputer.png', 8, 10, "#FFFFFF", "#d7d7ff", -2, standardCharMap, "#3c3f83", 1, 1);
    	let tiny = createTextRenderer('tinyPixls.png', 8, 8, "#FFFFFF", "#dc6060", -4, standardCharMap, "#3f1c1c", 1, 1);

    	//----------------BUTTON CLASS GENERATORS----------------
    	//generateButtonClass(buttonWidth, buttonHeight, fillColor, borderColor, hoverFillColor, hoverBorderColor, fontRenderer,
    	//   topShadowColor, bottomShadowColor, topHoverShadowColor, bottomHoverShadowColor,
    	//   textAlign ("center" "left" or "right"), margin (only for left or right align))
    	const defaultButtonParams = [
    		'#7997bc',
    		'black',
    		'#426b9e',
    		'black',
    		basic,
    		'#47596f',
    		'#a4ccff',
    		'#223751',
    		"#629de9"
    	];

    	const settingsMenuButton = generateTextButtonClass(128, 17, ...defaultButtonParams);
    	const singleLetterButton = generateTextButtonClass(16, 16, ...defaultButtonParams);
    	const smallLetterButton = generateTextButtonClass(10, 10, ...defaultButtonParams);
    	const settingsTitleButton = generateTextButtonClass(128, 13, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
    	const friendTitle = generateTextButtonClass(128, 15, '#426b9e', 'black', '#426b9e', 'black', basic, '#223751', "#629de9", '#223751', "#629de9");
    	const friendButton = generateTextButtonClass(128, 18, '#7997bc', 'black', '#223751', 'black', retro, '#47596f', '#a4ccff', '#1b2e43', '#2b4669', "left", 2);
    	const dropDownButton = new generateTextButtonClass(58, 13, '#6266d1', 'black', '#888dfc', 'black', retro, '#5356b2', '#777cff', "#5e62af", "#a389ff");
    	const paintButtonText = generateTextButtonClass(25, 15, '#8B9BB4', 'black', '#616C7E', 'black', retro, '#5B6A89', '#BEC8DA', '#848B97', '#424D64');
    	const paintButtonIcon = generateIconButtonClass(25, 15, '#8B9BB4', 'black', '#616C7E', 'black', '#5B6A89', '#BEC8DA', '#848B97', '#424D64');
    	const brushSizeButton = generateTextButtonClass(10, 16, '#8B9BB4', 'black', '#616C7E', 'black', retro, '#5B6A89', '#BEC8DA', '#848B97', '#424D64');

    	//---------------GENERAL OBJECTS----------------
    	//BUTTON TO RETURN TO MAIN ROOM
    	const backToMain = new smallLetterButton('<',
    	0,
    	2,
    	() => {
    			get_store_value(game).setCurrentRoom('mainRoom');
    			petObject.setCoordinate(36, 54, 0);
    		},
    	10);

    	//----------------MAIN ROOM----------------
    	//STATUS BAR INSTANTIATION
    	const StatusBar = generateStatusBarClass(107, 12, 'black', 'grey', '#40D61A', 2);

    	const statusBar = new StatusBar(20, 2, 0);

    	//MAIN MENU INSTANTIATION
    	const mainMenuButtonTexts = ['Settings', 'Shop', 'Customize', 'Paint', 'Social', 'Inventory', 'Close'];

    	const mainMenuButtonFunctions = [
    		() => {
    			get_store_value(game).setCurrentRoom('settingsRoom');
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('shopRoom');
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('customizeRoom');
    			petObject.setCoordinate(24, 99, 0);
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('paintRoom');
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('socialRoom');
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('inventoryRoom');
    		},
    		() => {
    			get_store_value(game).getCurrentRoom().removeObject(mainMenu);
    			get_store_value(game).getCurrentRoom().addObject(mainMenuButton);
    		}
    	];

    	const mainMenu = new buttonList(mainMenuButtonTexts, mainMenuButtonFunctions, dropDownButton, 58, 12, -1, 0, 0, 3);

    	//BUTTON TO OPEN MAIN MENU
    	const mainMenuButton = new Button('mainMenuButton',
    	0,
    	0,
    	() => {
    			get_store_value(game).getCurrentRoom().removeObject(mainMenuButton);
    			get_store_value(game).getCurrentRoom().addObject(mainMenu);
    		},
    	1);

    	//PET INSTANTIATION
    	let petObject = new Pet('pearguin', 36, 54, 0, "leaf");

    	//ROOM INSTANTIATION
    	let mainRoom = new Room('mainRoom',
    	false,
    	false,
    	() => {
    			petObject.nextFrame();
    		});

    	mainRoom.addObject(petObject, mainMenuButton, statusBar);

    	//----------------SETTINGS ROOM----------------
    	//SETTINGS MENU INSTANTIATION
    	const settingsMenuButtonTexts = ['Git Login', 'Notifs', 'Display', '<BACK'];

    	const settingsMenuButtonFunctions = [
    		() => {
    			handleGitHubLogin();
    		},
    		() => {
    			
    		},
    		() => {
    			
    		},
    		() => {
    			get_store_value(game).setCurrentRoom('mainRoom');
    		}
    	];

    	const settingsTitle = new settingsTitleButton('Settings',
    	0,
    	0,
    	() => {
    			
    		});

    	const settingsMenu = new buttonList(settingsMenuButtonTexts, settingsMenuButtonFunctions, settingsMenuButton, 58, 12, -1, 0, 12, 0);

    	//ROOM INSTANTIATION
    	let settingsRoom = new Room('settingsRoom');

    	settingsRoom.addObject(settingsTitle, settingsMenu);

    	//----------------CUSTOMIZE ROOM----------------
    	//BACKGROUND INSTANTIATION
    	let vanityBackground = new Background('vanityBackground',
    	0,
    	0,
    	-20,
    	() => {
    			if (vanityBackground.state === 'open') {
    				vanityBackground.queueState('slideBack');
    				vanityBackground.queueState('default');
    			} else {
    				vanityBackground.queueState('slide');
    				vanityBackground.queueState('open');
    			}
    		});

    	//CUSTOMIZATION UI INSTANTIATION
    	let hatArray = ["leaf", "marge", "partyDots", "partySpiral", "superSaiyan"];

    	const leftHatArrow = new singleLetterButton('<',
    	20,
    	100,
    	() => {
    			petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) - 1 < 0
    			? hatArray.length - 1
    			: hatArray.indexOf(petObject.hat) - 1]);
    		},
    	0);

    	const rightHatArrow = new singleLetterButton('>',
    	60,
    	100,
    	() => {
    			petObject.setHat(hatArray[hatArray.indexOf(petObject.hat) + 1 > hatArray.length - 1
    			? 0
    			: hatArray.indexOf(petObject.hat) + 1]);
    		},
    	0);

    	let customizeUI = new Background('customizeUI',
    	9,
    	88,
    	-10,
    	() => {
    			if (customizeUI.y < 22) {
    				customizeUI.startMovingTo(9, 88);
    			} else {
    				customizeUI.startMovingTo(9, 21, sineWaveSpeed);
    			}
    		});

    	//ROOM INSTANTIATION
    	let customizeRoom = new Room('customizeRoom',
    	false,
    	false,
    	() => {
    			petObject.nextFrame();
    			vanityBackground.nextFrame();
    			customizeUI.nextFrame();
    		});

    	customizeRoom.addObject(petObject, leftHatArrow, rightHatArrow, backToMain, customizeUI, vanityBackground);

    	//----------------SHOP ROOM----------------
    	let shopBackground = new Background('vendingBackground',
    	0,
    	0,
    	-20,
    	() => {
    			
    		});

    	let shopRoom = new Room('shopRoom');
    	shopRoom.addObject(backToMain, shopBackground);

    	//----------------PAINT ROOM----------------
    	//BACKGROUND INSTANTIATION
    	let postcardBackground = new Background('postcardBackground',
    	0,
    	0,
    	-20,
    	() => {
    			
    		});

    	let paintButtonSprites = spriteReaderFromStore(15, 11, 'paintIcons_B&W.png');

    	//ROOM INSTANTIATION
    	let paintRoom = new Room('paintRoom');

    	console.log(paintButtonSprites);

    	//PAINT BUTTONS INSTANTIATION
    	//TODO: MAKE INTO BUTTONLIST
    	let colorMenuObj = new ColorMenu(6,
    	16,
    	5,
    	36,
    	36,
    	"#8B9BB4",
    	"#BEC8DA",
    	3,
    	6,
    	2,
    	4,
    	4,
    	[
    			"red",
    			"orange",
    			"green",
    			"blue",
    			"darkslateblue",
    			"purple",
    			"magenta",
    			"lime",
    			"pink",
    			"azure",
    			"beige",
    			"greenyellow",
    			"indianred",
    			"lightcoral",
    			"white",
    			"black"
    		],
    	color => {
    			paintCanvas.setColor(color);
    			paintRoom.removeObject(colorMenuObj);
    		});

    	let paintButton1 = new paintButtonText('col',
    	8,
    	0,
    	() => {
    			if (paintRoom.objects.includes(colorMenuObj)) {
    				paintRoom.removeObject(colorMenuObj);
    			} else {
    				paintRoom.addObject(colorMenuObj);
    			}
    		},
    	5);

    	let eraserButton = new paintButtonIcon(paintButtonSprites[4],
    	paintButtonSprites[4],
    	32,
    	0,
    	() => {
    			paintCanvas.setEraser();
    		},
    	5);

    	let shapeButtonCircle = new paintButtonIcon(paintButtonSprites[2],
    	paintButtonSprites[2],
    	56,
    	0,
    	() => {
    			paintCanvas.rotateBrushShape();
    			paintRoom.addObject(shapeButtonSquare);
    			shapeButtonSquare.onHover();
    			paintRoom.removeObject(shapeButtonCircle);
    		},
    	5);

    	let clearButton = new paintButtonIcon(paintButtonSprites[5],
    	paintButtonSprites[1],
    	104,
    	0,
    	() => {
    			paintCanvas.clearCanvas();
    		},
    	5);

    	let shapeButtonSquare = new paintButtonIcon(paintButtonSprites[3],
    	paintButtonSprites[3],
    	56,
    	0,
    	() => {
    			paintCanvas.rotateBrushShape();
    			paintRoom.addObject(shapeButtonCircle);
    			shapeButtonCircle.onHover();
    			paintRoom.removeObject(shapeButtonSquare);
    		},
    	5);

    	let pencilButton = new paintButtonIcon(paintButtonSprites[0],
    	paintButtonSprites[0],
    	0,
    	107,
    	() => {
    			paintCanvas.setToPencilColor();
    		},
    	5);

    	//PAINT CANVAS INSTANTIATION
    	let paintCanvas = new PixelCanvas(4, 19, 0, 120, 80);

    	let sizeNumber = new activeTextRenderer(basic, 109, 110, 5);
    	sizeNumber.setText((paintCanvas.brushSize / 2).toString());

    	let brushSizeDown = new brushSizeButton('<',
    	97,
    	107,
    	() => {
    			paintCanvas.decrementSize();
    			sizeNumber.setText((paintCanvas.brushSize / 2).toString());
    		},
    	5);

    	let brushSizeUp = new brushSizeButton('>',
    	116,
    	107,
    	() => {
    			paintCanvas.incrementSize();
    			sizeNumber.setText((paintCanvas.brushSize / 2).toString());
    		},
    	5);

    	let undoButton = new paintButtonText('U',
    	50,
    	107,
    	() => {
    			paintCanvas.retrievePastCanvas();
    		},
    	5);

    	let redoButton = new paintButtonText('R',
    	70,
    	107,
    	() => {
    			paintCanvas.retrieveFutureCanvas();
    		},
    	5);

    	paintRoom.addObject(backToMain, paintCanvas, postcardBackground, paintButton1, eraserButton, shapeButtonCircle, clearButton, brushSizeDown, brushSizeUp, sizeNumber, undoButton, redoButton, pencilButton);

    	//----------------SOCIAL ROOM----------------
    	//TEXT INPUT BAR INSTANTIATION
    	const inputTextBar = new generateTextInputBar(100, 18, 'black', '#7997bc', 4, basic, 5, 1);

    	let textInputBarTest = new inputTextBar(0, 85, 0);

    	//FRIENDS INSTANTIATION
    	//TODO: MAKE INTO BUTTONLIST
    	function instantiateFriends(friends, friendTitle, friendButton) {
    		let friendArray = [];
    		const titleHeight = 14;
    		const buttonHeight = 17;

    		const title = new friendTitle('Friend Requests',
    		0,
    		0,
    		() => {
    				
    			},
    		0);

    		friendArray.push(title);

    		for (let i = 0; i < friends.length; i++) {
    			// Create the friend button
    			let friend = new friendButton(friends[i],
    			0,
    			titleHeight + buttonHeight * i,
    			() => {
    					
    				},
    			0);

    			friend.hoverWithChildren = true;

    			friend.onHover = () => {
    				friend.updateState('hovered');
    				friend.initializeButtons();
    			};

    			friend.onStopHover = () => {
    				friend.updateState('default');
    				friend.children = [];
    			};

    			// Register child button parameters
    			const checkButton = new Button('checkButton',
    			0,
    			30,
    			() => {
    					console.log('Button was clicked!');
    				},
    			1);

    			const rejectButton = new Button('rejectButton',
    			0,
    			50,
    			() => {
    					console.log('Button was clicked!');
    				},
    			1);

    			friend.registerButtonParams([
    				{
    					xOffset: 40,
    					yOffset: 3,
    					zOffset: 10,
    					buttonObject: checkButton,
    					actionOnClick: () => {
    						console.log('Check Button');
    					}
    				},
    				{
    					xOffset: 68,
    					yOffset: 3,
    					zOffset: 10,
    					buttonObject: rejectButton,
    					actionOnClick: () => {
    						console.log('Check Button');
    					}
    				}
    			]);

    			friendArray.push(friend);
    		}

    		return friendArray;
    	}

    	//ROOM INSTANTIATION
    	let socialRoom = new Room('socialRoom');

    	socialRoom.addObject(...instantiateFriends(["everlastingflame", "kitgore", "chinapoet"], friendTitle, friendButton), backToMain, textInputBarTest);

    	//----------------INVENTORY ROOM----------------
    	//ITEM INSTANTIATION (PLACEHOLDER)
    	// let testItem1 = new Item("coffee", 0, 0, 0);
    	// let testItem2 = new Item("tomatoSoup", 0, 0, 0)
    	// let testItem3 = new Item("fishingRod", 0, 0, 0)
    	// let testItem4 = new Item("potion", 0, 0, 0)
    	// let testItem5 = new Item("redHerring", 0, 0, 0)
    	// let testItem6 = new Item("tropicalFish", 0, 0, 0)
    	// let testItem7 = new Item("coffee", 0, 0, 0)
    	// let testItem8 = new Item("tomatoSoup", 0, 0, 0)
    	// let testItem9 = new Item("coffee", 0, 0, 0)
    	// let testItem10 = new Item("potion", 0, 0, 0)
    	// let testItem11 = new Item("tomatoSoup", 0, 0, 0)
    	// let itemArray = [testItem1, testItem2, testItem3, testItem4, testItem5, testItem6, testItem7, testItem8, testItem9, testItem10, testItem11];
    	// get(game).addStackableItem("tomatoSoup", 3);
    	// get(game).addStackableItem("coffee", 5);
    	// get(game).addStackableItem("potion", 2);
    	// get(game).subtractStackableItem("tomatoSoup", 3);
    	let itemArray = get_store_value(game).inventory.getItemsArray();

    	//ITEMSLOT FACTORY FUNCTION
    	function createItemSlot() {
    		let output = new Object$1("itemSlot", 0, 0, 0);
    		output.hoverWithChildren = true;
    		output.passMouseCoords = true;

    		// console.log("createItemSlot instance:", output); // Check the instance
    		return output;
    	}

    	//TOOLTIP INSTANTIATION
    	let testToolTip = new toolTip("black", "white", 3, 2, basic);

    	//INVENTORY GRID INSTANTIATION
    	let inventoryGridTest = new inventoryGrid(3, 3, 5, 3, 7, 0, -1, itemArray, 15, createItemSlot, testToolTip, tiny);

    	//ROOM INSTANTIATION
    	let inventoryRoom = new Room('inventoryRoom');

    	inventoryRoom.addObject(backToMain, inventoryGridTest);

    	function sineWaveSpeed(currentDistance, totalDistance) {
    		if (totalDistance === 0) return 0;

    		// Normalize the progress
    		let progress = currentDistance / totalDistance;

    		// Adjust the progress for a wider bell curve
    		// This will make the sine wave reach its peak faster
    		progress = Math.pow(progress, .7); // Adjust this exponent to control the curve

    		// Sine wave parameters
    		let frequency = Math.PI; // One complete sine wave

    		let amplitude = 15; // Adjust for maximum speed

    		// Calculate speed based on sine wave
    		let speed = Math.sin(progress * frequency) * amplitude;

    		// Ensure a minimum speed to avoid being stuck
    		return Math.max(speed, 0.6);
    	}
    } // function linearSpeed(currentDistance, totalDistance) {
    //     const speed = 1; // You can adjust this value for faster or slower speed

    function roomMain() {
    	get_store_value(game).getCurrentRoom().update();
    }

    /* webviews\components\Main.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let input;
    	let focus_action;
    	let t;
    	let canvas_1;
    	let mounted;
    	let dispose;

    	return {
    		c() {
    			input = element("input");
    			t = space();
    			canvas_1 = element("canvas");
    			attr(input, "type", "text");
    			attr(input, "id", "hiddenInput");
    			attr(canvas_1, "class", "pixel-grid");
    		},
    		m(target, anchor) {
    			insert(target, input, anchor);
    			set_input_value(input, /*$inputValue*/ ctx[0]);
    			insert(target, t, anchor);
    			insert(target, canvas_1, anchor);

    			if (!mounted) {
    				dispose = [
    					listen(input, "input", /*input_input_handler*/ ctx[2]),
    					action_destroyer(focus_action = focus.call(null, input, /*$shouldFocus*/ ctx[1])),
    					listen(canvas_1, "click", /*click_handler*/ ctx[3]),
    					listen(canvas_1, "mousemove", /*mousemove_handler*/ ctx[4]),
    					listen(canvas_1, "mousedown", /*mousedown_handler*/ ctx[5]),
    					listen(canvas_1, "mouseup", handleMouseUp),
    					listen(canvas_1, "mouseleave", /*mouseleave_handler*/ ctx[6]),
    					listen(canvas_1, "wheel", /*wheel_handler*/ ctx[7]),
    					listen(canvas_1, "keypress", null),
    					listen(canvas_1, "blur", null)
    				];

    				mounted = true;
    			}
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$inputValue*/ 1 && input.value !== /*$inputValue*/ ctx[0]) {
    				set_input_value(input, /*$inputValue*/ ctx[0]);
    			}

    			if (focus_action && is_function(focus_action.update) && dirty & /*$shouldFocus*/ 2) focus_action.update.call(null, /*$shouldFocus*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(input);
    			if (detaching) detach(t);
    			if (detaching) detach(canvas_1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};
    }

    const FPS = 16; //frames per second
    let screenWidth = 128;

    function instance($$self, $$props, $$invalidate) {
    	let $inputValue;
    	let $shouldFocus;
    	let $game;
    	component_subscribe($$self, inputValue, $$value => $$invalidate(0, $inputValue = $$value));
    	component_subscribe($$self, shouldFocus, $$value => $$invalidate(1, $shouldFocus = $$value));
    	component_subscribe($$self, game, $$value => $$invalidate(13, $game = $$value));
    	let screen = [];
    	let currentRoom;
    	let canvas, ctx;

    	//run once before main loop
    	function pre() {
    		// $game.pushToGlobalState( {"test": "whattup", "test2": "yeo", "test3": "bruh"} );
    		// $game.clearGlobalState();
    		$game.syncLocalToGlobalState({});

    		$game.constructInventory();
    		handleResize();
    		preloadObjects();

    		//prettier-ignore
    		// Set the initial room in the game
    		$game.setCurrentRoom('mainRoom');
    	}

    	//main loop
    	function main() {
    		let sprites = []; // Clear previous sprites
    		roomMain();

    		// Get the current room from the game object
    		currentRoom = $game.getCurrentRoom();

    		// Render objects in the current room
    		for (let obj of currentRoom.getObjects()) {
    			const children = obj.getChildren();

    			if (children.length > 0 && obj.renderChildren) {
    				obj.getChildSprites().forEach(sprite => {
    					// console.log("Child sprite: ", sprite)
    					if (Array.isArray(sprite)) {
    						sprites.push(...sprite);
    					} else {
    						sprites.push(sprite); //if not an array, push sprite
    					}
    				});
    			}

    			const sprite = obj.getSprite();

    			//if an array, unpack array and push each sprite individually
    			if (Array.isArray(sprite)) {
    				sprites.push(...sprite);
    			} else if (sprite) {
    				sprites.push(sprite); //if not an array, push sprite
    			}
    		}

    		screen = generateScreen(sprites, screenWidth, screenWidth);
    		renderScreen(screen);
    	}

    	function renderScreen(screen) {
    		let pixelSize = getPixelSize();

    		screen.forEach((row, x) => {
    			row.forEach((color, y) => {
    				if (color === 'transparent') {
    					ctx.clearRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    				} else {
    					ctx.fillStyle = color;
    					ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    				}
    			});
    		});
    	}

    	onMount(async () => {
    		//current load time ~3.9 seconds (BAD!)
    		let startTime, endTime;

    		canvas = document.getElementsByClassName('pixel-grid')[0];
    		let screenSize = window.innerWidth;
    		canvas.width = screenSize;
    		canvas.height = screenSize;
    		ctx = canvas.getContext('2d');
    		ctx.imageSmoothingEnabled = false;
    		ctx.webkitImageSmoothingEnabled = false;

    		window.addEventListener('message', async event => {
    			const message = event.data;

    			if (message.type === 'image-uris') {
    				startTime = performance.now(); // Start timing
    				store.images.set(message.uris);

    				// Wait until all sprites are loaded
    				await preloadAllSpriteSheets().then(() => {
    					// Call pre() once and start main loop
    					pre();

    					endTime = performance.now(); // End timing
    					console.log(`Time taken: ${endTime - startTime} milliseconds`);
    					setInterval(main, Math.floor(1000 / FPS));
    				});
    			} else if (message.type === 'documentSaved') {
    				console.log("DOCUMENT SAVE RECEIVED IN MAINNNNN TIME: ", message.value);
    			} else if (message.type === 'currentState') {
    				$game.setLocalState(message.value);
    			} else if (message.type === 'resize') {
    				handleResize();
    			}
    		});

    		tsvscode.postMessage({ type: 'webview-ready' });
    		window.addEventListener('resize', handleResize);
    	});

    	function input_input_handler() {
    		$inputValue = this.value;
    		inputValue.set($inputValue);
    	}

    	const click_handler = e => handleClick(e, get_store_value(game));
    	const mousemove_handler = e => handleMouseMove(e, get_store_value(game));
    	const mousedown_handler = e => handleMouseDown(e, get_store_value(game));
    	const mouseleave_handler = e => handleMouseOut(e);
    	const wheel_handler = e => handleScroll(e, get_store_value(game));

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$shouldFocus*/ 2) ;

    		if ($$self.$$.dirty & /*$inputValue*/ 1) {
    			console.log('Input Value:', $inputValue);
    		}
    	};

    	return [
    		$inputValue,
    		$shouldFocus,
    		input_input_handler,
    		click_handler,
    		mousemove_handler,
    		mousedown_handler,
    		mouseleave_handler,
    		wheel_handler
    	];
    }

    class Main extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, {});
    	}
    }

    const app = new Main({
        target: document.body,
    });

    return app;

})();
//# sourceMappingURL=sidebar.js.map
