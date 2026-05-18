(() => {
  const DATA = window.ARNOMENDI_DATA;
  const CONFIG = {
    ACCESS_PASSWORD: "Arnomendi1234",
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "Contraseñasegura1234"
  };

  // Configuración online de Supabase. Esta clave es pública y está pensada para usarse desde navegador.
  const SUPABASE = {
    URL: "https://rahtacqygsmtdepezzme.supabase.co",
    KEY: "sb_publishable_G2x1JTTH80IuXJRZJ58D_Q_hsQ3BlT_",
    TABLE: "app_state",
    ROW_ID: "main"
  };

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const app = $("#app");
  const clone = (v) => JSON.parse(JSON.stringify(v ?? []));
  const load = (k, f) => {
    try { return JSON.parse(localStorage.getItem(k)) || clone(f); }
    catch { return clone(f); }
  };

  const ADMIN_USER = { id: "admin", name: "Administrador", role: "admin", avatar: "🇪🇸" };
  const state = {
    privateAccess: sessionStorage.getItem("arnomendi_private_access") === "1",
    user: null,
    active: "home",
    users: load("arnomendi_users_v2", DATA.users || []),
    events: load("arnomendi_events_v2", DATA.events || []),
    bets: load("arnomendi_bets_v2", DATA.bets || []),
    onlineReady: false,
    onlineError: ""
  };

  async function sb(path, options = {}) {
    const res = await fetch(`${SUPABASE.URL}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: SUPABASE.KEY,
        Authorization: `Bearer ${SUPABASE.KEY}`,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    });
    if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    if (res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  async function loadOnlineState() {
    try {
      const rows = await sb(`${SUPABASE.TABLE}?id=eq.${SUPABASE.ROW_ID}&select=*`);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        state.users = Array.isArray(row.users) ? row.users : [];
        state.events = Array.isArray(row.events) && row.events.length ? row.events : clone(DATA.events || []);
        state.bets = Array.isArray(row.bets) ? row.bets : [];
      } else {
        state.users = [];
        state.events = clone(DATA.events || []);
        state.bets = [];
        await syncOnlineState();
      }
      localStorage.setItem("arnomendi_users_v2", JSON.stringify(state.users));
      localStorage.setItem("arnomendi_events_v2", JSON.stringify(state.events));
      localStorage.setItem("arnomendi_bets_v2", JSON.stringify(state.bets));
      state.onlineReady = true;
      state.onlineError = "";
    } catch (err) {
      console.error("Supabase no disponible:", err);
      state.onlineReady = false;
      state.onlineError = "No se ha podido conectar con Supabase. La web está usando datos locales de este navegador.";
    }
  }

  async function syncOnlineState() {
    const payload = {
      id: SUPABASE.ROW_ID,
      users: state.users,
      events: state.events,
      bets: state.bets,
      updated_at: new Date().toISOString()
    };
    await sb(SUPABASE.TABLE, {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify(payload)
    });
  }

  const save = () => {
    localStorage.setItem("arnomendi_users_v2", JSON.stringify(state.users));
    localStorage.setItem("arnomendi_events_v2", JSON.stringify(state.events));
    localStorage.setItem("arnomendi_bets_v2", JSON.stringify(state.bets));
    syncOnlineState().catch(err => {
      console.error("No se pudo guardar en Supabase:", err);
      state.onlineReady = false;
      state.onlineError = "No se ha podido guardar online. Revisa Supabase o tu conexión.";
    });
  };

  const e = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
  const normalize = (v) => String(v ?? "").trim().toLowerCase();
  const flag = (t) => DATA.flags[t] || "⚽";
  const isSpain = (m) => m.home === "España" || m.away === "España";
  const team = (n) => `<span class="team-pill"><span>${flag(n)}</span><span>${e(n)}</span></span>`;
  const stage = (g) => /^[A-L]$/.test(g) ? `Grupo ${g}` : g;
  const statusLabel = (s) => s === "open" ? "Abierta" : s === "closed" ? "Cerrada" : "Finalizada";
  const statusPill = (s) => `<span class="badge">${statusLabel(s)}</span>`;
  const go = (page) => { state.active = page; render(); };
  const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role, avatar: u.avatar });

  const SPAIN_SCORERS = [
    "Lamine Yamal", "Nico Williams", "Mikel Oyarzabal", "Ferran Torres", "Dani Olmo", "Álex Baena",
    "Yeremy Pino", "Ander Barrenetxea", "Víctor Muñoz", "Borja Iglesias", "Ansu Fati", "Toni Martínez",
    "Gonzalo García", "Carlos Espí", "Jesús Rodríguez", "Alberto Moleiro", "Mikel Merino", "Pedri González",
    "Gavi", "Rodrigo Hernández", "Fabián Ruiz", "Martín Zubimendi", "Pablo Fornals", "Carlos Soler",
    "Fermín López", "Pablo Barrios", "Marcos Llorente", "Marc Cucurella", "Alejandro Grimaldo", "Pedro Porro",
    "Pau Cubarsí", "Dean Huijsen", "Aymeric Laporte", "Robin Le Normand", "Dani Vivian", "Eric García",
    "Pau Torres", "Christian Mosquera", "Óscar Mingueza", "Álex Grimaldo", "No marca ningún español"
  ];

  const WORLD_CUP_TEAMS = DATA.groups.flatMap(g => g.teams);
  const SHIP_ART = "assets/arnomendi-ship.png";

  const eventTypeLabel = (type) => ({
    score: "Resultado exacto",
    winner: "Ganador del encuentro",
    scorer: "Goleador de España",
    worldcup_winner: "Ganador del Mundial",
    choice: "Opción múltiple"
  }[type] || "Opción");

  const fixtureLabel = (m) => `${m.no}. ${m.date} · ${m.time} · ${m.home} vs ${m.away}`;

  const MONTHS_ES = { ene:0, enero:0, feb:1, febrero:1, mar:2, marzo:2, abr:3, abril:3, may:4, mayo:4, jun:5, junio:5, jul:6, julio:6, ago:7, agosto:7, sep:8, septiembre:8, sept:8, oct:9, octubre:9, nov:10, noviembre:10, dic:11, diciembre:11 };

  function parseDeadlineDate(deadline) {
    const raw = String(deadline || "").toLowerCase();
    const m = raw.match(/(\d{1,2})\s+([a-záéíóúñ]+)(?:\s*·\s*(\d{1,2}):(\d{2}))?/i);
    if (!m) return null;
    const month = MONTHS_ES[m[2]];
    if (month === undefined) return null;
    return new Date(2026, month, Number(m[1]), Number(m[3] || 23), Number(m[4] || 59), 0);
  }

  function deadlineBadge(ev) {
    const d = ev.deadline || "Pendiente";
    if (ev.status === "finished") return `<span class="deadline-badge done">✅ Finalizada</span>`;
    if (ev.status === "closed") return `<span class="deadline-badge locked">🔒 Cerrada · ${e(d)}</span>`;
    const parsed = parseDeadlineDate(d);
    if (!parsed) return `<span class="deadline-badge">⏳ Cierre · ${e(d)}</span>`;
    const now = new Date();
    const days = Math.ceil((parsed - now) / 86400000);
    if (days < 0) return `<span class="deadline-badge urgent">⚠️ Plazo vencido</span>`;
    if (days === 0) return `<span class="deadline-badge urgent">⏳ Cierra hoy · ${e(d)}</span>`;
    if (days === 1) return `<span class="deadline-badge soon">⏳ Cierra mañana · ${e(d)}</span>`;
    if (days <= 3) return `<span class="deadline-badge soon">⏳ Quedan ${days} días · ${e(d)}</span>`;
    return `<span class="deadline-badge">⏳ Cierra · ${e(d)}</span>`;
  }

  function optionsForType(type, matchNo, customText = "") {
    if (type === "winner") return winnerOptionsFromFixture(matchNo);
    if (type === "worldcup_winner") return WORLD_CUP_TEAMS;
    if (type === "scorer") return SPAIN_SCORERS;
    if (type === "choice") return String(customText || "").split("\n").map(x => x.trim()).filter(Boolean);
    return [];
  }

  function winnerOptionsFromFixture(matchNo) {
    const m = DATA.fixtures.find(x => String(x.no) === String(matchNo));
    return m ? [m.home, "Empate", m.away] : [];
  }

  function defaultTitleFor(type, matchNo) {
    const m = DATA.fixtures.find(x => String(x.no) === String(matchNo));
    if (type === "worldcup_winner") return "¿Quién ganará el Mundial?";
    if (type === "scorer") return m ? `Goleador español · ${m.home} vs ${m.away}` : "Goleador de España";
    if (type === "winner") return m ? `Ganador · ${m.home} vs ${m.away}` : "Ganador del encuentro";
    if (type === "score") return m ? `${m.home} vs ${m.away}` : "Resultado exacto";
    return "Nueva apuesta";
  }

  function score(event, prediction, result) {
    if (!prediction || !result) return 0;
    if (["choice", "winner", "scorer", "worldcup_winner"].includes(event.type)) {
      return normalize(prediction) === normalize(result) ? event.pointsExact : 0;
    }
    const clean = (v) => String(v).replace(/\s/g, "").replace(":", "-");
    const p = clean(prediction), r = clean(result);
    if (p === r) return event.pointsExact;
    const [ph, pa] = p.split("-").map(Number), [rh, ra] = r.split("-").map(Number);
    if ([ph, pa, rh, ra].some(Number.isNaN)) return 0;
    return Math.sign(ph - pa) === Math.sign(rh - ra) ? event.pointsPartial : 0;
  }

  function ranking() {
    return state.users.map(user => {
      const mine = state.bets.filter(b => b.userId === user.id);
      return { user, points: mine.reduce((s, b) => s + (b.points || 0), 0), hits: mine.filter(b => b.points > 0).length };
    }).sort((a, b) => b.points - a.points || b.hits - a.hits || a.user.name.localeCompare(b.user.name));
  }

  function render() {
    if (!state.privateAccess) return privateGate();
    if (!state.user) return auth();

    const admin = state.user.role === "admin";
    const navItems = admin
      ? `${nav("home", "🏠 Inicio")}${nav("worldcup", "🇪🇸 Mundial 2026")}${nav("bets", "🎯 Porras")}${nav("ranking", "🏅 Ranking")}${nav("admin", "🛡️ Admin")}`
      : `${nav("home", "🏠 Inicio")}${nav("worldcup", "🇪🇸 Mundial 2026")}${nav("bets", "🎯 Porras")}${nav("ranking", "🏅 Ranking")}${nav("profile", "👤 Mi perfil")}`;

    const onlineBadge = `<span class="online-badge ${state.onlineReady ? "ok" : "bad"}" title="${e(state.onlineError || "Conectado a Supabase")}">${state.onlineReady ? "● Online" : "● Local"}</span>`;
    app.innerHTML = `<div class="top"></div><header class="header"><div class="container header-row"><button class="brand" data-go="home"><span class="logo">🏆</span><span class="logo-text">La Porra<span>del Arnomendi</span></span></button><nav class="nav">${navItems}</nav>${onlineBadge}<div class="chip"><span class="avatar">${e(state.user.avatar)}</span><div><strong>${e(state.user.name)}</strong><div class="muted">${admin ? "Panel de administrador" : "¡Vamos España!"}</div></div><button class="logout" title="Cerrar sesión">⎋</button></div></div></header><main class="main container" id="page"></main>`;
    $(".logout").onclick = () => { state.user = null; state.active = "home"; render(); };
    $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
    page();
  }

  function nav(id, label) { return `<button class="${state.active === id ? "active" : ""}" data-go="${id}">${label}</button>`; }

  function privateGate() {
    app.innerHTML = `<div class="top"></div><section class="login"><div class="container login-grid"><div><span class="badge">Acceso privado · Mundial 2026</span><h1 class="hero-title">La Porra del <span class="gold">Arnomendi</span></h1><p class="lead">Antes de entrar, introduce la contraseña general del grupo. Después podrás iniciar sesión o crear tu usuario.</p><div class="features"><div class="card feature"><div class="icon">🔐</div><strong>Entrada privada</strong><div class="muted">Evita accesos ajenos al grupo.</div></div><div class="card feature"><div class="icon">👤</div><strong>Usuarios propios</strong><div class="muted">Cada participante crea su cuenta.</div></div><div class="card feature"><div class="icon">🛡️</div><strong>Admin separado</strong><div class="muted">Menú distinto para gestión.</div></div></div></div><form class="card auth-card" id="gateForm"><span class="badge">Primer paso</span><h2 class="section-title" style="margin-top:12px">Contraseña general</h2><p class="section-sub">Esta clave es común para todos los participantes.</p><input class="input auth-input" id="gatePassword" type="password" autocomplete="current-password" placeholder="Contraseña general"><button class="btn primary auth-submit" type="submit">Entrar</button><div class="auth-message" id="gateMessage"></div></form></div></section>`;
    $("#gateForm").onsubmit = (ev) => {
      ev.preventDefault();
      const pass = $("#gatePassword").value;
      if (pass === CONFIG.ACCESS_PASSWORD) {
        sessionStorage.setItem("arnomendi_private_access", "1");
        state.privateAccess = true;
        render();
      } else {
        $("#gateMessage").textContent = "Contraseña incorrecta.";
      }
    };
  }

  function auth() {
    app.innerHTML = `<div class="top"></div><section class="login"><div class="container login-grid"><div><span class="badge">Zona de usuarios</span><h1 class="hero-title">Entra en la <span class="gold">porra</span></h1><p class="lead">Inicia sesión con tu usuario o crea una cuenta nueva. La cuenta queda guardada en este navegador para participar en la porra.</p><div class="features"><div class="card feature"><div class="icon">🎯</div><strong>Porras</strong><div class="muted">Resultados y predicciones.</div></div><div class="card feature"><div class="icon">🏅</div><strong>Ranking</strong><div class="muted">Clasificación automática.</div></div><div class="card feature"><div class="icon">📅</div><strong>Mundial</strong><div class="muted">Calendario en horario español.</div></div></div></div><div class="grid auth-grid"><form class="card auth-card" id="loginForm"><span class="badge">Ya tengo cuenta</span><h2 class="section-title" style="margin-top:12px">Iniciar sesión</h2><input class="input auth-input" id="loginName" autocomplete="username" placeholder="Nombre de usuario"><input class="input auth-input" id="loginPassword" type="password" autocomplete="current-password" placeholder="Contraseña"><button class="btn primary auth-submit" type="submit">Entrar</button><div class="auth-message" id="loginMessage"></div></form><form class="card auth-card" id="createUserForm"><span class="badge">Nuevo participante</span><h2 class="section-title" style="margin-top:12px">Crear usuario</h2><input class="input auth-input" id="newUserName" autocomplete="username" placeholder="Nombre de usuario"><input class="input auth-input" id="newUserPassword" type="password" autocomplete="new-password" placeholder="Contraseña"><button class="btn secondary auth-submit" type="submit">Crear y entrar</button><div class="auth-message" id="createMessage"></div></form></div></div></section>`;

    $("#loginForm").onsubmit = (ev) => {
      ev.preventDefault();
      const name = $("#loginName").value.trim();
      const pass = $("#loginPassword").value;
      if (normalize(name) === normalize(CONFIG.ADMIN_USERNAME) && pass === CONFIG.ADMIN_PASSWORD) {
        state.user = ADMIN_USER;
        state.active = "admin";
        return render();
      }
      const user = state.users.find(u => normalize(u.name) === normalize(name) && u.password === pass);
      if (!user) {
        $("#loginMessage").textContent = "Usuario o contraseña incorrectos.";
        return;
      }
      state.user = publicUser(user);
      state.active = "home";
      render();
    };

    $("#createUserForm").onsubmit = (ev) => {
      ev.preventDefault();
      const name = $("#newUserName").value.trim();
      const pass = $("#newUserPassword").value;
      if (name.length < 2) return $("#createMessage").textContent = "El nombre debe tener al menos 2 caracteres.";
      if (pass.length < 3) return $("#createMessage").textContent = "La contraseña debe tener al menos 3 caracteres.";
      if (normalize(name) === normalize(CONFIG.ADMIN_USERNAME) || state.users.some(u => normalize(u.name) === normalize(name))) {
        return $("#createMessage").textContent = "Ese nombre de usuario ya existe.";
      }
      const user = { id: `u${Date.now()}`, name, password: pass, role: "user", avatar: name[0].toUpperCase() };
      state.users.push(user);
      save();
      state.user = publicUser(user);
      state.active = "home";
      render();
    };
  }

  function page() {
    const p = $("#page");
    if (state.active === "home") p.innerHTML = state.user.role === "admin" ? adminHome() : home();
    if (state.active === "worldcup") p.innerHTML = worldcup();
    if (state.active === "bets") p.innerHTML = bets();
    if (state.active === "ranking") p.innerHTML = rankingView();
    if (state.active === "profile") p.innerHTML = state.user.role === "admin" ? adminHome() : profile();
    if (state.active === "admin") p.innerHTML = state.user.role === "admin" ? admin() : home();
    bind();
  }

  function stat(icon, label, value, hint) { return `<div class="card stat"><div class="row"><div class="stat-icon">${icon}</div><div><div class="stat-label">${e(label)}</div><div class="stat-value">${e(value)}</div><div class="stat-hint">${e(hint)}</div></div></div></div>`; }
  function miniEvent(ev) { return `<div class="group-card">${statusPill(ev.status)}<h3 class="event-title">${e(ev.title)}</h3><div class="section-sub">${e(ev.phase)}</div><div style="margin-top:12px;color:var(--gold);font-weight:950">${ev.pointsExact} pts</div></div>`; }

  function adminHome() {
    return `<div class="grid"><section class="hero-grid"><div class="card hero-card"><span class="badge">🛡️ Administración</span><h1 class="hero-title">La Porra del <span class="gold">Arnomendi</span></h1><p class="lead">Gestiona eventos, cierra porras, introduce resultados y revisa la participación sin entrar como usuario normal.</p><div class="btns"><button class="btn primary" data-go="admin">🛡️ Ir al panel admin</button><button class="btn secondary" data-go="ranking">🏅 Ver ranking</button></div></div><div class="card spain-card"><span class="badge">Resumen</span><div class="grid" style="margin-top:18px">${stat("👥", "Usuarios", state.users.length, "Creados")}${stat("📅", "Eventos", state.events.length, "Porras")}${stat("🎯", "Apuestas", state.bets.length, "Registradas")}</div></div></section></div>`;
  }

  function home() {
    const r = ranking(), myPos = r.findIndex(x => x.user.id === state.user.id) + 1, myPoints = r.find(x => x.user.id === state.user.id)?.points || 0;
    const spain = DATA.fixtures.filter(isSpain);
    return `<div class="grid"><section class="hero-grid"><div class="card hero-card"><span class="badge">🏆 Mundial 2026</span><h1 class="hero-title">La Porra del <span class="gold">Arnomendi</span></h1><p class="lead">Predice resultados, apuesta por España y consulta el calendario completo del Mundial en horario español.</p><div class="btns"><button class="btn primary" data-go="bets">🎯 Hacer apuesta</button><button class="btn secondary" data-go="worldcup">🇪🇸 Ver Mundial 2026</button></div><img class="hero-ship" src="${SHIP_ART}" alt="Arnomendi"></div><div class="card spain-card"><span class="badge">🇪🇸 Próximo partido de España</span><div class="versus"><div><div class="bigflag">🇪🇸</div><strong>ESPAÑA</strong></div><div class="vs">VS</div><div><div class="bigflag">🇨🇻</div><strong>CABO VERDE</strong></div></div><div class="match-meta"><div>📅 Lunes, 15 de junio de 2026</div><div>🕕 18:00 h · hora peninsular española</div><div>📍 Atlanta Stadium</div></div></div></section><section class="grid grid4">${stat("📅", "Eventos abiertos", state.events.filter(x => x.status === "open").length, "¡Participa ahora!")}${stat("🎯", "Tus apuestas", state.bets.filter(x => x.userId === state.user.id).length, "Pronósticos")}${stat("🏅", "Tu posición", myPos ? `${myPos}º` : "-", "Ranking")}${stat("⭐", "Puntos", myPoints, "¡Sigue sumando!")}</section><section class="layout"><div class="card"><h2 class="section-title">Partidos de España</h2><p class="section-sub">Grupo H · horario de España.</p><div class="fixtures" style="margin-top:16px">${spain.map(m => fixture(m, true)).join("")}</div></div><div class="card"><h2 class="section-title">Porras destacadas</h2><p class="section-sub">Eventos principales para empezar.</p><div class="grid grid2" style="margin-top:16px">${state.events.slice(0, 4).map(miniEvent).join("")}</div></div></section></div>`;
  }

  function worldcup() {
    return `<div class="grid"><section class="card"><span class="badge">🏆 Datos del Mundial</span><div class="layout" style="align-items:end;margin-top:16px"><div><h1 class="section-title" style="font-size:44px">Mundial 2026</h1><p class="section-sub">Grupos, participantes y calendario completo en horario peninsular español.</p></div><div class="grid grid3">${stat("🌍", "Selecciones", 48, "Participantes")}${stat("📊", "Grupos", 12, "A-L")}${stat("📅", "Partidos", 104, "Calendario")}</div></div></section><section class="layout"><div class="card"><h2 class="section-title">Grupos y participantes</h2><p class="section-sub">Todas las selecciones ordenadas por grupo.</p><div class="group-grid">${DATA.groups.map(groupCard).join("")}</div></div><div class="card"><span class="badge">🇪🇸 Camino de España</span><h2 class="section-title" style="margin-top:14px">Partidos de España</h2><p class="section-sub">Grupo H · horario de España.</p><div class="fixtures" style="margin-top:16px">${DATA.fixtures.filter(isSpain).map(m => fixture(m, true)).join("")}</div></div></section><section class="card"><div class="layout" style="align-items:end"><div><h2 class="section-title">Calendario completo</h2><p class="section-sub">Fase de grupos y eliminatorias.</p></div><label class="search">🔎<input id="fixtureSearch" placeholder="Buscar equipo, grupo o sede..."></label></div><div class="filters">${["Todos", "España", ...DATA.groups.map(g => g.group), "Eliminatorias"].map((f, i) => `<button class="filter ${i === 0 ? "active" : ""}" data-filter="${e(f)}">${f.length === 1 ? `Grupo ${f}` : f}</button>`).join("")}</div><div class="scroll fixtures">${DATA.fixtures.map(m => fixture(m)).join("")}</div></section></div>`;
  }

  function groupCard(g) { return `<div class="group-card ${g.group === "H" ? "spain" : ""}"><div class="group-head"><strong>Grupo ${g.group}</strong>${g.group === "H" ? `<span class="badge">España</span>` : ""}</div>${g.teams.map(t => `<div class="team-line"><span>${e(t)}</span><span>${flag(t)}</span></div>`).join("")}</div>`; }
  function fixture(m, compact = false) { const search = `${m.home} ${m.away} ${m.group} ${m.venue}`.toLowerCase(); return `<div class="fixture ${isSpain(m) ? "spain" : ""}" data-fixture data-search="${e(search)}" data-group="${e(m.group)}"><div class="fixture-grid"><div><div class="muted">Partido</div><div class="fixture-no">${m.no}</div></div><div><strong>${e(m.date)}</strong><div class="fixture-time">${e(m.time)} h</div></div><div><div>${team(m.home)} <strong style="color:var(--muted);margin:0 6px">vs</strong> ${team(m.away)}</div><div class="venue">📍 ${e(m.venue)}</div></div>${compact ? "" : `<div class="fixture-stage"><span class="badge">${e(stage(m.group))}</span></div>`}</div></div>`; }

  function eventGroup(title, subtitle, status, icon) {
    const items = state.events.filter(ev => ev.status === status);
    return `<section class="bet-group" data-event-group="${status}"><div class="event-group-head"><div><h2 class="section-title">${icon} ${title}</h2><p class="section-sub">${subtitle}</p></div><span class="badge">${items.length}</span></div><div class="grid grid2">${items.length ? items.map(eventCard).join("") : `<div class="card empty-state">No hay porras en este apartado.</div>`}</div></section>`;
  }

  function bets() {
    return `<div class="grid"><section class="card"><div class="layout" style="align-items:end"><div><h1 class="section-title">Porras</h1><p class="section-sub">Eventos ordenados por estado para que se vea claramente qué se puede apostar, qué está cerrado y qué ya ha puntuado.</p></div><div class="filters" style="margin:0">${[["all", "Todas"], ["spain", "España"], ["open", "Abiertas"], ["closed", "Cerradas"], ["finished", "Finalizadas"]].map(([id, l], i) => `<button class="filter ${i === 0 ? "active" : ""}" data-event-filter="${id}">${l}</button>`).join("")}</div></div></section>${eventGroup("Abiertas", "Disponibles para apostar ahora.", "open", "🟢")}${eventGroup("Cerradas", "Ya no admiten apuestas, pendientes de resultado.", "closed", "🔒")}${eventGroup("Finalizadas", "Resultado introducido y puntos calculados.", "finished", "✅")}</div>`;
  }

  function predictionControl(ev, existing) {
    if (ev.type === "score") {
      return `<input class="input" data-prediction="${ev.id}" placeholder="Ej: 2-1" value="${e(existing?.prediction || "")}">`;
    }
    const opts = ev.options || [];
    return `<select class="select" data-prediction="${ev.id}"><option value="">Selecciona una opción</option>${opts.map(o => `<option value="${e(o)}" ${existing?.prediction === o ? "selected" : ""}>${e(o)}</option>`).join("")}</select>`;
  }

  function resultControl(ev) {
    if (ev.type === "score") {
      return `<input class="input" data-result="${ev.id}" placeholder="Resultado correcto. Ej: 2-1" value="${e(ev.correctResult || "")}">`;
    }
    return `<select class="select" data-result="${ev.id}"><option value="">Selecciona resultado correcto</option>${(ev.options || []).map(o => `<option value="${e(o)}" ${ev.correctResult === o ? "selected" : ""}>${e(o)}</option>`).join("")}</select>`;
  }

  function eventCard(ev) {
    const existing = state.bets.find(b => b.userId === state.user.id && b.eventId === ev.id),
      can = ev.status === "open" && state.user.role !== "admin",
      count = state.bets.filter(b => b.eventId === ev.id).length;
    return `<article class="card" data-event data-status="${e(ev.status)}" data-title="${e(ev.title.toLowerCase())}"><div class="event-top"><div><div class="row">${statusPill(ev.status)}<span class="badge">${e(ev.phase)}</span></div><h3 class="event-title">${e(ev.title)}</h3><div class="deadline-row">${deadlineBadge(ev)}</div></div><div class="stat-icon">${can ? "🎯" : ev.status === "closed" ? "🔒" : "✅"}</div></div><div class="event-meta"><div class="mini"><strong>Puntos</strong><span>${ev.pointsExact} exacto${ev.pointsPartial ? ` · ${ev.pointsPartial} signo` : ""}</span></div><div class="mini"><strong>Apuestas</strong><span>${count}</span></div><div class="mini"><strong>Tipo</strong><span>${eventTypeLabel(ev.type)}</span></div></div>${existing ? `<div class="current"><strong>Tu apuesta actual</strong><br>${e(existing.prediction)} · ${existing.points ?? "pendiente"}</div>` : ""}${can ? `<div class="form">${predictionControl(ev, existing)}<button class="btn primary" data-bet="${ev.id}">${existing ? "Actualizar" : "Apostar"}</button></div>` : `<div class="mini" style="margin-top:16px"><span>${state.user.role === "admin" ? "El administrador no participa como apostante." : ev.status === "closed" ? "Evento cerrado pendiente de resultado." : `Resultado correcto: ${e(ev.correctResult || "pendiente")}`}</span></div>`}</article>`;
  }

  function rankingView() {
    const rows = ranking();
    return `<div class="grid"><section class="card"><h1 class="section-title">Clasificación general</h1><p class="section-sub">Ranking de La Porra del Arnomendi.</p></section><section class="card" style="overflow:hidden;padding:0">${rows.length ? `<table class="table"><thead><tr><th>Pos.</th><th>Usuario</th><th class="right">Puntos</th><th class="right">Aciertos</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.user.id === state.user.id ? "me" : ""}"><td><strong>${i + 1}</strong></td><td><span class="row"><span class="avatar" style="width:34px;height:34px">${e(r.user.avatar)}</span><span><strong>${e(r.user.name)}${r.user.id === state.user.id ? " (Tú)" : ""}</strong><br><span class="muted">Participante</span></span></span></td><td class="right"><strong style="color:var(--gold)">${r.points}</strong></td><td class="right">${r.hits}</td></tr>`).join("")}</tbody></table>` : `<div class="empty-state">Todavía no hay usuarios registrados.</div>`}</section></div>`;
  }

  function profile() { const rows = ranking(), row = rows.find(r => r.user.id === state.user.id), pos = rows.findIndex(r => r.user.id === state.user.id) + 1, mine = state.bets.filter(b => b.userId === state.user.id); return `<div class="grid"><section class="card"><div class="layout" style="align-items:center"><div class="row"><span class="avatar" style="width:78px;height:78px;font-size:30px">${e(state.user.avatar)}</span><span><h1 class="section-title">${e(state.user.name)}</h1><p class="section-sub">Participante · La Porra del Arnomendi</p></span></div><div class="grid grid3">${stat("⭐", "Puntos", row?.points || 0, "Totales")}${stat("🏅", "Posición", pos || "-", "Ranking")}${stat("🎯", "Apuestas", mine.length, "Realizadas")}</div></div></section><section class="grid grid2">${mine.map(b => { const ev = state.events.find(x => x.id === b.eventId); return ev ? `<div class="card">${statusPill(ev.status)}<h3 class="event-title">${e(ev.title)}</h3><p class="section-sub">Tu apuesta: <strong style="color:var(--gold)">${e(b.prediction)}</strong></p><p class="section-sub">Puntos: <strong>${b.points ?? "pendiente"}</strong></p></div>` : ""; }).join("") || `<div class="card"><p class="section-sub">Todavía no has realizado apuestas.</p></div>`}</section></div>`; }

  function admin() {
    const fixtureOptions = DATA.fixtures.map(m => `<option value="${m.no}">${e(fixtureLabel(m))}</option>`).join("");
    return `<div class="admin"><section class="card"><span class="badge">➕ Nueva apuesta</span><h1 class="section-title" style="margin-top:14px">Panel de administrador</h1><p class="section-sub">Crea porras de resultado, ganador del encuentro, ganador del Mundial o goleador de España. Las opciones se generan automáticamente para que los usuarios elijan, no escriban.</p><div class="grid admin-create" style="margin-top:18px"><label class="field-label">Tipo de apuesta<select class="select" id="newType"><option value="score">Resultado exacto</option><option value="winner">Ganador del encuentro</option><option value="worldcup_winner">Ganador del Mundial</option><option value="scorer">Goleador de España</option><option value="choice">Opción múltiple personalizada</option></select></label><label class="field-label" id="matchField">Partido<select class="select" id="newMatch">${fixtureOptions}</select></label><label class="field-label">Título<input class="input" id="newTitle" placeholder="Se genera automáticamente si lo dejas vacío"></label><label class="field-label">Fecha límite<input class="input" id="newDeadline" placeholder="Ej: 15 jun · 18:00"></label><label class="field-label">Puntos por acierto exacto<input class="input" id="newPointsExact" type="number" min="0" step="1" value="5"></label><label class="field-label" id="partialPointsField">Puntos por acertar signo<input class="input" id="newPointsPartial" type="number" min="0" step="1" value="3"></label><label class="field-label custom-options-field" id="customOptionsField">Opciones personalizadas<textarea class="input textarea" id="newOptions" placeholder="Una opción por línea"></textarea></label><div class="mini option-preview" id="optionPreview"><strong>Opciones que verá el usuario</strong><span></span></div><button class="btn primary" id="createEvent">Crear apuesta</button></div></section><section class="card"><div class="event-top"><div><h2 class="section-title">Usuarios registrados</h2><p class="section-sub">Puedes eliminar usuarios normales. Al hacerlo también se borran sus apuestas.</p></div><span class="badge">${state.users.length} usuarios</span></div><div style="margin-top:16px;overflow:hidden;border-radius:20px;border:1px solid var(--border)">${state.users.length ? `<table class="table"><thead><tr><th>Usuario</th><th class="right">Apuestas</th><th class="right">Acción</th></tr></thead><tbody>${state.users.map(adminUserRow).join("")}</tbody></table>` : `<div class="empty-state">Todavía no hay usuarios registrados.</div>`}</div></section><section><h2 class="section-title">Eventos creados</h2><p class="section-sub">Puedes editar, abrir, cerrar, finalizar o eliminar una apuesta. Si eliminas una apuesta también se borran sus pronósticos asociados.</p><div class="grid" style="margin-top:16px">${state.events.map(adminCard).join("")}</div></section></div>`;
  }

  function adminUserRow(u) {
    const userBets = state.bets.filter(b => b.userId === u.id).length;
    return `<tr><td><span class="row"><span class="avatar" style="width:34px;height:34px">${e(u.avatar || u.name?.[0] || "👤")}</span><span><strong>${e(u.name)}</strong><br><span class="muted">Participante</span></span></span></td><td class="right">${userBets}</td><td class="right"><button class="btn danger small-btn" data-delete-user="${u.id}">Eliminar</button></td></tr>`;
  }

  function editTypeOptions(current) {
    return [["score", "Resultado exacto"], ["winner", "Ganador del encuentro"], ["worldcup_winner", "Ganador del Mundial"], ["scorer", "Goleador de España"], ["choice", "Opción múltiple personalizada"]]
      .map(([id, label]) => `<option value="${id}" ${current === id ? "selected" : ""}>${label}</option>`).join("");
  }

  function editMatchOptions(ev) {
    const current = String(ev.matchNo || "");
    return DATA.fixtures.map(m => `<option value="${m.no}" ${String(m.no) === current ? "selected" : ""}>${e(fixtureLabel(m))}</option>`).join("");
  }

  function editableOptionsText(ev) {
    return (ev.options || []).join("\n");
  }

  function adminCard(ev) {
    const eb = state.bets.filter(b => b.eventId === ev.id);
    return `<article class="card"><div class="event-top"><div><div class="row">${statusPill(ev.status)}<span class="badge">${eb.length} apuestas</span><span class="badge">${eventTypeLabel(ev.type)}</span></div><h3 class="event-title">${e(ev.title)}</h3><div class="deadline-row">${deadlineBadge(ev)}</div><p class="section-sub">${e(ev.phase)}</p></div><div class="btns" style="margin-top:0"><button class="btn secondary" data-open="${ev.id}">Abrir</button><button class="btn primary" data-close="${ev.id}">Cerrar</button><button class="btn danger" data-delete-event="${ev.id}">Eliminar</button></div></div>${ev.options?.length ? `<div class="mini" style="margin-top:14px"><strong>Opciones</strong><span>${ev.options.map(e).join(" · ")}</span></div>` : ""}<div class="admin-edit"><h4>Editar apuesta</h4><div class="edit-grid"><label class="field-label">Tipo<select class="select" data-edit-type="${ev.id}">${editTypeOptions(ev.type)}</select></label><label class="field-label">Partido asociado<select class="select" data-edit-match="${ev.id}">${editMatchOptions(ev)}</select></label><label class="field-label">Título<input class="input" data-edit-title="${ev.id}" value="${e(ev.title)}"></label><label class="field-label">Fecha límite<input class="input" data-edit-deadline="${ev.id}" value="${e(ev.deadline || "")}" placeholder="Ej: 15 jun · 18:00"></label><label class="field-label edit-options-label">Opciones<textarea class="input textarea" data-edit-options="${ev.id}">${e(editableOptionsText(ev))}</textarea></label><button class="btn secondary" data-edit-event="${ev.id}">Guardar cambios</button></div><p class="section-sub edit-hint">Para ganador, goleador y campeón, las opciones se regeneran automáticamente al guardar. En opción múltiple se usan las opciones escritas aquí, una por línea.</p></div><div style="margin-top:16px;overflow:hidden;border-radius:20px;border:1px solid var(--border)"><table class="table"><thead><tr><th>Usuario</th><th>Apuesta</th><th class="right">Puntos</th></tr></thead><tbody>${eb.length ? eb.map(b => { const u = state.users.find(x => x.id === b.userId); return `<tr><td><strong>${e(u?.name || "Usuario eliminado")}</strong></td><td>${e(b.prediction)}</td><td class="right">${b.points ?? "-"}</td></tr>`; }).join("") : `<tr><td colspan="3">Sin apuestas.</td></tr>`}</tbody></table></div><div class="form"><input class="input" type="number" min="0" step="1" data-points-exact="${ev.id}" value="${Number(ev.pointsExact || 0)}" title="Puntos por acierto exacto"><input class="input" type="number" min="0" step="1" data-points-partial="${ev.id}" value="${Number(ev.pointsPartial || 0)}" title="Puntos parciales" ${ev.type !== "score" ? "disabled" : ""}><button class="btn secondary" data-save-points="${ev.id}">Guardar puntuación</button></div><div class="form">${resultControl(ev)}<button class="btn goldbtn" data-save="${ev.id}">Guardar y finalizar</button></div></article>`;
  }

  function bind() {
    $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
    const search = $("#fixtureSearch");
    if (search) {
      let active = "Todos";
      const buttons = $$('[data-filter]'), cards = $$('[data-fixture]');
      const apply = () => {
        const q = search.value.trim().toLowerCase();
        cards.forEach(c => {
          const text = c.dataset.search || "", g = c.dataset.group, sp = text.includes("españa"), ko = !/^[A-L]$/.test(g);
          c.style.display = text.includes(q) && (active === "Todos" || (active === "España" && sp) || (active === "Eliminatorias" && ko) || g === active) ? "" : "none";
        });
      };
      search.oninput = apply;
      buttons.forEach(b => b.onclick = () => { active = b.dataset.filter; buttons.forEach(x => x.classList.remove("active")); b.classList.add("active"); apply(); });
    }

    const ef = $$('[data-event-filter]');
    if (ef.length) {
      const cards = $$('[data-event]');
      ef.forEach(b => b.onclick = () => {
        ef.forEach(x => x.classList.remove("active"));
        b.classList.add("active");
        const f = b.dataset.eventFilter;
        cards.forEach(c => c.style.display = f === "all" || c.dataset.status === f || (f === "spain" && (c.dataset.title || "").includes("españa")) ? "" : "none");
        $$('[data-event-group]').forEach(g => {
          const visible = [...g.querySelectorAll('[data-event]')].some(c => c.style.display !== "none");
          g.style.display = visible ? "" : "none";
        });
      });
    }

    $$('[data-bet]').forEach(btn => btn.onclick = () => {
      if (state.user.role === "admin") return alert("El administrador no puede apostar.");
      const id = btn.dataset.bet, input = document.querySelector(`[data-prediction="${CSS.escape(id)}"]`), pred = input?.value?.trim();
      if (!pred) return alert("Introduce una apuesta antes de guardar.");
      const existing = state.bets.find(b => b.userId === state.user.id && b.eventId === id);
      if (existing) { existing.prediction = pred; existing.points = null; }
      else state.bets.push({ id: `b${Date.now()}`, userId: state.user.id, eventId: id, prediction: pred, points: null });
      save();
      render();
    });

    const typeInput = $("#newType"), matchInput = $("#newMatch"), optionsInput = $("#newOptions"), preview = $("#optionPreview span"), customOptionsField = $("#customOptionsField"), matchField = $("#matchField"), partialPointsField = $("#partialPointsField"), pointsExactInput = $("#newPointsExact"), pointsPartialInput = $("#newPointsPartial");
    const fillMatchOptions = () => {
      if (!matchInput || !typeInput) return;
      const current = matchInput.value;
      const fixtures = typeInput.value === "scorer" ? DATA.fixtures.filter(isSpain) : DATA.fixtures;
      matchInput.innerHTML = fixtures.map(m => `<option value="${m.no}">${e(fixtureLabel(m))}</option>`).join("");
      if (fixtures.some(m => String(m.no) === String(current))) matchInput.value = current;
    };
    const getNewOptions = () => {
      const type = typeInput?.value;
      if (type === "winner") return winnerOptionsFromFixture(matchInput?.value);
      if (type === "worldcup_winner") return WORLD_CUP_TEAMS;
      if (type === "scorer") return SPAIN_SCORERS;
      if (type === "choice") return (optionsInput?.value || "").split("\n").map(x => x.trim()).filter(Boolean);
      return [];
    };
    const refreshAdminCreate = () => {
      if (!typeInput) return;
      fillMatchOptions();
      const type = typeInput.value, opts = getNewOptions();
      if (customOptionsField) customOptionsField.style.display = type === "choice" ? "block" : "none";
      if (matchField) matchField.style.display = ["score", "winner", "scorer"].includes(type) ? "grid" : "none";
      if (partialPointsField) partialPointsField.style.display = type === "score" ? "grid" : "none";
      if (pointsExactInput && !pointsExactInput.dataset.touched) pointsExactInput.value = type === "score" ? 5 : type === "worldcup_winner" ? 15 : 10;
      if (pointsPartialInput && !pointsPartialInput.dataset.touched) pointsPartialInput.value = type === "score" ? 3 : 0;
      if (preview) preview.textContent = opts.length ? opts.join(" · ") : "Resultado escrito por el usuario. Ejemplo: 2-1";
    };
    [typeInput, matchInput, optionsInput].filter(Boolean).forEach(x => x.oninput = refreshAdminCreate);
    [pointsExactInput, pointsPartialInput].filter(Boolean).forEach(x => x.oninput = () => { x.dataset.touched = "1"; });
    refreshAdminCreate();

    const create = $("#createEvent");
    if (create) create.onclick = () => {
      const type = $("#newType").value;
      const matchNo = $("#newMatch")?.value || "";
      const match = DATA.fixtures.find(x => String(x.no) === String(matchNo));
      const title = $("#newTitle").value.trim() || defaultTitleFor(type, matchNo);
      const deadline = $("#newDeadline").value.trim() || (match ? `${match.date} · ${match.time}` : "Pendiente");
      const options = getNewOptions();
      const pointsExact = Math.max(0, Number($("#newPointsExact")?.value || 0));
      const pointsPartial = type === "score" ? Math.max(0, Number($("#newPointsPartial")?.value || 0)) : 0;
      if (!title) return alert("Pon un título al evento.");
      if (["winner", "scorer", "worldcup_winner", "choice"].includes(type) && options.length < 2) return alert("Este tipo de apuesta necesita al menos dos opciones.");
      state.events.unshift({
        id: `e${Date.now()}`,
        title,
        type,
        status: "open",
        phase: type === "worldcup_winner" ? "Mundial" : (match ? stage(match.group) : (type === "scorer" ? "España" : "General")),
        pointsExact,
        pointsPartial,
        deadline,
        options,
        correctResult: "",
        matchNo: matchNo || null
      });
      save();
      render();
    };

    $$('[data-open]').forEach(b => b.onclick = () => { const ev = state.events.find(x => x.id === b.dataset.open); if (ev) ev.status = "open"; save(); render(); });
    $$('[data-close]').forEach(b => b.onclick = () => { const ev = state.events.find(x => x.id === b.dataset.close); if (ev) ev.status = "closed"; save(); render(); });
    $$('[data-delete-event]').forEach(b => b.onclick = () => {
      const id = b.dataset.deleteEvent;
      const ev = state.events.find(x => x.id === id);
      if (!ev) return;
      const relatedBets = state.bets.filter(x => x.eventId === id).length;
      const ok = confirm(`¿Eliminar la apuesta "${ev.title}"? También se borrarán ${relatedBets} pronóstico(s) asociados.`);
      if (!ok) return;
      state.events = state.events.filter(x => x.id !== id);
      state.bets = state.bets.filter(x => x.eventId !== id);
      save();
      render();
    });
    $$('[data-delete-user]').forEach(b => b.onclick = () => {
      const id = b.dataset.deleteUser;
      const user = state.users.find(x => x.id === id);
      if (!user) return;
      const relatedBets = state.bets.filter(x => x.userId === id).length;
      const ok = confirm(`¿Eliminar al usuario "${user.name}"? También se borrarán ${relatedBets} apuesta(s) realizadas por este usuario.`);
      if (!ok) return;
      state.users = state.users.filter(x => x.id !== id);
      state.bets = state.bets.filter(x => x.userId !== id);
      save();
      render();
    });
    $$('[data-edit-event]').forEach(btn => btn.onclick = () => {
      const id = btn.dataset.editEvent, ev = state.events.find(x => x.id === id);
      if (!ev) return;
      const type = document.querySelector(`[data-edit-type="${CSS.escape(id)}"]`)?.value || ev.type;
      const matchNo = document.querySelector(`[data-edit-match="${CSS.escape(id)}"]`)?.value || ev.matchNo || "";
      const match = DATA.fixtures.find(x => String(x.no) === String(matchNo));
      if (type === "scorer" && match && !isSpain(match)) return alert("La apuesta de goleador solo puede asociarse a partidos de España.");
      const customText = document.querySelector(`[data-edit-options="${CSS.escape(id)}"]`)?.value || "";
      const options = optionsForType(type, matchNo, customText);
      if (["winner", "scorer", "worldcup_winner", "choice"].includes(type) && options.length < 2) return alert("Este tipo de apuesta necesita al menos dos opciones.");
      const title = document.querySelector(`[data-edit-title="${CSS.escape(id)}"]`)?.value.trim() || defaultTitleFor(type, matchNo);
      const deadline = document.querySelector(`[data-edit-deadline="${CSS.escape(id)}"]`)?.value.trim() || (match ? `${match.date} · ${match.time}` : "Pendiente");
      const structureChanged = ev.type !== type || JSON.stringify(ev.options || []) !== JSON.stringify(options);
      if (structureChanged && state.bets.some(b => b.eventId === id) && !confirm("Has cambiado el tipo o las opciones de una apuesta que ya tiene pronósticos. Se conservarán las apuestas, pero se dejarán pendientes de recalcular. ¿Continuar?")) return;
      ev.type = type;
      ev.title = title;
      ev.deadline = deadline;
      ev.phase = type === "worldcup_winner" ? "Mundial" : (match ? stage(match.group) : (type === "scorer" ? "España" : "General"));
      ev.matchNo = ["score", "winner", "scorer"].includes(type) ? matchNo : null;
      ev.options = options;
      if (type !== "score") ev.pointsPartial = 0;
      if (structureChanged) {
        ev.correctResult = "";
        if (ev.status === "finished") ev.status = "closed";
        state.bets.forEach(bet => { if (bet.eventId === id) bet.points = null; });
      }
      save();
      render();
    });

    $$('[data-save-points]').forEach(b => b.onclick = () => {
      const id = b.dataset.savePoints, ev = state.events.find(x => x.id === id);
      if (!ev) return;
      const exact = document.querySelector(`[data-points-exact="${CSS.escape(id)}"]`);
      const partial = document.querySelector(`[data-points-partial="${CSS.escape(id)}"]`);
      ev.pointsExact = Math.max(0, Number(exact?.value || 0));
      ev.pointsPartial = ev.type === "score" ? Math.max(0, Number(partial?.value || 0)) : 0;
      if (ev.status === "finished" && ev.correctResult) {
        state.bets.forEach(bet => { if (bet.eventId === id) bet.points = score(ev, bet.prediction, ev.correctResult); });
      }
      save();
      render();
    });
    $$('[data-save]').forEach(b => b.onclick = () => {
      const id = b.dataset.save, input = document.querySelector(`[data-result="${CSS.escape(id)}"]`), result = input?.value?.trim(), ev = state.events.find(x => x.id === id);
      if (!ev || !result) return alert("Introduce un resultado válido.");
      ev.correctResult = result;
      ev.status = "finished";
      state.bets.forEach(bet => { if (bet.eventId === id) bet.points = score(ev, bet.prediction, result); });
      save();
      render();
    });
  }

  async function start() {
    app.innerHTML = `<div class="top"></div><section class="login"><div class="container"><div class="card"><span class="badge">Conectando</span><h1 class="section-title" style="margin-top:12px">La Porra del Arnomendi</h1><p class="section-sub">Cargando datos online...</p></div></div></section>`;
    await loadOnlineState();
    render();
  }

  start();
})();
