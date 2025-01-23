import QRCode from './qrcode.js';


class QRCodeElement extends HTMLElement {
    constructor() {
        super();
        const text = this.getAttribute('text');
        const DEFAULT_SIZE = 128;
        const width = parseFloat(this.getAttribute('width') || DEFAULT_SIZE);
        const height = parseFloat(this.getAttribute('width') || DEFAULT_SIZE);
        const link = this.hasAttribute('link');

        const shadowRoot = this.attachShadow({mode: 'open'});

        let container = document.createElement('div');
        if(link) {
            const a = document.createElement('a');
            a.href = text;
            a.target = '_blank';
            a.appendChild(container);
            container = a;
        }

        shadowRoot.appendChild(container);

        const qrcode = new QRCode(container, {width, height});

        qrcode.makeCode(text);
    }
}

customElements.define("qr-code", QRCodeElement);
