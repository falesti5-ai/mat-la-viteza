const test = require("node:test");
const assert = require("node:assert");
const G = require("../reguli.js");

const DAY = 864e5;
const NOW = new Date(2026, 10, 22, 12, 0).getTime(); // duminică 22.11.2026
let n = 0;
const att = o => Object.assign({id: "x" + n++, pid: "ana", sid: "ana", name: "Ana", avatar: "🦊", color: "#f00", group: "g1",
  mode: "KQ", ok: true, result: "mat", ms: 40000, moves: 12, hints: false, ts: NOW - 1000 + n, kind: "antrenament"}, o);
const notes = aw => aw.map(a => a.note.split(" –")[0].split(",")[0]);

test("încercarea cu indicii nu primește stele", () => {
  assert.deepStrictEqual(G.starsForAttempt(att({hints: true, ms: 1000}), []), []);
});
test("copilul scris de mână (fără sid) nu primește stele", () => {
  assert.deepStrictEqual(G.starsForAttempt(att({sid: null, pid: "n:ion"}), []), []);
});
test("primul mat la un tip", () => {
  const aw = G.starsForAttempt(att({}), []);
  assert.deepStrictEqual(notes(aw), ["Primul mat"]);
  assert.ok(aw.every(a => a.rid === "mlvR" && a.value === 1 && a.sid === "ana"));
});
test("primul mat fără indicii după exersare cu indicii (se dă împreună cu primul mat)", () => {
  const h = [att({hints: true})];
  assert.deepStrictEqual(notes(G.starsForAttempt(att({}), h)).sort(), ["Primul mat", "Primul mat fără indicii"].sort());
});
test("al doilea mat obișnuit nu primește nimic", () => {
  assert.deepStrictEqual(G.starsForAttempt(att({ms: 41000}), [att({})]), []);
});
test("record nou al grupei", () => {
  const h = [att({pid: "mihai", sid: "mihai", ms: 30000}), att({})];
  assert.deepStrictEqual(notes(G.starsForAttempt(att({ms: 29000}), h)), ["Record nou al grupei"]);
  // recordul altei grupe nu contează
  const h2 = [att({pid: "ion", sid: "ion", group: "g2", ms: 10000}), att({})];
  assert.deepStrictEqual(notes(G.starsForAttempt(att({ms: 29000}), h2)), ["Record nou al grupei"]);
  // recordul cu indicii nu contează ca record
  const h3 = [att({pid: "mihai", sid: "mihai", ms: 5000, hints: true}), att({ms: 30000})];
  assert.deepStrictEqual(notes(G.starsForAttempt(att({ms: 29000}), h3)), ["Record nou al grupei"]);
});
test("Fulger: pragul este strict", () => {
  assert.ok(notes(G.starsForAttempt(att({ms: 24999}), [att({})])).includes("Fulger"));
  assert.ok(!notes(G.starsForAttempt(att({ms: 25000}), [att({ms: 25500})])).includes("Fulger"));
  assert.deepStrictEqual([G.PRAG.KQ, G.PRAG.KQR, G.PRAG.KRR, G.PRAG.KR], [25000, 15000, 20000, 35000]);
});
test("Fulger după mărirea pragului: cine a avut 22 s (sub pragul vechi de 20 s nu) primește acum", () => {
  // încercare veche, fără câmpul „fulger”, 22 s la damă: nu luase Fulger
  assert.ok(notes(G.starsForAttempt(att({ms: 23000}), [att({ms: 22000})])).includes("Fulger"));
  // încercare veche de 18 s: luase deja Fulger
  assert.ok(!notes(G.starsForAttempt(att({ms: 17000}), [att({ms: 18000})])).includes("Fulger"));
  // încercare nouă marcată
  assert.ok(!notes(G.starsForAttempt(att({ms: 17000}), [att({ms: 24000, fulger: true})])).includes("Fulger"));
  assert.ok(notes(G.starsForAttempt(att({ms: 17000}), [att({ms: 24000, fulger: false})])).includes("Fulger"));
});
test("primul mat la tipurile medii dă 2 stele", () => {
  const aw = G.starsForAttempt(att({mode: "KRB", ms: 90000}), []);
  assert.deepStrictEqual(aw.map(a => [a.note.split(" –")[0], a.value]), [["Primul mat", 2]]);
  assert.strictEqual(G.starsForAttempt(att({mode: "KBB", ms: 90000}), [])[0].value, 2);
  assert.strictEqual(G.starsForAttempt(att({mode: "KQN", ms: 90000}), [])[0].value, 1);
  assert.ok(Object.keys(G.PRAG).length === 9);
});
test("Fulger o singură dată pe tip", () => {
  const h = [att({ms: 15000})];
  assert.ok(!notes(G.starsForAttempt(att({ms: 14000}), h)).includes("Fulger"));
});
test("serie de 5 maturi la rând, ruptă de o greșeală", () => {
  const h = [att({}), att({ok: false, result: "pat"}), att({}), att({}), att({}), att({})];
  assert.ok(notes(G.starsForAttempt(att({}), h)).includes("Serie de 5 maturi"));
  const h2 = [att({}), att({}), att({}), att({hints: true}), att({})];
  assert.ok(!notes(G.starsForAttempt(att({}), h2)).includes("Serie de 5 maturi"));
  const h9 = Array.from({length: 9}, () => att({}));
  assert.ok(notes(G.starsForAttempt(att({}), h9)).includes("Serie de 5 maturi"));
});

const contest = entries => ({id: "c1", mode: "KR", group: "g1", positions: [], open: true, ts: NOW, entries});
const ent = (pid, total, ok = true, sid = pid) => ({pid, sid, name: pid, avatar: "🙂", color: "#000", times: [total / 3, total / 3, total / 3], moves: [5, 5, 5], total, ok, ts: NOW});
test("întrecerea: cel mai bun total pe copil, 3-2-1 stele", () => {
  const c = contest([ent("a", 90000), ent("b", 60000), ent("a", 50000), ent("c", 70000), ent("d", 80000), ent("e", 10000, false)]);
  assert.deepStrictEqual(G.contestRanking(c).map(e => e.pid), ["a", "b", "c", "d"]);
  const aw = G.contestAwards(c);
  assert.deepStrictEqual(aw.map(a => [a.sid, a.value, a.rid]), [["a", 3, "mlvI"], ["b", 2, "mlvI"], ["c", 1, "mlvI"]]);
});
test("întrecerea cu mai puțin de 3 copii", () => {
  assert.deepStrictEqual(G.contestAwards(contest([ent("a", 9000)])).map(a => a.value), [3]);
  assert.deepStrictEqual(G.contestAwards(contest([])), []);
});
test("întrecerea închisă nu se mai premiază", () => {
  const c = contest([ent("a", 9000)]); c.open = false;
  assert.deepStrictEqual(G.contestAwards(c), []);
});
test("copilul fără Ligă ocupă locul, dar nu primește stele", () => {
  const c = contest([ent("n:ion", 1000, true, null), ent("b", 2000)]);
  assert.deepStrictEqual(G.contestAwards(c).map(a => [a.sid, a.value]), [["b", 2]]);
});

test("progresul săptămânii", () => {
  const old = NOW - 14 * DAY;
  const list = [
    att({pid: "ana", ms: 60000, ts: old}), att({pid: "ana", ms: 30000, ts: NOW - 3600e3}),          // 50%
    att({pid: "mihai", sid: "mihai", ms: 40000, ts: old}), att({pid: "mihai", sid: "mihai", ms: 36000, ts: NOW - 3600e3}), // 10%
    att({pid: "ion", sid: "ion", ms: 20000, ts: NOW - 3600e3}),                                     // fără record vechi
    att({pid: "dan", sid: "dan", group: "g2", ms: 90000, ts: old}), att({pid: "dan", sid: "dan", group: "g2", ms: 10000, ts: NOW - 3600e3}),
  ];
  const p = G.weeklyProgress(list, "g1", NOW);
  assert.deepStrictEqual(p.map(x => x.pid), ["ana", "mihai"]);
  assert.strictEqual(Math.round(p[0].pct * 100), 50);
});

test("clasamentul de antrenament: cel mai bun timp și numărul de încercări", () => {
  const list = [att({ms: 50000}), att({ms: 30000}), att({ok: false, result: "pat"}), att({pid: "b", ms: 40000}), att({mode: "KR", ms: 1000})];
  const r = G.ranking(list, "KQ", "today", NOW);
  assert.deepStrictEqual(r.map(x => [x.a.pid, x.a.ms, x.tries]), [["ana", 30000, 3], ["b", 40000, 1]]);
});
