class Setting {
    constructor(customiser, name, default_value) {
        this.customiser = customiser;
        this.name = name;
        this.default_value = default_value;
        this._value = default_value;

        const id = `display-options-${name}`;
        this.input = document.getElementById(id);
        this.output = document.querySelector(`output[for="${id}"]`);

        const change = () => {
            this.value = this.filter_value(this.input_value);
            this.customiser.update_page();
            this.customiser.save_settings();
        }

        this.input.addEventListener('input', change);
        this.input.addEventListener('change', change);

        this.update_input(default_value);
    }

    reset() {
        this.value = this.default_value;
    }

    set value(value) {
        this._value = value;
        this.update_input();
        this.update_output();
    }

    get input_value() {
        return this.input.value;
    }

    filter_value(value) {
        return value;
    }
    
    update_input(value) {
        this.input.value = this.value;
    }

    update_output() {
        if(!this.output) {
            return;
        }
        this.output.textContent = this.display_value;
    }

    get value() {
        return this._value;
    }
    
    get css_value() {
        return this.value;
    }

    get display_value() {
        return this.value;
    }
}

class AngleSetting extends Setting {
    get css_value() {
        return `${this._value}turn`;
    }

    get display_value() {
        const t = this._value;
        return `${t} ${t==1 ? _('turn') : _('turns')}`
    }
}

class PercentageSetting extends Setting {

    get css_value() {
        return `${this.value}%`;
    }

    get display_value() {
        const f = parseFloat(this.value);
        return `${f.toFixed(0)}%`;
    }
}

class BooleanSetting extends Setting {
    get input_value() {
        return this.input.checked;
    }
}


class ExponentialPercentageSetting extends PercentageSetting {
    /* Range setting designed to have 100% exactly halfway, and the min and max as specified on the input attribute.
     * The value interpolates following an exponential function `y = a*e^(b*x) + c` in-between these points.
     */
    constructor() {
        super(...arguments);
        const min = this.min = parseFloat(this.input.getAttribute('min'));
        const max = this.max = parseFloat(this.input.getAttribute('max'));
        const step = this.step = parseFloat(this.input.getAttribute('step'));
        const z = (max-100)/(100-min);
        this.b = Math.log(z) * 2;
        this.a = (max-min)/(z*z - 1);
        this.c = min - this.a;
        this.input.setAttribute('max', 1);
        this.input.setAttribute('min', 0);
        this.input.setAttribute('step', 0.0001);
    }

    filter_value(value) {
        const {a, b, c, step} = this;
        let x = a * Math.exp(b*value) + c;
        if(!isNaN(step)) {
            x = Math.round(x/step) * step;
        }
        return x;
    }

    update_input() {
        const y = this.value;
        const {a,b,c} = this;
        const x = Math.log((y - c)/a)/b;
        this.input.value = x;
    }

    get css_value() {
        return this.value;
    }

    get display_value() {
        const f = parseFloat(this.value);
        return `${f.toFixed(0)}%`;
    }
}

class Customiser {
    add_setting(name, kind, default_value) {
        const kinds = {
            'exponentialpercentage': ExponentialPercentageSetting,
            'percentage': PercentageSetting,
            'boolean': BooleanSetting,
            'angle': AngleSetting,
            'colour': Setting,
            'text': Setting,
        }
        this.settings[name] = new kinds[kind](this, name, default_value);
    }

    constructor() {
        this.settings = {};
        this.localStorage_key = 'chirun-theme-customization';

        this.add_setting('font-scale', 'exponentialpercentage', 100);
        this.add_setting('spacing-factor', 'exponentialpercentage', 100);
        this.add_setting('font-family', 'text', 'var(--sans-serif-font)');
        this.add_setting('colour-scheme', 'text', 'auto');

        this.add_setting('text-colour', 'colour', '#000000');
        this.add_setting('link-colour', 'colour', '#0000ee');
        this.add_setting('bg-colour', 'colour', '#ffffff');
        this.add_setting('bg-colour-off', 'colour', '#eeeeee');
        this.add_setting('bg-colour-accent-1', 'colour', '#dcf0dd');
        this.add_setting('bg-colour-accent-2', 'colour', '#f6f6ff');
        this.add_setting('bg-colour-accent-3', 'colour', '#eeffd3');
        this.add_setting('bg-colour-accent-4', 'colour', '#ffeeee');

        this.add_setting('filter-sepia', 'percentage', 0);
        this.add_setting('filter-hue-rotate', 'angle', 0);

        this.add_setting('invert-images', 'boolean', true);

        const display_options_form = document.getElementById('display-options');
        const toggle_buttons = document.querySelectorAll('button[aria-controls="display-options"]');
        for(let button of toggle_buttons) {
            button.addEventListener('click', () => {
                display_options_form.classList.toggle('show');
                const displayed = display_options_form.classList.contains('show');

                toggle_buttons.forEach(b => b.setAttribute('aria-expanded', displayed));
            });
        }

        this.load_settings();

        document.getElementById('reset-display-options').addEventListener('click', () => this.reset());
    }

    load_settings() {
        let data;
        try {
            data = JSON.parse(localStorage.getItem(this.localStorage_key));
        } catch(e) {
            return;
        }

        if(!data) {
            return;
        }

        Object.keys(this.settings).forEach(key => {
            if(!key in data || data[key] === undefined) {
                return;
            }
            this.settings[key].value = data[key];
        });

        this.update_page();
    }

    save_settings() {
        const data = Object.fromEntries(Array.from(Object.entries(this.settings)).map(([k,s]) => [k,s._value]));
        localStorage.setItem(this.localStorage_key, JSON.stringify(data));
    }

    update_page() {
        Object.entries(this.settings).forEach(([k,{css_value}]) => {
            document.documentElement.style.setProperty(`--${k}`, css_value);
        });
        document.body.dataset.colourScheme = this.settings['colour-scheme'].value;
        document.body.dataset.invertImages = this.settings['invert-images'].value;
    }

    reset() {
        Object.values(this.settings).forEach(setting => setting.reset());
        this.update_page();
        this.save_settings();
    }
}

const customiser = new Customiser();

function treeview(element) {
    let search = '';

    element.addEventListener('click', e => {
        if(!e.target.classList.contains('toc-marker')) {
            return;
        }
        const a = e.target.parentElement;
        a.ariaExpanded = a.ariaExpanded == 'true' ? 'false' : 'true';
        e.preventDefault();
    });

    const all_items = [];

    function get_children(el) {
        const group = el.querySelector('[role="group"]');
        return group ? group.children : [];
    }

    function find_all_items(el) {
        const treeitem = el.querySelector('[role="treeitem"]');

        if(!treeitem) {
            return;
        }

        all_items.push(treeitem);

        if(treeitem.ariaExpanded == 'true') {
            for(let child of get_children(el)) {
                find_all_items(child);
            }
        }
    }
    find_all_items(element);


    element.addEventListener('keydown', e => {
        const modifier = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;

        const focused = document.activeElement;

        // find the <li> element for the focused item.
        let el = focused;
        while(el.parentElement && el.parentElement.role != 'group' && el.parentElement.role != 'tree') {
            el = el.parentElement;
        }
        if(!el.parentElement) {
            return;
        }
        const siblings = Array.from(el.parentElement.children);
        const i = siblings.indexOf(el);

        function next_item(el) {
            const treeitem = el.querySelector('[role="treeitem"]');
            const children = get_children(el);
            if(children.length > 0 && treeitem.ariaExpanded == 'true' ) {
                return children[0];
            } else {
                return next_sibling(el);
            }
        }

        function next_sibling(el) {
            const siblings = Array.from(el.parentElement.children);
            const i = siblings.indexOf(el);
            if(i == siblings.length-1) {
                if(el.parentElement.role == 'tree') {
                    return;
                } else {
                    return next_sibling(el.parentElement.parentElement);
                }
            } else {
                return siblings[i+1];
            }
        }

        function last_item(el) {
            const treeitem = el.querySelector('[role="treeitem"]');
            const children = get_children(el);
            if(children.length > 0 && treeitem.ariaExpanded == 'true' ) {
                return last_item(children[children.length-1]);
            } else {
                return el;
            }
        }

        function previous_item(el) {
            const siblings = Array.from(el.parentElement.children);
            const i = siblings.indexOf(el);
            if(i == 0) {
                if(el.parentElement.role == 'tree') {
                    return;
                } else {
                    return el.parentElement.parentElement;
                }
            } else {
                return last_item(siblings[i-1]);
            }
        }

        function focus_item(el, clear_search) {
            if(clear_search !== false) {
                search = '';
            }
            if(!el) {
                return;
            }
            el.querySelector('[role="treeitem"]').focus();
        }

        const handlers = {
            'ArrowLeft': () => {
                const treeitem = el.querySelector('[role="treeitem"]');
                if(treeitem.ariaExpanded == 'true') {
                    treeitem.ariaExpanded = 'false';
                    return;
                }
                if(el.role == 'tree') {
                    return;
                }
                focus_item(el.parentElement.parentElement);
            },
            'ArrowRight': () => {
                const treeitem = el.querySelector('[role="treeitem"]');
                const children = get_children(el);
                if(children.length > 0) {
                    if(treeitem.ariaExpanded == 'false') {
                        treeitem.ariaExpanded = 'true';
                        return;
                    }
                    focus_item(children[0]);
                }
            },
            'ArrowUp': () => {
                focus_item(previous_item(el));
            },
            'ArrowDown': () => {
                focus_item(next_item(el));
            },
            'Home': () => {
                const first_item = element.querySelector('[role="treeitem"]');
                if(!first_item) {
                    return;
                }
                focus_item(first_item.parentElement);
            },
            'End': () => {
                const last_item = all_items[all_items.length-1];
                if(!last_item) {
                    return;
                }
                focus_item(last_item.parentElement);
            },
            'Backspace': () => {
                search = search.slice(0, search.length-1);
            }
        }

        if(handlers[e.key]) {
            handlers[e.key]();
            e.preventDefault();
        } else if(e.key.length==1 && !modifier) {
            let j = all_items.indexOf(focused);
            const cycled_items = all_items.slice(j+1).concat(all_items.slice(0,j));
            search += e.key.toLowerCase();
            const item = cycled_items.find(item => item.textContent.toLowerCase().includes(search));
            if(item) {
                focus_item(item.parentElement, false);
                e.preventDefault();
            } else {
                search = '';
            }
        }

    });

    let update_visibility_timeout;
    let last_update = 0;
    const max_update_interval = 100;
    function update_visibility() {
        const t = new Date();
        const dt = t - last_update;
        if(dt < max_update_interval) {
            if(!update_visibility_timeout) {
                update_visibility_timeout = setTimeout(() => {
                    update_visibility();
                }, max_update_interval - dt);
            }
            return;
        }

        update_visibility_timeout = null;
        last_update = t;

        function set_not_visible(item) {
            item.classList.remove('visible');
        }

        function set_visible(item, level) {
            level = level || 0;
            item.classList.add('visible');
            let up = item;
            for(let i=0;i<3;i++) {
                up = up.parentElement;
                if(!up) {
                    return;
                }
            }
            if(up.classList.contains('toc-header')) {
                set_visible(up.querySelector('[role="treeitem"]'), level + 1);
            }
        }

        const items = element.querySelectorAll('[role="treeitem"]');
        for(let i=0;i<items.length;i++) {
            const item = items[i];

            const header = document.getElementById(item.getAttribute('href').slice(1));
            const {top, bottom} = header.getBoundingClientRect();
            const visibility = bottom < 0 ? 'above' : top > window.innerHeight ? 'below' : 'visible';

            item.dataset.visibility = visibility;

            item.tabIndex = -1;
            switch(visibility) {
                case 'above':
                    set_not_visible(item);
                    break;
                case 'visible':
                    set_visible(item);
                    break;
                case 'below':
                    set_not_visible(item);
                    if(i > 0 && items[i-1].dataset.visibility != 'below') {
                        set_visible(items[i-1], 100);
                    }
                    break;
            }
        }

        const visible_items = all_items.filter(item => item.classList.contains('visible'));
        if(visible_items.length) {
            visible_items[visible_items.length-1].tabIndex = 0;
        }
    }
    update_visibility();
    document.addEventListener('scroll', update_visibility);
}


Array.from(document.querySelectorAll('body > main > #sidebar .table-of-contents')).forEach(treeview);
