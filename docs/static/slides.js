setTimeout(() => {
    function restart_videos(section) {
        for(let video of section.querySelectorAll('video')) {
            video.currentTime = 0;
            video.pause();
        }
    }

    const sections = Array.from(document.querySelectorAll('main > section'));
    function scroll_update() {
        const section = sections.toReversed().find(s => s.getBoundingClientRect().top <= 10);
        if(!section) {
            return;
        }
        if(section.id) {
            const hash = `#${section.id}`;
            if(location.hash != hash) {
                history.replaceState('','',hash);
                restart_videos(section);
            }
        }
    }

    scroll_update();

    let lastKnownScrollPosition = 0;
    let ticking = false;

    const main = document.querySelector('main');
    main.addEventListener('scroll', function(e) {
        lastKnownScrollPosition = main.scrollTop;

        if (!ticking) {
            window.requestAnimationFrame(function() {
                scroll_update(lastKnownScrollPosition);
                ticking = false;
            });

            ticking = true;
        }
    });

    function move_slide(section,i,d) {
        if(d<0) {
            const revealed = section.querySelectorAll('.fragment.revealed');
            if(revealed.length) {
                revealed[revealed.length-1].classList.remove('revealed');
                return;
            }
        } else if(d>0) {
            const revealable = section.querySelectorAll('.fragment:not(.revealed)');
            if(revealable.length) {
                revealable[0].classList.add('revealed');
                return;
            }
        }

        const to_section = sections[i+d];
        if(to_section) {
            to_section.scrollIntoView();
        }
    }

    function get_current_section() {
        for(let i=0; i<sections.length; i++) {
            const {top} = sections[i].getBoundingClientRect();
            if(top >= 0) {
                return i;
            }
        }
    }

    /** Move slides because the user pressed an arrow key.
     */
    function key_move(d) {
        const i = get_current_section();
        if(i === undefined) {
            return;
        }

        move_slide(sections[i],i,d);
    }

    document.body.addEventListener('keydown', e => {
        switch(e.key) {
            case 'ArrowLeft':
                key_move(-1);
                break;
            case 'ArrowRight':
                key_move(1);
        }
    });

    const has_pager = document.getElementById('pager') !== null;

    if(has_pager) {
        document.getElementById('move-backwards').addEventListener('click', () => key_move(-1));
        document.getElementById('move-forwards').addEventListener('click', () => key_move(1));
    } else {
        sections.forEach((section,i) => {
            section.addEventListener('click', e => {
                if(e.target.nodeName.toLowerCase()=='a') {
                    return;
                }

                const box = section.getBoundingClientRect();
                const qx = Math.floor(4*(e.pageX - box.left)/(box.width));
                const qy = Math.floor(4*(e.pageY - box.top)/(box.height));
                if(qy<3) {
                    return;
                }
                const d = qx==0 ? -1 : qx==3 ? 1 : 0;

                e.preventDefault();
                e.stopPropagation();

                move_slide(section,i,d);

                document.addEventListener('selectionchange', () => {
                    window.getSelection().collapseToStart()
                }, {once:true});

            })
        })
    }


    window.matchMedia("print").addEventListener("change", evt => {
        if (evt.matches) {
            for(let e of document.body.querySelectorAll(".fragment:not(.revealed)")) {
                e.setAttribute("open", "");
                e.dataset.wasclosed = "";
            }
        } else {
            for(e of document.body.querySelectorAll(".fragment(.revealed)")) {
                e.removeAttribute("open");
                delete e.dataset.wasclosed;
            }
        }
    })

},100);
