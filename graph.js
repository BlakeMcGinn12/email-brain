/* Email Brain — SVG force-directed graph. No dependencies.
 *
 * SVG (vectors) instead of canvas (bitmap) so mobile Safari zoom stays sharp
 * even if the browser briefly fights for the pinch gesture.
 */

(() => {
  const svg = document.getElementById('brain');
  const NS = 'http://www.w3.org/2000/svg';

  // ─── Load & normalize data ─────────────────────────────────
  const FALLBACK_PALETTE = [
    '#63b3ff', '#ffd166', '#4ade80', '#a78bfa',
    '#f472b6', '#22d3ee', '#fb923c', '#e879f9',
  ];

  const source = window.EMAIL_BRAIN || {
    categories: window.CATEGORIES || {},
    emails: window.EMAILS || [],
  };

  const CATEGORIES = { ...(source.categories || {}) };
  const EMAILS = (source.emails || []).map((e) => ({
    sender: e.sender || 'Unknown',
    subject: e.subject || '(no subject)',
    cat: e.category || e.cat || 'uncategorized',
  }));

  let paletteIndex = 0;
  const nextColor = () => FALLBACK_PALETTE[paletteIndex++ % FALLBACK_PALETTE.length];
  EMAILS.forEach((e) => {
    if (!CATEGORIES[e.cat]) {
      CATEGORIES[e.cat] = { label: e.cat, color: nextColor() };
    }
  });
  Object.values(CATEGORIES).forEach((c) => {
    if (!c.color) c.color = nextColor();
    if (!c.label) c.label = 'Untitled';
  });

  // ─── Build graph ───────────────────────────────────────────
  const nodes = [];
  const edges = [];
  const catKeys = Object.keys(CATEGORIES);
  const hubById = {};
  
  catKeys.forEach((key, i) => {
    const angle = (i / catKeys.length) * Math.PI * 2 - Math.PI / 2;
    const hub = {
      id: `hub-${key}`,
      type: 'hub',
      cat: key,
      label: CATEGORIES[key].label,
      x: Math.cos(angle) * 210,
      y: Math.sin(angle) * 210,
      vx: 0, vy: 0, r: 13,
    };
    hubById[key] = hub;
    nodes.push(hub);
  });

  const bySender = {};
  EMAILS.forEach((email, i) => {
    const hub = hubById[email.cat];
    const jitter = () => (Math.random() - 0.5) * 180;
    const node = {
      id: `email-${i}`,
      type: 'email',
      cat: email.cat,
      sender: email.sender,
      subject: email.subject,
      x: hub.x + jitter(),
      y: hub.y + jitter(),
      vx: 0, vy: 0,
      r: 5.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    };
    nodes.push(node);
    edges.push({ a: hub, b: node, rest: 80, k: 0.014, kind: 'hub' });
    (bySender[email.sender] ||= []).push(node);
  });

  Object.values(bySender).forEach((group) => {
    for (let i = 1; i < group.length; i++) {
      edges.push({ a: group[i - 1], b: group[i], rest: 46, k: 0.03, kind: 'sender' });
    }
  });

  const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
  edges.forEach((e) => {
    neighbors.get(e.a.id).add(e.b.id);
    neighbors.get(e.b.id).add(e.a.id);
  });

  // ─── SVG scene ─────────────────────────────────────────────
  function el(name, attrs = {}) {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  while (svg.firstChild) svg.removeChild(svg.firstChild);

  const defs = el('defs');
  catKeys.forEach((key) => {
    const color = CATEGORIES[key].color;
    const grad = el('radialGradient', { id: `glow-${key}`, cx: '50%', cy: '50%', r: '50%' });
    grad.appendChild(el('stop', { offset: '0%', 'stop-color': color, 'stop-opacity': '0.55' }));
    grad.appendChild(el('stop', { offset: '45%', 'stop-color': color, 'stop-opacity': '0.18' }));
    grad.appendChild(el('stop', { offset: '100%', 'stop-color': color, 'stop-opacity': '0' }));
    defs.appendChild(grad);
  });
  svg.appendChild(defs);

  const world = el('g', { id: 'world' });
  const edgeLayer = el('g', { id: 'edges' });
  const nodeLayer = el('g', { id: 'nodes' });
  const labelLayer = el('g', { id: 'labels' });
  world.appendChild(edgeLayer);
  world.appendChild(nodeLayer);
  world.appendChild(labelLayer);
  svg.appendChild(world);

  edges.forEach((e) => {
    const line = el('line', {
      class: 'edge',
      stroke: 'rgba(120, 170, 235, 1)',
      'stroke-opacity': '0.13',
      'stroke-width': '0.7',
      'stroke-linecap': 'round',
    });
    edgeLayer.appendChild(line);
    e.el = line;
  });

  nodes.forEach((n) => {
    const color = CATEGORIES[n.cat].color;
    const g = el('g', { class: `node node-${n.type}`, 'data-id': n.id });
    g.style.cursor = 'pointer';

    const glow = el('circle', {
      class: 'node-glow',
      r: String(n.type === 'hub' ? 28 : 16),
      fill: `url(#glow-${n.cat})`,
    });
    const core = el('circle', {
      class: 'node-core',
      r: String(n.r),
      fill: color,
    });
    const shine = el('circle', {
      class: 'node-shine',
      r: String(n.r * 0.35),
      fill: 'rgba(255,255,255,0.22)',
    });
    const ring = el('circle', {
      class: 'node-ring',
      r: String(n.r + 4),
      fill: 'none',
      stroke: 'rgba(255,255,255,0.85)',
      'stroke-width': '1.4',
      opacity: '0',
    });

    g.appendChild(glow);
    g.appendChild(core);
    g.appendChild(shine);
    g.appendChild(ring);
    nodeLayer.appendChild(g);

    const label = el('text', {
      class: `node-label label-${n.type}`,
      'text-anchor': 'middle',
      fill: n.type === 'hub' ? '#dbe8ff' : '#b8ccec',
      'font-family': '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
      'font-weight': n.type === 'hub' ? '600' : '400',
      'font-size': n.type === 'hub' ? '12' : '10.5',
      opacity: n.type === 'hub' ? '0.9' : '0',
      'pointer-events': 'none',
    });
    label.textContent = n.type === 'hub' ? n.label : n.sender;
    labelLayer.appendChild(label);

    n.el = g;
    n.glowEl = glow;
    n.coreEl = core;
    n.shineEl = shine;
    n.ringEl = ring;
    n.labelEl = label;
  });

  // ─── Camera / viewport ─────────────────────────────────────
  const cam = { x: 0, y: 0, zoom: 0.9 };
  let viewW = 1;
  let viewH = 1;

  function layoutSize() {
    return {
      w: Math.max(1, Math.round(document.documentElement.clientWidth || window.innerWidth)),
      h: Math.max(1, Math.round(document.documentElement.clientHeight || window.innerHeight)),
    };
  }

  function resize() {
    const { w, h } = layoutSize();
    viewW = Math.max(1, Math.round(svg.clientWidth || w));
    viewH = Math.max(1, Math.round(svg.clientHeight || h));
    svg.setAttribute('viewBox', `0 0 ${viewW} ${viewH}`);
    svg.setAttribute('width', String(viewW));
    svg.setAttribute('height', String(viewH));
  }
  window.addEventListener('resize', resize);
  resize();

  function toWorld(px, py) {
    const rect = svg.getBoundingClientRect();
    const x = ((px - rect.left) / Math.max(rect.width, 1)) * viewW;
    const y = ((py - rect.top) / Math.max(rect.height, 1)) * viewH;
    return {
      x: (x - viewW / 2) / cam.zoom + cam.x,
      y: (y - viewH / 2) / cam.zoom + cam.y,
    };
  }

  function applyCamera() {
    world.setAttribute(
      'transform',
      `translate(${viewW / 2} ${viewH / 2}) scale(${cam.zoom}) translate(${-cam.x} ${-cam.y})`,
    );
  }

  // ─── Physics ───────────────────────────────────────────────
  const REPULSION = 2200;
  const CENTER_PULL = 0.0016;
  const DAMPING = 0.86;
  let warmup = 240;
  let heldNode = null;

  function step() {
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) { d2 = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
        if (d2 > 160000) continue;
        const f = REPULSION / d2;
        const d = Math.sqrt(d2);
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }
    }

    edges.forEach(({ a, b, rest, k }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const f = (d - rest) * k;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    });

    const t = performance.now() / 1000;
    nodes.forEach((n) => {
      n.vx += -n.x * CENTER_PULL;
      n.vy += -n.y * CENTER_PULL;
      if (n.type === 'email' && !warmup) {
        n.vx += Math.cos(t * 0.6 + n.phase) * 0.012;
        n.vy += Math.sin(t * 0.5 + n.phase) * 0.012;
      }
      if (n === heldNode) return;
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.x += n.vx;
      n.y += n.vy;
    });

    if (warmup > 0) warmup--;
  }

  // ─── Selection & highlighting ──────────────────────────────
  let selected = null;
  let hovered = null;

  const card = document.getElementById('detail-card');
  const cardKicker = document.getElementById('detail-kicker');
  const cardTitle = document.getElementById('detail-title');
  const cardSub = document.getElementById('detail-sub');
  const cardLinks = document.getElementById('detail-links');

  function select(node) {
    selected = node;
    if (!node) {
      card.classList.add('hidden');
      return;
    }
    const color = CATEGORIES[node.cat].color;
    cardKicker.textContent = CATEGORIES[node.cat].label;
    cardKicker.style.color = color;
    if (node.type === 'hub') {
      cardTitle.textContent = node.label;
      cardSub.textContent = `${neighbors.get(node.id).size} emails in this cluster`;
    } else {
      cardTitle.textContent = node.subject;
      cardSub.textContent = `From ${node.sender}`;
    }
    cardLinks.innerHTML = '';
    [...neighbors.get(node.id)]
      .map((id) => nodes.find((n) => n.id === id))
      .filter((n) => n.type === 'email')
      .slice(0, 12)
      .forEach((n) => {
        const btn = document.createElement('button');
        btn.className = 'detail-link';
        btn.type = 'button';
        btn.textContent = `${n.sender} — ${n.subject}`;
        btn.addEventListener('click', () => select(n));
        cardLinks.appendChild(btn);
      });
    card.classList.remove('hidden');
  }

  document.getElementById('detail-close').addEventListener('click', () => select(null));

  // ─── Input ─────────────────────────────────────────────────
  let panning = false;
  let lastPointer = null;
  let downAt = null;

  function hitTest(px, py) {
    const w = toWorld(px, py);
    let best = null;
    let bestD = Infinity;
    nodes.forEach((n) => {
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const hitR = n.r + 10 / cam.zoom;
      if (d < hitR && d < bestD) { best = n; bestD = d; }
    });
    return best;
  }

  function dist2(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function mid2(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function applyZoomAt(px, py, nextZoom) {
    const before = toWorld(px, py);
    cam.zoom = Math.min(3, Math.max(0.4, nextZoom));
    const after = toWorld(px, py);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  // Desktop: mouse via Pointer Events
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    downAt = { x: e.clientX, y: e.clientY };
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      heldNode = hit;
    } else {
      panning = true;
      svg.classList.add('dragging');
    }
    lastPointer = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (heldNode) {
      const w = toWorld(e.clientX, e.clientY);
      heldNode.x = w.x;
      heldNode.y = w.y;
      heldNode.vx = 0;
      heldNode.vy = 0;
    } else if (panning && lastPointer) {
      cam.x -= (e.clientX - lastPointer.x) / cam.zoom;
      cam.y -= (e.clientY - lastPointer.y) / cam.zoom;
    } else {
      hovered = hitTest(e.clientX, e.clientY);
      svg.classList.toggle('pointing', Boolean(hovered));
    }
    lastPointer = { x: e.clientX, y: e.clientY };
  });

  svg.addEventListener('pointerup', (e) => {
    if (e.pointerType === 'touch') return;
    const moved = downAt ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) : Infinity;
    if (moved < 5) select(hitTest(e.clientX, e.clientY));
    heldNode = null;
    panning = false;
    downAt = null;
    svg.classList.remove('dragging');
  });

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    applyZoomAt(e.clientX, e.clientY, cam.zoom * (e.deltaY < 0 ? 1.08 : 0.92));
  }, { passive: false });

  // Mobile: own gestures with Touch Events
  const touches = new Map();
  let touchMode = null;
  let touchDownAt = null;
  let touchMoved = 0;
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  function tPos(t) { return { x: t.clientX, y: t.clientY }; }

  function syncTouches(list) {
    for (const t of list) {
      if (touches.has(t.identifier)) touches.set(t.identifier, tPos(t));
    }
  }

  svg.addEventListener('touchstart', (e) => {
    e.preventDefault();
    for (const t of e.changedTouches) touches.set(t.identifier, tPos(t));

    if (touches.size >= 2) {
      touchMode = 'pinch';
      heldNode = null;
      const pts = [...touches.values()];
      pinchStartDist = dist2(pts[0], pts[1]) || 1;
      pinchStartZoom = cam.zoom;
      return;
    }

    const only = [...touches.values()][0];
    touchDownAt = { ...only };
    touchMoved = 0;
    const hit = hitTest(only.x, only.y);
    if (hit) {
      heldNode = hit;
      touchMode = 'drag';
    } else {
      touchMode = 'pan';
    }
    lastPointer = { ...only };
  }, { passive: false });

  svg.addEventListener('touchmove', (e) => {
    e.preventDefault();
    syncTouches(e.changedTouches);

    if (touches.size >= 2 && touchMode === 'pinch') {
      const pts = [...touches.values()];
      const d = dist2(pts[0], pts[1]) || 1;
      const m = mid2(pts[0], pts[1]);
      applyZoomAt(m.x, m.y, pinchStartZoom * (d / pinchStartDist));
      lastPointer = { ...m };
      return;
    }

    const only = [...touches.values()][0];
    if (!only) return;
    if (touchDownAt) {
      touchMoved = Math.max(touchMoved, Math.hypot(only.x - touchDownAt.x, only.y - touchDownAt.y));
    }

    if (touchMode === 'drag' && heldNode) {
      const w = toWorld(only.x, only.y);
      heldNode.x = w.x;
      heldNode.y = w.y;
      heldNode.vx = 0;
      heldNode.vy = 0;
    } else if (touchMode === 'pan' && lastPointer) {
      cam.x -= (only.x - lastPointer.x) / cam.zoom;
      cam.y -= (only.y - lastPointer.y) / cam.zoom;
    }
    lastPointer = { ...only };
  }, { passive: false });

  function endTouch(e) {
    e.preventDefault();
    for (const t of e.changedTouches) touches.delete(t.identifier);

    if (touches.size === 0) {
      if (touchMode !== 'pinch' && touchMoved < 8 && touchDownAt) {
        select(hitTest(touchDownAt.x, touchDownAt.y));
      }
      touchMode = null;
      heldNode = null;
      touchDownAt = null;
      touchMoved = 0;
      pinchStartDist = 0;
      lastPointer = null;
      return;
    }

    if (touches.size === 1) {
      touchMode = 'pan';
      heldNode = null;
      const only = [...touches.values()][0];
      lastPointer = { ...only };
      touchDownAt = { ...only };
      touchMoved = 999;
    }
  }
  svg.addEventListener('touchend', endTouch, { passive: false });
  svg.addEventListener('touchcancel', endTouch, { passive: false });

  document.addEventListener('gesturestart', (e) => e.preventDefault(), { capture: true });
  document.addEventListener('gesturechange', (e) => e.preventDefault(), { capture: true });
  document.addEventListener('gestureend', (e) => e.preventDefault(), { capture: true });

  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    if (!(e.target === svg || svg.contains(e.target))) return;
    const now = Date.now();
    if (now - lastTouchEnd < 320) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // ─── Legend ────────────────────────────────────────────────
  const legend = document.getElementById('legend');
  catKeys.forEach((key) => {
    const item = document.createElement('span');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="color:${CATEGORIES[key].color};background:${CATEGORIES[key].color}"></span>${CATEGORIES[key].label}`;
    legend.appendChild(item);
  });

  // ─── Render ────────────────────────────────────────────────
  function focusSetFor() {
    const focus = selected || hovered;
    if (!focus) return null;
    return new Set([focus.id, ...neighbors.get(focus.id)]);
  }

  function edgeLit(e, focus, focusSet) {
    if (!focusSet) return false;
    if (!focusSet.has(e.a.id) || !focusSet.has(e.b.id)) return false;
    return e.a.id === focus.id || e.b.id === focus.id
      || (focus.type === 'hub' && focusSet.has(e.a.id) && focusSet.has(e.b.id));
  }

  function render() {
    applyCamera();
    const focus = selected || hovered;
    const focusSet = focusSetFor();
    const inv = 1 / cam.zoom;

    edges.forEach((e) => {
      const lit = edgeLit(e, focus, focusSet);
      const line = e.el;
      line.setAttribute('x1', e.a.x);
      line.setAttribute('y1', e.a.y);
      line.setAttribute('x2', e.b.x);
      line.setAttribute('y2', e.b.y);
      if (focusSet) {
        line.setAttribute('stroke', lit ? CATEGORIES[focus.cat].color : 'rgba(120, 170, 235, 1)');
        line.setAttribute('stroke-opacity', lit ? '0.75' : '0.04');
        line.setAttribute('stroke-width', String((lit ? 1.6 : 0.7) * inv));
      } else {
        line.setAttribute('stroke', 'rgba(120, 170, 235, 1)');
        line.setAttribute('stroke-opacity', '0.13');
        line.setAttribute('stroke-width', String(0.7 * inv));
      }
    });

    nodes.forEach((n) => {
      const inFocus = !focusSet || focusSet.has(n.id);
      const isFocus = focus && n.id === focus.id;
      const alpha = inFocus ? 1 : 0.12;
      const coreR = n.r * (isFocus ? 1.35 : 1);
      const glowR = (isFocus ? 28 : n.type === 'hub' ? 22 : 14) * inv;

      n.el.setAttribute('transform', `translate(${n.x} ${n.y})`);
      n.el.setAttribute('opacity', String(alpha));
      n.glowEl.setAttribute('r', String(glowR));
      n.coreEl.setAttribute('r', String(coreR));
      n.shineEl.setAttribute('r', String(coreR * 0.35));
      n.shineEl.setAttribute('cx', String(-coreR * 0.25));
      n.shineEl.setAttribute('cy', String(-coreR * 0.25));
      n.ringEl.setAttribute('r', String(coreR + 4 * inv));
      n.ringEl.setAttribute('stroke-width', String(1.4 * inv));
      n.ringEl.setAttribute('opacity', isFocus ? '1' : '0');

      const showLabel = n.type === 'hub' || (focusSet && focusSet.has(n.id)) || cam.zoom > 1.7;
      let labelOpacity = 0;
      if (n.type === 'hub') {
        labelOpacity = focusSet && !focusSet.has(n.id) ? 0.15 : 0.9;
      } else if (showLabel) {
        labelOpacity = (focusSet && focusSet.has(n.id)) ? 0.95 : 0.5;
      }
      n.labelEl.setAttribute('x', n.x);
      n.labelEl.setAttribute('y', n.y - n.r - (n.type === 'hub' ? 9 : 6) * inv);
      n.labelEl.setAttribute('font-size', String((n.type === 'hub' ? 12 : 10.5) * inv));
      n.labelEl.setAttribute('opacity', String(labelOpacity));
    });
  }

  function loop() {
    step();
    render();
    requestAnimationFrame(loop);
  }
  applyCamera();
  loop();
})();
