/* ===== Token de invitación =====
   El nombre del invitado viaja cifrado dentro del propio link (?i=v1....).
   No hay lista que publicar: el link es autosuficiente.

   v1 = AES-GCM con clave derivada de TOKEN_CLAVE (nombre oculto y sin alterar)
   v0 = base64 simple, sólo como respaldo si el navegador no tiene crypto.subtle

   Ojo: si cambiás TOKEN_CLAVE, todos los links ya enviados dejan de funcionar. */
const TOKEN_CLAVE = "victoria-xv-2026-invitaciones";
const TOKEN_PREFIJO = "v1.";

const tokenCodificador = new TextEncoder();
const tokenDecodificador = new TextDecoder();
let tokenLlave = null;

function aBase64Url(bytes) {
  let binario = "";
  bytes.forEach((b) => (binario += String.fromCharCode(b)));
  return btoa(binario).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function deBase64Url(texto) {
  const b64 = String(texto).replaceAll("-", "+").replaceAll("_", "/");
  const relleno = "=".repeat((4 - (b64.length % 4)) % 4);
  const binario = atob(b64 + relleno);
  return Uint8Array.from(binario, (c) => c.charCodeAt(0));
}

async function obtenerLlave() {
  if (tokenLlave) return tokenLlave;
  const hash = await globalThis.crypto.subtle.digest("SHA-256", tokenCodificador.encode(TOKEN_CLAVE));
  tokenLlave = await globalThis.crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
  return tokenLlave;
}

/* nombre → token */
async function crearToken(nombre) {
  const datos = tokenCodificador.encode(JSON.stringify({ n: String(nombre).trim() }));

  if (!globalThis.crypto?.subtle) return "v0." + aBase64Url(datos);

  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const cifrado = new Uint8Array(await globalThis.crypto.subtle.encrypt({ name: "AES-GCM", iv }, await obtenerLlave(), datos));
  const salida = new Uint8Array(iv.length + cifrado.length);
  salida.set(iv, 0);
  salida.set(cifrado, iv.length);
  return TOKEN_PREFIJO + aBase64Url(salida);
}

/* token → { nombre } | null (token inválido, alterado o inventado) */
async function leerToken(token) {
  if (!token) return null;
  try {
    if (token.startsWith("v0.")) {
      const datos = JSON.parse(tokenDecodificador.decode(deBase64Url(token.slice(3))));
      return datos?.n ? { nombre: String(datos.n) } : null;
    }
    if (!token.startsWith(TOKEN_PREFIJO) || !globalThis.crypto?.subtle) return null;

    const bytes = deBase64Url(token.slice(TOKEN_PREFIJO.length));
    if (bytes.length < 13) return null;

    const iv = bytes.slice(0, 12);
    const cifrado = bytes.slice(12);
    const plano = await globalThis.crypto.subtle.decrypt({ name: "AES-GCM", iv }, await obtenerLlave(), cifrado);
    const datos = JSON.parse(tokenDecodificador.decode(plano));
    return datos?.n ? { nombre: String(datos.n) } : null;
  } catch {
    return null;
  }
}
