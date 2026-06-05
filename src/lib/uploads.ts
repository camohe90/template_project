import "server-only";
import path from "node:path";

export const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

/** Only allow simple file names to avoid path traversal. */
export function isSafeName(name: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(name) && !name.includes("..");
}
