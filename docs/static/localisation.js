import translations from "./translations.js";

window.gettext = window._ = function(key) {
    return translations[key] || key;
}
