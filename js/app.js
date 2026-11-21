/* Maktadmin — ilova mantig'i (prototip v2) */
(function () {
  const D = window.MA;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  // ── Sana yordamchilari ──
  const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"];
  const WEEKDAYS = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
  const SHORT = ["Ya", "Du", "Se", "Ch", "Pa", "Ju", "Sh"];
  const fmtDate = (d) => (d ? d.getDate() + "-" + MONTHS[d.getMonth()] : "—");
  const fmtFull = (d) => (d ? fmtDate(d) + " " + d.getFullYear() : "—");
  const isoDate = (d) => (d ? d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") : "");
  const parseDate = (v) => { if (!v) return null; if (v instanceof Date) return v; if (/^\d{4}-\d{2}-\d{2}T/.test(String(v))) { const t = new Date(v); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); } const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return new Date(+m[1], +m[2] - 1, +m[3]); const m2 = String(v).match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/); if (m2) return new Date(+m2[3], +m2[2] - 1, +m2[1]); const d = new Date(v); return isNaN(d) ? null : d; };
  const dayDiff = (d) => Math.round((d - D.today) / 86400000);
  const relDay = (d) => { const n = dayDiff(d); return n === 0 ? "Bugun" : n === 1 ? "Ertaga" : n === -1 ? "Kecha" : n < 0 ? Math.abs(n) + " kun oldin" : fmtDate(d); };
  const age = (b) => { if (!b) return "—"; let a = D.today.getFullYear() - b.getFullYear(); const m = D.today.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && D.today.getDate() < b.getDate())) a--; return a; };
  const isBirthday = (b) => b && b.getMonth() === D.today.getMonth() && b.getDate() === D.today.getDate();

  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  };
  const sess = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} },
  };

  // ── Saqlash (brauzer xotirasi) ──
  const DATA_KEY = "ma-data-v2";
  const DATE_KEYS = ["birth", "date", "due"];
  const COLLECTIONS = ["students", "clubs", "tasks", "events", "psychNotes"];
  function revive(obj) {
    if (Array.isArray(obj)) return obj.map(revive);
    if (obj && typeof obj === "object") { for (const k in obj) { if (DATE_KEYS.includes(k) && obj[k]) obj[k] = parseDate(obj[k]); else if (typeof obj[k] === "object") obj[k] = revive(obj[k]); } }
    return obj;
  }
  function snapshot() { const o = { v: 2, school: D.school }; COLLECTIONS.forEach((k) => (o[k] = D[k])); return o; }
  function applySnapshot(o) { if (o.school) D.school = o.school; COLLECTIONS.forEach((k) => { if (Array.isArray(o[k])) D[k] = revive(o[k]); }); }
  function save() { if (!store.set(DATA_KEY, JSON.stringify(snapshot()))) toast("Saqlab bo'lmadi — brauzer xotirasi yopiq"); }
  (function load() { const raw = store.get(DATA_KEY); if (!raw) return; try { applySnapshot(JSON.parse(raw)); } catch (e) { console.warn("Saqlangan ma'lumot o'qilmadi", e); } })();

  // ── Holat ──
  let views = {}; try { views = JSON.parse(store.get("ma-views") || "{}"); } catch (e) {}
  const state = { userId: sess.get("ma-user"), page: "bugun", q: "", sinf: "all", filter: "all", riskTab: "open", clubType: "all", openStudent: null, loginPick: "u1" };
  const user = () => D.users.find((u) => u.id === state.userId);
  const role = () => D.roles[user().role];
  const canSee = (page) => { if (page === "bolimlar") return true; const p = role().pages; return p === "*" || p.includes(page); };
  const canEdit = () => user().role !== "direktor";
  const myStudents = () => (role().scope === "sinf" ? D.students.filter((s) => s.sinf === user().sinf) : D.students);
  const clubById = (id) => D.clubs.find((c) => c.id === id);
  const stuById = (id) => D.students.find((s) => s.id === id);
  const fullName = (s) => s.first + " " + s.last;
  const initials = (name) => name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const allClasses = () => [...new Set(D.students.map((s) => s.sinf))].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
  const view = (key, def) => views[key] || def || "list";

  // ── Xavf signallari ──
  const INTEREST_CLUB = { Dasturlash: "c7", Robototexnika: "c1", "Ingliz tili": "c3", Sport: "c4", Rassomlik: "c8", Jurnalistika: "c5", Notiqlik: "c6", Matematika: "c2" };
  function risks(s) {
    const r = [];
    if (!s.clubs.length) r.push({ k: "club", t: "Hech qaysi to'garakka qatnashmaydi" });
    if (s.attendance != null && s.attendance < 85) r.push({ k: "att", t: "Davomat past: " + s.attendance + "%" });
    if (s.tests && s.tests.length >= 2) { const f = s.tests[0], l = s.tests[s.tests.length - 1]; if (f - l >= 12) r.push({ k: "test", t: "Test natijasi pasaymoqda: " + f + " → " + l }); }
    if (s.psychFlag && role().psych) r.push({ k: "psy", t: "Psixolog kuzatuvida" });
    return r;
  }
  function advice(s, r) {
    return r.map((x) => {
      if (x.k === "club") { const c = (s.interests || []).map((i) => INTEREST_CLUB[i]).filter(Boolean).map(clubById).filter(Boolean)[0]; return c ? "Qiziqishiga mos to'garak taklif qiling: «" + c.name + "»" : "Qiziqishlarini aniqlash uchun suhbat o'tkazing"; }
      if (x.k === "att") return "Sinf rahbari orqali ota-ona bilan bog'laning";
      if (x.k === "test") return "Fan o'qituvchisi bilan qo'shimcha dars rejasini tuzing";
      return "Psixolog bilan navbatdagi uchrashuvni belgilang";
    });
  }
  function levelBadge(n) {
    if (n >= 3) return '<span class="badge crit">' + icon("alert") + "Yuqori xavf</span>";
    if (n === 2) return '<span class="badge warn">' + icon("alert") + "O'rta xavf</span>";
    if (n === 1) return '<span class="badge neutral">Kuzatuvda</span>';
    return '<span class="badge good">' + icon("shield") + "Yaxshi</span>";
  }
  const riskList = () => myStudents().map((s) => ({ s, r: risks(s) })).filter((x) => x.r.length >= 2).sort((a, b) => b.r.length - a.r.length);

  // ── Menyu va bo'limlar ──
  const NAV = [
    { title: "Asosiy", items: [["bugun", "Bugun", "home"], ["bolimlar", "Barcha bo'limlar", "apps"]] },
    { title: "O'quvchilar", items: [["oquvchilar", "O'quvchilar", "users"], ["xavf", "Xavf guruhi", "alert"], ["psixolog", "Psixolog", "heart"]] },
    { title: "To'garaklar", items: [["togaraklar", "To'garak va klublar", "grid"], ["jadval", "Haftalik jadval", "calendar"]] },
    { title: "Natijalar", items: [["yutuqlar", "Yutuqlar", "trophy"], ["testlar", "Testlar", "test"]] },
    { title: "Yo'naltirish", items: [["kasb", "Kasb va OTM", "compass"], ["sorovnoma", "So'rovnomalar", "survey"]] },
    { title: "Ish yuritish", items: [["ishreja", "Ish reja", "check"], ["kengash", "Kengash saylovi", "vote"], ["hisobot", "Hisobotlar", "report"], ["hujjatlar", "Hujjatlar", "folder"], ["maosh", "Maosh", "wallet"], ["sozlamalar", "Sozlamalar", "settings"]] },
  ];
  const READY = ["bugun", "bolimlar", "oquvchilar", "xavf", "psixolog", "togaraklar", "jadval", "yutuqlar", "ishreja", "sozlamalar"];
  const DESC = {
    bugun: "Kunlik vazifalar, tadbirlar va diqqat talab qiladigan holatlar",
    oquvchilar: "O'quvchilar bazasi, Excel'dan import, profil va portfolio",
    xavf: "Yordamga muhtoj o'quvchilarni avtomatik aniqlash va tavsiyalar",
    psixolog: "Maxfiy qaydlar va uchrashuvlar tarixi",
    togaraklar: "Maktab klublari, tarmoq to'garaklari, Kelajak.uzedu va a'zolar",
    jadval: "Barcha mashg'ulotlar haftalik ko'rinishda",
    yutuqlar: "Olimpiada, tanlov, musobaqa va sertifikat natijalari",
    testlar: "Haftalik va mock testlar, reyting, o'sish grafiklari",
    kasb: "Kasbga yo'naltirish dasturi va bitiruvchilarning rejalari",
    sorovnoma: "Qiziqish, qobiliyat va tashkilotchilik so'rovnomalari",
    ishreja: "Vazifalar, muddatlar va eslatmalar",
    kengash: "O'quvchilar Kengashi nomzodlari, saylov va hujjatlar",
    hisobot: "Oylik, choraklik va yillik hisobotlar bir tugma bilan",
    hujjatlar: "Papkalar, fayllar va normativ hujjatlar",
    maosh: "Maslahatchi, to'garak rahbari va mukofot puli hisob-kitobi",
    sozlamalar: "Maktab ma'lumotlari, zaxira nusxa va tiklash",
  };
  const COUNT = {
    oquvchilar: () => myStudents().length + " nafar",
    xavf: () => riskList().filter((x) => !x.s.risksHandled).length + " ta ochiq",
    psixolog: () => D.psychNotes.length + " ta qayd",
    togaraklar: () => D.clubs.length + " ta",
    jadval: () => D.clubs.reduce((a, c) => a + c.days.length, 0) + " ta mashg'ulot",
    yutuqlar: () => myStudents().reduce((a, s) => a + s.achievements.length, 0) + " ta",
    ishreja: () => D.tasks.filter((t) => !t.done).length + " ta ochiq",
  };
  const navItem = (id) => { for (const g of NAV) for (const i of g.items) if (i[0] === id) return i; return null; };

  // ═════════════ UMUMIY KOMPONENTLAR ═════════════
  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function viewToggle(key, def) {
    const v = view(key, def);
    return `<div class="view-toggle" role="group" aria-label="Ko'rinish">
      <button data-view="${key}:list" class="${v === "list" ? "on" : ""}" title="Ro'yxat ko'rinishi" aria-label="Ro'yxat">${icon("list")}</button>
      <button data-view="${key}:cards" class="${v === "cards" ? "on" : ""}" title="Kartochka ko'rinishi" aria-label="Kartochka">${icon("grid")}</button></div>`;
  }
  function confirmBox(text, onYes) {
    modal({ title: "Tasdiqlash", body: `<div>${text}</div>`, foot: `<button class="btn" data-close>Bekor qilish</button><button class="btn primary" id="yesBtn" style="background:var(--crit);border-color:var(--crit);color:#fff">${icon("trash")}O'chirish</button>`,
      bind: (m, close) => { $("#yesBtn", m).onclick = () => { close(); onYes(); }; } });
  }
  function modal({ title, body, foot, wide, bind }) {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head"><h3>${title}</h3><button class="icon-btn" data-close aria-label="Yopish">${icon("x")}</button></div>
      <div class="modal-body">${body}</div>${foot ? `<div class="modal-foot">${foot}</div>` : ""}</div>`;
    document.body.appendChild(bg);
    const close = () => { bg.remove(); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    bg.addEventListener("mousedown", (e) => { if (e.target === bg) close(); });
    $$("[data-close]", bg).forEach((b) => (b.onclick = close));
    if (bind) bind(bg, close);
    const f = $("input,select,textarea", bg); if (f) setTimeout(() => f.focus(), 30);
    return close;
  }
  /* Forma: fields = [{k, label, type: text|number|date|select|textarea|days|tags, options, required, full}] */
  function formModal({ title, fields, values, onSave, onDelete, saveText }) {
    values = values || {};
    const input = (f) => {
      const v = values[f.k];
      if (f.type === "select") return `<select name="${f.k}" ${f.required ? "required" : ""}>${(f.options || []).map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(v) === String(val) ? "selected" : ""}>${esc(lab)}</option>`; }).join("")}</select>`;
      if (f.type === "textarea") return `<textarea name="${f.k}">${esc(v || "")}</textarea>`;
      if (f.type === "date") return `<input type="date" name="${f.k}" value="${isoDate(v)}" ${f.required ? "required" : ""}>`;
      if (f.type === "days") return `<div class="daypick">${[1, 2, 3, 4, 5, 6].map((d) => `<label><input type="checkbox" name="${f.k}" value="${d}" ${(v || []).includes(d) ? "checked" : ""}><span>${SHORT[d]}</span></label>`).join("")}</div>`;
      if (f.type === "tags") return `<input type="text" name="${f.k}" value="${esc((v || []).join(", "))}" placeholder="vergul bilan ajrating">`;
      return `<input type="${f.type || "text"}" name="${f.k}" value="${esc(v == null ? "" : v)}" ${f.required ? "required" : ""} ${f.min != null ? `min="${f.min}"` : ""} ${f.max != null ? `max="${f.max}"` : ""} ${f.placeholder ? `placeholder="${esc(f.placeholder)}"` : ""}>`;
    };
    modal({
      title,
      body: `<form id="mform" class="form-grid" novalidate>${fields.map((f) => `<div class="fl ${f.full || f.type === "textarea" || f.type === "days" ? "full" : ""}"><label>${esc(f.label)}${f.required ? " *" : ""}</label>${input(f)}</div>`).join("")}</form>`,
      foot: `${onDelete ? `<button class="btn danger left" id="delBtn">${icon("trash")}O'chirish</button>` : ""}<button class="btn" data-close>Bekor qilish</button><button class="btn primary" id="saveBtn">${saveText || "Saqlash"}</button>`,
      bind: (m, close) => {
        const submit = () => {
          const form = $("#mform", m), out = {};
          for (const f of fields) {
            if (f.type === "days") { out[f.k] = $$(`input[name="${f.k}"]:checked`, form).map((i) => +i.value); continue; }
            const el = form.elements[f.k]; let v = el.value.trim();
            if (f.required && !v) { el.focus(); el.style.borderColor = "var(--crit)"; toast("«" + f.label + "» maydonini to'ldiring"); return; }
            if (f.type === "number") v = v === "" ? null : Number(v);
            if (f.type === "date") v = parseDate(v);
            if (f.type === "tags") v = v.split(",").map((x) => x.trim()).filter(Boolean);
            out[f.k] = v;
          }
          if (onSave(out) !== false) { close(); save(); renderApp(); }
        };
        $("#saveBtn", m).onclick = submit;
        $("#mform", m).onsubmit = (e) => { e.preventDefault(); submit(); };
        if (onDelete) $("#delBtn", m).onclick = () => { close(); confirmBox("Rostdan ham o'chirilsinmi? Bu amalni qaytarib bo'lmaydi.", () => { onDelete(); save(); renderApp(); }); };
      },
    });
  }

  // ═════════════ KIRISH ═════════════
  function renderLogin() {
    $("#root").innerHTML = `
      <div class="login">
        <section class="login-side">
          <div class="logo"><div class="logo-mark">M</div><span>Makt<span class="a">admin</span></span></div>
          <div>
            <h2>Maktab maslahatchisining raqamli yordamchisi</h2>
            <p>O'quvchilar, to'garaklar, yutuqlar va hisobotlar — bitta xavfsiz tizimda.</p>
            <ul class="login-points">
              <li>${icon("shield")} Har kim faqat o'ziga tegishli ma'lumotni ko'radi</li>
              <li>${icon("alert")} Yordamga muhtoj o'quvchilarni erta aniqlash</li>
              <li>${icon("report")} Hisobotlar bir tugma bilan</li>
            </ul>
          </div>
          <div style="font-size:12.5px;opacity:.75">Namunaviy versiya · barcha ma'lumotlar to'qima</div>
        </section>
        <main class="login-main">
          <div class="login-card">
            <h1>Tizimga kirish</h1>
            <div class="muted">Demo uchun rolni tanlang — har bir rol boshqacha ko'rinishga ega.</div>
            <div class="role-list">
              ${D.users.map((u) => `<button class="role-opt ${state.loginPick === u.id ? "sel" : ""}" data-pick="${u.id}"><div class="avatar">${initials(u.name)}</div><div><b>${esc(u.name)}</b><span>${esc(u.title)}</span></div></button>`).join("")}
            </div>
            <button class="btn primary block" id="loginBtn">Kirish ${icon("chevron")}</button>
            <div class="muted" style="font-size:12px;margin-top:14px;display:flex;gap:6px;align-items:center">${icon("lock")} Haqiqiy versiyada: login, parol va ikki bosqichli tasdiq</div>
          </div>
        </main>
      </div>`;
    $$("[data-pick]").forEach((b) => (b.onclick = () => { state.loginPick = b.dataset.pick; renderLogin(); }));
    $("#loginBtn").onclick = () => { state.userId = state.loginPick; sess.set("ma-user", state.userId); state.page = "bugun"; renderApp(); };
  }

  // ═════════════ KARKAS ═════════════
  function renderApp() {
    if (!user()) return renderLogin();
    if (!canSee(state.page)) state.page = "bugun";
    const u = user();
    const riskCount = riskList().filter((x) => !x.s.risksHandled).length;
    const navHtml = NAV.map((g) => {
      const items = g.items.filter((i) => canSee(i[0]));
      if (!items.length) return "";
      return `<div class="nav-group"><div class="nav-title">${g.title}</div>${items.map((i) => `
        <button class="nav-item ${state.page === i[0] ? "active" : ""}" data-nav="${i[0]}">${icon(i[2])}<span>${i[1]}</span>
          ${i[0] === "xavf" && riskCount ? `<span class="count">${riskCount}</span>` : ""}
          ${!READY.includes(i[0]) ? `<span class="soon">tez kunda</span>` : ""}</button>`).join("")}</div>`;
    }).join("");
    const bottom = [["bugun", "Bugun", "home"], ["oquvchilar", "O'quvchilar", "users"], ["xavf", "Xavf", "alert"], ["bolimlar", "Bo'limlar", "apps"]].filter((i) => canSee(i[0]));

    $("#root").innerHTML = `
      <div class="app">
        <aside class="sidebar" id="sidebar">
          <div class="logo"><div class="logo-mark">M</div><span>Makt<span class="a">admin</span></span></div>
          <div class="school-chip"><b>${esc(D.school.name)}</b>${esc(D.school.region)} · ${esc(D.school.year)}</div>
          ${navHtml}
          <div class="sidebar-foot">
            <div class="avatar">${initials(u.name)}</div>
            <div class="who"><b>${esc(u.name)}</b><span>${esc(u.title)}</span></div>
            <button class="icon-btn" id="logout" title="Chiqish" aria-label="Chiqish">${icon("logout")}</button>
          </div>
        </aside>
        <div class="main">
          <header class="topbar">
            <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menyu">${icon("menu")}</button>
            <label class="field search">${icon("search")}<input id="gsearch" placeholder="O'quvchini izlash..." value="${esc(state.q)}"></label>
            <div class="spacer"></div>
            <span class="role-pill">${icon("shield")}${role().label}</span>
            <button class="icon-btn" id="themeBtn" aria-label="Mavzu">${icon(document.documentElement.dataset.theme === "dark" ? "sun" : "moon")}</button>
          </header>
          <main class="content" id="content"></main>
        </div>
        <nav class="bottom-nav">
          ${bottom.map((i) => `<button class="${state.page === i[0] ? "active" : ""}" data-nav="${i[0]}">${icon(i[2])}${i[1]}</button>`).join("")}
          <button id="moreBtn">${icon("menu")}Menyu</button>
        </nav>
      </div>
      <div class="drawer-bg" id="drawerBg"></div>
      <aside class="drawer" id="drawer" aria-label="O'quvchi profili"></aside>`;

    $$("[data-nav]").forEach((b) => (b.onclick = () => go(b.dataset.nav)));
    $("#logout").onclick = () => { sess.set("ma-user", null); state.userId = null; renderLogin(); };
    $("#themeBtn").onclick = () => { const t = document.documentElement.dataset.theme === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = t; store.set("ma-theme", t); renderApp(); };
    const sb = $("#sidebar"), bg = $("#drawerBg");
    const openSb = () => { sb.classList.add("open"); bg.classList.add("open"); };
    $("#menuBtn").onclick = openSb; $("#moreBtn").onclick = openSb;
    bg.onclick = () => { sb.classList.remove("open"); closeStudent(); };
    $("#gsearch").oninput = (e) => {
      state.q = e.target.value;
      if (state.page !== "oquvchilar") { go("oquvchilar"); const i = $("#gsearch"); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }
      else renderStudentsList();
    };
    renderPage();
    if (state.openStudent) openStudent(state.openStudent);
  }
  function go(page) { state.page = page; state.openStudent = null; renderApp(); window.scrollTo(0, 0); }
  function renderPage() {
    const fn = { bugun: pageToday, bolimlar: pageModules, oquvchilar: pageStudents, xavf: pageRisk, psixolog: pagePsych, togaraklar: pageClubs, jadval: pageWeek, yutuqlar: pageAchievements, ishreja: pageTasks, sozlamalar: pageSettings }[state.page];
    $("#content").innerHTML = fn ? fn() : pageSoon(state.page);
    bindPage();
  }
  const head = (title, sub, actions) => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions ? `<div class="head-actions">${actions}</div>` : ""}</div>`;
  const addBtn = (id, text) => (canEdit() ? `<button class="btn primary" id="${id}">${icon("plus")}${text}</button>` : "");

  // ═════════════ BARCHA BO'LIMLAR ═════════════
  function pageModules() {
    const items = [];
    NAV.forEach((g) => g.items.forEach((i) => { if (i[0] !== "bolimlar" && canSee(i[0])) items.push({ id: i[0], title: i[1], ic: i[2], group: g.title }); }));
    const v = view("modules", "cards");
    const body = v === "cards"
      ? `<div class="tiles">${items.map((i) => `<button class="tile" data-nav="${i.id}">
          <div class="t-top"><div class="t-icon">${icon(i.ic)}</div>${READY.includes(i.id) ? (COUNT[i.id] ? `<span class="badge neutral">${COUNT[i.id]()}</span>` : "") : '<span class="badge info">Tez kunda</span>'}</div>
          <div class="t-title">${i.title}</div><div class="t-desc">${DESC[i.id] || ""}</div></button>`).join("")}</div>`
      : `<div class="card"><div class="list">${items.map((i) => `<div class="row clickable" data-nav="${i.id}">
          <div class="soon-icon" style="width:40px;height:40px;border-radius:11px">${icon(i.ic)}</div>
          <div class="grow"><div class="title">${i.title} <span class="muted" style="font-weight:500;font-size:12px">· ${i.group}</span></div><div class="meta">${DESC[i.id] || ""}</div></div>
          ${READY.includes(i.id) ? (COUNT[i.id] ? `<span class="badge neutral hide-sm">${COUNT[i.id]()}</span>` : "") : '<span class="badge info">Tez kunda</span>'}
          <span class="muted">${icon("chevron")}</span></div>`).join("")}</div></div>`;
    return head("Barcha bo'limlar", items.length + " ta bo'lim · ko'rinishni o'ng tomondan almashtiring", viewToggle("modules", "cards")) + body;
  }

  // ═════════════ BUGUN ═════════════
  function pageToday() {
    const u = user(), st = myStudents();
    const covered = st.filter((s) => s.clubs.length).length;
    const cov = st.length ? Math.round((covered / st.length) * 100) : 0;
    const girls = st.filter((s) => s.gender === "Q").length;
    const rl = riskList().filter((x) => !x.s.risksHandled);
    const ach = st.reduce((a, s) => a + s.achievements.length, 0);
    const todayTasks = D.tasks.filter((t) => dayDiff(t.due) <= 0 && (!t.done || dayDiff(t.due) === 0)).sort((a, b) => a.done - b.done || a.due - b.due);
    const wd = D.today.getDay();
    const todayClubs = D.clubs.filter((c) => c.days.includes(wd)).sort((a, b) => a.time.localeCompare(b.time));
    const bdays = st.filter((s) => isBirthday(s.birth));
    const overdue = D.tasks.filter((t) => !t.done && dayDiff(t.due) < 0).length;
    const events = D.events.filter((e) => dayDiff(e.date) >= 0).sort((a, b) => a.date - b.date).slice(0, 4);
    const scopeText = role().scope === "sinf" ? user().sinf + " sinf" : "Maktab bo'yicha";
    return `
      <div class="welcome">
        <div style="position:relative;z-index:1"><h2>Xayrli kun, ${esc(u.name.split(" ")[0])}!</h2><p>${WEEKDAYS[wd]}, ${fmtDate(D.today)} · ${esc(D.school.year)}</p></div>
        <div class="chips">
          <span class="chip">${icon("check")}${todayTasks.filter((t) => !t.done).length} ta vazifa</span>
          ${overdue ? `<span class="chip">${icon("clock")}${overdue} ta muddati o'tgan</span>` : ""}
          ${bdays.length ? `<span class="chip">${icon("cake")}${bdays.length} ta tug'ilgan kun</span>` : ""}
        </div>
      </div>
      <div class="grid g-4 mt">
        <div class="card stat"><div class="label">${icon("users")}O'quvchilar</div><div class="value">${st.length}</div><div class="sub">${scopeText} · ${st.length - girls} o'g'il, ${girls} qiz</div></div>
        <div class="card stat"><div class="label">${icon("grid")}To'garakka qamrov</div><div class="value">${cov}%</div><div class="sub">${covered} nafar to'garakka qatnashadi</div></div>
        <div class="card stat alert"><div class="label">${icon("alert")}Xavf guruhida</div><div class="value">${rl.length}</div><div class="sub">${rl.filter((x) => x.r.length >= 3).length} nafari yuqori xavfda</div></div>
        <div class="card stat"><div class="label">${icon("trophy")}Yutuqlar</div><div class="value">${ach}</div><div class="sub">Olimpiada, tanlov, sertifikat</div></div>
      </div>
      <div class="grid g-main mt">
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-head"><h3>${icon("check")}Bugungi vazifalar</h3><button class="link" data-nav="ishreja">Barchasi${icon("chevron")}</button></div>
            <div class="list">${todayTasks.map(taskRow).join("") || '<div class="empty">Bugun vazifa yo\'q</div>'}</div></div>
          ${canSee("xavf") ? `<div class="card"><div class="card-head"><h3>${icon("alert")}Diqqat talab qiladi</h3><button class="link" data-nav="xavf">Xavf guruhi${icon("chevron")}</button></div>
            <div class="list">${rl.slice(0, 4).map((x) => `<div class="row clickable" data-student="${x.s.id}"><div class="avatar">${initials(fullName(x.s))}</div>
              <div class="grow"><div class="title">${esc(fullName(x.s))} <span class="muted" style="font-weight:500">· ${esc(x.s.sinf)}</span></div><div class="meta">${x.r.map((r) => esc(r.t)).join(" · ")}</div></div>${levelBadge(x.r.length)}</div>`).join("") || '<div class="empty">Hozircha xavf guruhida hech kim yo\'q</div>'}</div></div>` : ""}
          <div class="card"><div class="card-head"><h3>${icon("grid")}Sinflar bo'yicha to'garakka qamrov</h3><span class="muted" style="font-size:12.5px">foizda</span></div>${coverageChart(st)}</div>
        </div>
        <div class="grid" style="align-content:start">
          <div class="card"><div class="card-head"><h3>${icon("calendar")}Yaqin tadbirlar</h3>${canEdit() ? `<button class="link" id="addEvent">${icon("plus")}Qo'shish</button>` : ""}</div>
            <div class="list">${events.map((e) => `<div class="row ${canEdit() ? "clickable" : ""}" data-event="${e.id}"><div class="grow"><div class="title">${esc(e.title)}</div><div class="meta"><span>${icon("clock")} ${relDay(e.date)}, ${esc(e.time)}</span><span>${esc(e.place)}</span></div></div></div>`).join("") || '<div class="empty">Yaqin tadbir yo\'q</div>'}</div></div>
          <div class="card"><div class="card-head"><h3>${icon("grid")}Bugungi to'garaklar</h3><button class="link" data-nav="jadval">Jadval${icon("chevron")}</button></div>
            <div class="list">${todayClubs.map((c) => `<div class="row"><div class="tag">${esc(c.time)}</div><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta">${esc(c.room)} · ${esc(c.leader)}</div></div></div>`).join("") || '<div class="empty">Bugun mashg\'ulot yo\'q</div>'}</div></div>
          <div class="card"><div class="card-head"><h3>${icon("cake")}Tug'ilgan kunlar</h3></div>
            <div class="list">${bdays.map((s) => `<div class="row clickable" data-student="${s.id}"><div class="avatar">${initials(fullName(s))}</div><div class="grow"><div class="title">${esc(fullName(s))}</div><div class="meta">${esc(s.sinf)} · ${age(s.birth)} yoshga to'ldi</div></div></div>`).join("") || '<div class="empty">Bugun tug\'ilgan kun yo\'q</div>'}</div></div>
        </div>
      </div>`;
  }
  function taskRow(t) {
    const d = dayDiff(t.due);
    const due = t.done ? '<span class="badge good">' + icon("check") + "Bajarildi</span>" : d < 0 ? '<span class="badge crit">' + icon("clock") + "Muddati o'tgan</span>" : d === 0 ? '<span class="badge warn">' + icon("clock") + "Bugun</span>" : '<span class="badge neutral">' + relDay(t.due) + "</span>";
    return `<div class="row ${t.done ? "done" : ""}">
      <button class="task-check ${t.done ? "on" : ""}" data-task="${t.id}" aria-label="Bajarildi deb belgilash">${t.done ? icon("check") : ""}</button>
      <div class="grow ${canEdit() ? "clickable" : ""}" data-edittask="${t.id}" style="cursor:${canEdit() ? "pointer" : "default"}"><div class="title">${esc(t.title)}</div><div class="meta"><span class="tag">${esc(t.tag)}</span><span>${fmtDate(t.due)}</span></div></div>${due}</div>`;
  }
  function coverageChart(st) {
    const classes = [...new Set(st.map((s) => s.sinf))].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
    if (!classes.length) return '<div class="empty">Ma\'lumot yo\'q</div>';
    const data = classes.map((k) => { const g = st.filter((s) => s.sinf === k); const c = g.filter((s) => s.clubs.length).length; return { k, n: g.length, c, p: Math.round((c / g.length) * 100) }; });
    const grid = [25, 50, 75, 100].map((v) => `<div class="gridline" style="bottom:${v}%"><span>${v}</span></div>`).join("");
    return `<div class="bars" role="img" aria-label="Sinflar bo'yicha to'garakka qamrov foizi">${grid}
        ${data.map((d) => `<div class="bar-col" data-tip="<b>${esc(d.k)}</b> · ${d.p}%<br>${d.c} / ${d.n} o'quvchi"><div class="bar" style="height:${Math.max(d.p, 2)}%"></div></div>`).join("")}</div>
      <div class="bar-labels">${data.map((d) => `<span>${esc(d.k)}</span>`).join("")}</div>
      <details class="table-view"><summary>Jadval ko'rinishida</summary><div class="table-wrap"><table class="t"><thead><tr><th>Sinf</th><th class="num">O'quvchi</th><th class="num">Qatnashadi</th><th class="num">Qamrov</th></tr></thead>
        <tbody>${data.map((d) => `<tr><td>${esc(d.k)}</td><td class="num">${d.n}</td><td class="num">${d.c}</td><td class="num">${d.p}%</td></tr>`).join("")}</tbody></table></div></details>`;
  }
  function eventForm(e) {
    formModal({ title: e ? "Tadbirni tahrirlash" : "Yangi tadbir", values: e || { date: D.today, time: "15:00" },
      fields: [{ k: "title", label: "Tadbir nomi", required: true, full: true }, { k: "date", label: "Sana", type: "date", required: true }, { k: "time", label: "Vaqt", type: "time" }, { k: "place", label: "Joyi", full: true }],
      onSave: (v) => { if (e) Object.assign(e, v); else D.events.push({ id: uid("e"), ...v }); },
      onDelete: e ? () => { D.events = D.events.filter((x) => x !== e); } : null });
  }

  // ═════════════ O'QUVCHILAR ═════════════
  function pageStudents() {
    const classes = [...new Set(myStudents().map((s) => s.sinf))].sort((a, b) => parseInt(a) - parseInt(b) || a.localeCompare(b));
    const actions = (canEdit() ? `<button class="btn" id="importBtn">${icon("upload")}Excel'dan yuklash</button><button class="btn" id="exportStu">${icon("download")}Excel</button>${addBtn("addStudent", "Yangi o'quvchi")}` : `<button class="btn" id="exportStu">${icon("download")}Excel</button>`) + viewToggle("students", "list");
    return head("O'quvchilar", role().scope === "sinf" ? "Siz faqat o'z sinfingiz (" + esc(user().sinf) + ") o'quvchilarini ko'rasiz" : myStudents().length + " nafar o'quvchi · " + classes.length + " ta sinf", actions) + `
      <div class="toolbar">
        <label class="field">${icon("search")}<input id="lsearch" placeholder="Ism yoki familiya..." value="${esc(state.q)}"></label>
        ${classes.length > 1 ? `<select class="field" id="sinfSel"><option value="all">Barcha sinflar</option>${classes.map((k) => `<option ${state.sinf === k ? "selected" : ""}>${esc(k)}</option>`).join("")}</select>` : ""}
        <div class="seg">${[["all", "Barchasi"], ["risk", "Xavf guruhi"], ["noclub", "To'garaksiz"]].map((f) => `<button data-filter="${f[0]}" class="${state.filter === f[0] ? "on" : ""}">${f[1]}</button>`).join("")}</div>
      </div>
      <div id="stuList"></div>`;
  }
  function filteredStudents() {
    const q = state.q.trim().toLowerCase();
    let list = myStudents().filter((s) => (state.sinf === "all" || s.sinf === state.sinf) && (!q || fullName(s).toLowerCase().includes(q) || (s.last + " " + s.first).toLowerCase().includes(q)));
    if (state.filter === "risk") list = list.filter((s) => risks(s).length >= 2);
    if (state.filter === "noclub") list = list.filter((s) => !s.clubs.length);
    return list;
  }
  function renderStudentsList() {
    const el = $("#stuList"); if (!el) return;
    const list = filteredStudents();
    const lastTest = (s) => (s.tests && s.tests.length ? s.tests[s.tests.length - 1] : "—");
    if (!list.length) { el.innerHTML = '<div class="card empty">Hech narsa topilmadi</div>'; return; }
    if (view("students") === "cards") {
      el.innerHTML = `<div class="cards">${list.map((s) => `<div class="scard" data-student="${s.id}">
        <div class="top"><div class="avatar">${initials(fullName(s))}</div><div style="flex:1;min-width:0"><div class="nm">${esc(fullName(s))}</div><div class="muted" style="font-size:12.5px">${esc(s.sinf)} · ${age(s.birth)} yosh</div></div></div>
        <div class="mini"><div><b>${s.attendance == null ? "—" : s.attendance + "%"}</b><span>Davomat</span></div><div><b>${s.clubs.length}</b><span>To'garak</span></div><div><b>${lastTest(s)}</b><span>Test</span></div></div>
        <div>${levelBadge(risks(s).length)}</div></div>`).join("")}</div>`;
    } else {
      el.innerHTML = `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>O'quvchi</th><th>Sinf</th><th class="hide-sm">Yoshi</th><th class="num">Davomat</th><th class="hide-sm">To'garaklar</th><th>Holati</th></tr></thead><tbody>
        ${list.map((s) => `<tr data-student="${s.id}"><td><div class="namecell"><div class="avatar">${initials(fullName(s))}</div>${esc(fullName(s))}</div></td><td>${esc(s.sinf)}</td><td class="hide-sm">${age(s.birth)}</td>
          <td class="num">${s.attendance == null ? "—" : s.attendance + "%"}</td><td class="hide-sm">${s.clubs.map((c) => clubById(c)).filter(Boolean).map((c) => esc(c.name)).join(", ") || '<span class="muted">—</span>'}</td><td>${levelBadge(risks(s).length)}</td></tr>`).join("")}
        </tbody></table></div><div class="muted" style="font-size:12.5px;margin-top:10px">${list.length} ta natija</div></div>`;
    }
    $$("[data-student]", el).forEach((r) => (r.onclick = () => openStudent(r.dataset.student)));
  }
  function studentForm(s) {
    const clsDefault = role().scope === "sinf" ? user().sinf : "";
    formModal({
      title: s ? "O'quvchini tahrirlash" : "Yangi o'quvchi",
      values: s ? { ...s, testsText: (s.tests || []).join(", ") } : { gender: "O", sinf: clsDefault, attendance: 100 },
      fields: [
        { k: "last", label: "Familiya", required: true }, { k: "first", label: "Ism", required: true },
        { k: "sinf", label: "Sinf (masalan 7-A)", required: true }, { k: "gender", label: "Jinsi", type: "select", options: [["O", "O'g'il"], ["Q", "Qiz"]] },
        { k: "birth", label: "Tug'ilgan sana", type: "date" }, { k: "phone", label: "Ota-ona telefoni", placeholder: "+998 ..." },
        { k: "attendance", label: "Davomat (%)", type: "number", min: 0, max: 100 }, { k: "plan", label: "Kelajak rejasi (9–11-sinf)", type: "select", options: [["", "—"], "OTM", "Kollej / texnikum", "Ish / hunar", "Aniqlanmagan"] },
        { k: "interests", label: "Qiziqishlari", type: "tags", full: true },
        { k: "testsText", label: "Test natijalari (ball, vergul bilan)", full: true, placeholder: "72, 75, 80" },
      ],
      onSave: (v) => {
        if (role().scope === "sinf" && v.sinf !== user().sinf) { toast("Faqat o'z sinfingizga qo'sha olasiz"); return false; }
        v.tests = String(v.testsText || "").split(",").map((x) => parseInt(x, 10)).filter((x) => !isNaN(x)); delete v.testsText;
        v.plan = v.plan || null;
        if (s) Object.assign(s, v); else { const n = { id: uid("s"), clubs: [], achievements: [], psychFlag: false, risksHandled: false, ...v }; D.students.push(n); }
        toast(s ? "Saqlandi" : "O'quvchi qo'shildi");
      },
      onDelete: s ? () => { D.students = D.students.filter((x) => x !== s); D.psychNotes = D.psychNotes.filter((n) => n.sid !== s.id); closeStudent(); } : null,
    });
  }

  // ── Excel import / eksport ──
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
      sc.onload = () => res(window.XLSX); sc.onerror = () => rej(new Error("Excel kutubxonasi yuklanmadi — internetni tekshiring"));
      document.head.appendChild(sc);
    });
  }
  const COLS = [["Familiya", "last"], ["Ism", "first"], ["Sinf", "sinf"], ["Jinsi (O/Q)", "gender"], ["Tug'ilgan sana", "birth"], ["Telefon", "phone"], ["Davomat %", "attendance"], ["Qiziqishlari", "interests"]];
  function exportStudents() {
    loadXLSX().then((X) => {
      const rows = filteredStudents().map((s) => ({ Familiya: s.last, Ism: s.first, Sinf: s.sinf, "Jinsi (O/Q)": s.gender, "Tug'ilgan sana": isoDate(s.birth), Telefon: s.phone || "", "Davomat %": s.attendance, Qiziqishlari: (s.interests || []).join(", "), "To'garaklar": s.clubs.map(clubById).filter(Boolean).map((c) => c.name).join(", "), "Xavf darajasi": ["Yaxshi", "Kuzatuvda", "O'rta", "Yuqori"][Math.min(3, risks(s).length)] }));
      const ws = X.utils.json_to_sheet(rows); ws["!cols"] = Object.keys(rows[0] || { a: 1 }).map(() => ({ wch: 16 }));
      const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "O'quvchilar"); X.writeFile(wb, "Maktadmin_oquvchilar.xlsx");
    }).catch((e) => toast(e.message));
  }
  function importModal() {
    let parsed = [];
    modal({
      title: "Excel'dan o'quvchilarni yuklash", wide: true,
      body: `<div class="muted" style="font-size:13px">Fayl ustunlari: <b>${COLS.map((c) => c[0]).join(", ")}</b>. Ustunlar tartibi muhim emas, faqat sarlavhalar mos bo'lsin.</div>
        <div><button class="btn" id="tplBtn">${icon("download")}Namuna faylni yuklab olish</button></div>
        <label class="drop" id="drop">${icon("upload")}<div style="margin-top:6px"><b>Faylni shu yerga tashlang</b> yoki bosib tanlang (.xlsx, .xls, .csv)</div><input type="file" id="xfile" accept=".xlsx,.xls,.csv" hidden></label>
        <div id="preview"></div>`,
      foot: `<button class="btn" data-close>Bekor qilish</button><button class="btn primary" id="doImport" disabled>Yuklash</button>`,
      bind: (m, close) => {
        $("#tplBtn", m).onclick = () => loadXLSX().then((X) => {
          const ws = X.utils.aoa_to_sheet([COLS.map((c) => c[0]), ["Aliyev", "Jasur", "7-A", "O", "2013-04-12", "+998 90 123-45-67", 95, "Sport, Matematika"]]);
          const wb = X.utils.book_new(); X.utils.book_append_sheet(wb, ws, "O'quvchilar"); X.writeFile(wb, "Maktadmin_namuna.xlsx");
        }).catch((e) => toast(e.message));
        const handle = (file) => {
          loadXLSX().then((X) => file.arrayBuffer().then((buf) => {
            const wb = X.read(buf, { type: "array", cellDates: true });
            const rows = X.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
            const norm = (h) => String(h).toLowerCase().replace(/[^a-z']/g, "");
            const find = (row, key) => { const want = norm(key).slice(0, 5); const k = Object.keys(row).find((h) => norm(h).startsWith(want)); return k ? row[k] : ""; };
            parsed = rows.map((r) => {
              const g = String(find(r, "Jinsi")).trim().toUpperCase();
              const att = parseInt(find(r, "Davomat"), 10);
              return { id: uid("s"), last: String(find(r, "Familiya")).trim(), first: String(find(r, "Ism")).trim(), sinf: String(find(r, "Sinf")).trim().toUpperCase(),
                gender: g.startsWith("Q") || g.startsWith("A") || g.startsWith("F") ? "Q" : "O", birth: parseDate(find(r, "Tug'ilgan")), phone: String(find(r, "Telefon")).trim(),
                attendance: isNaN(att) ? null : att, interests: String(find(r, "Qiziqish")).split(",").map((x) => x.trim()).filter(Boolean), tests: [], clubs: [], achievements: [], psychFlag: false, risksHandled: false, plan: null };
            }).filter((s) => s.first && s.last && s.sinf);
            if (role().scope === "sinf") parsed = parsed.filter((s) => s.sinf === user().sinf);
            $("#preview", m).innerHTML = parsed.length ? `<div class="badge good" style="margin-bottom:8px">${icon("check")}${parsed.length} ta o'quvchi topildi</div>
              <div class="table-wrap" style="max-height:240px"><table class="t"><thead><tr><th>Familiya</th><th>Ism</th><th>Sinf</th><th>Jinsi</th><th>Tug'ilgan</th></tr></thead><tbody>
              ${parsed.slice(0, 50).map((s) => `<tr><td>${esc(s.last)}</td><td>${esc(s.first)}</td><td>${esc(s.sinf)}</td><td>${s.gender}</td><td>${fmtFull(s.birth)}</td></tr>`).join("")}</tbody></table></div>`
              : '<div class="badge crit">Mos qator topilmadi — sarlavhalarni tekshiring</div>';
            $("#doImport", m).disabled = !parsed.length;
          })).catch((e) => toast(e.message));
        };
        const drop = $("#drop", m), fi = $("#xfile", m);
        fi.onchange = () => fi.files[0] && handle(fi.files[0]);
        drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
        drop.ondragleave = () => drop.classList.remove("over");
        drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove("over"); if (e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); };
        $("#doImport", m).onclick = () => { D.students.push(...parsed); save(); close(); toast(parsed.length + " ta o'quvchi qo'shildi"); renderApp(); };
      },
    });
  }

  // ── Profil oynasi ──
  function openStudent(id) {
    const s = stuById(id); if (!s) return;
    state.openStudent = id;
    const r = risks(s);
    const notes = D.psychNotes.filter((n) => n.sid === s.id).sort((a, b) => b.date - a.date);
    $("#drawer").innerHTML = `
      <div class="drawer-head">
        <div class="avatar lg">${initials(fullName(s))}</div>
        <div style="flex:1;min-width:0"><h2>${esc(fullName(s))}</h2><div class="muted">${esc(s.sinf)} sinf · ${age(s.birth)} yosh</div></div>
        ${canEdit() ? `<button class="icon-btn" id="editStu" title="Tahrirlash" aria-label="Tahrirlash">${icon("edit")}</button>` : ""}
        <button class="icon-btn" id="closeDrawer" aria-label="Yopish">${icon("x")}</button>
      </div>
      <div class="drawer-body">
        <div style="display:flex;gap:8px;flex-wrap:wrap">${levelBadge(r.length)}${s.plan ? `<span class="badge info">${icon("compass")}Reja: ${esc(s.plan)}</span>` : ""}</div>
        <div class="card"><div class="kv">
          <div><span>Tug'ilgan sana</span>${fmtFull(s.birth)}</div><div><span>Jinsi</span>${s.gender === "Q" ? "Qiz" : "O'g'il"}</div>
          <div><span>Ota-ona telefoni</span>${esc(s.phone || "—")}</div><div><span>Davomat</span>${s.attendance == null ? "—" : s.attendance + "%"}</div>
        </div></div>
        ${r.length ? `<div class="card"><div class="card-head"><h3>${icon("alert")}Xavf signallari</h3></div><ul class="signals">${r.map((x) => `<li>${icon("alert")}${esc(x.t)}</li>`).join("")}</ul>
          <div class="advice mt"><b>${icon("sparkles")}Tavsiya</b><ul>${advice(s, r).map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div></div>` : ""}
        <div class="card"><div class="card-head"><h3>${icon("test")}Test natijalari</h3><span class="muted" style="font-size:12.5px">${(s.tests || []).length} ta</span></div>${(s.tests || []).length >= 2 ? spark(s.tests) : '<div class="muted" style="font-size:13px">Kamida 2 ta natija kerak</div>'}</div>
        <div class="card"><div class="card-head"><h3>${icon("sparkles")}Qiziqishlari va to'garaklari</h3></div>
          <div class="chips">${(s.interests || []).map((i) => `<span class="badge info">${esc(i)}</span>`).join("") || '<span class="muted" style="font-size:13px">Kiritilmagan</span>'}</div>
          <div class="chips" style="margin-top:8px">${s.clubs.map(clubById).filter(Boolean).map((c) => `<span class="badge neutral">${icon("grid")}${esc(c.name)}</span>`).join("") || '<span class="muted" style="font-size:13px">To\'garakka qatnashmaydi</span>'}</div></div>
        <div class="card"><div class="card-head"><h3>${icon("trophy")}Yutuqlari</h3>${canEdit() ? `<button class="link" id="addAchStu">${icon("plus")}Qo'shish</button>` : ""}</div>
          <div class="list">${s.achievements.map((a) => `<div class="row"><div class="grow"><div class="title">${esc(a.title)}</div><div class="meta">${esc(a.level)} · ${fmtFull(a.date)}</div></div><span class="badge good">${esc(a.result)}</span></div>`).join("") || '<div class="muted" style="font-size:13px">Hozircha qayd etilmagan</div>'}</div></div>
        <div class="card"><div class="card-head"><h3>${icon("heart")}Psixolog qaydlari</h3>${role().psych ? `<button class="link" id="addNoteStu">${icon("plus")}Qayd</button>` : ""}</div>
          ${role().psych ? (notes.length ? `<div class="list">${notes.map((n) => `<div class="row"><div class="grow"><div class="title">${esc(n.type)}</div><div class="meta">${fmtFull(n.date)}</div><div style="font-size:13px;margin-top:4px">${esc(n.note)}</div></div></div>`).join("")}</div>` : '<div class="muted" style="font-size:13px">Qaydlar yo\'q</div>')
            : `<div class="locked">${icon("lock")}Bu bo'lim maxfiy — faqat psixolog va maslahatchi ko'radi.</div>`}</div>
        <button class="btn primary block" id="portfolioBtn">${icon("printer")}Portfolio (PDF) yaratish</button>
      </div>`;
    $("#drawer").classList.add("open"); $("#drawerBg").classList.add("open");
    $("#closeDrawer").onclick = closeStudent;
    $("#portfolioBtn").onclick = () => printPortfolio(s);
    if ($("#editStu")) $("#editStu").onclick = () => studentForm(s);
    if ($("#addAchStu")) $("#addAchStu").onclick = () => achForm(null, s.id);
    if ($("#addNoteStu")) $("#addNoteStu").onclick = () => noteForm(null, s.id);
    bindTips($("#drawer"));
  }
  function closeStudent() {
    state.openStudent = null;
    const d = $("#drawer"), b = $("#drawerBg");
    if (d) d.classList.remove("open");
    if (b && !$("#sidebar").classList.contains("open")) b.classList.remove("open");
  }
  function spark(vals) {
    const w = 440, h = 90, px = 10, py = 12;
    const x = (i) => px + (i * (w - 2 * px)) / (vals.length - 1);
    const y = (v) => h - py - (v / 100) * (h - 2 * py);
    const first = vals[0], last = vals[vals.length - 1], trend = last - first;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" role="img" aria-label="Test natijalari: ${vals.join(", ")}">
        <line x1="${px}" x2="${w - px}" y1="${y(50)}" y2="${y(50)}" stroke="var(--border)" stroke-dasharray="3 3"/>
        <polyline points="${vals.map((v, i) => x(i) + "," + y(v)).join(" ")}" fill="none" stroke="var(--bar)" stroke-width="2" stroke-linejoin="round"/>
        ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="4.5" fill="var(--bar)" stroke="var(--surface)" stroke-width="2" data-tip="${i + 1}-test: <b>${v}</b> ball"/>`).join("")}</svg>
      <div style="display:flex;justify-content:space-between;font-size:12.5px;margin-top:6px"><span class="muted">Boshida: <b style="color:var(--ink)">${first}</b></span>
        <span class="muted">Hozir: <b style="color:var(--ink)">${last}</b> ${trend >= 0 ? `<span class="badge good">+${trend}</span>` : `<span class="badge crit">${trend}</span>`}</span></div>`;
  }
  function printPortfolio(s) {
    const w = window.open("", "_blank");
    if (!w) { toast("Brauzer yangi oynani blokladi — ruxsat bering"); return; }
    const row = (a, b) => `<tr><td style="color:#667;padding:4px 16px 4px 0">${a}</td><td style="padding:4px 0"><b>${b}</b></td></tr>`;
    w.document.write(`<!doctype html><html lang="uz"><head><meta charset="utf-8"><title>Portfolio — ${esc(fullName(s))}</title>
      <style>body{font-family:Inter,Segoe UI,sans-serif;color:#13201c;max-width:720px;margin:32px auto;padding:0 24px}h1{margin:0;font-size:26px}.brand{color:#0f766e;font-weight:800}
      h2{font-size:15px;border-bottom:2px solid #0f766e;padding-bottom:4px;margin-top:26px}.chip{display:inline-block;background:#e2f2ef;color:#0b5a53;border-radius:99px;padding:3px 10px;margin:2px;font-size:13px}
      table{border-collapse:collapse;font-size:14px}.ach td{padding:6px 10px 6px 0;border-bottom:1px solid #e1e7e4}</style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:center"><span>Makt<span class="brand">admin</span> · O'quvchi portfoliosi</span><span style="color:#667;font-size:13px">${fmtFull(D.today)}</span></div>
      <h1 style="margin-top:18px">${esc(fullName(s))}</h1><div style="color:#667">${esc(D.school.name)} · ${esc(s.sinf)} sinf</div>
      <h2>Umumiy ma'lumot</h2><table>${row("Yoshi", age(s.birth))}${row("Davomat", s.attendance == null ? "—" : s.attendance + "%")}${(s.tests || []).length ? row("Oxirgi test natijasi", s.tests[s.tests.length - 1] + " ball") : ""}${s.plan ? row("Kelajak rejasi", esc(s.plan)) : ""}</table>
      <h2>Qiziqishlari</h2>${(s.interests || []).map((i) => `<span class="chip">${esc(i)}</span>`).join("") || "—"}
      <h2>To'garak va klublar</h2>${s.clubs.map(clubById).filter(Boolean).map((c) => `<span class="chip">${esc(c.name)}</span>`).join("") || "—"}
      <h2>Yutuqlari</h2>${s.achievements.length ? `<table class="ach">${s.achievements.map((a) => `<tr><td>${esc(a.title)}</td><td>${esc(a.level)}</td><td><b>${esc(a.result)}</b></td></tr>`).join("")}</table>` : "—"}
      <p style="margin-top:40px;color:#889;font-size:12px">Maslahatchi: ${esc(user().name)} ________________ (imzo)</p>
      <script>window.onload=function(){window.print()}<\/script></body></html>`);
    w.document.close();
  }

  // ═════════════ XAVF GURUHI ═════════════
  function pageRisk() {
    const all = riskList();
    const list = all.filter((x) => (state.riskTab === "open" ? !x.s.risksHandled : x.s.risksHandled));
    const handleBtn = (s) => canEdit() || role().psych ? `<button class="btn ${s.risksHandled ? "" : "primary"}" data-handle="${s.id}">${s.risksHandled ? "Qayta ochish" : icon("check") + "Ko'rib chiqildi"}</button>` : "";
    const body = !list.length ? `<div class="card empty">${state.riskTab === "open" ? "Barcha holatlar ko'rib chiqilgan 🎉" : "Hali ko'rib chiqilgan holat yo'q"}</div>`
      : view("risk", "cards") === "cards"
        ? `<div class="grid g-3">${list.map((x) => `<div class="card risk-card">
            <div class="risk-top"><div class="avatar">${initials(fullName(x.s))}</div><div style="flex:1;min-width:0"><div style="font-weight:650">${esc(fullName(x.s))}</div><div class="muted" style="font-size:12.5px">${esc(x.s.sinf)} sinf</div></div>${levelBadge(x.r.length)}</div>
            <ul class="signals">${x.r.map((r) => `<li>${icon("alert")}${esc(r.t)}</li>`).join("")}</ul>
            <div class="advice"><b>${icon("sparkles")}Tavsiya</b><ul>${advice(x.s, x.r).map((a) => `<li>${esc(a)}</li>`).join("")}</ul></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="btn" data-student="${x.s.id}">Profil</button>${handleBtn(x.s)}</div></div>`).join("")}</div>`
        : `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>O'quvchi</th><th>Sinf</th><th>Signallar</th><th>Daraja</th><th></th></tr></thead><tbody>
            ${list.map((x) => `<tr data-student="${x.s.id}"><td><div class="namecell"><div class="avatar">${initials(fullName(x.s))}</div>${esc(fullName(x.s))}</div></td><td>${esc(x.s.sinf)}</td>
              <td style="white-space:normal;min-width:240px;font-size:13px">${x.r.map((r) => esc(r.t)).join("<br>")}</td><td>${levelBadge(x.r.length)}</td><td class="actions" onclick="event.stopPropagation()">${handleBtn(x.s)}</td></tr>`).join("")}</tbody></table></div></div>`;
    return head("Xavf guruhi", "Tizim davomat, to'garak va test natijalariga qarab yordamga muhtoj o'quvchilarni avtomatik aniqlaydi",
      `<div class="seg"><button data-risk="open" class="${state.riskTab === "open" ? "on" : ""}">Ochiq (${all.filter((x) => !x.s.risksHandled).length})</button><button data-risk="done" class="${state.riskTab === "done" ? "on" : ""}">Ko'rib chiqilgan (${all.filter((x) => x.s.risksHandled).length})</button></div>${viewToggle("risk", "cards")}`) + `
      <div class="card" style="margin-bottom:16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;font-size:13px"><b>Qanday aniqlanadi:</b>
        <span class="badge neutral">To'garakka qatnashmaslik</span><span class="badge neutral">Davomat 85% dan past</span><span class="badge neutral">Test natijasi 12+ ballga tushgan</span>${role().psych ? '<span class="badge neutral">Psixolog kuzatuvi</span>' : ""}
        <span class="muted">· 2 ta signal — o'rta, 3+ — yuqori xavf</span></div>${body}`;
  }

  // ═════════════ PSIXOLOG ═════════════
  function pagePsych() {
    const notes = D.psychNotes.map((n) => ({ n, s: stuById(n.sid) })).filter((x) => x.s).sort((a, b) => b.n.date - a.n.date);
    const month = notes.filter((x) => x.n.date.getMonth() === D.today.getMonth() && x.n.date.getFullYear() === D.today.getFullYear()).length;
    return head("Psixolog", "Maxfiy bo'lim — faqat psixolog va maslahatchi ko'radi", `<span class="badge info">${icon("lock")}Maxfiy</span>${addBtn("addNote", "Qayd qo'shish")}`) + `
      <div class="grid g-3">
        <div class="card stat"><div class="label">${icon("heart")}Kuzatuvdagi o'quvchilar</div><div class="value">${D.students.filter((s) => s.psychFlag).length}</div></div>
        <div class="card stat"><div class="label">${icon("calendar")}Bu oy qaydlar</div><div class="value">${month}</div></div>
        <div class="card stat"><div class="label">${icon("survey")}Jami qaydlar</div><div class="value">${notes.length}</div></div>
      </div>
      <div class="card mt"><div class="card-head"><h3>${icon("clock")}Qaydlar</h3></div>
        <div class="list">${notes.map((x) => `<div class="row clickable" data-note="${x.n.id}"><div class="avatar">${initials(fullName(x.s))}</div>
          <div class="grow"><div class="title">${esc(fullName(x.s))} · <span class="muted" style="font-weight:500">${esc(x.n.type)}</span></div><div class="meta">${relDay(x.n.date)} · ${esc(x.s.sinf)}</div><div style="font-size:13px;margin-top:3px">${esc(x.n.note)}</div></div></div>`).join("") || '<div class="empty">Qaydlar yo\'q</div>'}</div></div>`;
  }
  function noteForm(n, sid) {
    formModal({ title: n ? "Qaydni tahrirlash" : "Yangi qayd", values: n ? { ...n, flag: stuById(n.sid).psychFlag ? "1" : "0" } : { sid: sid || "", date: D.today, type: "Individual suhbat", flag: "1" },
      fields: [
        { k: "sid", label: "O'quvchi", type: "select", required: true, full: true, options: [["", "— tanlang —"], ...D.students.slice().sort((a, b) => fullName(a).localeCompare(fullName(b))).map((s) => [s.id, fullName(s) + " (" + s.sinf + ")"])] },
        { k: "type", label: "Turi", type: "select", options: ["Individual suhbat", "Guruh mashg'uloti", "Ota-ona bilan uchrashuv", "Test (xavotir darajasi)", "Test (o'z-o'zini baholash)", "Boshqa"] },
        { k: "date", label: "Sana", type: "date", required: true },
        { k: "flag", label: "Kuzatuvga olish", type: "select", options: [["1", "Ha, kuzatuvda"], ["0", "Yo'q"]] },
        { k: "note", label: "Qayd matni", type: "textarea" },
      ],
      onSave: (v) => { const s = stuById(v.sid); s.psychFlag = v.flag === "1"; delete v.flag; if (n) Object.assign(n, v); else D.psychNotes.push({ id: uid("p"), ...v }); },
      onDelete: n ? () => { D.psychNotes = D.psychNotes.filter((x) => x !== n); } : null });
  }

  // ═════════════ TO'GARAKLAR ═════════════
  const CLUB_TYPES = ["Maktab klubi", "Tarmoq to'garagi", "Kelajak.uzedu"];
  function pageClubs() {
    const st = myStudents();
    const list = D.clubs.filter((c) => state.clubType === "all" || c.type === state.clubType);
    const members = (c) => D.students.filter((s) => s.clubs.includes(c.id)).length;
    const mine = (c) => st.filter((s) => s.clubs.includes(c.id)).length;
    const daysHtml = (c) => `<div class="days">${[1, 2, 3, 4, 5, 6].map((d) => `<span class="${c.days.includes(d) ? "on" : ""}">${SHORT[d]}</span>`).join("")}</div>`;
    const body = !list.length ? '<div class="card empty">To\'garak yo\'q</div>' : view("clubs", "cards") === "cards"
      ? `<div class="cards">${list.map((c) => { const m = members(c); return `<div class="scard club" data-club="${c.id}">
          <div style="display:flex;justify-content:space-between;gap:8px"><div><div style="font-weight:700;font-size:15px">${esc(c.name)}</div><div class="muted" style="font-size:12.5px">${esc(c.leader)} · ${esc(c.type)}</div></div><span class="tag">${esc(c.time)}</span></div>
          ${daysHtml(c)}
          <div style="display:flex;justify-content:space-between;font-size:12.5px"><span class="muted">${icon("pin")} ${esc(c.room)}</span><span>${role().scope === "sinf" ? `<span class="muted">sinfingizdan ${mine(c)} · </span>` : ""}<b>${m}</b> / ${c.cap}</span></div>
          <div class="cap" data-tip="${m} / ${c.cap} o'rin band"><i style="width:${Math.min(100, (m / c.cap) * 100)}%"></i></div></div>`; }).join("")}</div>`
      : `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>Nomi</th><th>Turi</th><th class="hide-sm">Rahbar</th><th>Kunlar</th><th>Vaqt</th><th class="hide-sm">Xona</th><th class="num">A'zolar</th></tr></thead><tbody>
          ${list.map((c) => `<tr data-club="${c.id}"><td><b>${esc(c.name)}</b></td><td>${esc(c.type)}</td><td class="hide-sm">${esc(c.leader)}</td><td>${c.days.map((d) => SHORT[d]).join(", ")}</td><td>${esc(c.time)}</td><td class="hide-sm">${esc(c.room)}</td><td class="num">${members(c)} / ${c.cap}</td></tr>`).join("")}</tbody></table></div></div>`;
    return head("To'garak va klublar", D.clubs.length + " ta to'garak · " + D.students.filter((s) => s.clubs.length).length + " nafar o'quvchi qamrab olingan", addBtn("addClub", "Yangi to'garak") + viewToggle("clubs", "cards")) + `
      <div class="toolbar"><div class="seg">${[["all", "Barchasi"], ...CLUB_TYPES.map((t) => [t, t])].map((t) => `<button data-ctype="${esc(t[0])}" class="${state.clubType === t[0] ? "on" : ""}">${t[1]}</button>`).join("")}</div></div>${body}`;
  }
  function clubForm(c) {
    formModal({ title: c ? "To'garakni tahrirlash" : "Yangi to'garak", values: c || { type: "Maktab klubi", time: "15:00", cap: 15, days: [] },
      fields: [
        { k: "name", label: "Nomi", required: true, full: true }, { k: "type", label: "Turi", type: "select", options: CLUB_TYPES },
        { k: "leader", label: "Rahbar", required: true }, { k: "room", label: "Xona / joy" }, { k: "time", label: "Boshlanish vaqti", type: "time" },
        { k: "cap", label: "O'rinlar soni", type: "number", min: 1 }, { k: "days", label: "Mashg'ulot kunlari", type: "days" },
      ],
      onSave: (v) => { v.cap = v.cap || 15; if (c) Object.assign(c, v); else D.clubs.push({ id: uid("c"), ...v }); },
      onDelete: c ? () => { D.clubs = D.clubs.filter((x) => x !== c); D.students.forEach((s) => (s.clubs = s.clubs.filter((id) => id !== c.id))); } : null });
  }
  function clubDetail(c) {
    const mem = D.students.filter((s) => s.clubs.includes(c.id)).sort((a, b) => a.sinf.localeCompare(b.sinf) || fullName(a).localeCompare(fullName(b)));
    modal({ title: esc(c.name), wide: true,
      body: `<div class="kv"><div><span>Turi</span>${esc(c.type)}</div><div><span>Rahbar</span>${esc(c.leader)}</div><div><span>Kunlar va vaqt</span>${c.days.map((d) => WEEKDAYS[d]).join(", ") || "—"} · ${esc(c.time)}</div><div><span>Xona</span>${esc(c.room || "—")}</div></div>
        <div class="card-head" style="margin:6px 0 0"><h3>${icon("users")}A'zolar (${mem.length} / ${c.cap})</h3></div>
        <div class="list">${mem.map((s) => `<div class="row"><div class="avatar">${initials(fullName(s))}</div><div class="grow"><div class="title">${esc(fullName(s))}</div><div class="meta">${esc(s.sinf)}</div></div></div>`).join("") || '<div class="muted">Hali a\'zo yo\'q</div>'}</div>`,
      foot: canEdit() ? `<button class="btn left" id="cEdit">${icon("edit")}Tahrirlash</button><button class="btn primary" id="cMem">${icon("users")}A'zolarni boshqarish</button>` : `<button class="btn" data-close>Yopish</button>`,
      bind: (m, close) => { if ($("#cEdit", m)) { $("#cEdit", m).onclick = () => { close(); clubForm(c); }; $("#cMem", m).onclick = () => { close(); membersModal(c); }; } } });
  }
  function membersModal(c) {
    const pool = myStudents().slice().sort((a, b) => a.sinf.localeCompare(b.sinf) || fullName(a).localeCompare(fullName(b)));
    const sel = new Set(pool.filter((s) => s.clubs.includes(c.id)).map((s) => s.id));
    modal({ title: "A'zolar: " + esc(c.name), wide: true,
      body: `<label class="field">${icon("search")}<input id="mq" placeholder="Ism yoki sinf bo'yicha izlash..."></label><div class="muted" style="font-size:12.5px" id="mcount"></div><div class="member-list" id="mlist"></div>`,
      foot: `<button class="btn" data-close>Bekor qilish</button><button class="btn primary" id="mSave">Saqlash</button>`,
      bind: (m, close) => {
        const draw = () => {
          const q = $("#mq", m).value.trim().toLowerCase();
          $("#mlist", m).innerHTML = pool.filter((s) => !q || (fullName(s) + " " + s.sinf).toLowerCase().includes(q)).map((s) => `<label><input type="checkbox" value="${s.id}" ${sel.has(s.id) ? "checked" : ""}><span style="flex:1">${esc(fullName(s))}</span><span class="muted">${esc(s.sinf)}</span>${!s.clubs.length ? '<span class="badge warn">to\'garaksiz</span>' : ""}</label>`).join("");
          $("#mcount", m).textContent = sel.size + " / " + c.cap + " tanlangan";
          $$("#mlist input", m).forEach((i) => (i.onchange = () => { i.checked ? sel.add(i.value) : sel.delete(i.value); $("#mcount", m).textContent = sel.size + " / " + c.cap + " tanlangan"; }));
        };
        $("#mq", m).oninput = draw; draw();
        $("#mSave", m).onclick = () => {
          pool.forEach((s) => { const has = s.clubs.includes(c.id); if (sel.has(s.id) && !has) s.clubs.push(c.id); if (!sel.has(s.id) && has) s.clubs = s.clubs.filter((x) => x !== c.id); });
          save(); close(); toast("A'zolar saqlandi"); renderApp();
        };
      } });
  }

  // ═════════════ HAFTALIK JADVAL ═════════════
  function pageWeek() {
    const wd = D.today.getDay();
    const days = [1, 2, 3, 4, 5, 6];
    const byDay = (d) => D.clubs.filter((c) => c.days.includes(d)).sort((a, b) => a.time.localeCompare(b.time));
    const body = view("week", "cards") === "cards"
      ? `<div class="week">${days.map((d) => `<div class="day ${d === wd ? "today" : ""}"><h4>${WEEKDAYS[d]}${d === wd ? " · bugun" : ""}</h4>
          ${byDay(d).map((c) => `<div class="slot" data-club="${c.id}" style="cursor:pointer"><b>${esc(c.name)}</b>${esc(c.time)} · ${esc(c.room)}</div>`).join("") || '<div class="muted" style="font-size:12.5px">Mashg\'ulot yo\'q</div>'}</div>`).join("")}</div>`
      : `<div class="card">${days.map((d) => `<h3 style="font-size:14px;margin:${d === 1 ? 0 : 16}px 0 6px;color:${d === wd ? "var(--brand-ink)" : "var(--ink-2)"}">${WEEKDAYS[d]}${d === wd ? " · bugun" : ""}</h3>
          <div class="list">${byDay(d).map((c) => `<div class="row clickable" data-club="${c.id}"><div class="tag">${esc(c.time)}</div><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta">${esc(c.room)} · ${esc(c.leader)}</div></div></div>`).join("") || '<div class="muted" style="font-size:13px">Mashg\'ulot yo\'q</div>'}</div>`).join("")}</div>`;
    return head("Haftalik jadval", "Barcha to'garak va klub mashg'ulotlari bir joyda", viewToggle("week", "cards")) + body;
  }

  // ═════════════ YUTUQLAR ═════════════
  const ACH_LEVELS = ["Maktab", "Tuman bosqichi", "Viloyat bosqichi", "Respublika bosqichi", "Xalqaro", "Sertifikat"];
  function pageAchievements() {
    const rows = [];
    myStudents().forEach((s) => s.achievements.forEach((a) => rows.push({ s, a })));
    rows.sort((x, y) => y.a.date - x.a.date);
    const olymp = rows.filter((r) => /olimpiada/i.test(r.a.title)).length;
    const cert = rows.filter((r) => r.a.level === "Sertifikat").length;
    const body = !rows.length ? '<div class="card empty">Hozircha yutuq yo\'q</div>' : view("ach", "list") === "cards"
      ? `<div class="cards">${rows.map((r) => `<div class="scard" data-ach="${r.s.id}|${r.s.achievements.indexOf(r.a)}">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start"><div class="soon-icon" style="width:40px;height:40px;border-radius:11px">${icon("trophy")}</div><span class="badge good">${esc(r.a.result)}</span></div>
          <div><div class="nm">${esc(r.a.title)}</div><div class="muted" style="font-size:12.5px">${esc(r.a.level)} · ${fmtFull(r.a.date)}</div></div>
          <div class="namecell" style="font-size:13px"><div class="avatar">${initials(fullName(r.s))}</div>${esc(fullName(r.s))} · ${esc(r.s.sinf)}</div></div>`).join("")}</div>`
      : `<div class="card"><div class="table-wrap"><table class="t"><thead><tr><th>O'quvchi</th><th>Sinf</th><th>Yutuq</th><th class="hide-sm">Bosqich</th><th>Natija</th><th class="hide-sm">Sana</th></tr></thead><tbody>
          ${rows.map((r) => `<tr data-ach="${r.s.id}|${r.s.achievements.indexOf(r.a)}"><td><div class="namecell"><div class="avatar">${initials(fullName(r.s))}</div>${esc(fullName(r.s))}</div></td><td>${esc(r.s.sinf)}</td><td>${esc(r.a.title)}</td><td class="hide-sm">${esc(r.a.level)}</td><td><span class="badge good">${esc(r.a.result)}</span></td><td class="hide-sm">${fmtFull(r.a.date)}</td></tr>`).join("")}</tbody></table></div></div>`;
    return head("Yutuqlar", "Olimpiada, tanlov, musobaqa va sertifikatlar", addBtn("addAch", "Natija qo'shish") + viewToggle("ach", "list")) + `
      <div class="grid g-3" style="margin-bottom:16px">
        <div class="card stat"><div class="label">${icon("trophy")}Jami yutuqlar</div><div class="value">${rows.length}</div></div>
        <div class="card stat"><div class="label">${icon("test")}Olimpiadalar</div><div class="value">${olymp}</div></div>
        <div class="card stat"><div class="label">${icon("shield")}Sertifikatlar</div><div class="value">${cert}</div></div>
      </div>${body}`;
  }
  function achForm(ref, sid) {
    let s = null, a = null;
    if (ref) { const [id, idx] = ref.split("|"); s = stuById(id); a = s.achievements[+idx]; }
    formModal({ title: a ? "Natijani tahrirlash" : "Yangi natija", values: a ? { ...a, sid: s.id } : { sid: sid || "", date: D.today, level: "Tuman bosqichi" },
      fields: [
        { k: "sid", label: "O'quvchi", type: "select", required: true, full: true, options: [["", "— tanlang —"], ...myStudents().slice().sort((x, y) => fullName(x).localeCompare(fullName(y))).map((x) => [x.id, fullName(x) + " (" + x.sinf + ")"])] },
        { k: "title", label: "Olimpiada / tanlov / sertifikat nomi", required: true, full: true, placeholder: "Matematika olimpiadasi" },
        { k: "level", label: "Bosqich", type: "select", options: ACH_LEVELS }, { k: "result", label: "Natija", required: true, placeholder: "1-o'rin, A+, 7.0" },
        { k: "date", label: "Sana", type: "date", required: true },
      ],
      onSave: (v) => {
        const target = stuById(v.sid); const item = { title: v.title, level: v.level, result: v.result, date: v.date };
        if (a) { if (target !== s) { s.achievements.splice(s.achievements.indexOf(a), 1); target.achievements.push(item); } else Object.assign(a, item); }
        else target.achievements.push(item);
        toast("Saqlandi"); if (state.openStudent) setTimeout(() => openStudent(state.openStudent), 0);
      },
      onDelete: a ? () => { s.achievements.splice(s.achievements.indexOf(a), 1); } : null });
  }

  // ═════════════ ISH REJA ═════════════
  const TASK_TAGS = ["Hisobot", "Kengash", "Kasb", "To'garak", "Ota-onalar", "Tadbir", "Boshqa"];
  function pageTasks() {
    const open = D.tasks.filter((t) => !t.done).sort((a, b) => a.due - b.due);
    const done = D.tasks.filter((t) => t.done).sort((a, b) => b.due - a.due);
    const overdue = open.filter((t) => dayDiff(t.due) < 0), today = open.filter((t) => dayDiff(t.due) === 0), later = open.filter((t) => dayDiff(t.due) > 0);
    const col = (title, ic, arr) => `<div class="card"><div class="card-head"><h3>${icon(ic)}${title} <span class="muted" style="font-weight:500">(${arr.length})</span></h3></div><div class="list">${arr.map(taskRow).join("") || '<div class="empty">Bo\'sh</div>'}</div></div>`;
    const body = view("tasks", "list") === "cards"
      ? `<div class="kanban">${col("Muddati o'tgan", "alert", overdue)}${col("Bugun", "clock", today)}${col("Keyingi", "calendar", later)}${col("Bajarilgan", "check", done)}</div>`
      : `<div class="grid g-2">${col("Bajarilishi kerak", "clock", open)}${col("Bajarilgan", "check", done)}</div>`;
    return head("Ish reja", open.length + " ta ochiq vazifa" + (overdue.length ? " · " + overdue.length + " tasi muddati o'tgan" : ""), addBtn("addTask", "Yangi vazifa") + viewToggle("tasks", "list")) + body;
  }
  function taskForm(t) {
    formModal({ title: t ? "Vazifani tahrirlash" : "Yangi vazifa", values: t || { due: D.today, tag: "Boshqa" },
      fields: [{ k: "title", label: "Vazifa", required: true, full: true }, { k: "due", label: "Muddati", type: "date", required: true }, { k: "tag", label: "Turkum", type: "select", options: TASK_TAGS }],
      onSave: (v) => { if (t) Object.assign(t, v); else D.tasks.push({ id: uid("t"), done: false, ...v }); },
      onDelete: t ? () => { D.tasks = D.tasks.filter((x) => x !== t); } : null });
  }

  // ═════════════ SOZLAMALAR ═════════════
  function pageSettings() {
    const size = (store.get(DATA_KEY) || "").length;
    return head("Sozlamalar", "Maktab ma'lumotlari, zaxira nusxa va tiklash") + `
      <div class="grid g-2">
        <div class="card"><div class="card-head"><h3>${icon("home")}Maktab ma'lumotlari</h3>${canEdit() ? `<button class="link" id="editSchool">${icon("edit")}Tahrirlash</button>` : ""}</div>
          <div class="kv"><div><span>Maktab nomi</span>${esc(D.school.name)}</div><div><span>Hudud</span>${esc(D.school.region)}</div><div><span>O'quv yili</span>${esc(D.school.year)}</div><div><span>O'quvchilar</span>${D.students.length} nafar</div></div></div>
        <div class="card"><div class="card-head"><h3>${icon("shield")}Zaxira nusxa</h3></div>
          <div class="muted" style="font-size:13px;margin-bottom:12px">Hozircha ma'lumotlar shu brauzerda saqlanadi (${(size / 1024).toFixed(1)} KB). Boshqa kompyuterga o'tkazish yoki brauzer tozalanganda tiklash uchun zaxira oling.</div>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" id="backupBtn">${icon("download")}Zaxira olish (.json)</button>${canEdit() ? `<label class="btn">${icon("upload")}Tiklash<input type="file" id="restoreFile" accept=".json" hidden></label><button class="btn danger" id="resetBtn">${icon("trash")}Namunaga qaytarish</button>` : ""}</div></div>
      </div>`;
  }
  function bindSettings() {
    if ($("#editSchool")) $("#editSchool").onclick = () => formModal({ title: "Maktab ma'lumotlari", values: D.school,
      fields: [{ k: "name", label: "Maktab nomi", required: true, full: true }, { k: "region", label: "Hudud" }, { k: "year", label: "O'quv yili" }],
      onSave: (v) => { D.school = { ...D.school, ...v }; } });
    $("#backupBtn").onclick = () => {
      const blob = new Blob([JSON.stringify(snapshot(), null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "Maktadmin_zaxira_" + isoDate(D.today) + ".json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    if ($("#restoreFile")) $("#restoreFile").onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((t) => { try { const o = JSON.parse(t); if (!Array.isArray(o.students)) throw 0; applySnapshot(o); save(); toast("Ma'lumotlar tiklandi"); renderApp(); } catch (err) { toast("Fayl noto'g'ri formatda"); } }); };
    if ($("#resetBtn")) $("#resetBtn").onclick = () => confirmBox("Barcha o'zgarishlar o'chib, namunaviy ma'lumotlar qaytadi. Davom etilsinmi?", () => { store.set(DATA_KEY, null); location.reload(); });
  }

  // ═════════════ KEYINGI BOSQICH SAHIFALARI ═════════════
  const SOON = {
    testlar: ["Haftalik va mock testlar", ["Onlayn va qog'ozda test o'tkazish", "Savollar banki: Milliy sertifikat, DTM, SAT, Prezident maktablari", "Reyting, o'sish va pasayish grafiklari", "Eng ko'p xato qilingan mavzular tahlili"]],
    kasb: ["Kasbga yo'naltirish va OTM", ["7–9-sinflar uchun yo'naltirish dasturi va dars jurnali", "Ekskursiyalar va mutaxassislar bilan uchrashuvlar", "Bitiruvchilarning kelajak rejalari (OTM, kollej, ish)", "Qiziqish va qobiliyat testlari natijasi asosida tavsiya"]],
    sorovnoma: ["So'rovnomalar", ["Qiziqish, qobiliyat va tashkilotchilik so'rovnomalari", "Telefon orqali to'ldirish uchun havola", "Sinf va maktab bo'yicha avtomatik hisobot"]],
    kengash: ["O'quvchilar Kengashi saylovi", ["Nomzodlar va baholash mezonlari", "Sinf vakillari saylovi va bayonnomalar", "Tayyor Word hujjatlar"]],
    hisobot: ["Hisobotlar", ["Oylik, choraklik va yillik hisobot bitta tugma bilan", "Barcha bo'limlardan avtomatik yig'iladi", "Word va PDF formatida"]],
    hujjatlar: ["Hujjatlar", ["Papkalar: buyruqlar, rejalar, bayonnomalar", "Word, PDF fayllar va havolalar", "Normativ hujjatlar to'plami"]],
    maosh: ["Maosh kalkulyatori", ["Maslahatchi maoshi (stavka, toifa, staj)", "To'garak rahbari maoshi (soat bo'yicha)", "Tanlov g'olibi mukofot puli"]],
  };
  function pageSoon(page) {
    const n = navItem(page), s = SOON[page] || [n ? n[1] : "Bo'lim", []];
    return head(n ? n[1] : "Bo'lim", "") + `<div class="card"><div class="soon-hero"><div class="soon-icon">${icon(n ? n[2] : "grid")}</div>
        <div><span class="badge info">Keyingi bosqich</span><h3 style="font-size:18px;margin-top:8px">${s[0]}</h3><div class="muted" style="margin-top:4px">Bu bo'lim keyingi versiyada qo'shiladi. Rejalashtirilgan imkoniyatlar:</div>
        <ul class="feature-list">${s[1].map((f) => `<li>${icon("check")}<span>${f}</span></li>`).join("")}</ul></div></div></div>`;
  }

  // ── Hodisalarni bog'lash ──
  function bindPage() {
    const c = $("#content");
    const on = (sel, fn) => $$(sel, c).forEach((el) => (el.onclick = (e) => fn(el, e)));
    on("[data-nav]", (b) => go(b.dataset.nav));
    on("[data-student]", (b, e) => { e.stopPropagation(); openStudent(b.dataset.student); });
    on("[data-view]", (b) => { const [k, v] = b.dataset.view.split(":"); views[k] = v; store.set("ma-views", JSON.stringify(views)); renderPage(); });
    on("[data-task]", (b) => { const t = D.tasks.find((x) => x.id === b.dataset.task); t.done = !t.done; save(); renderPage(); });
    if (canEdit()) on("[data-edittask]", (b) => taskForm(D.tasks.find((x) => x.id === b.dataset.edittask)));
    on("[data-handle]", (b, e) => { e.stopPropagation(); const s = stuById(b.dataset.handle); s.risksHandled = !s.risksHandled; save(); renderApp(); });
    on("[data-risk]", (b) => { state.riskTab = b.dataset.risk; renderPage(); });
    on("[data-filter]", (b) => { state.filter = b.dataset.filter; renderPage(); });
    on("[data-ctype]", (b) => { state.clubType = b.dataset.ctype; renderPage(); });
    on("[data-club]", (b) => clubDetail(clubById(b.dataset.club)));
    if (canEdit()) on("[data-ach]", (b) => achForm(b.dataset.ach));
    on("[data-note]", (b) => noteForm(D.psychNotes.find((n) => n.id === b.dataset.note)));
    if (canEdit()) on("[data-event]", (b) => eventForm(D.events.find((e) => e.id === b.dataset.event)));
    const btn = (id, fn) => { const el = $("#" + id, c); if (el) el.onclick = fn; };
    btn("addStudent", () => studentForm(null)); btn("importBtn", importModal); btn("exportStu", exportStudents);
    btn("addClub", () => clubForm(null)); btn("addAch", () => achForm(null)); btn("addTask", () => taskForm(null));
    btn("addNote", () => noteForm(null)); btn("addEvent", () => eventForm(null));
    if (state.page === "sozlamalar") bindSettings();
    const sel = $("#sinfSel"); if (sel) sel.onchange = () => { state.sinf = sel.value; renderStudentsList(); };
    const ls = $("#lsearch"); if (ls) ls.oninput = () => { state.q = ls.value; $("#gsearch").value = ls.value; renderStudentsList(); };
    renderStudentsList();
    bindTips(c);
  }

  // ── Tooltip ──
  function bindTips(root) {
    const tip = $("#tooltip");
    $$("[data-tip]", root).forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        tip.innerHTML = el.dataset.tip; tip.classList.remove("hidden");
        const r = tip.getBoundingClientRect();
        let x = e.clientX + 14, y = e.clientY - r.height - 10;
        if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
        if (y < 8) y = e.clientY + 16;
        tip.style.left = x + "px"; tip.style.top = y + "px";
      });
      el.addEventListener("mouseleave", () => tip.classList.add("hidden"));
    });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$(".modal-bg")) { closeStudent(); const sb = $("#sidebar"); if (sb) sb.classList.remove("open"); const bg = $("#drawerBg"); if (bg) bg.classList.remove("open"); } });

  // Tez ko'rish uchun: index.html#as=u1&page=xavf&open=s5&view=students:cards
  const hp = new URLSearchParams(location.hash.slice(1));
  if (hp.get("as") && D.users.some((u) => u.id === hp.get("as"))) { state.userId = hp.get("as"); sess.set("ma-user", state.userId); if (hp.get("page")) state.page = hp.get("page"); }
  if (hp.get("open")) state.openStudent = hp.get("open");
  if (hp.get("view")) { const [k, v] = hp.get("view").split(":"); views[k] = v; }

  if (state.userId && user()) renderApp(); else renderLogin();
})();
