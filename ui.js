/* Mat la viteză – ecranele. Modul „cerc” (cu Liga Stelelor) sau „acasă” (telefon, fără Ligă). */
(function () {
  const {MODES, modeById, opp, legal, applyM, inCheck, cage, hanging, genPosition, defenderMove, F, R, kingSq, cheb, onEdge, goodCorners, mateIn1} = Sah;
  const {fmt, zec, maiBun, sameDay, ranking, starsForAttempt, contestRanking, contestAwards, weeklyProgress, weekStart} = Reguli;
  const {sfx, confetti, stopConfetti, flash, flyStars, GOLD} = Efecte;
  const KEY = "matLaViteza.v1";
  const NAME = {K: "regele", Q: "dama", R: "turnul", B: "nebunul", N: "calul"};
  const GRP = [["grele", "Piese grele"], ["mixt", "Damă + piesă ușoară · regele tău stă în colț 🔒"], ["usoare", "Doar piese ușoare"]];
  const ACTIVE = MODES.filter(m => m.grp !== "experiment").map(m => m.id); // tipurile de mat cu timp și stele
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
  ui.modes = ui.modes.filter(id => ACTIVE.includes(id)); if (!ui.modes.length) ui.modes = ["KR"];
  if (!ACTIVE.includes(ui.cMode)) ui.cMode = "KR";
  if (!ACTIVE.includes(ui.lbMode)) ui.lbMode = "KR";
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
    B: `<path d="M10 38.5h25l-2.5-5h-20z"/><circle cx="22.5" cy="8.3" r="2.9"/>
       <path d="M22.5 11.4c-5.8 4.2-8.8 8.7-8.8 13.2 0 3.6 2 6.3 3.6 8.4h10.4c1.6-2.1 3.6-4.8 3.6-8.4 0-4.5-3-9-8.8-13.2z"/>
       <path d="M25.8 17.2l-5.6 6.6" fill="none" stroke="{IN}" stroke-width="2.2" stroke-linecap="round"/>`,
    N: `<path d="M10.5 38.5h24l-2-5h-20z"/>
       <path d="M14.5 33.5c-.4-5.2 2.2-8.6 6.2-11.8-2.6.9-5.4 1.5-7.6 1-2-.5-3.4-1.9-3.3-3.6.1-1.4 1-2.7 2.3-3.8l6.6-5.8 1-4.2 2.8 2.7c7 .6 12.6 6 12.6 14.6 0 4.3-1 8.3-2.7 10.9z"/>
       <circle cx="18.6" cy="13.6" r="1.3" fill="{IN}" stroke="none"/><path d="M24.6 9.8c4.6 1.6 7.6 6 7.6 12.4" fill="none" stroke="{IN}" stroke-width="1.2"/>`,
  };
  const pieceSVG = (t, c, sz = "88%") => `<svg viewBox="0 0 45 45" width="${sz}" height="${sz}" fill="${c === "w" ? "#fbfbf7" : "#2b2b33"}" stroke="${c === "w" ? "#26262c" : "#0d0d10"}"
    stroke-width="1.6" stroke-linejoin="round">${SHAPE[t].replace(/\{IN\}/g, c === "w" ? "#26262c" : "#c9c9d4")}${c === "b" ? `<path d="M14 35.5h17" stroke="#9a9aa8" stroke-width="1" fill="none"/>` : ""}</svg>`;

  /* iconița tipului de mat: piesele atacantului desenate la fel ca pe tablă */
  const ico = m => `<span class="pic">${m.pieces.map(t => pieceSVG(t, "b", "1.15em")).join("")}</span>`;

  /* ---------- navigare ---------- */
  function renderNav(active) {
    const items = [["start", "🎯 Joacă"], ["lb", "🏆 Clasament"]].concat(MOD === "cerc" ? [["contest", "🏁 Întrecere"]] : []);
    $("#nav").innerHTML = items.map(([id, t]) => `<button data-nav="${id}" class="${id === active ? "on" : ""}">${t}</button>`).join("")
      + `<button data-guide="1" class="ghost">📜 Reguli</button>` + (MOD === "cerc" ? `<button data-qr="1" class="ghost">📱 Acasă</button>` : "");
  }
  /* ---------- ghidul cu regulile și codul QR ---------- */
  function guideHTML() {
    const L = id => modeById(id).label, s = ms => ms / 1000 + " s";
    const cu = n => ACTIVE.filter(id => modeById(id).stele === n).map(L).join(", ");
    const game = `<h3>♟️ Cum se joacă</h3><ul>
      <li>Copilul dă mat regelui advers cu piesele alese prin bife: ${ACTIVE.map(L).join(", ")}.</li>
      <li>🔒 La <b>Damă + Nebun</b> și <b>Damă + Cal</b> regele tău stă într-un colț și nu se mișcă: matul se dă doar cu dama și piesa ușoară.</li>
      <li>La <b>Rege + Nebun + Cal</b> matul se poate da doar în colțul de culoarea nebunului.</li>
      <li>🔬 <b>Experimentul cu 2 cai</b> arată de ce cu doi cai matul nu se poate forța (fără timp și fără stele).</li>
      <li>Poziția e nouă la fiecare încercare, iar culoarea pieselor se schimbă la întâmplare. Calculatorul apără regele.</li>
      <li>Contează <b>timpul</b>; mutările se numără și se afișează.</li>
      <li>Încercarea se termină fără mat la: <b>pat</b> (remiză), <b>o piesă pierdută</b>, <b>aceeași poziție repetată de 3 ori</b> (remiză), <b>50 de mutări</b> fără mat sau <b>renunțare</b>.</li>
      <li><b>💡 Cu indicii:</b> se văd „cușca” regelui, piesa în pericol, mutările posibile, <b>pașii matului</b> și avertismentul de repetare.
        <b>Fără indicii</b> nu se arată nici mutările posibile.</li></ul>`;
    const how = `<h3>🧭 Cum se dă matul (aceiași pași apar în indicii)</h3>
      <p class="note"><b>Damă + Nebun / Damă + Cal, regele în colț 🔒</b></p><ol>${STEPS.Q.map(x => `<li>${x}</li>`).join("")}</ol>
      <p class="note"><b>Rege + Nebun + Cal</b></p><ol>${STEPS.BN.map(x => `<li>${x}</li>`).join("")}</ol>`;
    if (MOD !== "cerc") return `<div class="guide">${game}${how}</div>`;
    return `<div class="guide">${game}${how}
      <h3>⭐ Stelele (doar pentru matul fără indicii și doar pentru copiii din Liga Stelelor)</h3>
      <table><tr><th>Pentru ce</th><th>Stele</th><th>Cât de des</th></tr>
        <tr><td>🏁 Întrecere: locul 1 / 2 / 3</td><td><b>3 / 2 / 1</b></td><td>la fiecare întrecere</td></tr>
        <tr><td>🥇 Primul mat la un tip de mat<br><span class="note">${cu(1)}: <b>+1</b> · ★★ ${cu(2)}: <b>+2</b> · ★★★ ${cu(5)}: <b>+5</b></span></td><td><b>+1</b> / <b>+2</b> / <b>+5</b></td><td>o dată pe tip</td></tr>
        <tr><td>👑 Record nou al grupei la un tip</td><td><b>+1</b></td><td>de fiecare dată</td></tr>
        <tr><td>🎓 Primul mat fără indicii, după ce a exersat cu indicii</td><td><b>+1</b></td><td>o dată pe tip</td></tr>
        <tr><td>🔥 Serie de 5 maturi la rând (fără pat, remiză, piesă pierdută sau renunțare)</td><td><b>+1</b></td><td>la fiecare 5</td></tr>
        <tr><td>⚡ Fulger – matul mai repede decât:<br><span class="note">${ACTIVE.map(id => `${L(id)} &lt; ${s(Reguli.PRAG[id])}`).join(" · ")}</span></td><td><b>+1</b></td><td>o dată pe tip</td></tr>
        <tr><td>📈 Cel mai mare progres al săptămânii (Clasament → butonul „+1”)</td><td><b>+1</b></td><td>o dată pe săptămână, pe grupă</td></tr></table>
      <p class="note">Stelele intră singure în Liga Stelelor, cu motivul „⏱️ Mat la viteză – întrecere” sau „♜ Mat la viteză – realizare” și o notiță (de exemplu „Fulger – Rege + Damă, 0:17.4”).
        Încercările cu indicii apar în clasament cu 💡, dar nu primesc stele. Copiii scriși de mână nu primesc stele.</p>
      <h3>🏁 Întrecerea de duminică</h3><ol>
        <li>„🏁 Întrecere” → alegeți grupa și tipul de mat → „Începe întrecerea”.</li>
        <li>Toți copiii primesc <b>aceleași 3 poziții</b>; calculatorul se apără la fel pentru toți; indiciile sunt oprite.</li>
        <li>Timpul copilului = suma celor 3 poziții. Pat, remiză, piesă pierdută sau renunțare = încercarea nu se clasează.</li>
        <li>Un copil poate încerca din nou dacă permiteți; contează cel mai bun total.</li>
        <li>„⭐ Încheie întrecerea” → podium și 3 – 2 – 1 stele în Ligă.</li></ol>
      <div class="f5box">⚠️ <b>Atenție la F5 înainte să dați stele de mână!</b><br>
        Dacă Liga Stelelor era deschisă în alt tab în timp ce Mat la viteză a dat stele, apăsați întâi <b>F5</b> în tabul Ligii (o reîncărcați).
        Altfel Liga își salvează datele vechi peste cele noi și <b>stelele date de Mat la viteză se pierd</b>.
        Cel mai sigur: închideți Liga cât timp copiii joacă și deschideți-o după aceea.</div>
      <h3>📱 Pentru acasă</h3><p class="note">Copiii se antrenează pe telefon la <b>${esc(window.QR_URL || "")}</b> (fără stele). Butonul „📱 Acasă” arată codul QR mare, de proiectat.</p></div>`;
  }
  /* pașii matului (în ghid și în indicii) */
  const STEPS = {
    Q: ["<b>Strânge cușca cu dama.</b> Pune dama la o săritură de cal de regele advers: acolo nu o poate ataca, iar cușca se micșorează. Așa îl împingi spre margine.",
        "<b>Adu piesa ușoară.</b> Nebunul sau calul trebuie să apere un câmp lipit de regele advers. Regele tău nu te ajută, deci nu lăsa piesele lângă regele advers!",
        "<b>„Sărutul morții”.</b> Dama se lipește de regele advers, pe câmpul apărat de nebun sau cal: regele nu o poate lua – mat. Atenție la pat!"],
    BN: ["<b>Adună piesele în centru</b> și împinge regele advers la margine cu regele, nebunul și calul.",
         "<b>Află colțul bun:</b> matul se dă doar în colțul de culoarea nebunului (cu indicii e colorat cu auriu).",
         "<b>Mută-l spre colțul bun:</b> dacă regele a fugit în colțul greșit, du-l pe margine spre cel bun – calul face un drum în formă de „W”, nebunul îi taie drumul înapoi.",
         "<b>Matul în colțul bun:</b> regele tău stă în fața regelui advers, iar nebunul și calul dau ultimele șahuri. Ai 50 de mutări."],
  };
  function openGuide() {
    modal(`<div class="res wide guideres"><h1 style="color:var(--accent)">📜 Reguli</h1>${guideHTML()}<div class="btns"><button class="pri" data-act="close">Am înțeles</button></div></div>`);
  }
  function openQR() {
    modal(`<div class="res qrres"><h1 style="color:var(--accent)">📱 Antrenează-te acasă!</h1>
      <p>Deschide camera telefonului și îndreapt-o spre cod.<br>Atinge linkul care apare.</p>
      <div class="qr">${window.QR_SVG || ""}</div><p class="qrurl">${esc(window.QR_URL || "")}</p>
      <div class="btns"><button class="pri" data-act="close">Gata</button></div></div>`);
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
  $("#nav").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.guide) return openGuide();
    if (b.dataset.qr) return openQR();
    if (b.dataset.nav) show(b.dataset.nav);
  });
  document.querySelector(".logo").addEventListener("click", openGuide);

  /* ---------- start ---------- */
  function kidCard(s, on, extra = "") {
    return `<button class="kid ${on ? "on" : ""}" data-kid="${s.id}">${extra}<div class="av" style="background:${s.color}33">${s.avatar}</div>
      <div class="nm">${esc(s.name)}</div><div class="st">⭐ ${starsOf(s.id)}</div></button>`;
  }
  /* butoanele cu tipurile de mat, pe grupe; isOn(id), attr = data-mode / data-cm */
  function modeButtons(isOn, attr, radio = false) {
    return `<div class="modes">${GRP.map(([g, t]) => `<div class="mgrp">${t}</div>` + MODES.filter(m => m.grp === g).map(m =>
      `<button class="mode ${radio ? "radio" : ""} ${isOn(m.id) ? "on" : ""}" data-${attr}="${m.id}"><span class="box">✓</span><span class="ic">${ico(m)}</span>
        <span><b>${m.label}</b>${m.stele === 5 ? `<small class="lvl">★★★ cel mai greu</small>` : m.stele > 1 ? `<small class="lvl">★★ mai greu</small>` : ""}</span></button>`).join("")).join("")}</div>`;
  }
  function modesHTML() {
    return `${modeButtons(id => ui.modes.includes(id), "mode")}
      <p class="note" style="margin-top:8px">Dacă bifați mai multe, ele vin la întâmplare. Culoarea pieselor se schimbă singură.</p>
      <button class="switch ${ui.hints ? "on" : ""}" data-act="hints"><span class="tg"></span><span><b>💡 Cu indicii</b><br><span class="note">„cușca” regelui, piesele în pericol și pașii matului${MOD === "cerc" ? " · fără stele" : ""}</span></span></button>
      <button class="expbtn" data-act="exp"><span class="ic">🔬</span><span><b>Experiment: Rege + 2 Cai</b><br><span class="note">De ce cu doi cai matul nu se poate da? Încearcă și vezi! (fără timp și fără stele)</span></span></button>`;
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
    else if (t.dataset.act === "exp") { save(); return startExperiment(1); }
    save(); renderStart();
  });
  $("#start").addEventListener("keydown", e => { if (e.key === "Enter" && e.target.id === "nn") { takeName(); save(); renderStart(); } });

  /* ---------- tabla și jocul ---------- */
  let G = null, timerRaf = null;
  function boardSize() {
    if (innerWidth <= 700) { // telefon: sus timpul, apoi tabla, sub ea indiciile – totul pe un ecran
      const hdr = (document.querySelector("header") || {offsetHeight: 110}).offsetHeight;
      return Math.max(220, Math.min(innerWidth - 40, innerHeight - hdr - 120 - (hintsOn() ? 110 : 20)));
    }
    return Math.max(240, Math.min(innerHeight - 120, innerWidth - 420));
  }
  const hintsOn = () => G && (G.kind === "experiment" || (G.kind === "antrenament" && ui.hints));
  function startPractice() {
    const mode = modeById(ui.modes[Math.random() * ui.modes.length | 0]);
    const {b, A} = genPosition(mode);
    beginBoard({b, A, mode, kind: "antrenament", rng: Math.random});
  }
  /* experimentul cu 2 cai: partea 1 – apărare corectă; partea 2 – regele greșește */
  const EXP2 = {b8: "bK", b6: "wK", e6: "wN", f6: "wN"}; // albul: Cd7+ … Ra8?? Cc7#
  function symPos(spec) { // una din cele 8 simetrii ale tablei (pentru regi și cai nu contează)
    const fx = Math.random() < .5, fy = Math.random() < .5, tr = Math.random() < .5, b = Array(64).fill(null);
    let k = 0;
    for (const [n, v] of Object.entries(spec)) {
      let f = n.charCodeAt(0) - 97, r = n.charCodeAt(1) - 49;
      if (tr) [f, r] = [r, f];
      if (fx) f = 7 - f;
      if (fy) r = 7 - r;
      b[r * 8 + f] = {id: v === "bK" ? "dk" : v === "wK" ? "ak" : "a" + k++, t: v[1], c: v[0]};
    }
    return b;
  }
  function startExperiment(part) {
    const mode = modeById("KNN"), p = ui.player || {pid: "exp", name: "Cercetător", color: "#6c4cff", group: null};
    const pos = part === 1 ? genPosition(mode) : {b: symPos(EXP2), A: "w"};
    beginBoard({b: pos.b, A: pos.A, mode, kind: "experiment", part, rng: Math.random, player: Object.assign({}, p, {avatar: "🔬"})});
  }
  function beginBoard(o) {
    stopConfetti(); document.querySelectorAll(".modal").forEach(m => m.remove());
    G = Object.assign(o, {D: opp(o.A), moves: 0, sel: null, last: null, over: true, busy: false, t0: 0, hintsUsed: o.kind === "antrenament" && ui.hints, seen: new Map()});
    notePos(G.b, G.A);
    show("game");
    const p = G.player || ui.player, m = G.mode;
    const exp = G.kind === "experiment";
    const steps = G.kind === "intrecere"
      ? `<div class="steps">${[0, 1, 2].map(i => `<span class="${i < G.run.idx ? "ok" : i === G.run.idx ? "on" : ""}">${i < G.run.idx ? "✓ " + fmt(G.run.times[i]) : "Poziția " + (i + 1)}</span>`).join("")}</div>`
      : exp ? `<div class="steps"><span class="${G.part === 1 ? "on" : "ok"}">🔬 Partea 1: apărare corectă</span><span class="${G.part === 2 ? "on" : ""}">Partea 2: regele greșește</span></div>` : "";
    $("#game").innerHTML = `<div class="game">
      <div class="boardwrap"><div class="board" id="board"></div></div>
      <div class="side">
        <div class="card player"><div class="av" style="background:${p.color}33">${p.avatar}</div><div><b>${esc(p.name)}</b><span>${ico(m)} ${m.label}${G.kind === "intrecere" ? " · 🏁 întrecere" : ""}</span></div></div>
        ${steps}
        <div class="color ${G.A}">${G.A === "w" ? "⚪ Joci cu ALBELE" : "⚫ Joci cu NEGRELE"}</div>
        <div class="card tcard"><div class="timer" id="timer">0:00.0</div>
          <div class="stats" style="margin-top:10px"><div><b id="mv">0</b><span>mutări${m.id === "KBN" ? " din 50" : exp ? ` din ${G.part === 1 ? 20 : 30}` : ""}</span></div><div><b id="best">–</b><span>${G.kind === "intrecere" ? "timp total" : exp ? "experiment" : "recordul tău"}</span></div></div>
          <div class="rec" id="rec" style="margin-top:8px"></div></div>
        <div class="hintbox" id="hint"></div>
        ${G.kind === "antrenament" ? `<button class="switch ${ui.hints ? "on" : ""}" data-act="hints"><span class="tg"></span><b>💡 Indicii</b></button>` : ""}
        <button class="giveup" data-act="giveup">${exp ? (G.part === 1 ? "🤔 M-am convins!" : "🏳️ Gata") : "🏳️ Renunț la poziție"}</button>
      </div></div>`;
    if (G.kind === "intrecere") $("#best").textContent = fmt(G.run.times.reduce((a, x) => a + x, 0));
    else if (exp) { $("#best").textContent = "🔬"; $("#rec").textContent = "Aici nu contează timpul – urmărește ce face regele."; }
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
  /* regula repetării: aceeași poziție (cu același jucător la mutare) de 3 ori = remiză */
  function notePos(b, side) { const k = Sah.posKey(b, side); G.seen.set(k, (G.seen.get(k) || 0) + 1); return G.seen.get(k); }
  const seenCount = (b, side) => G.seen.get(Sah.posKey(b, side)) || 0;
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
    const hints = hintsOn() && !G.over;
    // fără indicii nu se arată mutările posibile
    const targets = hints && G.sel != null ? legal(b, G.A).filter(m => m.from === G.sel) : [];
    const cg = hints ? cage(b, G.D) : new Set();
    const hang = hints ? hanging(b, G.A) : [];
    // mutările care ar repeta a treia oară o poziție (remiză)
    const repMove = m => seenCount(applyM(b, m), G.D) >= 2;
    const repNow = hints && (seenCount(b, G.A) >= 2 || legal(b, G.A).some(repMove));
    const gc = hints && G.mode.id === "KBN" ? goodCorners(b, G.A) : [];
    bd.querySelectorAll(".sq").forEach(el => {
      const s = +el.dataset.s, t = targets.find(m => m.to === s);
      el.classList.toggle("sel", s === G.sel);
      el.classList.toggle("tgt", !!t);
      el.classList.toggle("capt", !!(t && t.cap));
      el.classList.toggle("rep", !!(t && repMove(t)));
      el.classList.toggle("last", !!G.last && (G.last.from === s || G.last.to === s));
      el.classList.toggle("cage", cg.has(s) && !b[s]);
      el.classList.toggle("goodc", gc.includes(s));
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
      el.classList.toggle("fix", !!p.fix);
    });
    bd.querySelectorAll(".pc").forEach(el => { if (!alive.has(el.dataset.id) && !el.classList.contains("boom")) el.remove(); });
    $("#mv").textContent = G.moves;
    const hb = $("#hint");
    if (hints) {
      hb.classList.add("on");
      const st = stepHTML(b);
      hb.innerHTML = `Cușca regelui: <span class="big">${cg.size}</span> ${cg.size === 1 ? "câmp" : "câmpuri"}.${st ? "" : " Micșoreaz-o pas cu pas!"}` + st
        + (hang.length ? `<br><span style="color:var(--bad)">⚠️ Atenție! ${NAME[b[hang[0]].t]} poate fi luat de rege!</span>` : "")
        + (repNow ? `<div class="repwarn">🔁 <b>Atenție, repetare!</b> Te învârți pe loc – aceeași poziție a apărut deja de 2 ori.
            Dacă se repetă încă o dată, partida se termină <b>remiză</b> și jocul se oprește. Caută o mutare nouă!
            <small>Mutările care repetă poziția au cercul portocaliu.</small></div>` : "");
    } else hb.classList.remove("on");
  }
  /* pasul matului potrivit poziției de pe tablă */
  function stepHTML(b) {
    const id = G.mode.id, dk = kingSq(b, G.D), box = (n, tot, t) => `<div class="stepbox"><span class="stepn">Pasul ${n}/${tot}</span> ${t}</div>`;
    if (G.kind === "experiment") {
      if (G.part === 1) return `<div class="stepbox">🔬 Încearcă să închizi regele în colț și să-i dai mat cu cei doi cai. Calculatorul se apără corect.${G.moves >= 10 ? " <b>Merge? Dacă te-ai convins, apasă „M-am convins!”.</b>" : ""}</div>`;
      return `<div class="stepbox">🔬 Acum regele <b>greșește</b>: se duce singur spre colț. ${mateIn1(b, G.A) ? "<b>Ai mat dintr-o mutare – găsește-l!</b>" : "Dă-i șah cu un cal când e lângă colț!"}</div>`;
    }
    if (G.mode.fix) {
      if (mateIn1(b, G.A)) return box(3, 3, STEPS.Q[2] + " <b>Matul e gata – găsește-l!</b>");
      return onEdge(dk) ? box(2, 3, STEPS.Q[1]) : box(1, 3, STEPS.Q[0]);
    }
    if (id === "KBN") {
      const d = Math.min(...goodCorners(b, G.A).map(c => cheb(dk, c)));
      if (!onEdge(dk)) return box(1, 4, STEPS.BN[0] + " " + STEPS.BN[1]);
      return d >= 3 ? box(3, 4, STEPS.BN[2]) : box(4, 4, STEPS.BN[3]);
    }
    return "";
  }
  $("#game").addEventListener("click", e => {
    const t = e.target.closest("button");
    if (t && t.dataset.act === "hints") {
      ui.hints = !ui.hints; if (ui.hints) G.hintsUsed = true; t.classList.toggle("on", ui.hints); save();
      document.documentElement.style.setProperty("--bs", boardSize() + "px"); return render();
    }
    if (t && t.dataset.act === "giveup") { if (G && !G.over) finish(G.kind === "experiment" && G.part === 1 ? "convins" : "renunt"); return; }
    const sq = e.target.closest(".sq"); if (!sq || !G || G.over || G.busy) return;
    const s = +sq.dataset.s, p = G.b[s];
    if (G.sel != null) { const m = legal(G.b, G.A).find(m => m.from === G.sel && m.to === s); if (m) return playerMove(m); }
    G.sel = p && p.c === G.A && !p.fix ? (G.sel === s ? null : s) : null;
    render();
  });
  function playerMove(m) {
    G.b = applyM(G.b, m); G.moves++; G.last = m; G.sel = null;
    const rep = notePos(G.b, G.D);
    sfx.move(); render();
    const dm = legal(G.b, G.D);
    if (dm.length === 0) return finish(inCheck(G.b, G.D) ? "mat" : "pat");
    if (rep >= 3) return finish("repetare");
    if (inCheck(G.b, G.D)) sfx.check();
    if (G.kind === "experiment" && G.moves >= (G.part === 1 ? 20 : 30)) return finish(G.part === 1 ? "convins" : "limita");
    if (G.moves >= 50) return finish("limita");
    G.busy = true;
    const game = G;
    setTimeout(() => {
      if (G !== game || G.over) return;
      const t1 = performance.now();
      const d = defenderMove(G.b, G.D, G.rng, {ajuta: G.kind === "experiment" && G.part === 2});
      G.t0 += performance.now() - t1; // cât „se gândește” regele nu intră în timpul copilului
      const capEl = d.cap ? $(`.pc[data-id="${d.cap.id}"]`) : null;
      G.b = applyM(G.b, d); G.last = d; G.busy = false;
      if (capEl) { capEl.classList.add("boom"); setTimeout(() => capEl.remove(), 950); }
      const rep = notePos(G.b, G.A);
      sfx.move(); render();
      if (d.cap) finish("pierdut", d.cap);
      else if (rep >= 3) finish("repetare");
    }, 450);
  }

  /* ---------- rezultate ---------- */
  const practice = () => db.attempts.filter(a => a.kind !== "intrecere");
  function bestClean(mode, f) { return practice().filter(a => a.mode === mode && a.ok && !a.hints && f(a)).sort(maiBun)[0] || null; }
  function recordFor(mode, group) { return bestClean(mode, a => MOD !== "cerc" || a.group === group); }
  const numsHTML = (ms, moves, lblT = "timp") => `<div class="nums"><div><b>${fmt(ms)}</b>${lblT}</div><div><b>${moves}</b>mutări</div></div>`;

  function finish(result, cap) {
    G.over = true; cancelAnimationFrame(timerRaf);
    const ms = Math.round(performance.now() - G.t0);
    $("#timer").textContent = fmt(ms);
    render();
    const bd = $("#board");
    if (result === "mat") { const k = $(`.pc[data-id="dk"]`); k && k.classList.add("mated"); sfx.mate(); confetti(G.kind === "intrecere" ? 90 : 160); }
    if (result === "pat" || result === "repetare") { sfx.pat(); flash("grey"); bd.classList.add("pat", "shake"); }
    if (result === "pierdut") { sfx.boom(); flash("red"); bd.classList.add("shake"); }
    if (G.kind === "intrecere") return finishContestPosition(result, ms, cap);
    if (G.kind === "experiment") return finishExperiment(result);

    const p = ui.player, prior = practice();
    const prevRec = recordFor(G.mode.id, p.group), prevPB = bestClean(G.mode.id, a => a.pid === p.pid);
    const att = {id: uid(), pid: p.pid, sid: p.sid, name: p.name, avatar: p.avatar, color: p.color, group: p.group, mode: G.mode.id,
      ok: result === "mat", result, ms, moves: G.moves, hints: G.hintsUsed, ts: Date.now(), kind: "antrenament"};
    db.attempts.push(att); save();
    const btns = `<div class="btns"><button class="pri" data-act="again">🔁 Poziție nouă</button>${MOD === "cerc" ? `<button data-act="other">👤 Alt copil</button>` : ""}<button data-act="lb">🏆 Clasament</button></div>`;
    if (result !== "mat") return failModal(result, cap, numsHTML(ms, G.moves), btns, 900);

    let ribbon = "", crown = "";
    if (!att.hints && (!prevRec || zec(ms) < zec(prevRec.ms))) {
      crown = `<div class="crown">👑</div>`;
      ribbon = !prevRec ? `<div class="ribbon">👑 PRIMUL RECORD!<small>${G.mode.label}${MOD === "cerc" ? " · " + esc(groupName(p.group) || "") : ""}</small></div>`
        : prevRec.pid === p.pid ? `<div class="ribbon">👑 RECORD NOU!<small>Ți-ai bătut propriul record (${fmt(prevRec.ms)})</small></div>`
        : `<div class="ribbon">👑 RECORD NOU!<small>L-ai întrecut pe ${esc(prevRec.name)} ${prevRec.avatar} (${fmt(prevRec.ms)})</small></div>`;
      setTimeout(() => { sfx.record(); flash("gold"); confetti(220, GOLD); }, 700);
    } else if (!att.hints && prevRec && zec(ms) === zec(prevRec.ms)) {
      ribbon = prevRec.pid === p.pid ? `<div class="ribbon pb">🤝 Ai egalat recordul!<small>Același timp ca înainte: ${fmt(prevRec.ms)}</small></div>`
        : `<div class="ribbon pb">🤝 Ai egalat recordul${MOD === "cerc" ? " grupei" : ""}!<small>Recordul rămâne al lui ${esc(prevRec.name)} ${prevRec.avatar}, care l-a făcut primul</small></div>`;
    } else if (!att.hints && prevPB && zec(ms) < zec(prevPB.ms)) ribbon = `<div class="ribbon pb">⭐ Record personal!<small>Înainte: ${fmt(prevPB.ms)}</small></div>`;
    else if (!att.hints && prevPB && zec(ms) === zec(prevPB.ms)) ribbon = `<div class="ribbon pb">🤝 Ți-ai egalat recordul personal<small>${fmt(prevPB.ms)}</small></div>`;

    let starsHTML = "", star = null;
    if (MOD === "cerc") {
      const awards = starsForAttempt(att, prior);
      att.fulger = awards.some(a => a.tip === "fulger"); save();
      if (awards.length) {
        try {
          const r = Liga.scrieStele(localStorage, awards.map(({tip, ...a}) => a)); liga = r.state; star = {awards, res: r.rezultate[0]};
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
  /* ---------- experimentul cu 2 cai ---------- */
  /* diagramă mică: câmpuri egale (poziționate ca pe tabla mare) și coordonatele a–h, 1–8 */
  function miniBoard(spec, marks = {}) {
    let h = "";
    for (let r = 7; r >= 0; r--) for (let f = 0; f < 8; f++) {
      const n = "abcdefgh"[f] + (r + 1), v = spec[n], mk = marks[n];
      h += `<div class="msq ${(f + r) % 2 ? "l" : "d"} ${mk || ""}${v ? "" : " solo"}" style="left:${f * 12.5}%;top:${(7 - r) * 12.5}%">${v ? pieceSVG(v[1], v[0]) : ""}${mk === "ok" ? "<i>✅</i>" : mk === "bad" ? "<i>❌</i>" : ""}</div>`;
    }
    return `<div class="minib"><div class="mranks">${[8, 7, 6, 5, 4, 3, 2, 1].map(n => `<span>${n}</span>`).join("")}</div>
      <div class="mini">${h}</div><span></span><div class="mfiles">${[..."abcdefgh"].map(c => `<span>${c}</span>`).join("")}</div></div>`;
  }
  function expHTML() {
    return `<div class="diag"><div>${miniBoard({a8: "bK", c7: "wK", c6: "wN", d5: "wN"}, {a8: "pat"})}
        <p><b>1. Închis de tot = PAT.</b> Negrul e la mutare: regele din a8 nu are niciun câmp liber, dar nu e în șah. Este <b>pat</b>, remiză – nu mai apuci să dai șah cu calul.</p></div>
      <div>${miniBoard({b8: "bK", b6: "wK", d7: "wN", e6: "wN"}, {a8: "bad", c8: "ok"})}
        <p><b>2. Mat doar dacă regele greșește.</b> Calul a dat șah din d7. Dacă regele merge în <b>a8 ❌</b>, Cc7 e mat. Dar regele poate merge în <b>c8 ✅</b> și scapă. Un apărător atent alege mereu c8.</p></div></div>
      <p class="concl">De aceea, <b>cu doi cai matul nu se poate forța</b>: regele scapă de fiecare dată, dacă nu greșește.</p>`;
  }
  function finishExperiment(result) {

    const again = `<div class="btns">${G.part === 1 ? `<button class="pri" data-act="exp2">▶ Partea 2: regele greșește</button>` : `<button class="pri" data-act="exp2">🔁 Încă o dată</button>`}<button data-act="other">🎯 Înapoi la maturi</button></div>`;
    const why = {pat: "A ieșit <b>pat</b> – exact capcana cu doi cai!", repetare: "Poziția s-a repetat de 3 ori – regele se tot învârte și scapă.",
      pierdut: "Regele a luat un cal – acum matul nu mai e posibil deloc.", limita: "Ai făcut 30 de mutări – regele nu a mai greșit."}[result] || "";
    let html;
    if (G.part === 1) html = result === "mat"
      ? `<div class="res wide mat"><div class="em">😲</div><h1>Mat?!</h1><p>Ai găsit o poziție foarte rară în care regele nu mai avea scăpare. De obicei, cu doi cai regele scapă mereu:</p>${expHTML()}${again}</div>`
      : `<div class="res wide"><div class="em">🔬</div><h1 style="color:var(--accent)">Ce s-a întâmplat?</h1>${why ? `<p>${why}</p>` : ""}${expHTML()}${again}</div>`;
    else html = result === "mat"
      ? `<div class="res wide mat"><div class="em">🎉</div><h1>MAT!</h1><p>Bravo! Dar matul a ieșit <b>doar pentru că regele a greșit</b> și a intrat singur în colț.<br>Un apărător atent ar fi scăpat – de aceea, cu doi cai, matul nu se poate forța.</p>${again}</div>`
      : `<div class="res wide"><div class="em">🔬</div><h1 style="color:var(--accent)">Regele a scăpat</h1>${why ? `<p>${why}</p>` : ""}${expHTML()}${again}</div>`;
    setTimeout(() => modal(html), result === "mat" ? 900 : 500);
  }
  function animateStars(m, from, n, delay) {
    const av = m.querySelector("#sav"), tot = m.querySelector("#stot"); if (!av) return;
    flyStars(av, n, j => { tot.innerHTML = `⭐ ${from + j + 1} <span class="plus">+${j + 1}</span>`; }, delay);
  }
  function failModal(result, cap, nums, btns, delay, extra = "") {
    const html = result === "pat"
      ? `<div class="res pat"><div class="zzz">💤</div><div class="em">😮</div><h1>PAT!</h1>
         <p>Regele nu mai are mutări, dar nu este în șah.<br>Este remiză – matul s-a pierdut.<br><b>Lasă-i regelui un câmp liber!</b></p>${extra}${nums}${btns}</div>`
      : result === "repetare"
      ? `<div class="res pat"><div class="zzz">🔁</div><div class="em">🤝</div><h1>REMIZĂ!</h1>
         <p>Aceeași poziție s-a repetat de 3 ori.<br>După regulile șahului, partida se termină remiză – matul s-a pierdut.<br><b>Nu te învârți pe loc: strânge cușca regelui!</b></p>${extra}${nums}${btns}</div>`
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
      if (act === "exp2") return startExperiment(2);
      if (act === "next") return beginContestPosition(G.run, G.run.idx + 1);
      if (act === "backup") return;
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
        ${modeButtons(id => ui.cMode === id, "cm", true)}
        <button class="go" data-act="newc">🏁 Începe întrecerea</button></div>
        ${last ? `<div class="card"><h2>Ultima întrecere</h2><p class="note">${new Date(last.ts).toLocaleDateString("ro-RO")} · ${esc(groupName(last.group))} · ${modeById(last.mode).label}</p>${contestTable(last)}</div>` : ""}</div>`;
      return;
    }
    const done = new Map(); contestRanking(C).forEach(e => done.set(e.pid, e));
    $("#contest").innerHTML = `<div class="wrap">
      <div class="card"><div class="lbtop"><h2 style="margin:0">🏁 Întrecere: ${ico(modeById(C.mode))} ${modeById(C.mode).label} · ${esc(groupName(C.group))}</h2></div>
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
    try { const r = Liga.scrieStele(localStorage, awards.map(({tip, ...a}) => a)); liga = r.state; res = r.rezultate; } catch (e) { err = e.message; }
    C.open = false; save();
    const order = [1, 0, 2].filter(i => rk[i]);
    const m = modal(`<div class="res wide"><h1 style="color:var(--gold)">⭐ Premierea ⭐</h1>
      <p>${ico(modeById(C.mode))} ${modeById(C.mode).label} · ${esc(groupName(C.group))} · ${new Date().toLocaleDateString("ro-RO")}</p>
      <div class="podium">${order.map(i => { const e = rk[i], r = res.find(x => x.sid === e.sid); return `<div class="pod p${i + 1}">
        <div class="av" style="background:${e.color}33;animation-delay:${.9 + (2 - i) * .2}s" id="pav${i}">${e.avatar}</div>
        <div class="nm">${esc(e.name)}</div><div class="tm">${fmt(e.total)} · ${e.moves.reduce((a, x) => a + x, 0)} mutări</div>
        <div class="tot" id="ptot${i}">${r ? "⭐ " + r.inainte : `<span class="note">nu e în Ligă</span>`}</div>
        <div class="blk" style="animation-delay:${(2 - i) * .2}s">${i + 1}</div></div>`; }).join("")}</div>
      ${err ? `<p class="warn">Stelele nu s-au putut scrie în Ligă: ${esc(err)}</p>` : awards.length ? `<p class="note f5">Stelele au intrat în Liga Stelelor („⏱️ Mat la viteză – întrecere”). Dacă Liga e deschisă în alt tab, apăsați F5 în ea.</p>` : ""}
      ${backupHTML(true)}
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
      <div class="tabs">${ACTIVE.map(modeById).map(m => `<button data-lbm="${m.id}" class="${ui.lbMode === m.id ? "on" : ""}">${ico(m)} ${m.label}</button>`).join("")}</div>
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
    /* păstrarea datelor: doar la cerc (cu Liga Stelelor), nu și pe site/telefon */
    if (MOD === "cerc") html += `<div class="card"><h2>💾 Păstrarea rezultatelor</h2>
      <p class="note">Copia de rezervă din Liga Stelelor (⚙️ Setări → 💾 Date) păstrează acum și rezultatele de aici: toate încercările, timpii, recordurile și întrecerile. Puteți salva aceeași copie și de aici.</p>${backupHTML(false)}
      <div class="lbtop" style="margin:12px 0 0"><span class="note" style="margin:0">Tabel cu recordurile fiecărui copil și rezultatele întrecerilor, de deschis în Excel.</span><span class="sp"></span>
        <button class="small" data-act="csv">📊 Recordurile în Excel</button></div></div>`;
    $("#lb").innerHTML = html + "</div>";
  }
  $("#lb").addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t || t.dataset.act === "backup" || t.dataset.act === "csv") return; // le tratează document
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

  /* ---------- copia de rezervă (aceeași ca în Liga) și tabelul pentru Excel ---------- */
  const cate = (n, unu, multe) => n === 1 ? `1 ${unu}` : `${n}${n % 100 >= 20 || (n && n % 100 === 0) ? " de" : ""} ${multe}`;
  function backupHTML(compact) {
    const n = Copie.noi(localStorage), la = n.la ? `${Copie.zi(n.la)}, ${Copie.ora(n.la)}` : "";
    if (!n.rezultate && !n.stele) return compact ? "" : `<p class="note">✅ Copia de rezervă e la zi (ultima: ${la || "—"}).</p>`;
    const ce = [n.rezultate ? cate(n.rezultate, "rezultat nou", "rezultate noi") + " la Mat la viteză" : "", n.stele ? cate(n.stele, "înregistrare nouă", "înregistrări noi") + " în Ligă" : ""].filter(Boolean).join(" și ");
    return `<div class="bkp"><span>💾 ${la ? `De la ultima copie de rezervă (${la}): <b>${ce}</b>.` : `Încă nu este o copie de rezervă cu rezultatele de la Mat la viteză.`} Nu uitați s-o salvați!</span>
      <button class="small" data-act="backup">💾 Salvează copia acum</button></div>`;
  }
  function saveBackup(btn) {
    const c = Copie.faCopie(localStorage);
    if (!c) return alert("Nu am găsit datele Ligii Stelelor în acest browser.");
    Copie.descarca(c.nume, c.text, "application/json");
    const box = btn && btn.closest(".bkp");
    if (box) box.outerHTML = `<p class="note ok">✅ Copia „${c.nume}” (stelele + ${cate(c.rezultate, "rezultat", "rezultate")} la Mat la viteză) e în Descărcări. Păstrați-o pe stick sau în Google Drive.</p>`;
  }
  document.addEventListener("click", e => {
    const t = e.target.closest("button"); if (!t) return;
    if (t.dataset.act === "backup") saveBackup(t);
    if (t.dataset.act === "csv") Copie.descarca(`mat-la-viteza-recorduri-${Copie.ziIso(Date.now())}.csv`, Copie.csv(db, liga), "text/csv;charset=utf-8");
  });
  /* la închiderea paginii: browserul întreabă dacă sunt rezultate fără copie de rezervă */
  addEventListener("beforeunload", e => {
    if (MOD !== "cerc") return;
    const n = Copie.noi(localStorage);
    if (n.rezultate) { e.preventDefault(); e.returnValue = ""; }
  });

  addEventListener("resize", () => { if (G && $("#board")) document.documentElement.style.setProperty("--bs", boardSize() + "px"); });
  addEventListener("storage", e => {
    if (e.key === Liga.KEY) refreshLiga();
    if (e.key === KEY && e.newValue) { // copia încărcată în Liga sau alt tab cu Mat la viteză: recitim rezultatele
      try { const s = JSON.parse(e.newValue); if (s && s.attempts) db = Object.assign({attempts: [], contests: [], awardsLog: []}, s); } catch (err) {}
    }
    if ((e.key === KEY || e.key === Copie.KEYS.copieLa) && $("#lb").classList.contains("on")) renderLB();
  });
  window.__mlv = {get G() { return G; }, get db() { return db; }}; // pentru verificări
  show("start");
})();
