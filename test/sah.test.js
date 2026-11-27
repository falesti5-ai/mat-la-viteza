const test = require("node:test");
const assert = require("node:assert");
const S = require("../sah.js");

const sq = n => (n.charCodeAt(1) - 49) * 8 + (n.charCodeAt(0) - 97);
function board(spec) { // {"a8":"bK", ...}
  const b = Array(64).fill(null);
  let i = 0;
  for (const [k, v] of Object.entries(spec)) b[sq(k)] = {id: "p" + i++, c: v[0], t: v[1]};
  return b;
}

test("genPosition dă poziții corecte pentru toate tipurile", () => {
  for (const mode of S.MODES) {
    for (let i = 0; i < 100; i++) {
      const {b, A} = S.genPosition(mode);
      const D = S.opp(A);
      const ka = S.kingSq(b, A), kd = S.kingSq(b, D);
      assert.ok(S.cheb(ka, kd) >= 2, "regi vecini");
      assert.ok(!S.inCheck(b, D), "regele advers în șah");
      const f = kd & 7, r = kd >> 3;
      assert.ok(f > 0 && f < 7 && r > 0 && r < 7, "regele advers pe margine");
      assert.strictEqual(b.filter(p => p && p.c === A && p.t !== "K").length, mode.pieces.length);
      for (const m of S.legal(b, A)) assert.ok(S.legal(S.applyM(b, m), D).length > 0, "mat/pat dintr-o mutare");
    }
  }
});

test("genPosition cu aceeași sămânță dă aceeași poziție", () => {
  const m = S.MODES[0];
  const a = S.genPosition(m, S.mulberry32(7)), b = S.genPosition(m, S.mulberry32(7));
  assert.deepStrictEqual(a, b);
});

test("mat cunoscut: Ra8 / Rb6 Th8", () => {
  assert.strictEqual(S.isMate(board({a8: "bK", b6: "wK", h8: "wR"}), "b"), true);
});

test("pat cunoscut: Ra8 / Rc7 Db6", () => {
  const b = board({a8: "bK", c7: "wK", b6: "wQ"});
  assert.strictEqual(S.legal(b, "b").length, 0);
  assert.strictEqual(S.inCheck(b, "b"), false);
});

test("apărarea ia turnul neapărat", () => {
  const b = board({e5: "bK", e4: "wR", a1: "wK"});
  const m = S.defenderMove(b, "b", Math.random);
  assert.strictEqual(m.to, sq("e4"));
  assert.ok(m.cap);
});

test("cheia poziției: aceeași așezare și același la mutare → aceeași cheie", () => {
  const a = board({e5: "bK", a1: "wK", h2: "wR", h3: "wR"});
  const b = board({e5: "bK", a1: "wK", h3: "wR", h2: "wR"}); // turnurile schimbate între ele
  assert.strictEqual(S.posKey(a, "w"), S.posKey(b, "w"));
  assert.notStrictEqual(S.posKey(a, "w"), S.posKey(a, "b"));
  const c = S.applyM(a, {from: sq("h2"), to: sq("g2")});
  assert.notStrictEqual(S.posKey(a, "b"), S.posKey(c, "b"));
});

test("contorul de repetări ajunge la 3 după un du-te-vino", () => {
  let b = board({e5: "bK", a1: "wK", h2: "wR"});
  const seen = new Map(), note = (b, side) => { const k = S.posKey(b, side); seen.set(k, (seen.get(k) || 0) + 1); return seen.get(k); };
  note(b, "w");
  const moves = [["h2", "g2"], ["e5", "e6"], ["g2", "h2"], ["e6", "e5"]];
  let last = 0;
  for (let r = 0; r < 2; r++) for (const [i, [f, t]] of moves.entries()) { b = S.applyM(b, {from: sq(f), to: sq(t)}); last = note(b, i % 2 ? "w" : "b"); }
  assert.strictEqual(last, 3);
});

test("apărarea fără întâmplare e deterministă", () => {
  const b = board({e5: "bK", a1: "wK", h2: "wR"});
  const x = S.defenderMove(b, "b", null), y = S.defenderMove(b, "b", null);
  assert.deepStrictEqual([x.from, x.to], [y.from, y.to]);
});

test("nebunul și calul: atacuri corecte", () => {
  const b = board({d4: "wB", b2: "bK", h8: "wK"});
  const at = S.attacksFrom(b, sq("d4")).sort((x, y) => x - y);
  assert.ok(at.includes(sq("c3")) && at.includes(sq("b2")) && !at.includes(sq("a1")), "nebunul se oprește la piesă");
  assert.ok(at.includes(sq("g7")) && !at.includes(sq("d5")));
  const n = board({g1: "wN", a8: "bK", a1: "wK"});
  assert.deepStrictEqual(S.attacksFrom(n, sq("g1")).sort((x, y) => x - y), ["e2", "f3", "h3"].map(sq).sort((x, y) => x - y));
});
test("maturi cunoscute cu piese ușoare", () => {
  // doi nebuni: Rh8 / Rg6, Nf6 dă șah, Ne6 ține g8
  assert.strictEqual(S.isMate(board({h8: "bK", g6: "wK", f6: "wB", e6: "wB"}), "b"), true);
  assert.strictEqual(S.isMate(board({h8: "bK", g6: "wK", e5: "wB", e4: "wB"}), "b"), false); // fuge pe g8
  // turn + cal: Rh8 / Rh6, Cf7 dă șah, Tg1 ține coloana g
  assert.strictEqual(S.isMate(board({h8: "bK", h6: "wK", f7: "wN", g1: "wR"}), "b"), true);
  assert.strictEqual(S.isMate(board({h8: "bK", h6: "wK", f7: "wN", f1: "wR"}), "b"), false);
});
test("doi nebuni sunt mereu pe culori diferite", () => {
  const m = S.modeById("KBB");
  for (let i = 0; i < 200; i++) {
    const {b} = S.genPosition(m);
    const c = b.map((p, s) => p && p.t === "B" ? ((s & 7) + (s >> 3)) % 2 : -1).filter(x => x >= 0);
    assert.strictEqual(c.length, 2); assert.notStrictEqual(c[0], c[1]);
  }
});

test("regele înghețat stă în colț și nu mută niciodată", () => {
  for (const id of ["QB", "QN"]) for (let i = 0; i < 100; i++) {
    const {b, A} = S.genPosition(S.modeById(id));
    const k = S.kingSq(b, A);
    assert.ok(S.CORNERS.includes(k) && b[k].fix);
    assert.ok(S.legal(b, A).every(m => m.from !== k));
  }
});
test("tipurile scoase rămân doar pentru numele din istoric", () => {
  assert.ok(!S.MODES.some(m => ["KRB", "KRN", "KQB", "KQN"].includes(m.id)));
  assert.strictEqual(S.modeById("KRB").label, "Rege + Turn + Nebun");
});
test("Nebun + Cal: colțurile bune sunt cele de culoarea nebunului", () => {
  const b = board({b2: "bK", e4: "wK", f1: "wB", c4: "wN"}); // nebunul pe câmp alb → h1 și a8
  assert.deepStrictEqual(S.goodCorners(b, "w").sort((x, y) => x - y), [sq("h1"), sq("a8")].sort((x, y) => x - y));
});
test("Nebun + Cal: regele nu intră singur în matul în 2 (poziția din filmul din 27.11.2026)", () => {
  // negrul: Ra3, Nc4, Cc5; regele alb pe b1. Ra1?? Cb3+ Rb1 Nd3#
  const b = board({b1: "wK", a3: "bK", c4: "bB", c5: "bN"});
  assert.ok(S.forcedMate(S.applyM(b, {from: sq("b1"), to: sq("a1")}), "b", 2));
  for (let i = 0; i < 30; i++) {
    const m = S.defenderMove(b, "w");
    assert.notStrictEqual(m.to, sq("a1"));
    assert.ok(!S.forcedMate(S.applyM(b, m), "b", 3));
  }
});
test("Nebun + Cal: regele stă în centru cât poate, pe margine fuge spre colțul greșit", () => {
  const b = board({d2: "wK", c5: "bK", a2: "bB", a6: "bN"}); // începutul filmului
  for (let i = 0; i < 30; i++) assert.ok(S.edgeDist(S.defenderMove(b, "w").to) >= 2, "pleacă de la margine");
  // regele alb închis pe rândul 1 (Rd3 al negrului ține rândul 2): merge spre a1, nu spre h1
  const e = board({d1: "wK", d3: "bK", f5: "bB", h4: "bN"});
  assert.ok(!S.inCheck(e, "w"));
  const to = S.defenderMove(e, "w", null).to;
  assert.ok(S.F(to) <= 3, "spre colțul greșit a1: " + to);
});
test("experimentul cu 2 cai: pat și matul doar dacă regele greșește", () => {
  const pat = board({a8: "bK", c7: "wK", c6: "wN", d5: "wN"});
  assert.strictEqual(S.legal(pat, "b").length, 0); assert.strictEqual(S.inCheck(pat, "b"), false);
  const b = board({b8: "bK", b6: "wK", d7: "wN", e6: "wN"});
  const to = S.legal(b, "b").map(m => m.to).sort((x, y) => x - y);
  assert.deepStrictEqual(to, [sq("a8"), sq("c8")].sort((x, y) => x - y));
  assert.ok(S.mateIn1(S.applyM(b, {from: sq("b8"), to: sq("a8")}), "w"));
  assert.ok(!S.mateIn1(S.applyM(b, {from: sq("b8"), to: sq("c8")}), "w"));
  // apărarea corectă alege c8, cea „care greșește” alege a8
  assert.strictEqual(S.defenderMove(b, "b", null).to, sq("c8"));
  assert.strictEqual(S.defenderMove(b, "b", null, {ajuta: true}).to, sq("a8"));
  // poziția de start a părții 2: albul dă șah Cd7 (din f6)
  const p2 = board({b8: "bK", b6: "wK", e6: "wN", f6: "wN"});
  assert.ok(S.legal(p2, "w").some(m => m.from === sq("f6") && m.to === sq("d7")));
  assert.ok(!S.inCheck(p2, "b"));
});
