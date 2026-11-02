/* ===== CONFIGURACIÓN: editá sólo este bloque ===== */
const CONFIG = {
  nombre: "Victoria",
  fecha: "2026-12-07T21:30:00-03:00",
  duracionHs: 6,
  lugar: "Salón Las Acacias",
  direccion: "Av. Ejemplo 1234, Buenos Aires",
  alias: "alas.pato.vino",
  sheetUrl: "https://script.google.com/macros/s/AKfycbxWHZoNHEbWgQgPcVgVlgVoSZw-jjC6R94eo1Xbf4cFndTe-kOIli7PnteL0uCSECAt/exec", // URL de la app web de Google Apps Script (ver apps-script.gs)
  invitadosPorDefecto: ["Invitado/a"]
};

const $ = (id) => document.getElementById(id);

/* Aviso flotante breve (se usa al enviar la sugerencia de canción) */
let temporizadorAviso;
function avisar(texto) {
  const el = $("aviso");
  if (!el) return;
  el.textContent = texto;
  el.classList.add("visible");
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => el.classList.remove("visible"), 2600);
}

document.documentElement.classList.add("js");
const fecha = new Date(CONFIG.fecha);
const fmt = (o) => fecha.toLocaleDateString("es-AR", o);

/* Nombre dinámico: se toma del bloque CONFIG */
$("nombreTxt").textContent = CONFIG.nombre;
$("nombreFirma").textContent = CONFIG.nombre;
document.title = `Mis XV · ${CONFIG.nombre}`;

/* Textos de fecha, lugar, enlaces */
$("fechaTxt").textContent = fecha.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).replaceAll("/", ".");
$("diaTxt").textContent = `${fmt({ weekday: "long", day: "numeric", month: "long" })} · ${fecha.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs`;
$("lugarTxt").textContent = CONFIG.lugar;
$("dirTxt").textContent = CONFIG.direccion;
$("aliasInp").value = CONFIG.alias;
$("btnMapa").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${CONFIG.lugar} ${CONFIG.direccion}`);
const iso = (d) => d.toISOString().replace(/[-:]|\.\d{3}/g, "");
const fin = new Date(fecha.getTime() + CONFIG.duracionHs * 36e5);
$("btnAgenda").href = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=" +
  encodeURIComponent(`Mis XV · ${CONFIG.nombre}`) + `&dates=${iso(fecha)}/${iso(fin)}&location=` +
  encodeURIComponent(`${CONFIG.lugar}, ${CONFIG.direccion}`);

/* ===== Invitación individual =====
   El nombre no viaja en la URL: el link lleva sólo un token cifrado (?i=v1....)
   que se descifra con token.js. */
async function buscarInvitado(token) {
  return leerToken(token);
}

(async () => {
  const token = new URLSearchParams(location.search).get("i");
  const invitado = await buscarInvitado(token);

  /* Código inexistente o alterado: no se puede escribir un nombre propio */
  if (token && !invitado) {
    const aviso = $("invInvalida");
    if (aviso) {
      aviso.textContent = "Esta invitación no es válida. Pedile un link nuevo a quien te la envió.";
      aviso.hidden = false;
    }
    if ($("confirmar")) $("confirmar").style.display = "none";
    if ($("ctaFija")) $("ctaFija").style.display = "none";
    return;
  }

  const invitados = invitado ? [invitado.nombre] : CONFIG.invitadosPorDefecto;

  /* Confirmación: una respuesta por persona, identificada por el código del link */
  const familia = invitado ? invitado.nombre : invitados.join(" + ");
  const clave = "rsvp:" + (token || familia);
  let previas = {};
  try { previas = JSON.parse(localStorage.getItem(clave)) || {}; } catch { }
  invitados.forEach((n, i) => {
    const p = document.createElement("div"); p.className = "persona";
    const v = previas[n] === undefined ? "" : previas[n] ? "si" : "no";
    p.innerHTML = `<b></b><div class="opc"><label><input type="radio" name="p${i}" value="si" required><span>Voy</span></label><label><input type="radio" name="p${i}" value="no"><span>No voy</span></label></div>`;
    p.querySelector("b").textContent = n;
    if (v) p.querySelector(`input[value=${v}]`).checked = true;
    $("rsvpLista").append(p);
  });
  if (Object.keys(previas).length) $("btnRsvp").textContent = "Enviar respuesta";
  $("fRsvp").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = (t) => ($("rsvpMsg").textContent = t);
    if (!CONFIG.sheetUrl) return msg("La confirmación todavía no está disponible.");
    const f = new FormData(e.target);
    const respuestas = invitados.map((n, i) => ({ nombre: n, asiste: f.get("p" + i) === "si" }));
    $("btnRsvp").disabled = true; msg("Enviando…");
    try {
      await fetch(CONFIG.sheetUrl, { method: "POST", mode: "no-cors", body: JSON.stringify({ token, familia, respuestas }) });
      try { localStorage.setItem(clave, JSON.stringify(Object.fromEntries(respuestas.map((r) => [r.nombre, r.asiste])))); } catch { }
      msg(respuestas.some((r) => r.asiste) ? "¡Listo! Gracias por confirmar" : "Gracias por avisar. ¡Te vamos a extrañar!");
      $("btnRsvp").textContent = "Enviar respuesta";
    } catch { msg("No se pudo enviar. Revisá tu conexión y probá de nuevo."); }
    $("btnRsvp").disabled = false;
  });
})();

/* Cuenta regresiva */
function tick() {
  let s = Math.max(0, Math.floor((fecha - Date.now()) / 1000));
  const d = Math.floor(s / 86400); s -= d * 86400;
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  $("cd").textContent = d; $("ch").textContent = h; $("cm").textContent = m; $("cs").textContent = s;
}
tick(); setInterval(tick, 1000);

/* Aparición progresiva al hacer scroll (con leve escalonado) */
if ("IntersectionObserver" in window) {
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.12, rootMargin: "0px 0px -32px 0px" });

  document.querySelectorAll(".sec:not(.hero)").forEach((sec) => {
    [...sec.children].forEach((el, i) => {
      el.classList.add("rev");
      el.style.transitionDelay = `${Math.min(i, 4) * 70}ms`;
      io.observe(el);
    });
  });
}

/* Barra fija de confirmación (sólo mobile) */
const cta = $("ctaFija");
const hero = document.querySelector(".hero");
const pie = document.querySelector(".pie");
if (cta && hero && "IntersectionObserver" in window) {
  let pasoHero = false, enPie = false;
  const pintarCta = () => cta.classList.toggle("visible", pasoHero && !enPie);
  new IntersectionObserver(([e]) => { pasoHero = !e.isIntersecting; pintarCta(); }).observe(hero);
  if (pie) new IntersectionObserver(([e]) => { enPie = e.isIntersecting; pintarCta(); }).observe(pie);
}

/* Modales */
document.querySelectorAll("[data-modal]").forEach((b) =>
  b.addEventListener("click", () => $(b.dataset.modal).showModal()));
document.querySelectorAll("dialog").forEach((d) =>
  d.addEventListener("click", (e) => { if (e.target === d) d.close(); }));

/* Sugerir canción: se guarda en la pestaña "Canciones" de la planilla */
$("fMusica").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const msg = (t) => ($("musicaMsg").textContent = t);

  if (!CONFIG.sheetUrl) return msg("La sugerencia todavía no está disponible.");

  const f = new FormData(form);
  const cancion = String(f.get("cancion") || "").trim().replace(/\s+/g, " ");
  const artista = String(f.get("artista") || "").trim().replace(/\s+/g, " ");
  if (!cancion || !artista) return msg("Completá canción y artista.");

  const boton = form.querySelector("button[type=submit]");
  boton.disabled = true;
  msg("Enviando…");
  try {
    await fetch(CONFIG.sheetUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify({ tipo: "cancion", cancion, artista })
    });
    form.reset();
    $("mMusica").close();
    msg("");
    avisar("¡Gracias! Tu sugerencia quedó registrada.");
  } catch {
    msg("No se pudo enviar. Revisá tu conexión y probá de nuevo.");
  } finally {
    boton.disabled = false;
  }
});

/* Copiar alias */
$("btnCopiar").addEventListener("click", async () => {
  const ok = (t) => { $("copiado").textContent = t; setTimeout(() => ($("copiado").textContent = ""), 2500); };
  try { await navigator.clipboard.writeText(CONFIG.alias); ok("Alias copiado ✓"); }
  catch { $("aliasInp").select(); ok("Seleccionado: copialo manualmente"); }
});
