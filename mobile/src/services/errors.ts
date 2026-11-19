export function errorMessage(error: unknown): string {
  const e = error as {
    response?: {
      status?: number;
      data?: { error?: unknown; detail?: unknown; message?: unknown };
    };
    message?: string;
  };
  const d = e?.response?.data;
  if (typeof d?.error === "string") return d.error;
  if (
    d?.error &&
    typeof d.error === "object" &&
    "message" in d.error &&
    typeof d.error.message === "string"
  )
    return d.error.message;
  if (typeof d?.detail === "string") return d.detail;
  if (typeof d?.message === "string") return d.message;
  return e?.response
    ? "Request failed. Please try again."
    : e?.message || "Server unavailable. Check your connection.";
}
