/* Mat la viteză – sunete, confetti, fulgere de culoare și stele zburătoare. */
(function (root) {
  let actx = null;
  function tone(freq, dur = .12, type = "sine", vol = .15, delay = 0) {
    try {
      actx = actx || new (root.AudioContext || root.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain(), t = actx.currentTime + delay;
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  const sfx = {
    move: () => tone(520, .07, "triangle", .12),
    check: () => { tone(700, .1, "square", .07); tone(900, .12, "square", .07, .1); },
    mate: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, .25, "triangle", .18, i * .13)),
    record: () => [784, 988, 1175, 1568, 1175, 1568].forEach((f, i) => tone(f, .22, "square", .08, i * .11)),
    pat: () => [440, 392, 349, 262].forEach((f, i) => tone(f, .35, "sawtooth", .07, i * .22)),
    boom: () => { tone(120, .5, "sawtooth", .2); tone(80, .7, "square", .12, .05); },
    star: () => tone(1320, .15, "triangle", .12),
    tick: () => tone(660, .08, "sine", .15),
  };

  let cv, cx, parts = [], raf = null;
  function confetti(n = 160, colors = ["#ff7a59", "#ffb703", "#1fae7a", "#6c4cff", "#53c7ff", "#ff5a9e"]) {
    cv = cv || document.getElementById("confetti"); cx = cx || cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    for (let i = 0; i < n; i++) parts.push({x: innerWidth / 2 + (Math.random() - .5) * innerWidth * .6, y: innerHeight * .35,
      vx: (Math.random() - .5) * 16, vy: -Math.random() * 16 - 4, s: Math.random() * 10 + 6, c: colors[i % colors.length],
      r: Math.random() * 6, vr: (Math.random() - .5) * .4, life: 160 + Math.random() * 60});
    if (!raf) loop();
  }
  const GOLD = ["#ffcf33", "#ffb703", "#fff3b0", "#ff9f1c"];
  function loop() {
    cx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life-- > 0 && p.y < cv.height + 40);
    for (const p of parts) {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c; cx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); cx.restore();
    }
    raf = parts.length ? requestAnimationFrame(loop) : (cx.clearRect(0, 0, cv.width, cv.height), null);
  }
  function stopConfetti() { parts = []; }
  function flash(cls) { const d = document.createElement("div"); d.className = "flash " + cls; document.body.appendChild(d); setTimeout(() => d.remove(), 900); }

  /* n stele zboară de sus spre elementul target; onEach(i) după fiecare */
  function flyStars(target, n, onEach, delay = 0) {
    for (let j = 0; j < n; j++) setTimeout(() => {
      if (!target.isConnected) return;
      const st = document.createElement("div"); st.className = "flystar"; st.textContent = "⭐";
      const r = target.getBoundingClientRect();
      st.style.left = innerWidth / 2 - 22 + "px"; st.style.top = "-60px"; document.body.appendChild(st);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        st.style.transform = `translate(${r.left + r.width / 2 - innerWidth / 2}px, ${r.top + r.height / 2 + 40}px) scale(1.3) rotate(360deg)`;
      }));
      setTimeout(() => {
        st.remove(); sfx.star();
        target.animate([{transform: "scale(1)"}, {transform: "scale(1.25)"}, {transform: "scale(1)"}], {duration: 300});
        onEach && onEach(j);
      }, 950);
    }, delay + j * 420);
  }

  root.Efecte = {sfx, confetti, stopConfetti, flash, flyStars, GOLD};
})(window);
