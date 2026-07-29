const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "image/png": (bytes) =>
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47,
  "image/jpeg": (bytes) =>
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes.at(-2) === 0xff &&
    bytes.at(-1) === 0xd9,
  "image/webp": (bytes) =>
    bytes.length >= 12 &&
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
};

function pngDimensions(bytes: Uint8Array) {
  if (bytes.length < 24) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = bytes[offset + 1];
    const length = (bytes[offset + 2] << 8) + bytes[offset + 3];
    if (
      [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)
    ) {
      return {
        height: (bytes[offset + 5] << 8) + bytes[offset + 6],
        width: (bytes[offset + 7] << 8) + bytes[offset + 8]
      };
    }
    if (length < 2) break;
    offset += 2 + length;
  }
  return null;
}

export async function validateBrandImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { valid: false, error: "Use a PNG, JPG, or WebP image." };
  }
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "Brand images must be no larger than 5 MB." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!signatures[file.type]?.(bytes)) {
    return { valid: false, error: "The uploaded file is not a valid image." };
  }
  const dimensions =
    file.type === "image/png"
      ? pngDimensions(bytes)
      : file.type === "image/jpeg"
        ? jpegDimensions(bytes)
        : null;
  if (
    dimensions &&
    (dimensions.width < 16 ||
      dimensions.height < 16 ||
      dimensions.width > 8000 ||
      dimensions.height > 8000)
  ) {
    return {
      valid: false,
      error: "Images must be between 16×16 and 8000×8000 pixels."
    };
  }
  return { valid: true, dimensions };
}

export function extensionForImageType(type: string) {
  return type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";
}
