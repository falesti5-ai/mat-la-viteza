/* Mat la viteză – logica de șah (regi, dame, turnuri, nebuni și cai; fără pioni). Tabla: 64 de câmpuri, a1 = 0, h8 = 63. */
(function (root) {
  /* grp: grele / mixt (damă + piesă ușoară) / usoare / experiment; stele = câte stele dă primul mat (după dificultate);
     fix: regele atacantului stă înghețat într-un colț (matul se dă fără ajutorul lui) */
  const MODES = [
    {id: "KR",  label: "Rege + Turn",         ic: "♜",  pieces: ["R"],      minCage: 14, grp: "grele",  stele: 1},
    {id: "KRR", label: "Rege + 2 Turnuri",    ic: "♜♜", pieces: ["R", "R"], minCage: 8,  grp: "grele",  stele: 1},
    {id: "KQ",  label: "Rege + Damă",         ic: "♛",  pieces: ["Q"],      minCage: 10, grp: "grele",  stele: 1},
    {id: "KQR", label: "Rege + Damă + Turn",  ic: "♛♜", pieces: ["Q", "R"], minCage: 6,  grp: "grele",  stele: 1},
    {id: "QB",  label: "Damă + Nebun 🔒", ic: "♛♝", pieces: ["Q", "B"], minCage: 14, grp: "mixt", stele: 2, fix: true},
    {id: "QN",  label: "Damă + Cal 🔒",   ic: "♛♞", pieces: ["Q", "N"], minCage: 14, grp: "mixt", stele: 2, fix: true},
    {id: "KBB", label: "Rege + 2 Nebuni",     ic: "♝♝", pieces: ["B", "B"], minCage: 14, grp: "usoare", stele: 2},
    {id: "KBN", label: "Rege + Nebun + Cal",  ic: "♝♞", pieces: ["B", "N"], minCage: 16, grp: "usoare", stele: 5},
    {id: "KNN", label: "Rege + 2 Cai",        ic: "♞♞", pieces: ["N", "N"], minCage: 16, grp: "experiment", stele: 0},
  ];
  /* tipuri scoase (rămân doar pentru numele din istoric) */
  const OLD_MODES = [
    {id: "KQB", label: "Rege + Damă + Nebun", ic: "♛♝", pieces: ["Q", "B"], minCage: 8,  grp: "vechi", stele: 1},
    {id: "KQN", label: "Rege + Damă + Cal",   ic: "♛♞", pieces: ["Q", "N"], minCage: 8,  grp: "vechi", stele: 1},
    {id: "KRB", label: "Rege + Turn + Nebun", ic: "♜♝", pieces: ["R", "B"], minCage: 12, grp: "vechi", stele: 2},
    {id: "KRN", label: "Rege + Turn + Cal",   ic: "♜♞", pieces: ["R", "N"], minCage: 12, grp: "vechi", stele: 2},
  ];
  const F = s => s & 7, R = s => s >> 3, onB = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const KD = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]], RD = [[1,0],[-1,0],[0,1],[0,-1]], BD = [[1,1],[1,-1],[-1,1],[-1,-1]];
  const ND = [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]];
  const SLIDE = {Q: KD, R: RD, B: BD};
  const opp = c => c === "w" ? "b" : "w";
  const cheb = (a, b) => Math.max(Math.abs(F(a) - F(b)), Math.abs(R(a) - R(b)));

  function attacksFrom(b, s) {
    const p = b[s], out = [], f = F(s), r = R(s);
    if (p.t === "K" || p.t === "N") { for (const [df, dr] of (p.t === "K" ? KD : ND)) if (onB(f + df, r + dr)) out.push((r + dr) * 8 + f + df); return out; }
    for (const [df, dr] of SLIDE[p.t]) {
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
      const p = b[i]; if (!p || p.c !== c || p.fix) continue; // regele înghețat nu mută
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
  /* piesele atacantului atacate de regele advers și neapărate */
  function hanging(b, A) {
    const dk = kingSq(b, opp(A));
    return attacksFrom(b, dk).filter(s => b[s] && b[s].c === A && b[s].t !== "K" && !attacked(b, s, A));
  }

  const CORNERS = [0, 7, 56, 63];
  /* colțurile în care se poate da mat cu nebun și cal: cele de culoarea nebunului */
  function goodCorners(b, A) {
    const bs = b.findIndex(p => p && p.c === A && p.t === "B");
    if (bs < 0) return [];
    return CORNERS.filter(c => (F(c) + R(c)) % 2 === (F(bs) + R(bs)) % 2);
  }
  const onEdge = s => F(s) === 0 || F(s) === 7 || R(s) === 0 || R(s) === 7;
  /* există o mutare a atacantului care dă mat? (întoarce mutarea sau null) */
  function mateIn1(b, A) {
    for (const m of legal(b, A)) if (isMate(applyM(b, m), opp(A))) return m;
    return null;
  }

  /* atacantul A (la mutare) dă mat forțat în cel mult n mutări? Dacă regele poate lua o piesă, nu e mat. */
  function forcedMate(b, A, n) {
    const D = opp(A);
    for (const m of legal(b, A)) {
      const nb = applyM(b, m), rs = legal(nb, D);
      if (rs.length === 0) { if (inCheck(nb, D)) return true; continue; }
      if (n === 1 || rs.some(r => r.cap)) continue;
      if (rs.every(r => forcedMate(applyM(nb, r), A, n - 1))) return true;
    }
    return false;
  }
  const edgeDist = s => Math.min(F(s), 7 - F(s), R(s), 7 - R(s));

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
      let ak;
      if (mode.fix) { ak = CORNERS[rng() * 4 | 0]; if (used.has(ak)) continue; used.add(ak); }
      else ak = rnd();
      b[ak] = {id: "ak", t: "K", c: A};
      if (mode.fix) { b[ak].fix = true; if (cheb(dk, ak) < 4) continue; } // regele advers pornește departe de regele înghețat
      mode.pieces.forEach((t, i) => { b[rnd()] = {id: "a" + i, t, c: A}; });
      if (cheb(dk, ak) < 2 || inCheck(b, D)) continue;
      // doi nebuni: trebuie să fie pe câmpuri de culori diferite, altfel matul e imposibil
      const bs = b.map((p, s) => p && p.t === "B" ? (F(s) + R(s)) % 2 : -1).filter(x => x >= 0);
      if (bs.length === 2 && bs[0] === bs[1]) continue;
      if (F(dk) === 0 || F(dk) === 7 || R(dk) === 0 || R(dk) === 7) continue;
      if (attacksFrom(b, dk).some(s => b[s] && b[s].c === A)) continue;
      if (legal(b, A).some(m => legal(applyM(b, m), D).length === 0)) continue;
      fallback = {b, A};
      if (cage(b, D).size >= mode.minCage) return fallback;
    }
    return fallback;
  }

  /* apărarea: ia piesa neapărată; altfel caută spațiu și evită matul imediat.
     Nebun + Cal: fuge de colțurile de culoarea nebunului. Regele atacantului înghețat: stă departe de el.
     rng === null → deterministă (pentru întrecere).
     opts.ajuta: apărătorul „greșește” (experimentul cu 2 cai): intră singur în matul dintr-o mutare și caută colțul. */
  function defenderMove(b, D, rng = Math.random, opts = {}) {
    const ms = legal(b, D), A = opp(D);
    if (opts.ajuta) {
      const bad = ms.find(m => !m.cap && mateIn1(applyM(b, m), A));
      if (bad) return bad;
    } else {
      const cap = ms.find(m => m.cap);
      if (cap) return cap;
    }
    const types = b.filter(p => p && p.c === A && p.t !== "K").map(p => p.t).sort().join("");
    const gc = types === "BN" ? goodCorners(b, A) : [];
    const ak = kingSq(b, A), frozen = ak >= 0 && b[ak].fix;
    let best = null, bs = -1e9;
    for (const m of ms) {
      if (opts.ajuta && m.cap) continue;
      const nb = applyM(b, m);
      const center = -(Math.abs(3.5 - F(m.to)) + Math.abs(3.5 - R(m.to)));
      let sc;
      if (opts.ajuta) sc = -center * 2 + (rng ? rng() * 1.5 : 0); // merge spre colț
      else {
        const threat = hanging(nb, A).length ? 6 : 0;
        const away = frozen ? 2 * Math.min(cheb(m.to, ak), 4) : 0;
        let pen = mateIn1(nb, A) ? -1000 : 0, corner = 0;
        if (gc.length) {
          /* Nebun + Cal (27.11.2026): 1) nu intră în mat forțat în 2 mutări (lângă margine nici în 3);
             2) stă în centru cât poate – colțul bun pentru el contează doar lângă margine;
             3) lângă colț stă alături de el, nu intră singur în colț */
          const d = edgeDist(m.to);
          if (!pen) pen = forcedMate(nb, A, 2) ? -900 : d <= 1 && forcedMate(nb, A, 3) ? -800 : 0;
          corner = 8 * d + 2 * Math.min(...gc.map(c => cheb(m.to, c))) + (CORNERS.includes(m.to) ? -6 : 0);
        }
        sc = cage(nb, D).size * 3 + center + threat + pen + corner + away + (rng ? rng() * 1.5 : 0);
      }
      if (sc > bs) { bs = sc; best = m; }
    }
    return best || ms[0];
  }

  const api = {MODES, OLD_MODES, CORNERS, F, R, opp, cheb, attacksFrom, attacked, kingSq, inCheck, applyM, legal, isMate, mateIn1, forcedMate, edgeDist, posKey, cage, hanging,
    goodCorners, onEdge, mulberry32, genPosition, defenderMove,
    modeById: id => MODES.find(m => m.id === id) || OLD_MODES.find(m => m.id === id)};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Sah = api;
})(this);
