/* Email Brain — force-directed canvas graph. No dependencies. */

(() => {
  const canvas = document.getElementById('brain');
  // Opaque buffer — transparent canvases trail/smear on some mobile GPUs.
  const ctx = canvas.getContext('2d', { alpha: false })
    || canvas.getContext('2d');
  let dpr = Math.min(window.devicePixelRatio || 1, 2);

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

  // Layout viewport only — never visualViewport.
  // On iOS, page-pinch shrinks visualViewport and offsets it; sizing the canvas
  // to that makes the drawing surface jump up-left and leaves smear "behind" it.
  function layoutSize() {
    return {
      w: Math.max(1, Math.round(document.documentElement.clientWidth || window.innerWidth)),
      h: Math.max(1, Math.round(document.documentElement.clientHeight || window.innerHeight)),
    };
  }

  // iOS Safari visualViewport tracking - needed to prevent smearing when pinch-zooming
  function getVisualViewportOffset() {
    const vv = window.visualViewport;
    if (!vv) return { x: 0, y: 0, scale: 1 };
    return {
      x: vv.offsetLeft || 0,
      y: vv.offsetTop || 0,
      scale: vv.scale || 1
    };
  }

  // Simple resize - keep canvas at full layout size
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(layoutSize().w));
    const h = Math.max(1, Math.round(layoutSize().h));
    const bw = Math.floor(w * dpr);
    const bh = Math.floor(h * dpr);
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw;
      canvas.height = bh;
    }
    // Reset canvas CSS
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.left = '0';
    canvas.style.top = '0';
  }
  window.addEventListener('resize', resize);
  resize();

  function toWorld(px, py) {
    const w = canvas.clientWidth || layoutSize().w;
    const h = canvas.clientHeight || layoutSize().h;
    const rect = canvas.getBoundingClientRect();
    // Map from client coords into the canvas CSS box (ignores any page zoom offset).
    const x = ((px - rect.left) / Math.max(rect.width, 1)) * w;
    const y = ((py - rect.top) / Math.max(rect.height, 1)) * h;
    return {
      x: (x - w / 2) / cam.zoom + cam.x,
      y: (y - h / 2) / cam.zoom + cam.y,
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
  const activePointers = new Map();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

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

  function pointerDist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function pointerMid(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function applyZoomAt(px, py, nextZoom) {
    const before = toWorld(px, py);
    cam.zoom = Math.min(3, Math.max(0.4, nextZoom));
    const after = toWorld(px, py);
    cam.x += before.x - after.x;
    cam.y += before.y - after.y;
  }

  // ─── Touch handling (OWN THE GESTURE - Map App Pattern) ─────────────────────
  // We handle ALL touch events manually and preventDefault to stop Safari zoom
  
  const touches = new Map(); // track active touches by identifier
  let pinchStartDistance = 0;
  let pinchStartCamZoom = 1;
  let pinchMidpoint = null;
  let isPinching = false;
  let touchPanning = false;
  let touchStartPos = null;
  let touchDragNode = null;
  
  function getTouchDistance(t1, t2) {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  }
  
  function getTouchMidpoint(t1, t2) {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    };
  }
  
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // CRITICAL: Stop Safari from zooming
    
    // Track all touches
    for (const t of e.changedTouches) {
      touches.set(t.identifier, { x: t.clientX, y: t.clientY });
    }
    
    if (touches.size === 2) {
      // Pinch start
      isPinching = true;
      touchPanning = false;
      touchDragNode = null;
      const tArray = [...touches.values()];
      pinchStartDistance = getTouchDistance(tArray[0], tArray[1]);
      pinchStartCamZoom = cam.zoom;
      pinchMidpoint = getTouchMidpoint(tArray[0], tArray[1]);
    } else if (touches.size === 1) {
      // Single touch - could be pan or drag node
      const t = [...touches.values()][0];
      touchStartPos = { x: t.x, y: t.y };
      const hit = hitTest(t.x, t.y);
      if (hit) {
        touchDragNode = hit;
      } else {
        touchPanning = true;
        canvas.classList.add('dragging');
      }
    }
  }, { passive: false });
  
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault(); // CRITICAL: Stop Safari from zooming/panning
    
    // Update tracked touches
    for (const t of e.changedTouches) {
      if (touches.has(t.identifier)) {
        touches.set(t.identifier, { x: t.clientX, y: t.clientY });
      }
    }
    
    if (isPinching && touches.size === 2) {
      // Handle pinch zoom
      const tArray = [...touches.values()];
      const newDistance = getTouchDistance(tArray[0], tArray[1]);
      const newMidpoint = getTouchMidpoint(tArray[0], tArray[1]);
      const zoomFactor = newDistance / pinchStartDistance;
      
      // Apply zoom at the midpoint
      const before = toWorld(newMidpoint.x, newMidpoint.y);
      cam.zoom = Math.min(3, Math.max(0.4, pinchStartCamZoom * zoomFactor));
      const after = toWorld(newMidpoint.x, newMidpoint.y);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
    } else if (touchPanning && touches.size === 1) {
      // Handle pan
      const t = [...touches.values()][0];
      if (touchStartPos) {
        cam.x -= (t.x - touchStartPos.x) / cam.zoom;
        cam.y -= (t.y - touchStartPos.y) / cam.zoom;
      }
      touchStartPos = { x: t.x, y: t.y };
    } else if (touchDragNode && touches.size === 1) {
      // Handle node drag
      const t = [...touches.values()][0];
      const w = toWorld(t.x, t.y);
      touchDragNode.x = w.x;
      touchDragNode.y = w.y;
      touchDragNode.vx = 0;
      touchDragNode.vy = 0;
    }
    
    // Update hover state
    if (touches.size === 1) {
      const t = [...touches.values()][0];
      hovered = hitTest(t.x, t.y);
      canvas.classList.toggle('pointing', Boolean(hovered));
    }
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    
    // Remove ended touches
    for (const t of e.changedTouches) {
      touches.delete(t.identifier);
    }
    
    if (touches.size === 0) {
      // All touches ended
      if (!isPinching && touchStartPos && !touchDragNode) {
        // Check if it was a tap (not pan)
        const t = e.changedTouches[0];
        const dist = Math.hypot(t.clientX - touchStartPos.x, t.clientY - touchStartPos.y);
        if (dist < 10) {
          select(hitTest(t.clientX, t.clientY));
        }
      }
      
      // Reset state
      isPinching = false;
      touchPanning = false;
      touchDragNode = null;
      touchStartPos = null;
      canvas.classList.remove('dragging');
    } else if (touches.size === 1 && isPinching) {
      // Pinch ended but one finger still down - switch to pan
      isPinching = false;
      touchPanning = true;
      touchDragNode = null;
      const t = [...touches.values()][0];
      touchStartPos = { x: t.x, y: t.y };
    }
  }, { passive: false });
  
  canvas.addEventListener('touchcancel', (e) => {
    touches.clear();
    isPinching = false;
    touchPanning = false;
    touchDragNode = null;
    touchStartPos = null;
    canvas.classList.remove('dragging');
  }, { passive: false });
  
  // Mouse / Pointer support for desktop
  let mouseDown = false;
  let mouseDragNode = null;
  let mouseStartPos = null;
  
  canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
    mouseStartPos = { x: e.clientX, y: e.clientY };
    const hit = hitTest(e.clientX, e.clientY);
    if (hit) {
      mouseDragNode = hit;
    } else {
      canvas.classList.add('dragging');
    }
  });
  
  canvas.addEventListener('mousemove', (e) => {
    if (mouseDown) {
      if (mouseDragNode) {
        const w = toWorld(e.clientX, e.clientY);
        mouseDragNode.x = w.x;
        mouseDragNode.y = w.y;
        mouseDragNode.vx = 0;
        mouseDragNode.vy = 0;
      } else {
        cam.x -= (e.clientX - mouseStartPos.x) / cam.zoom;
        cam.y -= (e.clientY - mouseStartPos.y) / cam.zoom;
      }
      mouseStartPos = { x: e.clientX, y: e.clientY };
    } else {
      hovered = hitTest(e.clientX, e.clientY);
      canvas.classList.toggle('pointing', Boolean(hovered));
    }
  });
  
  canvas.addEventListener('mouseup', (e) => {
    if (mouseDown && !mouseDragNode) {
      const dist = Math.hypot(e.clientX - mouseStartPos.x, e.clientY - mouseStartPos.y);
      if (dist < 5) {
        select(hitTest(e.clientX, e.clientY));
      }
    }
    mouseDown = false;
    mouseDragNode = null;
    canvas.classList.remove('dragging');
  });
  
  canvas.addEventListener('mouseleave', () => {
    mouseDown = false;
    mouseDragNode = null;
    canvas.classList.remove('dragging');
  });
  
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    applyZoomAt(e.clientX, e.clientY, cam.zoom * (e.deltaY < 0 ? 1.08 : 0.92));
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

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }

  function nodeAlpha(n, focusSet) {
    if (!focusSet) return 1;
    return focusSet.has(n.id) ? 1 : 0.12;
  }

  // Soft glow without ctx.shadowBlur — shadows + scale() mash colors on mobile GPUs.
  // Radius is kept roughly constant in *screen* pixels (÷ zoom) so zoom-in
  // doesn't balloon glows into overlapping smears.
  function drawGlow(x, y, screenRadius, hex, alpha) {
    const radius = screenRadius / cam.zoom;
    const { r, g, b } = hexToRgb(hex);
    const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
    glow.addColorStop(0, `rgba(${r},${g},${b},${0.55 * alpha})`);
    glow.addColorStop(0.45, `rgba(${r},${g},${b},${0.18 * alpha})`);
    glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearFrame() {
    // Reset every drawing state that could leave trails, then paint opaque.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
    ctx.fillStyle = '#060b16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  function draw() {
    const w = canvas.width / dpr;
    const h = canvas.height / dpr;
    
    clearFrame();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    // Fill ENTIRE canvas with solid background first
    ctx.fillStyle = '#060b16';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Then draw gradient overlay
    const g = ctx.createRadialGradient(
      w / 2, h / 2, 0,
      w / 2, h / 2, Math.max(w, h) * 0.7,
    );
    g.addColorStop(0, '#0b1428');
    g.addColorStop(1, '#060b16');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.translate(w / 2, h / 2);
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
      const coreR = n.r * (isFocus ? 1.35 : 1);
      const glowScreen = (isFocus ? 28 : n.type === 'hub' ? 22 : 14);

      ctx.globalAlpha = 1;
      drawGlow(n.x, n.y, glowScreen, color, alpha);

      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, coreR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(n.x - coreR * 0.25, n.y - coreR * 0.25, coreR * 0.35, 0, Math.PI * 2);
      ctx.fill();

      if (isFocus) {
        ctx.strokeStyle = 'rgba(255,255,255,0.85)';
        ctx.lineWidth = 1.4 / cam.zoom;
        ctx.beginPath();
        ctx.arc(n.x, n.y, coreR + 4 / cam.zoom, 0, Math.PI * 2);
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
