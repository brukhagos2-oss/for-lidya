(() => {
  "use strict";
  const canvas = document.getElementById("art");
  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  const note = document.getElementById("loveNote");
  const hint = document.getElementById("hint");
  const revealButton = document.getElementById("reveal");
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, frame = 0, last = 0;
  let yaw = -.25, pitch = .22, targetYaw = yaw, targetPitch = pitch;
  let dragging = false, px = 0, py = 0, revealed = false;
  let bloom = 0;
  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // A rose-like parametric surface, sampled densely and projected in 3D.
  const petals = [];
  const PETAL_COUNT = 7;
  const SAMPLES = 6100;
  for (let i = 0; i < SAMPLES; i++) {
    const u = (i / SAMPLES) * TAU * 19;
    const v = (i / SAMPLES) * TAU;
    const petal = Math.cos(PETAL_COUNT * v + u * .12);
    const envelope = .24 + .76 * Math.pow(.5 + .5 * Math.sin(u * .5), 1.35);
    const radius = (1.05 + .72 * petal) * envelope;
    const twist = u * .115 + v;
    const x = Math.cos(twist) * radius;
    const y = Math.sin(twist) * radius;
    const z = .34 * Math.sin(PETAL_COUNT * v + u * .12) + .20 * Math.cos(u * .32) + (u / (TAU * 19) - .5) * .42;
    const hue = Math.random();
    petals.push({ x, y, z, size: rand(.55, 1.65), hue, phase: rand(0, TAU), sparkle: Math.random() });
  }

  const dust = Array.from({ length: 230 }, () => ({
    x: Math.random(), y: Math.random(), z: rand(.1, 1),
    r: rand(.35, 1.25), phase: rand(0, TAU), speed: rand(.15, .8)
  }));

  // Sample the lettering into a second cloud; the dots gently gather into LIDYA.
  const textCanvas = document.createElement("canvas");
  const textCtx = textCanvas.getContext("2d", { willReadFrequently: true });
  const letterPoints = [];
  function makeLetterPoints() {
    textCanvas.width = 720; textCanvas.height = 190;
    textCtx.clearRect(0, 0, 720, 190);
    textCtx.textAlign = "center"; textCtx.textBaseline = "middle";
    textCtx.font = '600 112px Georgia, "Times New Roman", serif';
    textCtx.fillStyle = "#fff"; textCtx.fillText("LIDYA", 360, 98);
    const data = textCtx.getImageData(0, 0, 720, 190).data;
    for (let y = 8; y < 184; y += 4) for (let x = 8; x < 712; x += 4) {
      if (data[(y * 720 + x) * 4 + 3] > 100) letterPoints.push({ x: (x - 360) / 115, y: (y - 95) / 115 });
    }
  }
  makeLetterPoints();
  const nameParticles = Array.from({ length: 1250 }, (_, i) => ({
    from: { x: rand(-2.5, 2.5), y: rand(-1.5, 1.5), z: rand(-.9, .9) },
    to: letterPoints[i % letterPoints.length],
    seed: rand(0, TAU), size: rand(.65, 1.65), gold: Math.random()
  }));

  function resize() {
    W = innerWidth; H = innerHeight;
    dpr = Math.min(devicePixelRatio || 1, 1.65);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize, { passive: true });
  resize();

  function rotate(p, a, b) {
    const cy = Math.cos(a), sy = Math.sin(a), cx = Math.cos(b), sx = Math.sin(b);
    const x1 = p.x * cy - p.z * sy;
    const z1 = p.x * sy + p.z * cy;
    return { x: x1, y: p.y * cx - z1 * sx, z: p.y * sx + z1 * cx };
  }
  function project(p, scale) {
    const perspective = 4.8 / (4.8 + p.z);
    return { x: W / 2 + p.x * scale * perspective, y: H * .52 + p.y * scale * perspective, k: perspective };
  }
  function glowDot(x, y, r, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = r * 5.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }

  function draw(now) {
    if (document.hidden) { requestAnimationFrame(draw); return; }
    const dt = Math.min((now - (last || now)) / 1000, .04); last = now;
    const time = now * .001;
    if (!dragging && !reduceMotion) targetYaw += dt * .075;
    yaw += (targetYaw - yaw) * .045;
    pitch += (targetPitch - pitch) * .045;
    bloom += (1 - bloom) * .012;

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,0,.24)";
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";
    const scale = Math.min(W, H) * .245;
    const opening = .78 + .22 * Math.sin(time * .48);

    // Fine orbiting stardust.
    for (const s of dust) {
      const x = (s.x * W + Math.sin(time * s.speed + s.phase) * 12 + W) % W;
      const y = (s.y * H + Math.cos(time * s.speed * .7 + s.phase) * 10 + H) % H;
      glowDot(x, y, s.r, "rgba(255,190,177,.65)", .2 + .35 * (.5 + .5 * Math.sin(time + s.phase)));
    }

    // Depth-sort the mandala points for a rich, layered 3D bloom.
    const projected = new Array(petals.length);
    for (let i = 0; i < petals.length; i++) {
      const p = petals[i], wobble = 1 + .018 * Math.sin(time * 1.2 + p.phase);
      const q = rotate({ x: p.x * opening * wobble, y: p.y * opening * wobble, z: p.z }, yaw, pitch);
      projected[i] = { ...project(q, scale), z: q.z, p };
    }
    projected.sort((a, b) => a.z - b.z);
    for (const q of projected) {
      const p = q.p;
      const twinkle = .62 + .38 * Math.sin(time * 1.8 + p.phase);
      const color = p.hue < .18 ? "rgba(255,242,225,.95)" :
        p.hue < .52 ? "rgba(255,64,91,.92)" :
        p.hue < .78 ? "rgba(206,20,62,.9)" : "rgba(255,139,169,.92)";
      glowDot(q.x, q.y, p.size * q.k, color, (.42 + .46 * twinkle) * Math.min(1.2, q.k));
    }

    // The name resolves from drifting sparks into a steady, warm constellation.
    const gather = Math.min(1, Math.max(0, (time - 1.1) / 3.2));
    const pulse = 1 + .035 * Math.sin(time * 2.15);
    const nameScale = Math.min(W * .00105, H * .0018) * 1.08;
    for (const p of nameParticles) {
      const ease = gather * gather * (3 - 2 * gather);
      const x = p.from.x * (1 - ease) + p.to.x * ease;
      const y = p.from.y * (1 - ease) + p.to.y * ease;
      const drift = (1 - ease) * Math.sin(time * 1.1 + p.seed) * .08;
      const xx = W / 2 + x * scale * .82 * nameScale * 3.6 * pulse;
      const yy = H * .52 + (y + drift) * scale * .82 * nameScale * 3.6 * pulse;
      const color = p.gold > .42 ? "rgba(255,205,125,.96)" : "rgba(255,119,145,.95)";
      glowDot(xx, yy, p.size * (gather ? 1.05 : .8), color, .18 + .8 * ease);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    frame = requestAnimationFrame(draw);
  }

  function toggleMessage() {
    revealed = !revealed;
    note.classList.toggle("visible", revealed);
    hint.style.opacity = revealed ? "0" : "1";
  }
  revealButton.addEventListener("click", toggleMessage);
  document.getElementById("universe").addEventListener("click", (e) => {
    if (e.target !== revealButton && !dragging) toggleMessage();
  });
  canvas.addEventListener("pointerdown", e => {
    dragging = true; px = e.clientX; py = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener("pointermove", e => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py;
    targetYaw += dx * .008;
    targetPitch = Math.max(-1.05, Math.min(1.05, targetPitch + dy * .006));
    px = e.clientX; py = e.clientY;
  });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);
  canvas.addEventListener("lostpointercapture", stopDrag);
  document.addEventListener("visibilitychange", () => { last = 0; });
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  requestAnimationFrame(draw);
})();
