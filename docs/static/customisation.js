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
