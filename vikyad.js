/* ===== Panel de invitaciones =====
   Lista de personas (vacía al inicio) guardada en este navegador.
   Al agregar una persona se genera un link autosuficiente: el nombre viaja
   cifrado adentro (?i=v1....), así que no hay nada que publicar. */

const CLAVE = "admin:invitaciones";
const $ = (id) => document.getElementById(id);

let estado = cargar();
let temporizadorToast;

/* ---------- Persistencia ---------- */
function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (guardado && Array.isArray(guardado.personas)) {
      return { base: guardado.base || "", personas: guardado.personas };
    }
  } catch { }
  return { base: "", personas: [] };
}

function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { }
}

/* ---------- Links ---------- */
function normalizarBase(valor) {
  const s = String(valor || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : "" + s;
}

function linkDe(token) {
  const base = normalizarBase(estado.base);
  if (!base) return "";
  try {
    const url = new URL(base);
    url.searchParams.set("i", token);
    return url.toString();
  } catch { return ""; }
}

/* ---------- Interfaz ---------- */
function render() {
  const lista = $("lista");
  lista.textContent = "";

  $("contador").textContent = estado.personas.length;
  $("vacio").hidden = estado.personas.length > 0;

  estado.personas.forEach((persona) => {
    const fila = document.createElement("li");
    fila.className = "fila";

    const nombre = document.createElement("input");
    nombre.className = "nombre";
    nombre.type = "text";
    nombre.maxLength = 60;
    nombre.value = persona.nombre;
    nombre.setAttribute("aria-label", "Nombre del invitado");
    nombre.addEventListener("change", async () => {
      const nuevo = nombre.value.trim().replace(/\s+/g, " ");
      if (!nuevo || nuevo === persona.nombre) {
        nombre.value = persona.nombre;
        return;
      }
      persona.nombre = nuevo;
      persona.token = await crearToken(nuevo);
      guardar();
      render();
      toast("Nombre actualizado. Copiá el link de nuevo.");
    });

    const link = linkDe(persona.token);
    const ancla = document.createElement("a");
    ancla.className = "link" + (link ? "" : " sin-link");
    if (link) {
      ancla.href = link;
      ancla.target = "_blank";
      ancla.rel = "noopener";
      ancla.textContent = link;
    } else {
      ancla.textContent = "Configurá la URL de la invitación";
    }

    const copiar = document.createElement("button");
    copiar.className = "btn chico";
    copiar.type = "button";
    copiar.textContent = "Copiar link";
    copiar.disabled = !link;
    copiar.addEventListener("click", () => copiarTexto(link));

    const borrar = document.createElement("button");
    borrar.className = "btn chico peligro";
    borrar.type = "button";
    borrar.textContent = "Eliminar";
    borrar.addEventListener("click", () => {
      if (!confirm(`¿Eliminar la invitación de ${persona.nombre}?`)) return;
      estado.personas = estado.personas.filter((p) => p !== persona);
      guardar();
      render();
      toast("Invitación eliminada");
    });

    fila.append(nombre, ancla, copiar, borrar);
    lista.append(fila);
  });
}

/* ---------- Acciones ---------- */
async function copiarTexto(texto) {
  if (!texto) return;
  try {
    await navigator.clipboard.writeText(texto);
    toast("Link copiado");
  } catch {
    const area = document.createElement("textarea");
    area.value = texto;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    try { document.execCommand("copy"); toast("Link copiado"); }
    catch { toast("Copialo manualmente"); }
    area.remove();
  }
}

function descargar(nombreArchivo, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function celdaCsv(valor) {
  return `"${String(valor).replaceAll('"', '""')}"`;
}

/* ---------- Eventos ---------- */
$("base").addEventListener("change", (e) => {
  estado.base = normalizarBase(e.target.value);
  e.target.value = estado.base;
  guardar();
  render();
});

$("fAlta").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nombre = $("nombre").value.trim().replace(/\s+/g, " ");
  if (!nombre) return;

  const boton = $("fAlta").querySelector("button");
  boton.disabled = true;
  try {
    const token = await crearToken(nombre);
    estado.personas.push({ token, nombre });
    guardar();
    render();

    $("nombre").value = "";
    $("nombre").focus();
    $("altaMsg").textContent = `Agregado: ${nombre}. El link ya funciona: copialo de la lista.`;
    toast("Link listo");
  } finally {
    boton.disabled = false;
  }
});

$("btnCsv").addEventListener("click", () => {
  if (!estado.personas.length) return toast("Agregá al menos una persona");
  const filas = [["Nombre", "Token", "Link"]];
  estado.personas.forEach((p) => filas.push([p.nombre, p.token, linkDe(p.token)]));
  const csv = "\uFEFF" + filas.map((f) => f.map(celdaCsv).join(",")).join("\r\n");
  descargar("invitaciones.csv", csv, "text/csv;charset=utf-8");
  toast("CSV descargado");
});

function toast(mensaje) {
  const el = $("toast");
  el.textContent = mensaje;
  el.classList.add("visible");
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => el.classList.remove("visible"), 2200);
}

/* ---------- Arranque ---------- */
$("base").value = estado.base;
render();
