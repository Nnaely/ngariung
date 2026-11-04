/** Ubah file gambar jadi avatar persegi kecil (data URL) — hemat localStorage. */
export async function fileToAvatar(file: File, size = 192): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File harus berupa gambar.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Ukuran foto maksimal 8 MB.");
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const side = Math.min(img.width, img.height);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung canvas.");

    ctx.drawImage(
      img,
      (img.width - side) / 2,
      (img.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size,
    );

    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Gambar tidak bisa dibaca."));
    img.src = src;
  });
}
