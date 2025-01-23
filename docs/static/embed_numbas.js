/** Post a message to all of the given window's frames, and all of their frames, recursively.
 */
function postToFrames(contentWindow, data) {
    for(let frame of Object.values(contentWindow.frames)) {
        frame.postMessage(data, '*');
        if(frame.frames.length > 0) {
            postToFrames(frame, data);
        }
    }
}

/** A custom element to embed a Numbas exam.
 *
 *  If the exam uses the `postmessage-to-parent` extension, this element will resize to match the exam's displayed height, and can show score feedback.
 *  
 *  Attributes:
 *
 *  * `url`: The embed URL of the exam
 *  * `id`: A unique ID for this exam. If not given, a currently-unique ID will be picked automatically.
 */
class EmbedNumbasElement extends HTMLElement {
    constructor() {
        super();

        this.exam_data = {};

        this.url = this.getAttribute('url');
        this.id = this.getAttribute('id');
        this.storageKey = `numbas_embed:${location.href}:${this.id}:${this.url}`;

        const template = document.getElementById('embed-numbas-template');
        const templateContent = template.content;

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.iframe = shadowRoot.querySelector('iframe.embed');
        this.iframe_loaded = new Promise((resolve, reject) => {
            this.resolve_iframe_loaded = resolve;
        });

        const wrapper = this.shadowRoot.querySelector('#wrapper');

        wrapper.addEventListener('toggle', (event) => {
            if(wrapper.open) {
                this.load_exam();
            }
        });

        this.iframe_loaded.then(() => {
            wrapper.classList.add('loaded');
        });

        this.listen_for_messages();

        this.send_message({"message":"send_id","id":this.id});

        this.load_data();
    }

    /** Load the exam: set the `src` of the iframe, and wait for it to load.
     */
    load_exam() {
        if(this.loaded_exam) {
            return;
        }

        this.iframe.setAttribute('src', this.url);
        this.iframe.addEventListener('load', () => setTimeout(() => this.resolve_iframe_loaded(), 200));
        this.loaded_exam = true;
    }

    load_data() {
        try {
            this.exam_data = JSON.parse(localStorage.getItem(this.storageKey)) || {};
        } catch(e) {
            this.exam_data = {};
        } finally {
            this.update_display();
        }
    }

    save_data() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.exam_data));
    }

    update_display() {
        const score = this.exam_data?.score || 0;
        const max_marks = this.exam_data?.marks;
        const complete = max_marks !== undefined && score !== undefined && score >= max_marks;
        const completionStatus = max_marks === undefined ? 'unknown' : complete ? 'complete' : 'incomplete';
        this.shadowRoot.querySelector('#wrapper').dataset.completionStatus = completionStatus;

        if(max_marks !== undefined && score !== undefined) {
            const score_feedback = this.shadowRoot.querySelector('#score-feedback progress');

            score_feedback.classList.add('show');
            score_feedback.setAttribute('max', max_marks);
            score_feedback.value = score;
            score_feedback.textContent = `${score} / ${max_marks}`;
        }
    }

    /** Send a message to the Numbas exam iframe.
     */
    async send_message(message) {
        await this.iframe_loaded;
        postToFrames(this.iframe.contentWindow, JSON.stringify(message));
    }

    /** Set up a listener for messages from the Numbas exam iframe.
     */
    listen_for_messages() {
        window.addEventListener('message', event => {
            try {
                var data = JSON.parse(event.data);
            } catch(e) {
                return;
            }
            console.log(data);

            if(data.numbas_version === undefined) {
                return;
            }

            if(data.frame_id != this.id) {
                return;
            }

            if(data.message === undefined) {
                return;
            }

            const handler = this[`handle_${data.message}`];
            if(!handler) {
                console.log(_("Unexpected postMessage data:"),data);
                return;
            }
            handler.call(this,data);
        });
    }

    handle_height_changed(data) {
        const height = parseFloat(data.documentHeight) + 50;
        if(isNaN(height)) {
            return;
        }
        this.iframe.style.height = `${height}px`;
    }

    handle_SCORM_value(data) {
        const {key, value} = data;
        const {exam_data} = this;
        const key_handlers = {
            'cmi.score.raw': () => { exam_data.score = value; },
            'cmi.score.max': () => { exam_data.marks = value; },
            'cmi.completion_status': () => { exam_data.completion_status = value; }
        }

        if(key in key_handlers) {
            key_handlers[key]();
            this.update_display();
            this.save_data();
        }
    }

}

customElements.define("embed-numbas", EmbedNumbasElement);

