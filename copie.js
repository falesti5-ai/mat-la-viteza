/* Mat la viteză – copia de rezervă și tabelul pentru Excel (fără DOM, în afară de descarca()).
   Copia este fișierul Ligii Stelelor (liga-stelelor-copie-DATA.json) cu un câmp în plus, „matLaViteza”,
   care ține toate încercările, întrecerile și stelele date. Liga îl încarcă înapoi pe amândouă. */
(function (root) {
  const Sah = typeof module !== "undefined" && module.exports ? require("./sah.js") : root.Sah;
  const Reguli = typeof module !== "undefined" && module.exports ? require("./reguli.js") : root.Reguli;
  const KEYS = {liga: "ligaStelelor.v1", mlv: "matLaViteza.v1", copieLa: "ligaStelelor.v1.copieLa"};
  const read = (st, k) => { try { return JSON.parse(st.getItem(k) || "null"); } catch (e) { return null; } };
  const pad = n => String(n).padStart(2, "0");
  const ziIso = ts => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const zi = ts => { const d = new Date(ts); return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`; };
  const ora = ts => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

  /* când s-a făcut ultima copie (0 = niciodată) */
  const copieLa = st => +st.getItem(KEYS.copieLa) || 0;

  /* ce s-a adăugat de la ultima copie: înregistrări în Ligă și rezultate la Mat la viteză */
  function noi(st) {
    const t = copieLa(st), l = read(st, KEYS.liga), m = read(st, KEYS.mlv) || {};
    const rez = (m.attempts || []).filter(a => a.ts > t).length
      + (m.contests || []).reduce((s, c) => s + (c.entries || []).filter(e => e.ts > t).length, 0);
    return {la: t, stele: l && l.events ? l.events.filter(e => e.ts > t).length : 0, rezultate: rez};
  }

  /* copia comună (Liga + Mat la viteză); notează ora copiei */
  function faCopie(st, now = Date.now()) {
    const l = read(st, KEYS.liga);
    if (!l || !l.groups) return null;
    const m = read(st, KEYS.mlv), c = Object.assign({}, l);
    delete c.matLaViteza;
    if (m && Array.isArray(m.attempts)) c.matLaViteza = m;
    try { st.setItem(KEYS.copieLa, String(now)); } catch (e) {}
    return {nume: `liga-stelelor-copie-${ziIso(now)}.json`, text: JSON.stringify(c, null, 1), rezultate: m && m.attempts ? m.attempts.length : 0};
  }

  /* ---------- tabelul pentru Excel (CSV cu „;”, virgulă zecimală, UTF-8 cu BOM) ---------- */
  const sec = ms => (Math.round(ms / 100) / 10).toFixed(1).replace(".", ",");
  const timp = ms => ms >= 60000 ? `${Math.floor(ms / 60000)} min ${sec(ms % 60000)} s` : `${sec(ms)} s`;
  const cel = v => { const s = v == null ? "" : String(v); return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const linie = a => a.map(cel).join(";");
  const ORD = [...Sah.MODES, ...(Sah.OLD_MODES || [])].map(m => m.id);
  const eticheta = id => (Sah.modeById(id) || {label: id}).label.replace(/\s*🔒/, " (regele în colț)");

  function csv(db, liga, now = Date.now()) {
    const grupe = liga ? liga.groups : [], elevi = liga ? liga.students : [];
    const gName = g => (grupe.find(x => x.id === g) || {name: ""}).name;
    const gIdx = g => { const i = grupe.findIndex(x => x.id === g); return i < 0 ? 99 : i; };
    const nume = (sid, n) => (elevi.find(s => s.id === sid) || {name: n}).name;
    const out = [linie([`Mat la viteză – recordurile copiilor, ${zi(now)} ${ora(now)}`]), "",
      linie(["Grupa", "Copilul", "Tipul de mat", "Cel mai bun timp", "Secunde", "Mutări", "Data recordului",
        "Maturi date", "Încercări", "Cel mai bun cu indicii", "Ultima încercare"])];
    const by = new Map();
    for (const a of db.attempts || []) {
      if (a.kind === "intrecere" || !Sah.modeById(a.mode) || Sah.modeById(a.mode).grp === "experiment") continue;
      const k = a.pid + "|" + a.mode, r = by.get(k) || {a, tries: 0, mats: 0, best: null, bestH: null, last: 0};
      r.tries++; r.last = Math.max(r.last, a.ts);
      if (a.ok) {
        r.mats++;
        if (!a.hints && (!r.best || Reguli.maiBun(a, r.best) < 0)) r.best = a;
        if (a.hints && (!r.bestH || Reguli.maiBun(a, r.bestH) < 0)) r.bestH = a;
      }
      by.set(k, r);
    }
    const rows = [...by.values()].sort((x, y) => gIdx(x.a.group) - gIdx(y.a.group) || ORD.indexOf(x.a.mode) - ORD.indexOf(y.a.mode)
      || (x.best ? x.best.ms : 1e12) - (y.best ? y.best.ms : 1e12) || nume(x.a.sid, x.a.name).localeCompare(nume(y.a.sid, y.a.name)));
    for (const r of rows) out.push(linie([gName(r.a.group), nume(r.a.sid, r.a.name), eticheta(r.a.mode),
      r.best ? timp(r.best.ms) : "", r.best ? sec(r.best.ms) : "", r.best ? r.best.moves : "", r.best ? zi(r.best.ts) : "",
      r.mats, r.tries, r.bestH ? timp(r.bestH.ms) : "", zi(r.last)]));
    if (!rows.length) out.push(linie(["(încă nu sunt rezultate)"]));

    const intreceri = (db.contests || []).filter(c => !c.open && !c.cancelled).sort((a, b) => a.ts - b.ts);
    out.push("", linie(["Întrecerile"]), linie(["Data", "Grupa", "Tipul de mat", "Locul", "Copilul", "Timpul total", "Secunde",
      "Poziția 1", "Poziția 2", "Poziția 3", "Mutări"]));
    for (const c of intreceri) {
      Reguli.contestRanking(c).forEach((e, i) => out.push(linie([zi(c.ts), gName(c.group), eticheta(c.mode), i + 1, nume(e.sid, e.name),
        timp(e.total), sec(e.total), ...e.times.map(timp), e.moves.reduce((s, x) => s + x, 0)])));
    }
    if (!intreceri.length) out.push(linie(["(încă nu sunt întreceri încheiate)"]));
    return "﻿" + out.join("\r\n") + "\r\n";
  }

  /* descarcă un fișier (doar în browser) */
  function descarca(nume, text, type) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], {type}));
    a.download = nume;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  const api = {KEYS, copieLa, noi, faCopie, csv, descarca, zi, ora, ziIso};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Copie = api;
})(this);
