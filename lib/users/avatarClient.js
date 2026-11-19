// Corre en el navegador: recorta la foto al centro en un cuadrado de 256 px y
// la comprime en JPEG hasta quedar por debajo de ~95 KB. Devuelve un data URL.
const SIDE = 256;
const MAX_BYTES = 95 * 1024;

async function loadImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // se intenta con <img>
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function byteLength(dataUrl) {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  return Math.floor((base64.length * 3) / 4);
}

export async function prepareAvatar(file) {
  if (!file?.type?.startsWith("image/")) throw new Error("El archivo no es una imagen.");
  if (file.size > 15 * 1024 * 1024) throw new Error("La foto pesa más de 15 MB.");

  let image;
  try {
    image = await loadImage(file);
  } catch {
    throw new Error("No pudimos leer esta foto (probá con JPG o PNG).");
  }

  const crop = Math.min(image.width, image.height);
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, SIDE, SIDE);
  context.drawImage(image, (image.width - crop) / 2, (image.height - crop) / 2, crop, crop, 0, 0, SIDE, SIDE);
  image.close?.();

  for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
    const dataUrl = canvas.toDataURL("image/jpeg", quality);
    if (byteLength(dataUrl) <= MAX_BYTES) return dataUrl;
  }
  throw new Error("No pudimos achicar la foto lo suficiente.");
}
