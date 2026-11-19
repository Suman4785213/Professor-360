import { File, Directory, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { registerCleanup } from "./cleanup";
import { session } from "./runtime";
const cached = new Set<File>();
const directory = new Directory(Paths.cache, "p360-private");
export function clearPrivateFiles() {
  for (const file of cached) {
    try {
      file.delete();
    } catch {}
  }
  cached.clear();
  try {
    if (directory.exists) directory.delete();
  } catch {}
}
const formats: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "docx",
  "application/msword": "doc",
  "image/png": "png",
  "image/jpeg": "jpg",
};
export function fileExtension(mime: string) {
  const extension = formats[mime.split(";")[0].trim()];
  if (!extension) throw new Error("Unsupported file response.");
  return extension;
}
export async function downloadPrivate(url: string, image = false) {
  const version = session.version();
  const response = await session.api.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
  });
  const mime = String(response.headers["content-type"] || "").split(";")[0];
  const extension = fileExtension(mime);
  if (image && !mime.startsWith("image/"))
    throw new Error("Expected an image.");
  if (version !== session.version()) throw new Error("Session changed");
  directory.create({ idempotent: true });
  const file = new File(
    directory,
    `p360-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`,
  );
  cached.add(file);
  try {
    file.create();
    await file.write(new Uint8Array(response.data));
    if (version !== session.version()) throw new Error("Session changed");
    return { file, mime, version };
  } catch (e) {
    try {
      file.delete();
    } catch {}
    cached.delete(file);
    throw e;
  }
}
export async function sharePrivate(url: string) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("File sharing is unavailable on this device.");
  const result = await downloadPrivate(url);
  try {
    if (result.version !== session.version())
      throw new Error("Session changed");
    await Sharing.shareAsync(result.file.uri, {
      mimeType: result.mime,
      dialogTitle: "Open or save authorized file",
    });
  } finally {
    try {
      result.file.delete();
    } catch {}
    cached.delete(result.file);
  }
}
export function releasePrivate(file: File) {
  try {
    file.delete();
  } catch {}
  cached.delete(file);
}

registerCleanup(clearPrivateFiles);

clearPrivateFiles();
