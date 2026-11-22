/* Mat la viteză – logica de șah (doar regi, dame și turnuri). Tabla: 64 de câmpuri, a1 = 0, h8 = 63. */
(function (root) {
  const MODES = [
    {id: "KR",  label: "Rege + Turn",        ic: "♜",  pieces: ["R"],      minCage: 14},
    {id: "KRR", label: "Rege + 2 Turnuri",   ic: "♜♜", pieces: ["R", "R"], minCage: 8},
    {id: "KQ",  label: "Rege + Damă",        ic: "♛",  pieces: ["Q"],      minCage: 10},
    {id: "KQR", label: "Rege + Damă + Turn", ic: "♛♜", pieces: ["Q", "R"], minCage: 6},
  ];
  const F = s => s & 7, R = s => s >> 3, onB = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const KD = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], RD = [[1,0],[-1,0],[0,1],[0,-1]];
  const opp = c => c === "w" ? "b" : "w";
  const cheb = (a, b) => Math.max(Math.abs(F(a) - F(b)), Math.abs(R(a) - R(b)));

  function attacksFrom(b, s) {
    const p = b[s], out = [], f = F(s), r = R(s);
    if (p.t === "K") { for (const [df, dr] of KD) if (onB(f + df, r + dr)) out.push((r + dr) * 8 + f + df); return out; }
    for (const [df, dr] of (p.t === "R" ? RD : KD)) {
      let x = f + df, y = r + dr;
      while (onB(x, y)) { const t = y * 8 + x; out.push(t); if (b[t]) break; x += df; y += dr; }
    }
    return out;
  }
  function attacked(b, s, by) {
    for (let i = 0; i < 64; i++) { const p = b[i]; if (p && p.c === by && attacksFrom(b, i).includes(s)) return true; }
    return false;
  }
  const kingSq = (b, c) => b.findIndex(p => p && p.t === "K" && p.c === c);
  const inCheck = (b, c) => attacked(b, kingSq(b, c), opp(c));
  const applyM = (b, m) => { const nb = b.slice(); nb[m.to] = nb[m.from]; nb[m.from] = null; return nb; };
  function legal(b, c) {
    const res = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p || p.c !== c) continue;
      for (const t of attacksFrom(b, i)) {
        const q = b[t]; if (q && (q.c === c || q.t === "K")) continue;
        const m = {from: i, to: t, cap: q || null};
        if (!inCheck(applyM(b, m), c)) res.push(m);
      }
    }
    return res;
  }
  const isMate = (b, c) => legal(b, c).length === 0 && inCheck(b, c);
  /* cheia poziției pentru regula repetării de 3 ori: așezarea pieselor + cine e la mutare */
  const posKey = (b, side) => b.map(p => p ? p.c + p.t : ".").join("") + side;

  /* „cușca” regelui: câmpurile la care ajunge fără să treacă prin câmpuri atacate */
  function cage(b, D) {
    const A = opp(D), k = kingSq(b, D), nb = b.slice(); nb[k] = null;
    const att = new Set();
    for (let i = 0; i < 64; i++) { const p = nb[i]; if (p && p.c === A) attacksFrom(nb, i).forEach(s => att.add(s)); }
    const seen = new Set([k]), q = [k];
    while (q.length) {
      const s = q.pop();
      for (const [df, dr] of KD) {
        if (!onB(F(s) + df, R(s) + dr)) continue;
        const t = (R(s) + dr) * 8 + F(s) + df;
        if (seen.has(t) || att.has(t) || (nb[t] && nb[t].c === A)) continue;
        seen.add(t); q.push(t);
      }
    }
    return seen;
  }
  /* piesele grele ale atacantului atacate de regele advers și neapărate */
  function hanging(b, A) {
    const dk = kingSq(b, opp(A));
    return attacksFrom(b, dk).filter(s => b[s] && b[s].c === A && b[s].t !== "K" && !attacked(b, s, A));
  }

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function genPosition(mode, rng = Math.random) {
    const A = rng() < .5 ? "w" : "b", D = opp(A);
    let fallback = null;
    for (let tries = 0; tries < 8000; tries++) {
      const b = Array(64).fill(null), used = new Set();
      const rnd = () => { let s; do { s = rng() * 64 | 0; } while (used.has(s)); used.add(s); return s; };
      const dk = rnd(); b[dk] = {id: "dk", t: "K", c: D};
      const ak = rnd(); b[ak] = {id: "ak", t: "K", c: A};
      mode.pieces.forEach((t, i) => { b[rnd()] = {id: "a" + i, t, c: A}; });
      if (cheb(dk, ak) < 2 || inCheck(b, D)) continue;
      if (F(dk) === 0 || F(dk) === 7 || R(dk) === 0 || R(dk) === 7) continue;
      if (attacksFrom(b, dk).some(s => b[s] && b[s].c === A)) continue;
      if (legal(b, A).some(m => legal(applyM(b, m), D).length === 0)) continue;
      fallback = {b, A};
      if (cage(b, D).size >= mode.minCage) return fallback;
    }
    return fallback;
  }

  /* apărarea: ia piesa neapărată; altfel caută spațiu și evită matul imediat.
     rng === null → deterministă (pentru întrecere). */
  function defenderMove(b, D, rng = Math.random) {
    const ms = legal(b, D), A = opp(D);
    const cap = ms.find(m => m.cap);
    if (cap) return cap;
    let best = null, bs = -1e9;
    for (const m of ms) {
      const nb = applyM(b, m);
      let pen = 0;
      for (const am of legal(nb, A)) if (isMate(applyM(nb, am), D)) { pen = -1000; break; }
      const threat = hanging(nb, A).length ? 6 : 0;
      const center = -(Math.abs(3.5 - F(m.to)) + Math.abs(3.5 - R(m.to)));
      const sc = cage(nb, D).size * 3 + center + threat + pen + (rng ? rng() * 1.5 : 0);
      if (sc > bs) { bs = sc; best = m; }
    }
    return best;
  }

  const api = {MODES, F, R, opp, cheb, attacksFrom, attacked, kingSq, inCheck, applyM, legal, isMate, posKey, cage, hanging, mulberry32, genPosition, defenderMove,
    modeById: id => MODES.find(m => m.id === id)};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Sah = api;
})(this);
