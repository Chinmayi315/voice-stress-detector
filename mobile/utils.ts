export function getErrorMessage(e: any): string {
  const detail = e?.response?.data?.detail;

  if (!detail) return e?.message || "Something went wrong. Please try again.";

  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
  }

  return JSON.stringify(detail);
}