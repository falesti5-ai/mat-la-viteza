const test = require("node:test");
const assert = require("node:assert");
const Copie = require("../copie.js");

const T0 = new Date(2026, 10, 26, 17, 19).getTime();
const store = init => { const m = Object.assign({}, init); return {getItem: k => k in m ? m[k] : null, setItem: (k, v) => { m[k] = String(v); }, m}; };
const liga = {groups: [{id: "g1", name: "Grupa 1"}, {id: "g2", name: "Grupa 2"}],
  students: [{id: "s1", name: "Ana", group: "g1"}, {id: "s2", name: "Ion; mic", group: "g2"}], events: [{sid: "s1", value: 1, ts: T0 - 5}, {sid: "s1", value: 2, ts: T0 + 5}]};
const att = (o) => Object.assign({id: Math.random().toString(36), pid: "s1", sid: "s1", name: "Ana", group: "g1", mode: "KQ", ok: true, ms: 17400, moves: 9, hints: false, ts: T0 + 10, kind: "antrenament"}, o);
const mlv = {attempts: [att({ts: T0 - 10}), att({ms: 15200, moves: 7}), att({ms: 9000, hints: true}), att({ok: false, result: "pat", ms: 30000}),
  att({pid: "s2", sid: "s2", name: "Ion; mic", group: "g2", mode: "KBN", ms: 95300, moves: 31}), att({mode: "KNN", ms: 1000})],
  contests: [{id: "c1", mode: "KR", group: "g1", ts: T0, open: false, positions: [],
    entries: [{pid: "s1", sid: "s1", name: "Ana", times: [10000, 12000, 13500], moves: [9, 10, 11], total: 35500, ok: true, ts: T0 + 20}]},
    {id: "c2", mode: "KR", group: "g1", ts: T0, open: false, cancelled: true, entries: []}], awardsLog: []};
const full = () => store({"ligaStelelor.v1": JSON.stringify(liga), "matLaViteza.v1": JSON.stringify(mlv), "ligaStelelor.v1.copieLa": String(T0)});

test("ce e nou de la ultima copie: înregistrări în Ligă, încercări și întreceri", () => {
  assert.deepStrictEqual(Copie.noi(full()), {la: T0, stele: 1, rezultate: 6});
  const st = full(); st.m["ligaStelelor.v1.copieLa"] = String(T0 + 100);
  assert.deepStrictEqual(Copie.noi(st), {la: T0 + 100, stele: 0, rezultate: 0});
  assert.deepStrictEqual(Copie.noi(store({})), {la: 0, stele: 0, rezultate: 0});
});

test("copia are formatul Ligii plus câmpul matLaViteza și notează ora copiei", () => {
  const st = full(), c = Copie.faCopie(st, T0 + 1000);
  assert.strictEqual(c.nume, "liga-stelelor-copie-2026-11-26.json");
  const j = JSON.parse(c.text);
  for (const k of ["groups", "students", "events"]) assert.deepStrictEqual(j[k], liga[k]);
  assert.deepStrictEqual(j.matLaViteza, mlv);
  assert.strictEqual(st.m["ligaStelelor.v1.copieLa"], String(T0 + 1000));
  assert.deepStrictEqual(Copie.noi(st), {la: T0 + 1000, stele: 0, rezultate: 0});
  assert.strictEqual(Copie.faCopie(store({})), null); // fără Ligă nu se face copie
  const fara = store({"ligaStelelor.v1": JSON.stringify(liga)});
  assert.ok(!("matLaViteza" in JSON.parse(Copie.faCopie(fara).text)));
});

test("tabelul pentru Excel: cel mai bun timp fără indicii, întrecerile, fără experiment", () => {
  const txt = Copie.csv(mlv, liga, T0), L = txt.slice(1).split("\r\n");
  assert.strictEqual(txt.charCodeAt(0), 0xFEFF); // BOM, ca Excel să citească diacriticele
  const ana = L.find(l => l.startsWith("Grupa 1;Ana;Rege + Damă"));
  assert.ok(ana, txt);
  assert.deepStrictEqual(ana.split(";"), ["Grupa 1", "Ana", "Rege + Damă", "15,2 s", "15,2", "7", "26.11.2026", "3", "4", "9,0 s", "26.11.2026"]);
  assert.ok(L.some(l => l.startsWith('Grupa 2;"Ion; mic";') && l.includes("1 min 35,3 s;95,3;31")), "câmpul cu „;” e între ghilimele");
  assert.ok(!L.some(l => /2 Cai/i.test(l) && l.startsWith("Grupa")), "experimentul nu intră în tabel");
  const ic = L.indexOf("Întrecerile");
  assert.ok(ic > 0);
  assert.deepStrictEqual(L[ic + 2].split(";").slice(0, 7), ["26.11.2026", "Grupa 1", "Rege + Turn", "1", "Ana", "35,5 s", "35,5"]);
  assert.strictEqual(L[ic + 3], ""); // întrecerea anulată lipsește
});
