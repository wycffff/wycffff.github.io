(() => {
  'use strict';

  const canvas = document.getElementById('signal-art');
  const slider = document.getElementById('signal-shape');
  if (!canvas || !slider) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const tau = Math.PI * 2;
  const sections = 184;
  const sides = 40;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let targetX = 0;
  let targetY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let pendingFrame = 0;
  let lastPaint = 0;

  // The section of the torus twists and changes width like a length of folded tape.
  function makeSurface(shape) {
    const surface = [];
    for (let i = 0; i < sections; i += 1) {
      const t = tau * i / sections;
      const c = Math.cos(t);
      const s = Math.sin(t);
      const radius = 1.02 + (0.07 + shape * 0.12) * Math.cos(3 * t - 0.55);
      const rise = (0.14 + shape * 0.6) * Math.sin(2 * t + 0.15)
        + 0.12 * Math.cos(3 * t - 0.4);
      const twist = 0.28 + (0.36 + shape * 0.86) * Math.sin(2 * t - 0.85);
      const width = 0.41 + 0.07 * Math.sin(3 * t + 1.35);
      const thickness = 0.205 + 0.035 * Math.cos(2 * t);
      const twistCos = Math.cos(twist);
      const twistSin = Math.sin(twist);

      for (let j = 0; j < sides; j += 1) {
        const v = tau * j / sides;
        const wide = width * Math.cos(v);
        const thin = thickness * Math.sin(v);
        const r = radius + wide * twistCos - thin * twistSin;
        surface.push([r * c, r * s, rise + wide * twistSin + thin * twistCos]);
      }
    }
    return surface;
  }

  let surface = makeSurface(slider.valueAsNumber / 100);

  function draw() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(rect.width * pixelRatio);
    const height = Math.round(rect.height * pixelRatio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const roll = -0.46;
    const pitch = -0.73 + tiltY;
    const yaw = 0.20 + tiltX;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;

    const points = surface.map(([x, y, z]) => {
      const a = x * cy + z * sy;
      const b = -x * sy + z * cy;
      const d = y * cp - b * sp;
      const depth = y * sp + b * cp;
      const rx = a * cr - d * sr;
      const ry = a * sr + d * cr;
      const perspective = 5.8 / (5.8 - depth);
      const u = rx * perspective;
      const v = -ry * perspective;
      left = Math.min(left, u);
      right = Math.max(right, u);
      top = Math.min(top, v);
      bottom = Math.max(bottom, v);
      return { x: rx, y: ry, z: depth, u, v };
    });

    const scale = Math.min(rect.width * 0.93 / (right - left), rect.height * 0.90 / (bottom - top));
    const dx = (rect.width - (left + right) * scale) / 2;
    const dy = (rect.height - (top + bottom) * scale) / 2;
    for (const point of points) {
      point.u = point.u * scale + dx;
      point.v = point.v * scale + dy;
    }

    const faces = [];
    for (let i = 0; i < sections; i += 1) {
      const nextI = (i + 1) % sections;
      for (let j = 0; j < sides; j += 1) {
        const nextJ = (j + 1) % sides;
        const a = points[i * sides + j], b = points[nextI * sides + j];
        const c = points[nextI * sides + nextJ], d = points[i * sides + nextJ];
        const ex = b.x - a.x, ey = b.y - a.y, ez = b.z - a.z;
        const fx = d.x - a.x, fy = d.y - a.y, fz = d.z - a.z;
        const nx = ey * fz - ez * fy, ny = ez * fx - ex * fz, nz = ex * fy - ey * fx;
        if (nz * (5.8 - a.z) < nx * a.x + ny * a.y) continue;
        const light = (nx * -0.46 + ny * 0.59 + nz * 0.65) / (Math.hypot(nx, ny, nz) || 1);
        const tone = Math.max(0, Math.min(1, (light + 0.34) / 1.34));
        faces.push({ a, b, c, d, j, tone, depth: a.z + b.z + c.z + d.z });
      }
    }
    faces.sort((a, b) => a.depth - b.depth);

    const lineWidth = Math.max(0.43, Math.min(1.3, scale / 120));
    ctx.lineJoin = 'round';
    for (const { a, b, c, d, j, tone } of faces) {
      const wash = Math.pow(tone, 0.74);
      const red = Math.round(30 + 184 * wash);
      const green = Math.round(42 + 189 * wash);
      const blue = Math.round(156 + 96 * wash);
      ctx.fillStyle = 'rgb(' + red + ',' + green + ',' + blue + ')';
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.52;
      ctx.beginPath();
      ctx.moveTo(a.u, a.v);
      ctx.lineTo(b.u, b.v);
      ctx.lineTo(c.u, c.v);
      ctx.lineTo(d.u, d.v);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dense transverse hoops, with quieter longitudinal contour lines.
      ctx.strokeStyle = 'rgba(19,44,174,' + (0.84 - 0.18 * tone) + ')';
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(a.u, a.v);
      ctx.lineTo(d.u, d.v);
      ctx.stroke();
      if (j % 4 === 0) {
        ctx.strokeStyle = 'rgba(27,56,179,0.30)';
        ctx.lineWidth = lineWidth * 0.83;
        ctx.beginPath();
        ctx.moveTo(a.u, a.v);
        ctx.lineTo(b.u, b.v);
        ctx.stroke();
      }
    }
  }

  function frame(time) {
    pendingFrame = 0;
    const delta = Math.min(80, Math.max(10, time - lastPaint));
    lastPaint = time;
    const fraction = reducedMotion.matches ? 1 : 1 - Math.exp(-delta / 68);
    tiltX += (targetX - tiltX) * fraction;
    tiltY += (targetY - tiltY) * fraction;
    draw();
    if (Math.abs(targetX - tiltX) + Math.abs(targetY - tiltY) > 0.002) requestDraw();
  }

  function requestDraw() {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(frame);
  }

  function resetTilt() {
    targetX = 0;
    targetY = 0;
    requestDraw();
  }
  canvas.addEventListener('pointermove', event => {
    if (reducedMotion.matches || (event.pointerType !== 'mouse' && event.buttons !== 1)) return;
    const rect = canvas.getBoundingClientRect();
    targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 0.45;
    targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 0.29;
    requestDraw();
  });
  canvas.addEventListener('pointerleave', resetTilt);
  canvas.addEventListener('pointercancel', resetTilt);
  reducedMotion.addEventListener('change', resetTilt);
  slider.addEventListener('input', () => {
    surface = makeSurface(slider.valueAsNumber / 100);
    requestDraw();
  });
  if ('ResizeObserver' in window) new ResizeObserver(requestDraw).observe(canvas);
  else window.addEventListener('resize', requestDraw);
  requestDraw();
})();
