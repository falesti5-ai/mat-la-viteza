/* Mat la viteză – legătura cu Liga Stelelor (aceleași date din browser, cheia ligaStelelor.v1).
   Liga însăși nu se modifică: se adaugă doar două motive și înregistrările de stele. */
(function (root) {
  const KEY = "ligaStelelor.v1";
  const REASONS = [
    {id: "mlvI", icon: "⏱️", label: "Mat la viteză – întrecere", value: 1, type: "plus"},
    {id: "mlvR", icon: "♜", label: "Mat la viteză – realizare", value: 1, type: "plus"},
  ];
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

  function citesteLiga(storage) {
    try {
      const s = JSON.parse(storage.getItem(KEY) || "null");
      return s && Array.isArray(s.students) && s.students.length && Array.isArray(s.events) ? s : null;
    } catch (e) { return null; }
  }
  const stele = (state, sid) => state.events.filter(e => e.sid === sid).reduce((a, e) => a + (+e.value || 0), 0);

  /* awards: [{sid, value, rid, note}] → recitește Liga, adaugă și salvează */
  function scrieStele(storage, awards, now = Date.now()) {
    if (!awards.length) return {state: citesteLiga(storage), rezultate: []};
    const state = citesteLiga(storage);
    if (!state) throw new Error("Liga Stelelor nu a fost găsită în acest browser.");
    state.reasons = state.reasons || [];
    for (const r of REASONS) if (!state.reasons.some(x => x.id === r.id)) state.reasons.push({...r});
    const sids = [...new Set(awards.map(a => a.sid))];
    const inainte = Object.fromEntries(sids.map(sid => [sid, stele(state, sid)]));
    awards.forEach((a, i) => state.events.push({id: uid(), sid: a.sid, rid: a.rid, value: a.value, ts: now + i, note: a.note || ""}));
    storage.setItem(KEY, JSON.stringify(state));
    return {state, rezultate: sids.map(sid => ({sid, inainte: inainte[sid], dupa: stele(state, sid)}))};
  }

  const api = {KEY, REASONS, citesteLiga, stele, scrieStele};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Liga = api;
})(this);
