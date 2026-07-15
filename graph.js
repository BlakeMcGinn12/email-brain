/* Email Brain — force-directed canvas graph. No dependencies. */

(() => {
  const canvas = document.getElementById('brain');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // ─── Load & normalize data ─────────────────────────────────
  // Data comes from data.js as:
  //   window.EMAIL_BRAIN = { categories: {...}, emails: [...] }
  // (legacy window.CATEGORIES / window.EMAILS are also accepted).
  // Emails may use `category` or `cat`. Categories referenced by an
  // email but missing from the map are auto-created, and any category
  // without a color gets one from the fallback palette.

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

  // Category hubs arranged in a rough ring so clusters spread out.
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
      vx: 0,
      vy: 0,
      r: 13,
    };
    hubById[key] = hub;
    nodes.push(hub);
  });

  // Email nodes, seeded near their hub.
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
      vx: 0,
      vy: 0,
      r: 5.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    };
    nodes.push(node);
    edges.push({ a: hub, b: node, rest: 80, k: 0.014, kind: 'hub' });
    (bySender[email.sender] ||= []).push(node);
  });

  // Same-sender links: chain emails from one sender together.
  Object.values(bySender).forEach((group) => {
    for (let i = 1; i < group.length; i++) {
      edges.push({ a: group[i - 1], b: group[i], rest: 46, k: 0.03, kind: 'sender' });
    }
  });

  // Neighbor lookup for highlighting.
  const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));
  const nodeEdges = new Map(nodes.map((n) => [n.id, []]));
  edges.forEach((e) => {
    neighbors.get(e.a.id).add(e.b.id);
    neighbors.get(e.b.id).add(e.a.id);
    nodeEdges.get(e.a.id).push(e);
    nodeEdges.get(e.b.id).push(e);
  });

  // ─── Camera / viewport ─────────────────────────────────────

  const cam = { x: 0, y: 0, zoom: 0.9 };

  function resize() {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
  }
  window.addEventListener('resize', resize);
  resize();

  function toWorld(px, py) {
    return {
      x: (px - innerWidth / 2) / cam.zoom + cam.x,
      y: (py - innerHeight / 2) / cam.zoom + cam.y,
    };
  }

  // ─── Physics ───────────────────────────────────────────────

  const REPULSION = 2200;
  const CENTER_PULL = 0.0016;
  const DAMPING = 0.86;
  let warmup = 240; // extra energetic frames at load so the layout blooms

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
        // Ambient drift so the brain never fully freezes.
        n.vx += Math.cos(t * 0.6 + n.phase) * 0.012;
        n.vy += Math.sin(t * 0.5 + n.phase) * 0.012;
      }
      if (n === dragNode) return;
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
      const count = neighbors.get(node.id).size;
      cardSub.textContent = `${count} emails in this cluster`;
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

  let dragNode = null;
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
      const hitR = n.r + 6 / cam.zoom;
      if (d < hitR && d < bestD) { best = n; bestD = d; }
    });
    return best;
  }

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    downAt = { x: e.clientX, y: e.clientY };
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      dragNode = hit;
    } else {
      panning = true;
      canvas.classList.add('dragging');
    }
    lastPointer = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointermove', (e) => {
    if (dragNode) {
      const w = toWorld(e.clientX, e.clientY);
      dragNode.x = w.x;
      dragNode.y = w.y;
      dragNode.vx = 0;
      dragNode.vy = 0;
    } else if (panning && lastPointer) {
      cam.x -= (e.clientX - lastPointer.x) / cam.zoom;
      cam.y -= (e.clientY - lastPointer.y) / cam.zoom;
    } else {
      hovered = hitTest(e.clientX, e.clientY);
      canvas.classList.toggle('pointing', Boolean(hovered));
    }
    lastPointer = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener('pointerup', (e) => {
    const moved = downAt
      ? Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y)
      : Infinity;
    if (moved < 5) {
      select(hitTest(e.clientX, e.clientY));
    }
    dragNode = null;
    panning = false;
    downAt = null;
    canvas.classList.remove('dragging');
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const before = toWorld(e.clientX, e.clientY);
    cam.zoom = Math.min(3, Math.max(0.4, cam.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    const after = toWorld(e.clientX, e.clientY);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
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

  function nodeAlpha(n, focusSet) {
    if (!focusSet) return 1;
    return focusSet.has(n.id) ? 1 : 0.12;
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = ctx.createRadialGradient(
      innerWidth / 2, innerHeight / 2, 0,
      innerWidth / 2, innerHeight / 2, Math.max(innerWidth, innerHeight) * 0.7,
    );
    g.addColorStop(0, '#0b1428');
    g.addColorStop(1, '#060b16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, innerWidth, innerHeight);

    ctx.translate(innerWidth / 2, innerHeight / 2);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    const focus = selected || hovered;
    let focusSet = null;
    if (focus) {
      focusSet = new Set([focus.id, ...neighbors.get(focus.id)]);
    }

    // Edges
    edges.forEach((e) => {
      const inFocus = focusSet && focusSet.has(e.a.id) && focusSet.has(e.b.id)
        && (e.a.id === focus.id || e.b.id === focus.id
            || (focusSet.has(e.a.id) && focusSet.has(e.b.id) && focus.type === 'hub'));
      const lit = focusSet ? inFocus : false;
      const alpha = focusSet ? (lit ? 0.75 : 0.04) : 0.13;
      ctx.strokeStyle = lit
        ? CATEGORIES[focus.cat].color
        : 'rgba(120, 170, 235, 1)';
      ctx.globalAlpha = alpha;
      ctx.lineWidth = (lit ? 1.6 : 0.7) / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(e.a.x, e.a.y);
      ctx.lineTo(e.b.x, e.b.y);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // Nodes
    nodes.forEach((n) => {
      const color = CATEGORIES[n.cat].color;
      const alpha = nodeAlpha(n, focusSet);
      const isFocus = focus && n.id === focus.id;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = (isFocus ? 26 : n.type === 'hub' ? 18 : 10) * cam.zoom;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r * (isFocus ? 1.35 : 1), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      if (isFocus) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.4 / cam.zoom;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r * 1.35 + 4 / cam.zoom, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;

    // Labels: hubs always; emails when focused/neighboring or zoomed in.
    ctx.textAlign = 'center';
    nodes.forEach((n) => {
      const inFocus = focusSet?.has(n.id);
      if (n.type === 'hub') {
        ctx.globalAlpha = focusSet && !inFocus ? 0.15 : 0.9;
        ctx.font = `600 ${12 / cam.zoom}px -apple-system, sans-serif`;
        ctx.fillStyle = '#dbe8ff';
        ctx.fillText(n.label, n.x, n.y - n.r - 9 / cam.zoom);
      } else if (inFocus || cam.zoom > 1.7) {
        ctx.globalAlpha = inFocus ? 0.95 : 0.5;
        ctx.font = `${10.5 / cam.zoom}px -apple-system, sans-serif`;
        ctx.fillStyle = '#b8ccec';
        ctx.fillText(n.sender, n.x, n.y - n.r - 6 / cam.zoom);
      }
    });
    ctx.globalAlpha = 1;
  }

  function loop() {
    step();
    draw();
    requestAnimationFrame(loop);
  }
  loop();
})();
