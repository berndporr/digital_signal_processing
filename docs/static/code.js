/** 
 * Runnable code blocks in Chirun
 * Based on the Numbas Programming Extension, Newcastle University, 2020-2022
 * https://github.com/numbas/numbas-extension-programming
 * License: Apache License 2.0
 */
import codemirror_editor from "./runnable_code.js";

const webR_URL = 'https://webr.r-wasm.org/v0.2.1/webr.mjs';

var codeMirrorInstances = {};

/** Objects to run code in different languages.
 * @enum {CodeRunner}
 */
var language_runners = {}

const register_language_runner = function(name, runner) {
    language_runners[name] = new runner();
}

/** An object which can run code in a certain language.
 */
class CodeRunner {
    constructor() {
        this.job_id_acc = 0;
        this.jobs = {};

        this.namespace_id_acc = 0;
        this.clear_buffers();
    }

    /** Clear the STDOUT and STDERR buffers.
     */
    clear_buffers() {
        this.buffers = {
            stdout: '',
            stderr: ''
        };
    }

    /** The contents of the STDOUT buffer after running a block of code.
     * @type {string}
     */
    get stdout() {
        return this.buffers.stdout;
    }

    /** The contents of the STDERR buffer after running a block of code.
     * @type {string}
     */
    get stderr() {
        return this.buffers.stderr;
    }

    /** Create a session using this runner.
     * @returns {CodeSession}
     */
    new_session() {
        return new CodeSession(this);
    }

    /** Create a new namespace to run code in.
     * @returns {namespace_id}
     */
    new_namespace() {
        return this.namespace_id_acc++;
    }

    /** Create a new ID for a job.
     * @returns {job}
     */
    new_job() {
        const job_id = this.job_id_acc++;
        const promise = new Promise((resolve, reject) => {
            this.jobs[job_id] = { id: job_id, resolve, reject };
        });
        const job = this.jobs[job_id];
        job.promise = promise;
        return job;
    }

    /** Get the job with the given ID, or throw an error if it doesn't exist.
     * @param {job_id} job_id
     * @returns {job}
     */
    get_job(job_id) {
        if(!this.jobs[job_id]) {
            throw(new Error(_`Unrecognised job id ${job_id}`));
        }
        return this.jobs[job_id];
    }

    /** Run some code in this runner, in the given namespace.
     * @param {string} code - The code to run.
     * @param {namespace_id} namespace_id - The ID of the namespace to run the code in.
     * @returns {job}
     */
    run_code(code, namespace_id) {
        throw(new Error(_("run_code should be implemented.")));
    }

    /** Interrupt the execution of a job.
     * @param {job_id} job_id
     */
    interrupt() {
        throw(new Error(_("This code runner can't be interrupted.")));
    }

    /** Run several blocks of code in the same session.
     *  Empty blocks of code won't run, but will return result `undefined` and success `true`.
     *
     * @param {Array.<string>} codes - Blocks of code to run.
     * @returns {Promise.<Array.<run_result>>}
     */
    async run_code_blocks(codes) {
        const session = this.new_session();
        var results = [];
        for(let code of codes) {
            if(code.trim()=='') {
              results.push({
                result: undefined,
                success: true,
                stdout: '',
                stderr: ''
              });
              continue;
            }
            try {
                const result = await session.run_code(code);
                results.push(result);
            } catch(error) {
                results.push(error);
            }
        }
        return {results, session};
    }
}

/** An independent session to run code in.
 *  Code run in one session should not affect code run in another.
 *  @param {CodeRunner} runner
 */
class CodeSession {
    constructor(runner) {
        this.runner = runner;
        this.namespace_id = runner.new_namespace();
    }

    async run_code(code) {
        try {
            const job = await this.runner.run_code(code, this);
            const result = await job.promise;
            return Object.assign({success: true}, result);
        } catch(err) {
            return Object.assign({success: false}, err);
        }
    }
}

/** Load pyodide - inserts the script in the page, and returns a promise which resolves to the `pyodide` object. 
 * @returns {Promise.<pyodide>}
 */
class PyodideRunner extends CodeRunner {
    constructor() {
        super();
        const worker_url = new URL(chirun_static_url.href);
        worker_url.pathname += '/pyodide_worker.js';
        var worker = this.worker = new Worker(worker_url);

        worker.onmessage = (event) => {
            const job_id = event.data.job_id;
            const job = this.get_job(job_id);
            if(event.data.error) {
                job.reject(event.data);
            } else {
                job.resolve(event.data);
            }
        }
    }
    run_code(code, session) {
        const {namespace_id} = session;
        const job = this.new_job();
        this.worker.postMessage({
            command: 'runPython',
            job_id: job.id,
            namespace_id: namespace_id,
            code: code
        });
        return job;
    }

    interrupt(job_id) {
        if(this.interruptBuffer) {
           this.interruptBuffer[0] = 2;
        } else {
            return super.interrupt(job_id);
        }
    }
}
register_language_runner('pyodide', PyodideRunner);

/** Load webR - inserts the script in the page, and returns a promise which resolves to the `webR` object. 
 * @returns {Promise.<webR>}
 */
class WebRRunner extends CodeRunner {
    constructor() {
        super();
    }

    new_session() {
        const session = super.new_session();
        this.run_code(`${this.namespace_name(session.namespace_id)} <- new.env()`);
        return session;
    }

    namespace_name(namespace_id) {
        return `webr_namespace${namespace_id}`;
    }

    /** Start loading webR.
     * @returns {Promise} - Resolves to the `webR` object once it has loaded.
     */
    load_webR() {
        if(!this.webRPromise) {
            this.webRPromise = new Promise(async (resolve, reject) => {
                const { WebR, ChannelType } = await import(webR_URL);
                const webR = new WebR({
                  channelType: ChannelType.PostMessage,
                    loadPackages: []
                });
                await webR.init();
                await webR.evalRVoid(`options(device=webr::canvas)`);
                await webR.flush();
                resolve(webR);
            });
        }
        return this.webRPromise;
    }

    run_code(code, session) {
        const {namespace_id} = session || {};
        const job = this.new_job();

        if(namespace_id !== undefined) {
            code = `with(${this.namespace_name(namespace_id)}, {\n${code}\n})`;
        }

        this.load_webR().then(async (webR) => {
            try {
                const shelter = await new webR.Shelter();

                const msg = await shelter.captureR(code);
                const {result, output} = msg;

                const webR_type_to_json = {
                    'complex': ({re,im}) => `${re} + ${im}i`,
                    'null': v => 'null',
                };

                const webR_to_json = function(r) {
                    switch(r.type) {
                        case 'null':
                            return 'NULL';
                        case 'list':
                        case 'object':
                            const values = r.values.map(webR_to_json);
                            if(r.names) {
                                return '{'+r.names.map((n,i) => `${JSON.stringify(n)}: ${values[i]}`).join(', ')+'}';
                            } else {
                                return values.join(' ');
                            }
                        default:
                            const fn = webR_type_to_json[r.type] || (v => JSON.stringify(v));
                            return r.values.map(fn).join(' ');
                    }
                }

                let result_js;
                try {
                    const js = (await result.toJs());
                    result_js = webR_to_json(js);
                } catch(e) {
                }

                const [stdout,stderr] = ['stdout','stderr'].map(buffer => output.filter(x => x.type==buffer).map(x => x.data).join('\n'));

                shelter.purge();

                job.resolve({
                    result: result_js,
                    stdout: stdout,
                    stderr: stderr
                });
            } catch(err) {
                job.reject({
                    error: err.message,
                    stdout: '',
                    stderr: err
                });
            }; 
        });

        return job;
    }

    async run_code_blocks(codes) {
        const {results, session} = await super.run_code_blocks(codes);
        const webR = await this.load_webR();
        const messages = await webR.flush();
        const image_events = messages.filter(x => x.type=='canvas').map(x => x.data);
        const images = [];
        let canvas, ctx;
        image_events.forEach(data => {
            switch(data.event) {
                case 'canvasNewPage':
                    canvas = document.createElement('canvas');
                    images.push(canvas);
                    ctx = canvas.getContext('2d');
                    break;
                case 'canvasImage':
                    if(!ctx) {
                        break;
                    }
                    if(data.image.width > canvas.width || data.image.height > canvas.height) {
                        canvas.width = Math.max(data.image.width, canvas.width);
                        canvas.height = Math.max(data.image.height, canvas.height);
                    }
                    ctx.drawImage(data.image,0,0);
                    break;
            }
        });

        return {results, session, images};
    }
}
register_language_runner('webr', WebRRunner);

var run_code = async function(language, codes) {
    try {
        return await language_runners[language_synonym(language)].run_code_blocks(codes);
    } catch(error_results) {
        return error_results;
    }
}

/** Synonyms for code languages (for when there's more than one way of running a given language)
 */
var languageSynonyms = {
    'python': 'pyodide',
    'r': 'webr'
}

/** Get the canonical name for a language by applying synonyms.
 * @param {string} name
 * @returns {string}
 */
var language_synonym = function(name) {
    return languageSynonyms[name] || name;
}

class RunnableCodeElement extends HTMLElement {
    constructor() {
        super();

        this.language = this.getAttribute('language');

        const template = document.getElementById('runnable-code-template');
        const templateContent = template.content;

        const shadowRoot = this.attachShadow({mode: 'open'});
        shadowRoot.appendChild(templateContent.cloneNode(true));

        this.wrapper = shadowRoot.querySelector('.runnable-code-wrapper');
        this.output_display = shadowRoot.querySelector('#output');
        this.code_tag = this.shadowRoot.querySelector('#code');
        this.set_state('fresh');
        this.wrapper.dataset.format = document.body.dataset.format;

        this.init_editor();

        const run_button = this.run_button = shadowRoot.querySelector('.run-code');
        run_button.addEventListener('click', () => this.run());

        Array.from(shadowRoot.querySelectorAll('.fullscreenable')).forEach(container => {
            container.querySelector('button.fullscreen').addEventListener('click', () => {
                if(shadowRoot.fullscreenElement == container) {
                    document.exitFullscreen();
                } else {
                    container.requestFullscreen();
                }
            });
            container.addEventListener('fullscreenchange', () => setTimeout(() => container.scrollIntoView(), 1));
        });
    }

    init_editor() {
        const code = this.textContent;
        const code_tag = this.shadowRoot.querySelector('#code');

        this.codeMirror = codemirror_editor(
            this.language,
            {
                doc: code,
                parent: code_tag,
                root: this.shadowRoot,
                onChange: update => this.onChange(update)
            }
        );
    }

    set_state(state) {
        this.state = state;
        this.wrapper.dataset.state = this.state;
    }

    async run() {
        switch(this.state) {
            case 'running':
            case 'running-changed':
                return;
        }

        this.run_button.disabled = true;

        const code = this.codeMirror.state.doc.toString();

        try {
            const {results, images} = await run_code(this.language,[code]);
            const [result] = results;

            let output = result.stdout+result.stderr;

            this.output_display.querySelector('.stdout').textContent = output;
            this.output_display.classList.toggle('has-result', result.result);

            const result_string = result.result ?? '';
            this.output_display.querySelector('.result').textContent = result_string;

            const image_display = this.output_display.querySelector('.images');
            image_display.innerHTML = '';
            if(images) {
                for(let canvas of images) {
                    image_display.appendChild(canvas);
                }
            }
        } catch(error) {
            console.error(_`An error occured running code.`);
            console.log(error);
        } finally {
            switch(this.state) {
                case 'running-changed':
                    this.set_state('changed');
                default:
                    this.set_state('ran');
            }
            this.run_button.disabled = false;
        };
    }

    onChange() {
        switch(this.state) {
            case 'fresh':
                break;
            case 'running':
                this.set_state('running-changed');
                break;
            default:
                this.set_state('changed');
        }
    }
}
customElements.define("runnable-code", RunnableCodeElement);
