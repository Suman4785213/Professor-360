import { it, expect, vi, beforeEach } from "vitest";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  version: 0,
  write: vi.fn(),
  delete: vi.fn(),
  share: vi.fn(),
}));
vi.mock("../src/services/runtime", () => ({
  session: { version: () => mocks.version, api: { get: mocks.get } },
}));
vi.mock("expo-file-system", () => ({
  Paths: { cache: "cache" },
  Directory: class {
    exists = false;
    create() {}
    delete() {}
  },
  File: class {
    uri = "file://private";
    create() {}
    write = mocks.write;
    delete = mocks.delete;
  },
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: async () => true,
  shareAsync: mocks.share,
}));
const { downloadPrivate, sharePrivate, clearPrivateFiles, fileExtension } =
  await import("../src/services/privateFiles");
beforeEach(() => {
  vi.clearAllMocks();
  mocks.version = 0;
  mocks.get.mockResolvedValue({
    data: new ArrayBuffer(4),
    headers: { "content-type": "application/pdf" },
  });
});
it("saves authenticated binary and opens native sharing without token URLs", async () => {
  await sharePrivate("/api/v1/reports/1/download/");
  expect(mocks.get).toHaveBeenCalledWith("/api/v1/reports/1/download/", {
    responseType: "arraybuffer",
  });
  expect(mocks.write).toHaveBeenCalledWith(expect.any(Uint8Array));
  expect(mocks.share).toHaveBeenCalledWith(
    "file://private",
    expect.objectContaining({ mimeType: "application/pdf" }),
  );
  expect(mocks.delete).toHaveBeenCalled();
});
it("supports Office and image response types", () => {
  expect(
    fileExtension(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ),
  ).toBe("docx");
  expect(fileExtension("application/vnd.ms-excel")).toBe("xls");
  expect(fileExtension("image/png")).toBe("png");
  expect(() => fileExtension("application/json")).toThrow();
});
it("does not write denied or invalid binary responses", async () => {
  mocks.get.mockRejectedValueOnce({ response: { status: 403 } });
  await expect(downloadPrivate("/media/private")).rejects.toBeTruthy();
  expect(mocks.write).not.toHaveBeenCalled();
  mocks.get.mockResolvedValueOnce({
    data: new ArrayBuffer(2),
    headers: { "content-type": "application/json" },
  });
  await expect(downloadPrivate("/media/private")).rejects.toThrow();
});
it("handles image loading and logout cache cleanup", async () => {
  mocks.get.mockResolvedValueOnce({
    data: new ArrayBuffer(2),
    headers: { "content-type": "image/png" },
  });
  await downloadPrivate("/media/photo", true);
  clearPrivateFiles();
  expect(mocks.delete).toHaveBeenCalled();
});
it("rejects a file returned after account switch", async () => {
  mocks.get.mockImplementationOnce(async () => {
    mocks.version++;
    return {
      data: new ArrayBuffer(2),
      headers: { "content-type": "image/png" },
    };
  });
  await expect(downloadPrivate("/media/photo", true)).rejects.toThrow(
    "Session changed",
  );
  expect(mocks.write).not.toHaveBeenCalled();
});
