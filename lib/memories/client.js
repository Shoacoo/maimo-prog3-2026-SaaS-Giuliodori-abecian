// Utilidades de Recuerdos que corren en el navegador: comprimir la foto antes
// de subirla y subirla mostrando el progreso.

const FULL_MAX_SIDE = 1600;
const THUMB_MAX_SIDE = 480;
// Un poco por debajo de los limites del servidor (lib/memories/photoStore.js).
const FULL_MAX_BYTES = 820 * 1024;
const THUMB_MAX_BYTES = 110 * 1024;

async function loadBitmap(file) {
  if (typeof createImageBitmap === "function") {
    try {
      // Respeta la orientacion EXIF de las fotos del celular.
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // algunos navegadores no aceptan opciones: se intenta con <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

// Achica y recomprime en JPEG bajando la calidad (y si hace falta el tamaño)
// hasta quedar por debajo del limite de bytes.
async function encode(source, maxSide, maxBytes) {
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  let side = maxSide;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const scale = Math.min(1, side / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff"; // fondo blanco para PNG con transparencia
    context.fillRect(0, 0, width, height);
    context.drawImage(source, 0, 0, width, height);
    for (const quality of [0.82, 0.72, 0.62]) {
      const blob = await toBlob(canvas, quality);
      if (blob && blob.size <= maxBytes) return { blob, width, height };
    }
    side = Math.round(side * 0.8);
  }
  throw new Error("No pudimos achicar la foto lo suficiente.");
}

export async function compressImage(file) {
  if (!file.type.startsWith("image/")) {
    throw new Error("El archivo no es una imagen.");
  }
  let bitmap;
  try {
    bitmap = await loadBitmap(file);
  } catch {
    throw new Error("No pudimos leer esta foto (probá con JPG o PNG).");
  }
  const full = await encode(bitmap, FULL_MAX_SIDE, FULL_MAX_BYTES);
  const thumb = await encode(bitmap, THUMB_MAX_SIDE, THUMB_MAX_BYTES);
  bitmap.close?.();
  return { full: full.blob, thumb: thumb.blob, width: full.width, height: full.height };
}

// fetch no informa el progreso de subida; XMLHttpRequest si.
export function uploadMemoryPhoto(tripId, fields, onProgress) {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      if (value === null || value === undefined) return;
      if (value instanceof Blob) form.append(key, value, `${key}.jpg`);
      else form.append(key, String(value));
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/trips/${tripId}/memories/photos`);
    xhr.responseType = "json";
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.photo) resolve(xhr.response.photo);
      else reject(new Error(xhr.response?.error || "No se pudo subir la foto."));
    };
    xhr.onerror = () => reject(new Error("Sin conexión. Probá de nuevo."));
    xhr.send(form);
  });
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const longFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const shortFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "numeric", month: "short" });

// "Miércoles 24 de septiembre"
export function longDate(date) {
  return date ? capitalize(longFormatter.format(new Date(`${date}T00:00:00`))) : "";
}

// "MIÉ 24 SEP"
export function shortDate(date) {
  return date ? shortFormatter.format(new Date(`${date}T00:00:00`)).replace(/\./g, "").replace(",", "").toUpperCase() : "";
}

// "23 – 25 de septiembre"
export function rangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return "";
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const month = (date) => new Intl.DateTimeFormat("es-AR", { month: "long" }).format(date);
  if (startDate === endDate) return `${end.getDate()} de ${month(end)}`;
  if (start.getMonth() === end.getMonth()) return `${start.getDate()} – ${end.getDate()} de ${month(end)}`;
  return `${start.getDate()} de ${month(start)} – ${end.getDate()} de ${month(end)}`;
}
