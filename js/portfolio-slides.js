document.addEventListener('DOMContentLoaded', () => {
    const sections = [...document.querySelectorAll('body > section[id]')];
    const names = ['Hello', 'Identity', 'Technology universe', 'Professional journey', 'Engineering gallery', 'Connect'];
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const compact = window.matchMedia('(max-width: 768px)');
    const navbar = document.querySelector('.navbar');
    const lifetime = new AbortController();
    const listen = (element, type, callback, options = {}) =>
        element.addEventListener(type, callback, { ...options, signal: lifetime.signal });
    const status = document.createElement('p');
    status.className = 'cinematic-status';
    status.setAttribute('role', 'status');
    document.body.append(status);
    function notify(message) { status.textContent = message; }
    const hasTimeline = Boolean(window.gsap && window.ScrollTrigger);
    if (hasTimeline) {
        window.gsap.registerPlugin(window.ScrollTrigger);
        window.ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });
    }
    else {
        console.warn('GSAP/ScrollTrigger did not load. The portfolio will use its readable document layout.');
        notify('Animation libraries are unavailable. All content is available in the standard layout.');
    }

    const stage = document.createElement('main');
    stage.className = 'cinematic-stage';
    stage.setAttribute('aria-label', 'A journey through my engineering world');
    const backdrop = document.createElement('div');
    backdrop.className = 'cinematic-world';
    backdrop.setAttribute('aria-hidden', 'true');
    stage.append(backdrop);
    sections[0].before(stage);
    const ribbon = document.querySelector('.stack-ribbon');
    const footer = document.querySelector('.footer');
    const contents = sections.map((section, index) => {
        const content = document.createElement('div');
        content.className = 'scene-content';
        while (section.firstChild) content.append(section.firstChild);
        section.append(content);
        section.tabIndex = -1;
        const heading = section.querySelector('.section-header');
        stage.append(section);
        return content;
    });
    contents[0].append(ribbon);
    contents[5].append(footer);
    sections.forEach(section => {
        section.querySelectorAll('.is-pending').forEach(element => element.classList.remove('is-pending'));
        section.querySelectorAll('.skill-progress').forEach(bar => { bar.style.width = `${bar.dataset.width}%`; });
    });
    const controls = document.createElement('nav');
    controls.className = 'scene-controls';
    controls.setAttribute('aria-label', 'Cinematic journey navigation');
    controls.innerHTML = '<button type="button" class="scene-previous" aria-label="Previous scene">&#8592;</button>' +
        
        '<div class="scene-dots"></div>' +
        '<button type="button" class="scene-next" aria-label="Next scene">&#8594;</button>' +
        '<span class="scene-announcement" role="status" aria-live="polite"></span>';
    document.body.append(controls);
    const previous = controls.querySelector('.scene-previous');
    const next = controls.querySelector('.scene-next');
    const announcement = controls.querySelector('.scene-announcement');
    const dots = sections.map((section, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('aria-label', `Explore ${names[index]}`);
        listen(button, 'click', () => navigate(index, true));
        controls.querySelector('.scene-dots').append(button);
        return button;
    });
    let active = -1;
    let timeline = null;
    let world = null;
    let segments = [];
    let total = 0;
    let rebuildFrame = 0;
    let navigationTween = null;
    let staticFrame = 0;
    let building = false;
    let disposed = false;
    const playhead = { position: 0 };
    const cameraState = { x: 0, y: 1, z: 15, lookX: 0, lookY: 0, lookZ: 0, fov: 48, roll: 0 };
    const cameraStops = [
        { x: 0, y: 1, fov: 48, roll: 0 },
        { x: -1.5, y: 0.7, fov: 50, roll: 0.012 },
        { x: 1.5, y: 0.4, fov: 53, roll: -0.015 },
        { x: -1.2, y: 1.4, fov: 48, roll: 0.01 },
        { x: 1.2, y: 0.4, fov: 51, roll: -0.012 },
        { x: 0, y: 0.8, fov: 46, roll: 0 }
    ];
    const clamp = value => Math.max(0, Math.min(1, value));
    const ease = value => value * value * (3 - 2 * value);

    function setActive(index) {
        if (active === index) return;
        const old = sections[active];
        active = index;
        if (old && old.contains(document.activeElement) && !document.querySelector('dialog[open]')) {
            sections[active].focus({ preventScroll: true });
        }
        sections.forEach((section, position) => {
            section.classList.toggle('scene-active', position === index);
            section.inert = Boolean(timeline) && position !== index;
            if (timeline) section.setAttribute('aria-hidden', String(position !== index));
            else section.removeAttribute('aria-hidden');
        });
        previous.disabled = index === 0;
        next.disabled = index === sections.length - 1;
        announcement.textContent = names[index];
        dots.forEach((button, position) => {
            if (position === index) button.setAttribute('aria-current', 'step');
            else button.removeAttribute('aria-current');
        });
        document.querySelectorAll('.navbar-links a').forEach(link => {
            const selected = link.getAttribute('href') === `#${sections[index].id}`;
            link.classList.toggle('active', selected);
            if (selected) link.setAttribute('aria-current', 'page');
            else link.removeAttribute('aria-current');
        });
    }

    function renderJourney() {
        const position = playhead.position;
        const viewport = stage.clientHeight;
        let current = 0;
        segments.forEach((segment, index) => {
            const arriving = segment.start - segment.transitionIn;
            const enter = segment.transitionIn ? ease(clamp((position - arriving) / segment.transitionIn)) : 1;
            const leave = index < sections.length - 1 ? ease(clamp((position - segment.holdEnd) / segment.transitionOut)) : 0;
            const opacity = enter * (1 - leave);
            const node = sections[index];
            const direction = index % 2 ? -1 : 1;
            const depth = compact.matches ? 220 : 650;
            const twist = compact.matches ? 5 : 12;
            node.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
            node.style.opacity = String(opacity);
            node.style.transform = `translate3d(${direction * ((1 - enter) * 7 - leave * 7)}%,0,${-depth * ((1 - enter) + leave)}px) rotateY(${direction * twist * ((1 - enter) - leave)}deg)`;
            const travel = clamp((position - segment.start - viewport * 0.15) / Math.max(1, segment.duration - viewport * 0.35));
            contents[index].style.transform = `translate3d(0,${-segment.overflow * travel}px,0)`;
            if (position >= arriving + segment.transitionIn * 0.5) current = index;
        });
        setActive(current);
        const progress = total ? position / total : 0;
        document.documentElement.style.setProperty('--journey', progress.toFixed(5));
        if (world) world.update(cameraState, progress);
    }

    function updateStatic() {
        staticFrame = 0;
        let index = 0;
        sections.forEach((section, position) => {
            if (section.getBoundingClientRect().top <= innerHeight * 0.45) index = position;
        });
        setActive(index);
        const distance = document.documentElement.scrollHeight - innerHeight;
        document.documentElement.style.setProperty('--journey', String(distance ? clamp(scrollY / distance) : 0));
    }

    function rebuild() {
        rebuildFrame = 0;
        if (disposed || building) return;
        building = true;
        const oldSegment = segments[active];
        const local = oldSegment ? clamp((playhead.position - oldSegment.start) / oldSegment.duration) : 0;
        const savedIndex = Math.max(0, active);
        const wasPinned = Boolean(timeline);
        if (navigationTween) navigationTween.kill();
        if (timeline) {
            timeline.scrollTrigger.kill(true);
            timeline.kill();
            timeline = null;
        }
        document.documentElement.style.setProperty('--stage-h', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--nav-height', `${navbar.getBoundingClientRect().height}px`);
        sections.forEach(section => {
            section.removeAttribute('style');
            section.inert = false;
            section.removeAttribute('aria-hidden');
        });
        contents.forEach(content => { content.style.transform = ''; });
        const pinned = hasTimeline && !motion.matches;
        document.body.classList.toggle('cinematic-static', !pinned);
        if (!pinned) {
            if (world) { world.destroy(); world = null; }
            active = -1;
            updateStatic();
            if (wasPinned) sections[savedIndex].scrollIntoView({ behavior: 'instant' });
            building = false;
            return;
        }
        if (!world && window.createPortfolioWorld && !navigator.connection?.saveData) {
            world = window.createPortfolioWorld(backdrop, notify);
        }
        const height = stage.clientHeight;
        total = 0;
        segments = contents.map((content, index) => {
            const overflow = Math.max(0, content.scrollHeight - height);
            const duration = Math.max(height * 2.4, overflow + height * 1.8);
            const transitionOut = index < sections.length - 1 ? height * 0.95 : 0;
            const segment = { start: total, duration, overflow, holdEnd: total + duration,
                transitionOut, transitionIn: index ? height * 0.95 : 0 };
            total += duration + transitionOut;
            return segment;
        });
        window.gsap.set(cameraState, { ...cameraStops[0], z: 15, lookX: 0, lookY: 0, lookZ: 0 });
        timeline = window.gsap.timeline({
            paused: true,
            onUpdate: renderJourney,
            scrollTrigger: {
                id: 'portfolio-world',
                trigger: stage,
                start: 'top top',
                end: () => `+=${total}`,
                pin: true,
                scrub: 1.2,
                anticipatePin: 1,
                invalidateOnRefresh: true
            }
        });
        timeline.to(playhead, { position: total, duration: total, ease: 'none' }, 0);
        segments.forEach((segment, index) => {
            timeline.addLabel(sections[index].id, segment.start);
            timeline.to(cameraState, {
                z: -index * 28 + 12, lookZ: -index * 28 - 2, duration: segment.duration, ease: 'none'
            }, segment.start);
            if (index < sections.length - 1) {
                timeline.to(cameraState, {
                    ...cameraStops[index + 1], z: -(index + 1) * 28 + 15,
                    lookX: cameraStops[index + 1].x * 0.35, lookY: 0,
                    lookZ: -(index + 1) * 28, duration: segment.transitionOut, ease: 'sine.inOut'
                }, segment.holdEnd);
            }
        });
        active = -1;
        window.ScrollTrigger.refresh();
        if (wasPinned) {
            const target = segments[savedIndex].start + segments[savedIndex].duration * local;
            window.scrollTo({ top: timeline.scrollTrigger.start + target, behavior: 'instant' });
            timeline.time(target, false);
        } else timeline.time(0, false);
        renderJourney();
        building = false;
    }

    function scheduleRebuild() {
        if (document.activeElement?.matches('input,textarea,select')) { rebuildPending = true; return; }
        if (!rebuildFrame && !building) rebuildFrame = requestAnimationFrame(rebuild);
    }
    // The mobile keyboard resizes the viewport; rebuilding then would reset the scene and drop focus.
    let rebuildPending = false;
    listen(document, 'focusout', () => {
        setTimeout(() => {
            if (rebuildPending && !document.activeElement?.matches('input,textarea,select')) {
                rebuildPending = false;
                scheduleRebuild();
            }
        }, 350);
    });

    function closeNavigation() {
        document.getElementById('navbar-menu').classList.remove('active');
        const toggle = document.getElementById('navbar-toggle');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', 'Open navigation');
        toggle.innerHTML = '<i class="fas fa-bars" aria-hidden="true"></i>';
    }

    function navigate(index, focus = false, history = true) {
        if (index < 0 || index >= sections.length) return;
        if (history && location.hash !== `#${sections[index].id}`) {
            window.history.pushState(null, '', `#${sections[index].id}`);
        }
        if (navigationTween) navigationTween.kill();
        if (timeline) {
            const position = segments[index].start;
            const scroll = { y: window.scrollY };
            navigationTween = window.gsap.to(scroll, {
                y: timeline.scrollTrigger.start + position,
                duration: focus ? 1.1 : 0,
                ease: 'power2.inOut',
                onUpdate: () => window.scrollTo({ top: scroll.y, behavior: 'instant' }),
                onComplete: () => {
                    timeline.time(position, false);
                    if (focus) sections[index].focus({ preventScroll: true });
                    navigationTween = null;
                }
            });
        } else {
            sections[index].scrollIntoView({ behavior: 'instant' });
            setActive(index);
            if (focus) sections[index].focus({ preventScroll: true });
        }
    }

    listen(previous, 'click', () => navigate(active - 1, true));
    listen(next, 'click', () => navigate(active + 1, true));
    listen(window, 'click', event => {
        const anchor = event.target.closest('a[href^="#"]');
        if (!anchor || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        const index = sections.findIndex(section => `#${section.id}` === anchor.getAttribute('href'));
        if (index < 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        closeNavigation();
        navigate(index, true);
    }, { capture: true });
    listen(window, 'hashchange', () => {
        const index = sections.findIndex(section => `#${section.id}` === location.hash);
        navigate(index < 0 ? 0 : index, false, false);
    });
    listen(window, 'wheel', () => { if (navigationTween) navigationTween.kill(); }, { passive: true });
    listen(window, 'touchstart', () => { if (navigationTween) navigationTween.kill(); }, { passive: true });
    listen(document, 'keydown', event => {
        if (!timeline || event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey ||
            event.target.closest('input,textarea,select,button,a,dialog,[contenteditable="true"]')) return;
        const keys = { ArrowDown: 1, ArrowUp: -1, PageDown: 1, PageUp: -1, ' ': event.shiftKey ? -1 : 1 };
        if (!(event.key in keys)) return;
        event.preventDefault();
        if (navigationTween) navigationTween.kill();
        window.scrollBy({ top: keys[event.key] * stage.clientHeight * 0.65, behavior: 'smooth' });
    });
    listen(window, 'scroll', () => {
        if (!timeline && !staticFrame) staticFrame = requestAnimationFrame(updateStatic);
    }, { passive: true });
    listen(window, 'resize', scheduleRebuild);
    listen(motion, 'change', scheduleRebuild);
    listen(document, 'click', event => {
        if (event.target.closest('.filter-btn,.tab-btn')) scheduleRebuild();
    });

    const dialog = document.createElement('dialog');
    dialog.className = 'project-dialog';
    dialog.setAttribute('aria-labelledby', 'project-dialog-title');
    dialog.innerHTML = '<button type="button" class="project-details-trigger dialog-close" autofocus>Close / Esc</button><div class="dialog-body"></div>';
    document.body.append(dialog);
    listen(dialog.querySelector('.dialog-close'), 'click', () => dialog.close());
    listen(dialog, 'click', event => { if (event.target === dialog) dialog.close(); });
    listen(dialog, 'close', () => { if (timeline) renderJourney(); });
    document.querySelectorAll('.project-card').forEach(card => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'project-details-trigger';
        button.textContent = 'Explore project +';
        button.setAttribute('aria-label', `Explore ${card.querySelector('.project-title').textContent}`);
        button.setAttribute('aria-haspopup', 'dialog');
        listen(button, 'click', () => {
            const body = dialog.querySelector('.dialog-body');
            body.replaceChildren();
            body.append(card.querySelector('.project-image').cloneNode(true));
            const details = card.querySelector('.project-content').cloneNode(true);
            details.querySelector('.project-details-trigger')?.remove();
            details.querySelector('.project-title').id = 'project-dialog-title';
            body.append(details);
            if (navigationTween) navigationTween.kill();
            dialog.showModal();
            if (timeline) renderJourney();
        });
        card.querySelector('.project-content').append(button);
    });
    document.body.classList.add('cinematic-ready');
    const themeObserver = new MutationObserver(records => {
        if (records.some(record => record.attributeName === 'class')) {
            const dark = getComputedStyle(document.body).getPropertyValue('--background').trim();
            document.documentElement.style.colorScheme = ['#edf3fa'].includes(dark) ? 'light' : 'dark';
        }
    });
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    const sizeObserver = new ResizeObserver(scheduleRebuild);
    contents.forEach(content => sizeObserver.observe(content));
    sizeObserver.observe(navbar);
    rebuild();
    const initial = sections.findIndex(section => `#${section.id}` === location.hash);
    if (initial >= 0) navigate(initial);
    document.fonts.ready.then(scheduleRebuild);
    window.portfolioCinema = {
        navigate: index => navigate(index),
        getState: () => ({
            mode: timeline ? 'cinematic' : 'document',
            active: sections[active]?.id,
            position: playhead.position, total,
            camera: { ...cameraState },
            segments: segments.map(segment => ({ ...segment })),
            graphics: world ? world.getStats() : null
        })
    };
    listen(window, 'pagehide', event => {
        if (event.persisted) return;
        disposed = true;
        lifetime.abort();
        themeObserver.disconnect();
        sizeObserver.disconnect();
        if (rebuildFrame) cancelAnimationFrame(rebuildFrame);
        if (staticFrame) cancelAnimationFrame(staticFrame);
        if (navigationTween) navigationTween.kill();
        if (timeline) { timeline.scrollTrigger.kill(true); timeline.kill(); }
        if (world) world.destroy();
    });
});
