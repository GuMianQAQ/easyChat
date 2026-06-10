const MAX_SCREENSHOT_BYTES = 1024 * 1024;
const MAX_AVATAR_EDGE = 160;
const MAX_IMAGE_EDGE = 1280;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片加载失败"));
    image.src = source;
  });
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const separator = dataUrl.indexOf(",");
  if (separator === -1) {
    return 0;
  }
  const base64 = dataUrl.slice(separator + 1);
  return Math.floor((base64.length * 3) / 4);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) {
    throw new Error("图片数据错误");
  }

  const mimeMatch = parts[0].match(/data:(.*?);base64/);
  if (!mimeMatch) {
    throw new Error("图片数据错误");
  }

  const binary = atob(parts[1]);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeMatch[1] });
}

export async function prepareAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("只能选择图片");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const size = Math.min(image.width, image.height);
  const offsetX = (image.width - size) / 2;
  const offsetY = (image.height - size) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = MAX_AVATAR_EDGE;
  canvas.height = MAX_AVATAR_EDGE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("头像处理失败");
  }

  context.drawImage(
    image,
    offsetX,
    offsetY,
    size,
    size,
    0,
    0,
    MAX_AVATAR_EDGE,
    MAX_AVATAR_EDGE,
  );

  return canvas.toDataURL("image/webp", 0.86);
}

export async function prepareImageDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("仅支持图片");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = image.width > MAX_IMAGE_EDGE ? MAX_IMAGE_EDGE / image.width : 1;
  const targetWidth = Math.round(image.width * scale);
  const targetHeight = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("图片处理失败");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);
  return exportCanvasWithinLimit(canvas, "image/webp");
}

async function exportCanvasWithinLimit(
  canvas: HTMLCanvasElement,
  mimeType: "image/webp" | "image/jpeg",
): Promise<string> {
  const qualities = [0.9, 0.82, 0.74, 0.68, 0.6];
  for (const quality of qualities) {
    const dataUrl = canvas.toDataURL(mimeType, quality);
    if (estimateDataUrlBytes(dataUrl) <= MAX_SCREENSHOT_BYTES) {
      return dataUrl;
    }
  }
  return canvas.toDataURL(mimeType, 0.55);
}

export async function captureScreen(hideWindow: boolean): Promise<string | null> {
  if (!window.myChatCapture) {
    throw new Error("当前环境不支持截图功能");
  }

  return window.myChatCapture.takeScreenshot(hideWindow);
}
