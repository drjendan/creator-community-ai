type StructuredError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

export function databaseErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (!error || typeof error !== "object") return String(error);
  const structured = error as StructuredError;
  const parts = [structured.message, structured.details, structured.hint]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return parts.join(" ") || "The database rejected the request.";
}

export function isMissingEditableMembershipMetadata(error: unknown) {
  const detail = databaseErrorMessage(error);
  return /schema cache|column/i.test(detail) &&
    /display_order|is_active|is_editable|created_from_template|template_key|benefits|color/i.test(detail);
}
