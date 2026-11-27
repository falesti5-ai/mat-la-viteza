/* Mat la viteză – clasamente și reguli pentru stele (fără DOM). */
(function (root) {
  const Sah = typeof module !== "undefined" && module.exports ? require("./sah.js") : root.Sah;
  /* pragurile „Fulger” (ms). 23.11.2026: +5 s la cele 4 maturi cu piese grele.
     26.11.2026: Damă + Nebun 30 s și Damă + Cal 40 s (regele în colț), Nebun + Cal 2 min. Experimentul cu 2 cai nu are prag. */
  const PRAG = {KQ: 25000, KQR: 15000, KRR: 20000, KR: 35000, QB: 30000, QN: 40000, KBB: 60000, KBN: 120000};
  const PRAG_V1 = {KQ: 20000, KQR: 10000, KRR: 15000, KR: 30000}; // pragurile vechi, pentru încercările de dinainte
  /* a primit deja Fulger la încercarea a? (încercările noi au câmpul „fulger”; cele vechi se judecă după pragul vechi) */
  const hadFulger = a => "fulger" in a ? a.fulger === true : clean(a) && a.ms < (PRAG_V1[a.mode] || 0);
  const CONTEST_STARS = [3, 2, 1];
  const label = id => (Sah.modeById(id) || {label: id}).label;
  const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${Math.floor(ms / 100) % 10}`;
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const clean = a => a.ok && !a.hints;
  /* 27.11.2026: timpii se compară la zecimi de secundă, cum se văd pe ecran (0:44.1).
     La zecimi egale e mai sus cel care a făcut timpul primul. */
  const zec = ms => Math.floor(ms / 100);
  const maiBun = (x, y) => zec(x.ms) - zec(y.ms) || x.ts - y.ts;
  function weekStart(now) {
    const d = new Date(now); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // luni
    return d.getTime();
  }

  /* clasamentul de antrenament: cel mai bun timp al fiecărui copil + numărul de încercări */
  function ranking(attempts, mode, scope, now) {
    const by = new Map();
    for (const a of attempts) {
      if (a.mode !== mode || (scope === "today" && !sameDay(a.ts, now))) continue;
      const r = by.get(a.pid) || {a: null, tries: 0}; r.tries++;
      if (a.ok && (!r.a || maiBun(a, r.a) < 0)) r.a = a;
      by.set(a.pid, r);
    }
    return [...by.values()].filter(r => r.a).sort((x, y) => maiBun(x.a, y.a));
  }
  function best(attempts, f) { return attempts.filter(f).sort(maiBun)[0] || null; }

  /* stelele pentru o încercare de antrenament; history = încercările anterioare */
  function starsForAttempt(att, history) {
    if (!clean(att) || !att.sid) return [];
    const out = [], L = label(att.mode), give = (note, value = 1, tip) => out.push({sid: att.sid, value, rid: "mlvR", note, tip});
    const firstStars = (Sah.modeById(att.mode) || {stele: 1}).stele;
    const mine = history.filter(a => a.pid === att.pid);
    const mineMode = mine.filter(a => a.mode === att.mode);
    if (!mineMode.some(clean)) {
      give(`Primul mat – ${L}`, firstStars);
      if (mineMode.some(a => a.ok && a.hints)) give(`Primul mat fără indicii – ${L}`);
    }
    const rec = best(history, a => clean(a) && a.mode === att.mode && a.group === att.group);
    if (rec && zec(att.ms) < zec(rec.ms)) give(`Record nou al grupei – ${L}, ${fmt(att.ms)}`);
    let streak = 0;
    for (const a of [...mine, att].sort((x, y) => x.ts - y.ts).reverse()) { if (!clean(a)) break; streak++; }
    if (streak % 5 === 0) give(`Serie de 5 maturi – ${streak} la rând`);
    if (zec(att.ms) < PRAG[att.mode] / 100 && !mineMode.some(hadFulger)) give(`Fulger – ${L}, ${fmt(att.ms)}`, 1, "fulger");
    return out;
  }

  /* întrecerea: cel mai bun total reușit al fiecărui copil */
  function contestRanking(contest) {
    const by = new Map();
    const mut = e => e.moves.reduce((s, x) => s + x, 0);
    const cmp = (x, y) => zec(x.total) - zec(y.total) || mut(x) - mut(y) || x.ts - y.ts; // la total egal: mai puține mutări, apoi primul
    for (const e of contest.entries) if (e.ok && (!by.has(e.pid) || cmp(e, by.get(e.pid)) < 0)) by.set(e.pid, e);
    return [...by.values()].sort(cmp);
  }
  function contestAwards(contest) {
    if (!contest.open) return [];
    return contestRanking(contest).slice(0, 3).map((e, i) => e.sid
      ? {sid: e.sid, value: CONTEST_STARS[i], rid: "mlvI", note: `Locul ${i + 1} – ${label(contest.mode)}, ${fmt(e.total)} (3 poziții)`}
      : null).filter(Boolean);
  }

  /* progresul săptămânii: recordul de dinainte de luni vs. recordul din săptămâna curentă */
  function weeklyProgress(attempts, group, now) {
    const ws = weekStart(now), res = new Map();
    const pool = attempts.filter(a => clean(a) && a.group === group && a.sid);
    for (const pid of new Set(pool.map(a => a.pid))) {
      for (const mode of Object.keys(PRAG)) {
        const old = best(pool, a => a.pid === pid && a.mode === mode && a.ts < ws);
        const neu = best(pool, a => a.pid === pid && a.mode === mode && a.ts >= ws && a.ts <= now);
        if (!old || !neu || zec(neu.ms) >= zec(old.ms)) continue;
        const pct = (old.ms - neu.ms) / old.ms;
        if (!res.has(pid) || pct > res.get(pid).pct) res.set(pid, {pid, sid: neu.sid, name: neu.name, avatar: neu.avatar, color: neu.color, mode, pct, inainte: old.ms, acum: neu.ms});
      }
    }
    return [...res.values()].sort((x, y) => y.pct - x.pct);
  }

  const api = {PRAG, CONTEST_STARS, fmt, zec, maiBun, sameDay, weekStart, ranking, starsForAttempt, contestRanking, contestAwards, weeklyProgress};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Reguli = api;
})(this);
