/* ===== Apps Script de la invitación =====
   Pegar en script.google.com (Extensiones > Apps Script de tu planilla).

   Pestaña "Respuestas": una fila por invitado; si vuelve a responder, se actualiza.
   Pestaña "Canciones": se crea sola la primera vez y acumula cada sugerencia.

   Implementar > Administrar implementaciones > editar (lápiz) > Versión: Nueva.
   Ejecutar como: yo · Acceso: cualquier persona.
   La URL NO cambia, así que CONFIG.sheetUrl sigue sirviendo. */

function doPost(e) {
  let d;
  try {
    d = JSON.parse(e.postData.contents);
  } catch {
    return texto("json-invalido");
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (d.tipo === "cancion") return guardarCancion(ss, d);
  return guardarRespuestas(ss, d);
}

/* ---------- Confirmaciones (misma lógica de siempre) ---------- */
function guardarRespuestas(ss, d) {
  if (!Array.isArray(d.respuestas)) return texto("sin-respuestas");

  const sh = ss.getSheetByName("Respuestas") || ss.insertSheet("Respuestas");
  if (sh.getLastRow() === 0) sh.appendRow(["Actualizado", "Familia", "Invitado", "Asistencia"]);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const filas = sh.getDataRange().getValues();
    d.respuestas.forEach((r) => {
      const fila = [new Date(), String(d.familia).slice(0, 80), String(r.nombre).slice(0, 80), r.asiste ? "Va" : "No va"];
      const i = filas.findIndex((x, k) => k > 0 && x[1] === fila[1] && x[2] === fila[2]);
      if (i > 0) {
        sh.getRange(i + 1, 1, 1, 4).setValues([fila]);
      } else {
        sh.appendRow(fila);
        filas.push(fila);
      }
    });
  } finally {
    lock.releaseLock();
  }
  return texto("ok");
}

/* ---------- Canciones sugeridas ---------- */
function guardarCancion(ss, d) {
  const cancion = limpiar(d.cancion);
  const artista = limpiar(d.artista);
  if (!cancion || !artista) return texto("faltan-datos");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = ss.getSheetByName("Canciones") || ss.insertSheet("Canciones");
    if (sh.getLastRow() === 0) {
      sh.appendRow(["Cancion", "Artista"]);
      sh.getRange(1, 1, 1, 2).setFontWeight("bold");
    }
    sh.appendRow([cancion, artista]);
  } finally {
    lock.releaseLock();
  }
  return texto("ok");
}

/* Recorta, normaliza espacios y evita que el texto se interprete como fórmula. */
function limpiar(valor) {
  const s = String(valor == null ? "" : valor).trim().replace(/\s+/g, " ").slice(0, 80);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function texto(valor) {
  return ContentService.createTextOutput(valor).setMimeType(ContentService.MimeType.TEXT);
}
