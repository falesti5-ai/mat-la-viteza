/* Mat la viteză – clasamente și reguli pentru stele (fără DOM). */
(function (root) {
  const Sah = typeof module !== "undefined" && module.exports ? require("./sah.js") : root.Sah;
  const PRAG = {KQ: 20000, KQR: 10000, KRR: 15000, KR: 30000};
  const CONTEST_STARS = [3, 2, 1];
  const label = id => (Sah.modeById(id) || {label: id}).label;
  const fmt = ms => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${Math.floor(ms / 100) % 10}`;
  const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
  const clean = a => a.ok && !a.hints;
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
      if (a.ok && (!r.a || a.ms < r.a.ms)) r.a = a;
      by.set(a.pid, r);
    }
    return [...by.values()].filter(r => r.a).sort((x, y) => x.a.ms - y.a.ms);
  }
  function best(attempts, f) { return attempts.filter(f).sort((x, y) => x.ms - y.ms)[0] || null; }

  /* stelele pentru o încercare de antrenament; history = încercările anterioare */
  function starsForAttempt(att, history) {
    if (!clean(att) || !att.sid) return [];
    const out = [], L = label(att.mode), give = note => out.push({sid: att.sid, value: 1, rid: "mlvR", note});
    const mine = history.filter(a => a.pid === att.pid);
    const mineMode = mine.filter(a => a.mode === att.mode);
    if (!mineMode.some(clean)) {
      give(`Primul mat – ${L}`);
      if (mineMode.some(a => a.ok && a.hints)) give(`Primul mat fără indicii – ${L}`);
    }
    const rec = best(history, a => clean(a) && a.mode === att.mode && a.group === att.group);
    if (rec && att.ms < rec.ms) give(`Record nou al grupei – ${L}, ${fmt(att.ms)}`);
    let streak = 0;
    for (const a of [...mine, att].sort((x, y) => x.ts - y.ts).reverse()) { if (!clean(a)) break; streak++; }
    if (streak % 5 === 0) give(`Serie de 5 maturi – ${streak} la rând`);
    if (att.ms < PRAG[att.mode] && !mineMode.some(a => clean(a) && a.ms < PRAG[att.mode])) give(`Fulger – ${L}, ${fmt(att.ms)}`);
    return out;
  }

  /* întrecerea: cel mai bun total reușit al fiecărui copil */
  function contestRanking(contest) {
    const by = new Map();
    for (const e of contest.entries) if (e.ok && (!by.has(e.pid) || e.total < by.get(e.pid).total)) by.set(e.pid, e);
    return [...by.values()].sort((x, y) => x.total - y.total);
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
        if (!old || !neu || neu.ms >= old.ms) continue;
        const pct = (old.ms - neu.ms) / old.ms;
        if (!res.has(pid) || pct > res.get(pid).pct) res.set(pid, {pid, sid: neu.sid, name: neu.name, avatar: neu.avatar, color: neu.color, mode, pct, inainte: old.ms, acum: neu.ms});
      }
    }
    return [...res.values()].sort((x, y) => y.pct - x.pct);
  }

  const api = {PRAG, CONTEST_STARS, fmt, sameDay, weekStart, ranking, starsForAttempt, contestRanking, contestAwards, weeklyProgress};
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.Reguli = api;
})(this);
