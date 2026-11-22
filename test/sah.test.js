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
