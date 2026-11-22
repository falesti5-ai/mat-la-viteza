/* Mat la viteză – ecranele. Modul „cerc” (cu Liga Stelelor) sau „acasă” (telefon, fără Ligă). */
(function () {
  const {MODES, modeById, opp, legal, applyM, inCheck, cage, hanging, genPosition, defenderMove, F, R} = Sah;
  const {fmt, sameDay, ranking, starsForAttempt, contestRanking, contestAwards, weeklyProgress, weekStart} = Reguli;
  const {sfx, confetti, stopConfetti, flash, flyStars, GOLD} = Efecte;
  const KEY = "matLaViteza.v1";
  const NAME = {K: "regele", Q: "dama", R: "turnul"};
  const AVATARS = ["🦊", "🐼", "🦁", "🐯", "🐸", "🦄", "🐲", "🦉", "🐬", "🐧", "🚀", "⚡"];
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]));
  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const MEDAL = ["🥇", "🥈", "🥉"];

  /* ---------- date ---------- */
  let liga = Liga.citesteLiga(localStorage);
  const MOD = liga ? "cerc" : "acasa";
  document.body.classList.add(MOD);
  let db = {attempts: [], contests: [], awardsLog: []};
  try { const s = JSON.parse(localStorage.getItem(KEY) || "null"); if (s && s.attempts) db = Object.assign(db, s); } catch (e) {}
  let ui = {modes: ["KR"], hints: true, group: null, player: null, lbMode: "KR", lbScope: "today", lbGroup: null,
    homeName: "", homeAvatar: "🦊", cMode: "KR", cGroup: null};
  try { const u = JSON.parse(localStorage.getItem(KEY + ".ui") || "null"); if (u) ui = Object.assign(ui, u); } catch (e) {}
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); localStorage.setItem(KEY + ".ui", JSON.stringify(ui)); }
    catch (e) { alert("Rezultatele nu s-au putut salva în browser."); }
  }
  const refreshLiga = () => { const l = Liga.citesteLiga(localStorage); if (l) liga = l; };
  const groups = () => liga ? liga.groups : [];
  const students = g => liga ? liga.students.filter(s => s.group === g) : [];
  const starsOf = sid => liga && sid ? Liga.stele(liga, sid) : 0;
  const groupName = g => (groups().find(x => x.id === g) || {name: ""}).name;
  if (MOD === "cerc") {
    const ids = groups().map(g => g.id);
    if (!ids.includes(ui.group) && ui.group !== "new") ui.group = ids[0];
    if (!ids.includes(ui.lbGroup)) ui.lbGroup = ids[0];
    if (!ids.includes(ui.cGroup)) ui.cGroup = ids[0];
    if (ui.player && ui.player.sid && !liga.students.some(s => s.id === ui.player.sid)) ui.player = null;
  } else {
    ui.player = ui.homeName ? homePlayer() : null;
  }
  function homePlayer() { return {pid: "n:" + ui.homeName.toLowerCase(), sid: null, name: ui.homeName, avatar: ui.homeAvatar, color: "#6c4cff", group: null}; }
  const openContest = () => db.contests.find(c => c.open) || null;

  /* ---------- piese ---------- */
  const SHAPE = {
    K: `<path d="M22.5 4v7M19 7.5h7" fill="none" stroke-width="2.4"/><circle cx="22.5" cy="15" r="3.6"/>
       <path d="M12.5 31c-5-6-3.5-14 3.5-14.5 3.4-.2 5.6 2.6 6.5 5.5.9-2.9 3.1-5.7 6.5-5.5 7 .5 8.5 8.5 3.5 14.5z"/><path d="M10 38.5h25l-2-7.5H12z"/>`,
    Q: `<circle cx="8" cy="12" r="2.6"/><circle cx="16" cy="9" r="2.6"/><circle cx="22.5" cy="8" r="2.6"/><circle cx="29" cy="9" r="2.6"/><circle cx="37" cy="12" r="2.6"/>
       <path d="M12.5 31L8 14l7.5 9 1-13 6 12 6-12 1 13 7.5-9-4.5 17z"/><path d="M10 38.5h25l-2.5-7.5h-20z"/>`,
    R: `<path d="M9 39h27v-4.5H9z"/><path d="M12.5 34.5l1.5-15h17l1.5 15z"/><path d="M11 15V9h4.5v2.5h4.5V9h5v2.5h4.5V9H34v6l-3 4.5H14z"/>`,
  };
  const pieceSVG = (t, c) => `<svg viewBox="0 0 45 45" width="88%" height="88%" fill="${c === "w" ? "#fbfbf7" : "#2b2b33"}" stroke="${c === "w" ? "#26262c" : "#0d0d10"}"
    stroke-width="1.6" stroke-linejoin="round">${SHAPE[t]}${c === "b" ? `<path d="M14 35.5h17" stroke="#9a9aa8" stroke-width="1" fill="none"/>` : ""}</svg>`;

  /* ---------- navigare ---------- */
  function renderNav(active) {
    const items = [["start", "🎯 Joacă"], ["lb", "🏆 Clasament"]].concat(MOD === "cerc" ? [["contest", "🏁 Întrecere"]] : []);
    $("#nav").innerHTML = items.map(([id, t]) => `<button data-nav="${id}" class="${id === active ? "on" : ""}">${t}</button>`).join("");
  }
  function show(id) {
    if (id !== "game" && G && !G.over) { G.over = true; cancelAnimationFrame(timerRaf); }
    if (id !== "game") { document.querySelectorAll(".modal").forEach(m => m.remove()); stopConfetti(); }
    document.querySelectorAll(".scr").forEach(s => s.classList.toggle("on", s.id === id));
    renderNav(id === "game" ? (G && G.kind === "intrecere" ? "contest" : "start") : id);
    refreshLiga();
    if (id === "start") renderStart();
    if (id === "lb") renderLB();
    if (id === "contest") renderContest();
    scrollTo(0, 0);
  }
  $("#nav").addEventListener("click", e => { const b = e.target.closest("[data-nav]"); if (b) show(b.dataset.nav); });

  /* ---------- start ---------- */
  function kidCard(s, on, extra = "") {
    return `<button class="kid ${on ? "on" : ""}" data-kid="${s.id}">${extra}<div class="av" style="background:${s.color}33">${s.avatar}</div>
      <div class="nm">${esc(s.name)}</div><div class="st">⭐ ${starsOf(s.id)}</div></button>`;
  }
  function modesHTML() {
    return `<div class="modes">${MODES.map(m => `<button class="mode ${ui.modes.includes(m.id) ? "on" : ""}" data-mode="${m.id}">
      <span class="box">✓</span><span class="ic">${m.ic}</span><span><b>${m.label}</b></span></button>`).join("")}</div>
      <p class="note" style="margin-top:8px">Dacă bifați mai multe, ele vin la întâmplare. Culoarea pieselor se schimbă singură.</p>
      <button class="switch ${ui.hints ? "on" : ""}" data-act="hints"><span class="tg"></span><span><b>💡 Cu indicii</b><br><span class="note">„cușca” regelui și piesele în pericol${MOD === "cerc" ? " · fără stele" : ""}</span></span></button>`;
  }
  function renderStart() {
    const sel = ui.player;
    let left;
    if (MOD === "cerc") {
      const tabs = groups().map(g => `<button data-grp="${g.id}" class="${ui.group === g.id ? "on" : ""}">${esc(g.name)}</button>`).join("")
        + `<button data-grp="new" class="${ui.group === "new" ? "on" : ""}">✏️ Alt nume</button>`;
      const body = ui.group === "new"
        ? `<div class="row"><input id="nn" maxlength="30" placeholder="Scrie numele copilului" value="${sel && !sel.sid ? esc(sel.name) : ""}"><button class="small" data-act="nn">OK</button></div>
           <p class="note" style="margin-top:10px">Rezultatul se păstrează, dar stelele se dau doar copiilor din Liga Stelelor.</p>`
        : `<div class="kids">${students(ui.group).map(s => kidCard(s, sel && sel.sid === s.id)).join("") || `<p class="empty">Grupa nu are elevi în Liga Stelelor.</p>`}</div>`;
      left = `<div class="card"><h2>1. Cine joacă acum?</h2><p class="note">Copiii sunt luați din Liga Stelelor.</p><div class="tabs">${tabs}</div>${body}</div>`;
    } else {
      left = `<div class="card"><h2>1. Cum te numești?</h2>
        <div class="row"><input id="nn" maxlength="30" placeholder="Scrie numele tău" value="${esc(ui.homeName)}"><button class="small" data-act="nn">OK</button></div>
        <p class="note" style="margin-top:12px">Alege-ți un avatar:</p>
        <div class="avs">${AVATARS.map(a => `<button data-av="${a}" class="${ui.homeAvatar === a ? "on" : ""}">${a}</button>`).join("")}</div>
        <p class="note" style="margin-top:14px">Antrenează-te acasă! Recordurile tale se păstrează pe acest telefon.</p></div>`;
    }
    $("#start").innerHTML = `<div class="start">${left}
      <div class="card"><h2>2. Ce mat exersăm?</h2>${modesHTML()}
        <div class="who">${sel ? `<span style="font-size:34px">${sel.avatar}</span> Joacă: ${esc(sel.name)}` : `<span class="note">${MOD === "cerc" ? "Alegeți copilul din stânga." : "Scrie-ți numele mai sus."}</span>`}</div>
        <button class="go" data-act="go" ${sel && ui.modes.length ? "" : "disabled"}>▶ Începe!</button></div></div>`;
  }
  function takeName() {
    const v = ($("#nn") || {}).value; if (!v || !v.trim()) return;
    if (MOD === "cerc") ui.player = {pid: "n:" + v.trim().toLowerCase(), sid: null, name: v.trim(), avatar: "🙂", color: "#6c4cff", group: null};
    else { ui.homeName = v.trim(); ui.player = homePlayer(); }
  }
  $("#start").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.grp) ui.group = t.dataset.grp;
    else if (t.dataset.kid) { const s = liga.students.find(x => x.id === t.dataset.kid); ui.player = {pid: s.id, sid: s.id, name: s.name, avatar: s.avatar, color: s.color, group: s.group}; }
    else if (t.dataset.mode) { const id = t.dataset.mode; ui.modes = ui.modes.includes(id) ? ui.modes.filter(x => x !== id) : [...ui.modes, id]; }
    else if (t.dataset.av) { ui.homeAvatar = t.dataset.av; if (ui.homeName) ui.player = homePlayer(); }
    else if (t.dataset.act === "hints") ui.hints = !ui.hints;
    else if (t.dataset.act === "nn") takeName();
    else if (t.dataset.act === "go") { save(); return startPractice(); }
    save(); renderStart();
  });
  $("#start").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "nn") { takeName(); save(); renderStart(); } });

  /* ---------- tabla și jocul ---------- */
  let G = null, timerRaf = null;
  function boardSize() {
    if (innerWidth <= 700) return Math.max(240, Math.min(innerWidth - 40, innerHeight - 250));
    return Math.max(240, Math.min(innerHeight - 120, innerWidth - 420));
  }
  const hintsOn = () => G && G.kind === "antrenament" && ui.hints;
  function startPractice() {
    const mode = modeById(ui.modes[Math.random() * ui.modes.length | 0]);
    const {b, A} = genPosition(mode);
    beginBoard({b, A, mode, kind: "antrenament", rng: Math.random});
  }
  function beginBoard(o) {
    stopConfetti(); document.querySelectorAll(".modal").forEach(m => m.remove());
    G = Object.assign(o, {D: opp(o.A), moves: 0, sel: null, last: null, over: true, busy: false, t0: 0, hintsUsed: o.kind === "antrenament" && ui.hints});
    show("game");
    const p = G.player || ui.player, m = G.mode;
    const steps = G.kind === "intrecere"
      ? `<div class="steps">${[0, 1, 2].map(i => `<span class="${i < G.run.idx ? "ok" : i === G.run.idx ? "on" : ""}">${i < G.run.idx ? "✓ " + fmt(G.run.times[i]) : "Poziția " + (i + 1)}</span>`).join("")}</div>` : "";
    $("#game").innerHTML = `<div class="game">
      <div class="boardwrap"><div class="board" id="board"></div></div>
      <div class="side">
        <div class="card player"><div class="av" style="background:${p.color}33">${p.avatar}</div><div><b>${esc(p.name)}</b><span>${m.ic} ${m.label}${G.kind === "intrecere" ? " · 🏁 întrecere" : ""}</span></div></div>
        ${steps}
        <div class="color ${G.A}">${G.A === "w" ? "⚪ Joci cu ALBELE" : "⚫ Joci cu NEGRELE"}</div>
        <div class="card tcard"><div class="timer" id="timer">0:00.0</div>
          <div class="stats" style="margin-top:10px"><div><b id="mv">0</b><span>mutări</span></div><div><b id="best">–</b><span>${G.kind === "intrecere" ? "timp total" : "recordul tău"}</span></div></div>
          <div class="rec" id="rec" style="margin-top:8px"></div></div>
        <div class="hintbox" id="hint"></div>
        ${G.kind === "antrenament" ? `<button class="switch ${ui.hints ? "on" : ""}" data-act="hints"><span class="tg"></span><b>💡 Indicii</b></button>` : ""}
        <button class="giveup" data-act="giveup">🏳️ Renunț la poziție</button>
      </div></div>`;
    if (G.kind === "intrecere") $("#best").textContent = fmt(G.run.times.reduce((a, x) => a + x, 0));
    else {
      const pb = bestClean(m.id, a => a.pid === p.pid), rec = recordFor(m.id, p.group);
      $("#best").textContent = pb ? fmt(pb.ms) : "–";
      $("#rec").textContent = rec ? `👑 Recordul${MOD === "cerc" ? " grupei" : ""}: ${fmt(rec.ms)} – ${rec.name}` : "👑 Încă nu există record – fii primul!";
    }
    document.documentElement.style.setProperty("--bs", boardSize() + "px");
    buildBoard(); render();
    const cd = document.createElement("div"); cd.className = "countdown"; $(".boardwrap").appendChild(cd);
    let n = 3;
    const step = () => {
      if (!G || G.cd !== cd) return;
      if (n === 0) {
        cd.innerHTML = `<span style="font-size:.5em">Start!</span>`; sfx.mate();
        setTimeout(() => { if (G.cd !== cd) return; cd.remove(); G.over = false; G.t0 = performance.now(); render(); tick(); }, 450);
        return;
      }
      cd.innerHTML = `<span>${n}</span>`; sfx.tick(); n--; setTimeout(step, 750);
    };
    G.cd = cd; step();
  }
  function tick() { if (!G || G.over) return; $("#timer").textContent = fmt(performance.now() - G.t0); timerRaf = requestAnimationFrame(tick); }
  const disp = s => G.A === "w" ? [F(s), 7 - R(s)] : [7 - F(s), R(s)];
  function buildBoard() {
    let h = "";
    for (let s = 0; s < 64; s++) {
      const [c, r] = disp(s), light = (F(s) + R(s)) % 2 === 1;
      let co = "";
      if (r === 7) co += `<span class="coord f">${"abcdefgh"[F(s)]}</span>`;
      if (c === 0) co += `<span class="coord r">${R(s) + 1}</span>`;
      h += `<div class="sq ${light ? "l" : "d"}" data-s="${s}" style="left:${c * 12.5}%;top:${r * 12.5}%">${co}<span class="dot"></span></div>`;
    }
    $("#board").innerHTML = h;
  }
  function render() {
    const bd = $("#board"), b = G.b;
    const targets = G.sel != null ? legal(b, G.A).filter(m => m.from === G.sel) : [];
    const cg = hintsOn() && !G.over ? cage(b, G.D) : new Set();
    const hang = hintsOn() && !G.over ? hanging(b, G.A) : [];
    bd.querySelectorAll(".sq").forEach(el => {
      const s = +el.dataset.s, t = targets.find(m => m.to === s);
      el.classList.toggle("sel", s === G.sel);
      el.classList.toggle("tgt", !!t);
      el.classList.toggle("capt", !!(t && t.cap));
      el.classList.toggle("last", !!G.last && (G.last.from === s || G.last.to === s));
      el.classList.toggle("cage", cg.has(s) && !b[s]);
    });
    const alive = new Set();
    b.forEach((p, s) => {
      if (!p) return; alive.add(p.id);
      let el = bd.querySelector(`.pc[data-id="${p.id}"]`);
      if (!el) { el = document.createElement("div"); el.className = "pc"; el.dataset.id = p.id; el.innerHTML = pieceSVG(p.t, p.c); bd.appendChild(el); }
      const [c, r] = disp(s);
      el.style.left = c * 12.5 + "%"; el.style.top = r * 12.5 + "%";
      el.classList.toggle("check", p.t === "K" && p.c === G.D && inCheck(b, G.D) && !G.over);
      el.classList.toggle("danger", hang.includes(s));
    });
    bd.querySelectorAll(".pc").forEach(el => { if (!alive.has(el.dataset.id) && !el.classList.contains("boom")) el.remove(); });
    $("#mv").textContent = G.moves;
    const hb = $("#hint");
    if (hintsOn() && !G.over) {
      hb.classList.add("on");
      hb.innerHTML = `Cușca regelui: <span class="big">${cg.size}</span> câmpuri.<br>Micșoreaz-o pas cu pas!`
        + (hang.length ? `<br><span style="color:var(--bad)">⚠️ Atenție! ${NAME[b[hang[0]].t]} poate fi luat de rege!</span>` : "");
    } else hb.classList.remove("on");
  }
  $("#game").addEventListener("click", e => {
    const t = e.target.closest("button");
    if (t && t.dataset.act === "hints") { ui.hints = !ui.hints; if (ui.hints) G.hintsUsed = true; t.classList.toggle("on", ui.hints); save(); return render(); }
    if (t && t.dataset.act === "giveup") { if (G && !G.over) finish("renunt"); return; }
    const sq = e.target.closest(".sq"); if (!sq || !G || G.over || G.busy) return;
    const s = +sq.dataset.s, p = G.b[s];
    if (G.sel != null) { const m = legal(G.b, G.A).find(m => m.from === G.sel && m.to === s); if (m) return playerMove(m); }
    G.sel = p && p.c === G.A ? (G.sel === s ? null : s) : null;
    render();
  });
  function playerMove(m) {
    G.b = applyM(G.b, m); G.moves++; G.last = m; G.sel = null; sfx.move(); render();
    const dm = legal(G.b, G.D);
    if (dm.length === 0) return finish(inCheck(G.b, G.D) ? "mat" : "pat");
    if (inCheck(G.b, G.D)) sfx.check();
    if (G.moves >= 50) return finish("limita");
    G.busy = true;
    const game = G;
    setTimeout(() => {
      if (G !== game || G.over) return;
      const d = defenderMove(G.b, G.D, G.rng);
      const capEl = d.cap ? $(`.pc[data-id="${d.cap.id}"]`) : null;
      G.b = applyM(G.b, d); G.last = d; G.busy = false;
      if (capEl) { capEl.classList.add("boom"); setTimeout(() => capEl.remove(), 950); }
      sfx.move(); render();
      if (d.cap) finish("pierdut", d.cap);
    }, 450);
  }

  /* ---------- rezultate ---------- */
  const practice = () => db.attempts.filter(a => a.kind !== "intrecere");
  function bestClean(mode, f) { return practice().filter(a => a.mode === mode && a.ok && !a.hints && f(a)).sort((x, y) => x.ms - y.ms)[0] || null; }
  function recordFor(mode, group) { return bestClean(mode, a => MOD !== "cerc" || a.group === group); }
  const numsHTML = (ms, moves, lblT = "timp") => `<div class="nums"><div><b>${fmt(ms)}</b>${lblT}</div><div><b>${moves}</b>mutări</div></div>`;

  function finish(result, cap) {
    G.over = true; cancelAnimationFrame(timerRaf);
    const ms = Math.round(performance.now() - G.t0);
    $("#timer").textContent = fmt(ms);
    render();
    const bd = $("#board");
    if (result === "mat") { const k = $(`.pc[data-id="dk"]`); k && k.classList.add("mated"); sfx.mate(); confetti(G.kind === "intrecere" ? 90 : 160); }
    if (result === "pat") { sfx.pat(); flash("grey"); bd.classList.add("pat", "shake"); }
    if (result === "pierdut") { sfx.boom(); flash("red"); bd.classList.add("shake"); }
    if (G.kind === "intrecere") return finishContestPosition(result, ms, cap);

    const p = ui.player, prior = practice();
    const prevRec = recordFor(G.mode.id, p.group), prevPB = bestClean(G.mode.id, a => a.pid === p.pid);
    const att = {id: uid(), pid: p.pid, sid: p.sid, name: p.name, avatar: p.avatar, color: p.color, group: p.group, mode: G.mode.id,
      ok: result === "mat", result, ms, moves: G.moves, hints: G.hintsUsed, ts: Date.now(), kind: "antrenament"};
    db.attempts.push(att); save();
    const btns = `<div class="btns"><button class="pri" data-act="again">🔁 Poziție nouă</button>${MOD === "cerc" ? `<button data-act="other">👤 Alt copil</button>` : ""}<button data-act="lb">🏆 Clasament</button></div>`;
    if (result !== "mat") return failModal(result, cap, numsHTML(ms, G.moves), btns, 900);

    let ribbon = "", crown = "";
    if (!att.hints && (!prevRec || ms < prevRec.ms)) {
      crown = `<div class="crown">👑</div>`;
      ribbon = !prevRec ? `<div class="ribbon">👑 PRIMUL RECORD!<small>${G.mode.label}${MOD === "cerc" ? " · " + esc(groupName(p.group) || "") : ""}</small></div>`
        : prevRec.pid === p.pid ? `<div class="ribbon">👑 RECORD NOU!<small>Ți-ai bătut propriul record (${fmt(prevRec.ms)})</small></div>`
        : `<div class="ribbon">👑 RECORD NOU!<small>L-ai întrecut pe ${esc(prevRec.name)} ${prevRec.avatar} (${fmt(prevRec.ms)})</small></div>`;
      setTimeout(() => { sfx.record(); flash("gold"); confetti(220, GOLD); }, 700);
    } else if (!att.hints && prevPB && ms < prevPB.ms) ribbon = `<div class="ribbon pb">⭐ Record personal!<small>Înainte: ${fmt(prevPB.ms)}</small></div>`;

    let starsHTML = "", star = null;
    if (MOD === "cerc") {
      const awards = starsForAttempt(att, prior);
      if (awards.length) {
        try {
          const r = Liga.scrieStele(localStorage, awards); liga = r.state; star = {awards, res: r.rezultate[0]};
          starsHTML = `<div class="starsbox"><div class="av" id="sav" style="background:${p.color}33">${p.avatar}</div><div>
            <div class="tot" id="stot">⭐ ${star.res.inainte}</div><ul>${awards.map(a => `<li>⭐ +${a.value} · ${esc(a.note)}</li>`).join("")}</ul></div></div>
            <p class="note f5">Stelele au intrat în Liga Stelelor. Dacă Liga e deschisă în alt tab, apăsați F5 în ea înainte să dați alte stele.</p>`;
        } catch (e) { starsHTML = `<p class="warn">Stelele nu s-au putut scrie în Ligă: ${esc(e.message)}</p>`; }
      } else if (att.hints) starsHTML = `<p class="note">💡 Cu indicii – fără stele. Încearcă și fără indicii!</p>`;
    }
    setTimeout(() => {
      const m = modal(`<div class="res mat">${crown}<div class="em">🎉</div><h1>MAT!</h1>${ribbon}
        <p>${esc(p.name)} a dat mat cu ${G.A === "w" ? "albele" : "negrele"}${att.hints ? " (cu indicii 💡)" : ""}</p>${numsHTML(ms, G.moves)}${starsHTML}${btns}</div>`);
      if (star) animateStars(m, star.res.inainte, star.awards.reduce((a, x) => a + x.value, 0), 1400);
    }, 900);
  }
  function animateStars(m, from, n, delay) {
    const av = m.querySelector("#sav"), tot = m.querySelector("#stot"); if (!av) return;
    flyStars(av, n, j => { tot.innerHTML = `⭐ ${from + j + 1} <span class="plus">+${j + 1}</span>`; }, delay);
  }
  function failModal(result, cap, nums, btns, delay, extra = "") {
    const html = result === "pat"
      ? `<div class="res pat"><div class="zzz">💤</div><div class="em">😮</div><h1>PAT!</h1>
         <p>Regele nu mai are mutări, dar nu este în șah.<br>Este remiză – matul s-a pierdut.<br><b>Lasă-i regelui un câmp liber!</b></p>${extra}${nums}${btns}</div>`
      : result === "pierdut"
      ? `<div class="res lost"><div class="em">💥</div><h1>Ai pierdut ${NAME[cap.t]}!</h1>
         <p>Regele a luat piesa neapărată.<br><b>Ține piesele departe de rege sau apără-le cu regele tău.</b></p>${extra}${nums}${btns}</div>`
      : `<div class="res lost"><div class="em">🏳️</div><h1>Încearcă din nou</h1><p>${result === "limita" ? "Ai făcut 50 de mutări fără mat." : "Ai renunțat la poziție."}</p>${extra}${nums}${btns}</div>`;
    setTimeout(() => modal(html), delay);
  }
  function modal(html) {
    const m = document.createElement("div"); m.className = "modal"; m.innerHTML = html; $("#fx").appendChild(m);
    m.addEventListener("click", e => {
      const t = e.target.closest("button"); if (!t || !t.dataset.act) return;
      const act = t.dataset.act;
      if (act === "again") return startPractice();
      if (act === "next") return beginContestPosition(G.run, G.run.idx + 1);
      m.remove();
      if (act === "other") show("start");
      if (act === "lb") show("lb");
      if (act === "contest") show("contest");
    });
    return m;
  }

  /* ---------- întrecerea ---------- */
  function beginContestPosition(run, idx) {
    const C = db.contests.find(c => c.id === run.cid); if (!C || !C.open) return show("contest");
    run.idx = idx;
    const pos = C.positions[idx];
    beginBoard({b: pos.b.map(x => x && {...x}), A: pos.A, mode: modeById(C.mode), kind: "intrecere", rng: null, run, player: run.player});
  }
  function finishContestPosition(result, ms, cap) {
    const run = G.run, C = db.contests.find(c => c.id === run.cid);
    run.times.push(ms); run.moves.push(G.moves);
    const back = `<div class="btns"><button class="pri" data-act="contest">🏁 Înapoi la întrecere</button></div>`;
    const entry = ok => ({pid: run.player.pid, sid: run.player.sid, name: run.player.name, avatar: run.player.avatar, color: run.player.color,
      times: run.times.slice(), moves: run.moves.slice(), total: run.times.reduce((a, x) => a + x, 0), ok, ts: Date.now()});
    if (result !== "mat") {
      if (C) { C.entries.push(entry(false)); save(); }
      return failModal(result, cap, numsHTML(ms, G.moves), back, 900, `<p class="warn">Întrecerea s-a încheiat la poziția ${run.idx + 1} din 3. Încercarea nu se clasează.</p>`);
    }
    if (run.idx < 2) {
      return setTimeout(() => modal(`<div class="res mat"><div class="em">✅</div><h1>Poziția ${run.idx + 1} din 3</h1>
        ${numsHTML(ms, G.moves)}<p>Timp total până acum: <b>${fmt(run.times.reduce((a, x) => a + x, 0))}</b></p>
        <div class="btns"><button class="pri" data-act="next">▶ Poziția ${run.idx + 2}</button></div></div>`), 700);
    }
    const e = entry(true);
    if (C) { C.entries.push(e); save(); }
    const rk = C ? contestRanking(C) : [], place = rk.findIndex(x => x === e) + 1;
    const prevBest = C ? C.entries.filter(x => x.pid === e.pid && x.ok && x !== e).sort((a, b) => a.total - b.total)[0] : null;
    if (place === 1) setTimeout(() => { sfx.record(); flash("gold"); confetti(220, GOLD); }, 700);
    setTimeout(() => modal(`<div class="res mat">${place === 1 ? `<div class="crown">👑</div>` : ""}<div class="em">🏁</div><h1>Gata!</h1>
      ${place ? `<div class="ribbon ${place > 3 ? "pb" : ""}">${MEDAL[place - 1] || ""} Locul ${place} în întrecere<small>${place === 1 ? "Ești primul!" : "Mai poți încerca o dată, dacă permite profesorul"}</small></div>`
        : `<p>Rezultatul tău mai bun rămâne ${prevBest ? fmt(prevBest.total) : ""}.</p>`}
      <div class="nums"><div><b>${fmt(e.total)}</b>timp total</div><div><b>${e.moves.reduce((a, x) => a + x, 0)}</b>mutări</div></div>
      <p>${e.times.map((t, i) => `Poziția ${i + 1}: ${fmt(t)}`).join(" · ")}</p>${back}</div>`), 900);
  }
  function renderContest() {
    const C = openContest();
    if (!C) {
      const last = db.contests.filter(c => !c.open).sort((a, b) => b.ts - a.ts)[0];
      $("#contest").innerHTML = `<div class="wrap"><div class="card"><h2>🏁 Întrecere nouă</h2>
        <p class="note">Toți copiii primesc aceleași 3 poziții. Se adună timpul celor 3 poziții. Indiciile sunt oprite. Primii trei primesc 3 – 2 – 1 stele în Liga Stelelor.</p>
        <div class="lbl note"><b>Grupa:</b></div><div class="tabs">${groups().map(g => `<button data-cg="${g.id}" class="${ui.cGroup === g.id ? "on" : ""}">${esc(g.name)}</button>`).join("")}</div>
        <div class="lbl note"><b>Tipul de mat:</b></div>
        <div class="modes">${MODES.map(m => `<button class="mode radio ${ui.cMode === m.id ? "on" : ""}" data-cm="${m.id}"><span class="box">✓</span><span class="ic">${m.ic}</span><span><b>${m.label}</b></span></button>`).join("")}</div>
        <button class="go" data-act="newc">🏁 Începe întrecerea</button></div>
        ${last ? `<div class="card"><h2>Ultima întrecere</h2><p class="note">${new Date(last.ts).toLocaleDateString("ro-RO")} · ${esc(groupName(last.group))} · ${modeById(last.mode).label}</p>${contestTable(last)}</div>` : ""}</div>`;
      return;
    }
    const done = new Map(); contestRanking(C).forEach(e => done.set(e.pid, e));
    $("#contest").innerHTML = `<div class="wrap">
      <div class="card"><div class="lbtop"><h2 style="margin:0">🏁 Întrecere: ${modeById(C.mode).ic} ${modeById(C.mode).label} · ${esc(groupName(C.group))}</h2></div>
        <p class="note">Atingeți copilul care joacă acum. Fiecare joacă aceleași 3 poziții; contează cel mai bun total.</p>
        <div class="kids">${students(C.group).map(s => kidCard(s, false, done.has(s.id) ? `<span class="done">✓ ${fmt(done.get(s.id).total)}</span>` : "")).join("")}</div>
        <div class="row" style="margin-top:12px"><input id="cn" maxlength="30" placeholder="Alt nume (fără stele)"><button class="small" data-act="cname">▶ Joacă</button></div></div>
      <div class="card"><h2>Clasamentul întrecerii</h2>${contestTable(C)}
        <div class="lbtop" style="margin-top:14px"><button class="small danger" data-act="cancel">Anulează întrecerea</button><span class="sp"></span>
          <button class="award" data-act="award" ${contestRanking(C).length ? "" : "disabled"}>⭐ Încheie întrecerea: 3 – 2 – 1 stele</button></div></div></div>`;
  }
  function contestTable(C) {
    const rk = contestRanking(C);
    if (!rk.length) return `<div class="empty">Încă nu a terminat nimeni cele 3 poziții.</div>`;
    return `<table><tr><th></th><th>Copilul</th><th>Total</th><th>Pozițiile</th><th>Mutări</th></tr>${rk.map((e, i) => `<tr><td class="rk">${MEDAL[i] || i + 1}</td>
      <td><span class="av" style="background:${e.color}33">${e.avatar}</span>${esc(e.name)}</td><td class="t">${fmt(e.total)}</td>
      <td class="sm">${e.times.map(fmt).join(" · ")}</td><td>${e.moves.reduce((a, x) => a + x, 0)}</td></tr>`).join("")}</table>`;
  }
  $("#contest").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    const C = openContest();
    if (t.dataset.cg) { ui.cGroup = t.dataset.cg; save(); return renderContest(); }
    if (t.dataset.cm) { ui.cMode = t.dataset.cm; save(); return renderContest(); }
    if (t.dataset.act === "newc") {
      const mode = modeById(ui.cMode);
      db.contests.push({id: uid(), mode: mode.id, group: ui.cGroup, positions: [0, 1, 2].map(() => genPosition(mode)), open: true, ts: Date.now(), entries: []});
      save(); return renderContest();
    }
    if (!C) return;
    let player = null;
    if (t.dataset.kid) { const s = liga.students.find(x => x.id === t.dataset.kid); player = {pid: s.id, sid: s.id, name: s.name, avatar: s.avatar, color: s.color, group: s.group}; }
    if (t.dataset.act === "cname") { const v = $("#cn").value.trim(); if (!v) return; player = {pid: "n:" + v.toLowerCase(), sid: null, name: v, avatar: "🙂", color: "#6c4cff", group: null}; }
    if (player) return beginContestPosition({cid: C.id, player, idx: 0, times: [], moves: []}, 0);
    if (t.dataset.act === "cancel" && confirm("Anulați întrecerea fără să dați stele?")) { C.open = false; C.cancelled = true; save(); return renderContest(); }
    if (t.dataset.act === "award") { t.disabled = true; return awardContest(C); }
  });
  function awardContest(C) {
    const awards = contestAwards(C), rk = contestRanking(C).slice(0, 3);
    let res = [], err = "";
    try { const r = Liga.scrieStele(localStorage, awards); liga = r.state; res = r.rezultate; } catch (e) { err = e.message; }
    C.open = false; save();
    const order = [1, 0, 2].filter(i => rk[i]);
    const m = modal(`<div class="res wide"><h1 style="color:var(--gold)">⭐ Premierea ⭐</h1>
      <p>${modeById(C.mode).ic} ${modeById(C.mode).label} · ${esc(groupName(C.group))} · ${new Date().toLocaleDateString("ro-RO")}</p>
      <div class="podium">${order.map(i => { const e = rk[i], r = res.find(x => x.sid === e.sid); return `<div class="pod p${i + 1}">
        <div class="av" style="background:${e.color}33;animation-delay:${.9 + (2 - i) * .2}s" id="pav${i}">${e.avatar}</div>
        <div class="nm">${esc(e.name)}</div><div class="tm">${fmt(e.total)} · ${e.moves.reduce((a, x) => a + x, 0)} mutări</div>
        <div class="tot" id="ptot${i}">${r ? "⭐ " + r.inainte : `<span class="note">nu e în Ligă</span>`}</div>
        <div class="blk" style="animation-delay:${(2 - i) * .2}s">${i + 1}</div></div>`; }).join("")}</div>
      ${err ? `<p class="warn">Stelele nu s-au putut scrie în Ligă: ${esc(err)}</p>` : awards.length ? `<p class="note f5">Stelele au intrat în Liga Stelelor („⏱️ Mat la viteză – întrecere”). Dacă Liga e deschisă în alt tab, apăsați F5 în ea.</p>` : ""}
      <div class="btns"><button class="pri" data-act="contest">Gata</button></div></div>`);
    sfx.record(); setTimeout(() => confetti(200, GOLD), 900);
    [2, 1, 0].forEach((i, k) => {
      const e = rk[i]; if (!e) return;
      const r = res.find(x => x.sid === e.sid), n = Reguli.CONTEST_STARS[i];
      flyStars(m.querySelector("#pav" + i), r ? n : 0, j => { m.querySelector("#ptot" + i).innerHTML = `⭐ ${r.inainte + j + 1} <span class="plus">+${j + 1}</span>`; }, 1800 + k * 1700);
    });
  }

  /* ---------- clasament ---------- */
  function renderLB() {
    const pool = practice().filter(a => MOD !== "cerc" || a.group === ui.lbGroup);
    const rows = ranking(pool, ui.lbMode, ui.lbScope, Date.now());
    let html = `<div class="wrap"><div class="card">
      <div class="lbtop"><h2 style="margin:0">🏆 Clasament</h2><span class="sp"></span>
        <div class="tabs" style="margin:0"><button data-scope="today" class="${ui.lbScope === "today" ? "on" : ""}">Azi</button><button data-scope="all" class="${ui.lbScope === "all" ? "on" : ""}">Toate timpurile</button></div></div>
      ${MOD === "cerc" ? `<div class="tabs">${groups().map(g => `<button data-lg="${g.id}" class="${ui.lbGroup === g.id ? "on" : ""}">${esc(g.name)}</button>`).join("")}</div>` : ""}
      <div class="tabs">${MODES.map(m => `<button data-lbm="${m.id}" class="${ui.lbMode === m.id ? "on" : ""}">${m.ic} ${m.label}</button>`).join("")}</div>
      ${rows.length ? `<table><tr><th></th><th>${MOD === "cerc" ? "Copilul" : "Numele"}</th><th>Cel mai bun timp</th><th>Mutări</th><th>Încercări</th></tr>
        ${rows.map((r, i) => `<tr><td class="rk">${MEDAL[i] || i + 1}</td><td><span class="av" style="background:${r.a.color}33">${r.a.avatar}</span>${esc(r.a.name)}${r.a.hints ? " 💡" : ""}</td>
          <td class="t">${fmt(r.a.ms)}</td><td>${r.a.moves}</td><td>${r.tries}</td></tr>`).join("")}</table>`
        : `<div class="empty">Încă nu este niciun mat ${ui.lbScope === "today" ? "azi " : ""}la „${modeById(ui.lbMode).label}”.</div>`}
      <div class="lbtop" style="margin-top:14px"><span class="note">💡 = cu indicii (fără stele). Se arată cel mai bun timp al fiecăruia.</span><span class="sp"></span>
        <button class="small danger" data-act="clear">🗑️ Șterge rezultatele de azi</button></div></div>`;
    if (MOD === "cerc") {
      const wk = weekStart(Date.now()), given = db.awardsLog.find(x => x.type === "progres" && x.group === ui.lbGroup && x.week === wk);
      const prog = weeklyProgress(practice(), ui.lbGroup, Date.now()).slice(0, 5);
      html += `<div class="card"><h2>📈 Progresul săptămânii · ${esc(groupName(ui.lbGroup))}</h2>
        <p class="note">Cât și-a îmbunătățit fiecare recordul personal față de săptămânile trecute (fără indicii).</p>
        ${prog.length ? `<table><tr><th></th><th>Copilul</th><th>Progres</th><th>Tipul</th><th>Înainte → acum</th></tr>${prog.map((x, i) => `<tr><td class="rk">${i + 1}</td>
          <td><span class="av" style="background:${x.color}33">${x.avatar}</span>${esc(x.name)}</td><td class="t">−${Math.round(x.pct * 100)}%</td>
          <td class="sm">${modeById(x.mode).label}</td><td class="sm">${fmt(x.inainte)} → ${fmt(x.acum)}</td></tr>`).join("")}</table>` : `<div class="empty">Încă nu are nimeni un record îmbunătățit săptămâna aceasta.</div>`}
        <div class="lbtop" style="margin-top:14px"><span class="sp"></span>${given ? `<span class="note">✅ Steaua săptămânii a fost dată: ${esc(given.name)}</span>`
          : `<button class="award" data-act="prog" ${prog.length ? "" : "disabled"}>⭐ +1 pentru ${prog.length ? esc(prog[0].name) : "…"}</button>`}</div></div>`;
    }
    $("#lb").innerHTML = html + "</div>";
  }
  $("#lb").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.scope) ui.lbScope = t.dataset.scope;
    if (t.dataset.lbm) ui.lbMode = t.dataset.lbm;
    if (t.dataset.lg) ui.lbGroup = t.dataset.lg;
    if (t.dataset.act === "clear" && confirm("Ștergeți rezultatele de antrenament de azi?")) db.attempts = db.attempts.filter(a => !sameDay(a.ts, Date.now()));
    if (t.dataset.act === "prog") {
      const x = weeklyProgress(practice(), ui.lbGroup, Date.now())[0]; if (!x) return;
      t.disabled = true;
      try {
        const r = Liga.scrieStele(localStorage, [{sid: x.sid, value: 1, rid: "mlvR", note: `Cel mai mare progres al săptămânii – ${modeById(x.mode).label}: ${fmt(x.inainte)} → ${fmt(x.acum)}`}]);
        liga = r.state;
        db.awardsLog.push({type: "progres", group: ui.lbGroup, week: weekStart(Date.now()), sid: x.sid, name: x.name, ts: Date.now()});
        save(); renderLB();
        const m = modal(`<div class="res mat"><div class="em">📈</div><h1>Bravo, ${esc(x.name)}!</h1><p>Cel mai mare progres al săptămânii: −${Math.round(x.pct * 100)}%</p>
          <div class="starsbox"><div class="av" id="sav" style="background:${x.color}33">${x.avatar}</div><div><div class="tot" id="stot">⭐ ${r.rezultate[0].inainte}</div>
          <ul><li>⭐ +1 · Progresul săptămânii</li></ul></div></div><p class="note f5">Dacă Liga e deschisă în alt tab, apăsați F5 în ea.</p>
          <div class="btns"><button class="pri" data-act="lb">Gata</button></div></div>`);
        confetti(); animateStars(m, r.rezultate[0].inainte, 1, 600);
      } catch (err) { alert("Steaua nu s-a putut scrie în Ligă: " + err.message); }
      return;
    }
    save(); renderLB();
  });

  addEventListener("resize", () => { if (G && $("#board")) document.documentElement.style.setProperty("--bs", boardSize() + "px"); });
  addEventListener("storage", e => { if (e.key === Liga.KEY) refreshLiga(); });
  window.__mlv = {get G() { return G; }, get db() { return db; }}; // pentru verificări
  show("start");
})();
