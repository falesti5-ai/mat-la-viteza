const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const Liga = require("../liga.js");

const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "liga-stelelor-copie-2026-11-19.json"), "utf8");
const store = (txt = SRC) => { const m = {"ligaStelelor.v1": txt}; return {getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, m}; };
const NOW = 1795300000000;

test("fără date sau fără elevi → null", () => {
  assert.strictEqual(Liga.citesteLiga(store(null)), null);
  assert.strictEqual(Liga.citesteLiga(store(JSON.stringify({groups: [], students: [], events: []}))), null);
  assert.strictEqual(Liga.citesteLiga(store("{stricat")), null);
});

test("totalul crește exact cu stelele acordate, cu motivul și notița", () => {
  const st = store(), s0 = Liga.citesteLiga(st), sid = s0.students[0].id, before = Liga.stele(s0, sid);
  const r = Liga.scrieStele(st, [{sid, value: 3, rid: "mlvI", note: "Locul 1"}, {sid, value: 1, rid: "mlvR", note: "Fulger"}], NOW);
  assert.deepStrictEqual(r.rezultate, [{sid, inainte: before, dupa: before + 4}]);
  const s1 = JSON.parse(st.m["ligaStelelor.v1"]);
  assert.strictEqual(Liga.stele(s1, sid), before + 4);
  const ev = s1.events.filter(e => e.rid === "mlvI");
  assert.strictEqual(ev.length, 1);
  assert.deepStrictEqual([ev[0].sid, ev[0].value, ev[0].note, ev[0].ts], [sid, 3, "Locul 1", NOW]);
});

test("motivele nu se dublează și restul datelor rămâne neschimbat", () => {
  const st = store(), s0 = JSON.parse(SRC), sid = s0.students[1].id;
  Liga.scrieStele(st, [{sid, value: 1, rid: "mlvR", note: "a"}], NOW);
  Liga.scrieStele(st, [{sid, value: 1, rid: "mlvR", note: "b"}], NOW + 1);
  const s1 = JSON.parse(st.m["ligaStelelor.v1"]);
  assert.strictEqual(s1.reasons.filter(r => r.id === "mlvR").length, 1);
  assert.strictEqual(s1.reasons.filter(r => r.id === "mlvI").length, 1);
  for (const k of ["groups", "students", "prizes", "settings"]) assert.deepStrictEqual(s1[k], s0[k]);
  assert.deepStrictEqual(s1.events.slice(0, s0.events.length), s0.events);
  assert.deepStrictEqual(s1.reasons.slice(0, s0.reasons.length), s0.reasons);
});

test("stelele adăugate în Ligă între timp se păstrează (se recitește înainte de scriere)", () => {
  const st = store(), s0 = Liga.citesteLiga(st), sid = s0.students[0].id;
  const other = JSON.parse(st.m["ligaStelelor.v1"]);
  other.events.push({id: "manual", sid, rid: "ex", value: 1, ts: NOW, note: ""});
  st.setItem("ligaStelelor.v1", JSON.stringify(other));
  Liga.scrieStele(st, [{sid, value: 2, rid: "mlvI", note: ""}], NOW);
  const s1 = JSON.parse(st.m["ligaStelelor.v1"]);
  assert.ok(s1.events.some(e => e.id === "manual"));
  assert.ok(s1.events.some(e => e.rid === "mlvI"));
});

test("nicio stea → nu se scrie nimic", () => {
  const st = store();
  const r = Liga.scrieStele(st, [], NOW);
  assert.deepStrictEqual(r.rezultate, []);
  assert.strictEqual(st.m["ligaStelelor.v1"], SRC);
});
