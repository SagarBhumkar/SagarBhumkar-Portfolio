/* One shared world: the camera travels through all six environments. */
window.createPortfolioWorld = function (host, onUnavailable) {
    if (!window.THREE) {
        onUnavailable('The 3D library could not load. The lightweight scene is available.');
        return null;
    }
    const T = window.THREE;
    const mobile = window.matchMedia('(max-width: 768px)');
    const canvas = document.createElement('canvas');
    let renderer;
    try {
        renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: !mobile.matches, powerPreference: 'low-power' });
    } catch (error) {
        console.warn('WebGL is unavailable; using the lightweight portfolio.', error);
        onUnavailable('WebGL is unavailable. Showing the lightweight cinematic environment.');
        return null;
    }
    canvas.className = 'world-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.append(canvas);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.25 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    const scene = new T.Scene();
    scene.fog = new T.FogExp2(0x07101f, 0.021);
    const camera = new T.PerspectiveCamera(48, 1, 0.1, 240);
    const target = new T.Vector3();
    const ambient = new T.HemisphereLight(0xbdefff, 0x090d20, 2.4);
    const key = new T.PointLight(0x55caff, 80, 65);
    const rim = new T.PointLight(0x9d6dff, 65, 50);
    scene.add(ambient, key, rim);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    const animated = [];
    const environments = [];
    let frame = 0;
    let disposed = false;
    let lost = false;
    let currentProgress = 0;
    let currentCamera = { x: 0, y: 1, z: 15, lookX: 0, lookY: 0, lookZ: 0, fov: 48, roll: 0 };
    const accent = new T.Color(0x48caff);

    function geometry(value) { geometries.add(value); return value; }
    function material(value) { materials.add(value); return value; }
    const metal = material(new T.MeshStandardMaterial({
        color: 0x243b62, metalness: 0.78, roughness: 0.24, emissive: 0x102843, emissiveIntensity: 0.6
    }));
    const glow = material(new T.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.65 }));
    const violet = material(new T.MeshBasicMaterial({ color: 0x9775ff, transparent: true, opacity: 0.36 }));
    const lineMaterial = material(new T.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.24 }));

    function mesh(shape, surface, parent, x = 0, y = 0, z = 0) {
        const object = new T.Mesh(shape, surface);
        object.position.set(x, y, z);
        parent.add(object);
        return object;
    }
    function wire(shape, parent, x, y, z) {
        const object = new T.LineSegments(geometry(new T.EdgesGeometry(shape)), lineMaterial);
        object.position.set(x, y, z);
        parent.add(object);
        return object;
    }
    function label(text, parent, x, y, z, width = 2.5) {
        const bitmap = document.createElement('canvas');
        bitmap.width = 512;
        bitmap.height = 128;
        const context = bitmap.getContext('2d');
        context.fillStyle = '#bcefff';
        context.font = '500 40px monospace';
        context.textAlign = 'center';
        context.fillText(text, 256, 78);
        const texture = new T.CanvasTexture(bitmap);
        textures.add(texture);
        const sprite = new T.Sprite(material(new T.SpriteMaterial({ map: texture, transparent: true, opacity: 0.8, depthWrite: false })));
        sprite.position.set(x, y, z);
        sprite.scale.set(width, width / 4, 1);
        parent.add(sprite);
    }
    function connection(points, parent, surface = lineMaterial) {
        const shape = geometry(new T.BufferGeometry().setFromPoints(points.map(p => new T.Vector3(...p))));
        parent.add(new T.Line(shape, surface));
    }
    function ring(parent, radius, x, y, z, surface = glow) {
        const object = mesh(geometry(new T.TorusGeometry(radius, 0.025, 6, 70)), surface, parent, x, y, z);
        return object;
    }

    const floor = new T.GridHelper(180, 90, 0x235578, 0x14263e);
    floor.position.set(0, -5, -65);
    floor.material.transparent = true;
    floor.material.opacity = 0.3;
    materials.add(floor.material);
    geometries.add(floor.geometry);
    scene.add(floor);
    const positions = new Float32Array((mobile.matches ? 200 : 550) * 3);
    let seed = 41;
    function random() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    }
    for (let i = 0; i < positions.length; i += 3) {
        positions[i] = (random() - 0.5) * 75;
        positions[i + 1] = (random() - 0.5) * 32;
        positions[i + 2] = 15 - random() * 190;
    }
    const particleShape = geometry(new T.BufferGeometry());
    particleShape.setAttribute('position', new T.BufferAttribute(positions, 3));
    scene.add(new T.Points(particleShape, material(new T.PointsMaterial({
        color: 0x88cfff, size: 0.055, transparent: true, opacity: 0.6, sizeAttenuation: true
    }))));

    for (let index = 0; index < 6; index++) {
        const environment = new T.Group();
        environment.position.z = -index * 28;
        scene.add(environment);
        environments.push(environment);
        const portal = ring(environment, 9.5, 0, 0, -9, violet);
        portal.rotation.y = index % 2 ? 0.2 : -0.2;
        connection([[-12, -4.8, 12], [-9, -4.8, 0], [9, -4.8, -12], [12, -4.8, -28]], environment);
    }
    const coreShape = geometry(new T.IcosahedronGeometry(2.5, 1));
    const core = mesh(coreShape, metal, environments[0], 5, 0, 0);
    const shell = wire(geometry(new T.IcosahedronGeometry(3.1, 0)), environments[0], 5, 0, 0);
    animated.push({ object: core, speed: 1 }, { object: shell, speed: -0.7 });
    for (let i = 0; i < 3; i++) {
        const orbit = ring(environments[0], 3.8 + i * 0.5, 5, 0, 0, i % 2 ? violet : glow);
        orbit.rotation.set(0.5 + i * 0.7, i * 0.6, 0);
        animated.push({ object: orbit, speed: 0.3 + i * 0.2 });
    }
    ['</>', 'const build =', '{ ideas: Infinity }'].forEach((text, i) => label(text, environments[0], i % 2 ? -7 : 7, 4 - i * 3, -3 - i, 3.2));

    for (let i = 0; i < 7; i++) {
        const block = mesh(geometry(new T.BoxGeometry(1.7, 0.3 + i * 0.5, 1.7)), metal, environments[1],
            (i % 2 ? -1 : 1) * (5 + i * 0.45), -3 + i * 0.5, -i * 1.1);
        wire(block.geometry, block, 0, 0, 0);
        animated.push({ object: block, speed: 0.12 });
    }
    const technologies = ['.NET', 'C#', 'Angular', 'React', 'Node.js', 'SQL', 'Git', 'TypeScript'];
    const nodeShape = geometry(new T.OctahedronGeometry(0.4));
    const nodePositions = technologies.map((text, index) => {
        const angle = index / technologies.length * Math.PI * 2;
        const point = [Math.cos(angle) * 7.5, Math.sin(angle) * 4.5, -Math.sin(angle * 2) * 3];
        const node = mesh(nodeShape, index % 2 ? metal : glow, environments[2], ...point);
        label(text, environments[2], point[0], point[1] + 0.8, point[2], 2.3);
        animated.push({ object: node, speed: 0.7 });
        return point;
    });
    nodePositions.forEach((point, index) => {
        connection([point, nodePositions[(index + 1) % nodePositions.length]], environments[2]);
        connection([point, nodePositions[(index + 3) % nodePositions.length]], environments[2]);
    });
    const timelinePoints = [];
    for (let i = 0; i < 5; i++) {
        const x = i % 2 ? 6 : -6;
        const y = 3 - i * 1.4;
        const z = 5 - i * 4;
        timelinePoints.push([x, y, z]);
        const marker = ring(environments[3], 0.7, x, y, z);
        label(['2022 / START', 'BUILD', '2024 / EVOLVE', 'SCALE', 'NEXT'][i], environments[3], x, y + 1.2, z, 3);
        animated.push({ object: marker, speed: 0.15 });
    }
    connection(timelinePoints, environments[3], glow);

    for (let i = 0; i < 6; i++) {
        const frame = wire(geometry(new T.BoxGeometry(3.6, 2.3, 0.35)), environments[4],
            i % 2 ? 7 : -7, 3 - Math.floor(i / 2) * 3, -Math.floor(i / 2) * 5);
        frame.rotation.y = i % 2 ? -0.3 : 0.3;
    }
    for (let i = 0; i < 4; i++) {
        const connectionRing = ring(environments[5], 2.3 + i * 1.2, 4, 0, -i * 1.2, i % 2 ? violet : glow);
        connectionRing.rotation.y = i * 0.3;
        animated.push({ object: connectionRing, speed: 0.2 + i * 0.1 });
    }
    mesh(geometry(new T.OctahedronGeometry(1.4)), metal, environments[5], 4, 0, 0);
    const reflection = mesh(geometry(new T.PlaneGeometry(28, 8)), material(new T.MeshBasicMaterial({
        color: 0x0d2240, transparent: true, opacity: 0.4, side: T.DoubleSide
    })), scene, 0, -5.02, -70);
    reflection.rotation.x = -Math.PI / 2;

    function render() {
        frame = 0;
        if (disposed || lost || document.hidden) return;
        camera.position.set(currentCamera.x, currentCamera.y, currentCamera.z);
        target.set(currentCamera.lookX, currentCamera.lookY, currentCamera.lookZ);
        camera.lookAt(target);
        camera.rotation.z += currentCamera.roll;
        if (Math.abs(camera.fov - currentCamera.fov) > 0.01) {
            camera.fov = currentCamera.fov;
            camera.updateProjectionMatrix();
        }
        key.position.set(camera.position.x + 5, 7, camera.position.z - 5);
        rim.position.set(camera.position.x - 7, -1, camera.position.z - 12);
        environments.forEach(group => { group.visible = Math.abs(camera.position.z - group.position.z) < 70; });
        animated.forEach(({ object, speed }, index) => {
            object.rotation.y = currentProgress * Math.PI * 5 * speed + index * 0.1;
            object.rotation.z = currentProgress * Math.PI * speed;
        });
        renderer.render(scene, camera);
    }
    function requestRender() {
        if (!frame && !disposed && !lost && !document.hidden) frame = requestAnimationFrame(render);
    }
    function resize() {
        const width = host.clientWidth;
        const height = host.clientHeight;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile.matches ? 1.25 : 1.75));
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
        requestRender();
    }
    function recolor() {
        const color = getComputedStyle(document.body).getPropertyValue('--primary-light').trim();
        accent.set(color || '#48caff');
        glow.color.copy(accent);
        lineMaterial.color.copy(accent);
        key.color.copy(accent);
        requestRender();
    }
    function contextLost(event) {
        event.preventDefault();
        lost = true;
        if (frame) cancelAnimationFrame(frame);
        frame = 0;
        canvas.hidden = true;
        console.warn('WebGL context lost; the portfolio remains usable in lightweight mode.');
        onUnavailable('The 3D graphics context was lost. All portfolio content remains available.');
    }
    function contextRestored() {
        lost = false;
        canvas.hidden = false;
        resize();
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const themeObserver = new MutationObserver(recolor);
    themeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    canvas.addEventListener('webglcontextlost', contextLost);
    canvas.addEventListener('webglcontextrestored', contextRestored);
    document.addEventListener('visibilitychange', requestRender);
    recolor();
    resize();
    return {
        update(cameraState, progress) {
            currentCamera = cameraState;
            currentProgress = progress;
            requestRender();
        },
        getStats() {
            return { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
                pixelRatio: renderer.getPixelRatio(), pendingFrame: Boolean(frame), contextLost: lost };
        },
        destroy() {
            disposed = true;
            if (frame) cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            themeObserver.disconnect();
            document.removeEventListener('visibilitychange', requestRender);
            canvas.removeEventListener('webglcontextlost', contextLost);
            canvas.removeEventListener('webglcontextrestored', contextRestored);
            geometries.forEach(item => item.dispose());
            materials.forEach(item => item.dispose());
            textures.forEach(item => item.dispose());
            renderer.dispose();
            canvas.remove();
        }
    };
};
