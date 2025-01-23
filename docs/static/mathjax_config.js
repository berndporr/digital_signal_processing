(() => {
const body_refs = {};
const plastex_labels = document.getElementById('plastex-labels');
if(plastex_labels) {
    Object.assign(body_refs, JSON.parse(plastex_labels.textContent));
}
window.MathJax = {
    tex: {
        macros: {
            mathsterling: '{\\unicode{xA3}}',
            pounds: '{\\unicode{xA3}}',
            euro: '\\unicode{x20AC}',
            bm: ["\\boldsymbol{ #1 }",1],
            lefteqn: ["\\rlap{ #1 }\\quad",1],
            qedhere: "\\tag*{$\\blacksquare$}"
        },
        inlineMath: [['\\(','\\)']],
        autoload: {},
        packages: {'[+]': [
            'noerrors',
            'mhchem',
            'textmacros',
            'mathtools',
            'tagformat',
            'chirun-eqref'
        ]},
        textmacros: {
            packages: {'[+]': ['bbox']}
        },
        tagformat: {
            url: (id, base) => {
                /** 
                 * Format the URL for a reference in math mode.
                 * If it's in `body_refs`, strip off MathJax's `mjx-eqn:` prefix.
                 */
                const stripped_id = id.replace(/^mjx-eqn:/,'');
                if(body_refs[stripped_id]) {
                    id = '#' + stripped_id;
                }
                return id;
            }
        }
    },
    startup: {
        typeset: true,
        ready: () => {
            const Configuration = MathJax._.input.tex.Configuration.Configuration;
            const CommandMap = MathJax._.input.tex.SymbolMap.CommandMap;
            const Label = MathJax._.input.tex.Tags.Label;
            const BaseMethods = MathJax._.input.tex.base.BaseMethods.default;

            new CommandMap('chirun-eqref', {
                ref:     ['HandleRef', false],
                eqref: ['HandleRef', true]
            }, {
                HandleRef(parser, name, eqref) {
                    const i = parser.i;
                    const label = parser.GetArgument(name);
                    parser.i = i;

                    const ref = parser.tags.allLabels[label] || parser.tags.labels[label];

                    if (!ref && parser.tags.refUpdate) {
                        /** When there is a reference in math mode to a label defined in text mode, fill it in from `body_refs`.
                         */
                        if(body_refs[label]) {
                            const {ref, url} = body_refs[label];
                            parser.tags.labels[label] = new Label(ref, url);
                        }
                    }

                    BaseMethods.HandleRef(parser, name, eqref);
                }
            });

            Configuration.create('chirun-eqref', {
                handler: {macro: ['chirun-eqref']}
            });

            MathJax.startup.defaultReady();
            MathJax.startup.promise.then(() => {
                window.mathjax_is_loaded = 1;
            });
        }
    },
    options: {
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process',
        renderActions: {
            findScript: [10, function (doc) {
                for (const node of document.querySelectorAll('script[type^="math/tex"]')) {
                    const display = !!node.type.match(/; *mode=display/);
                    const math = new doc.options.MathItem(node.textContent, doc.inputJax[0], display);
                    const text = document.createTextNode('');
                    node.parentNode.replaceChild(text, node);
                    math.start = {node: text, delim: '', n: 0};
                    math.end = {node: text, delim: '', n: 0};
                    doc.math.push(math);
                }
            }, '']
        }
    },
    loader: {
        load: [
            '[tex]/noerrors',
            '[tex]/mhchem',
            '[tex]/textmacros',
            '[tex]/bbox',
            '[tex]/mathtools',
            '[tex]/tagformat'
        ]
    }
};
})();
