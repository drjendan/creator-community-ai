const editableMetadataColumns = new Set([
  "display_order",
  "is_active",
  "is_editable",
  "created_from_template",
  "template_key",
  "benefits",
  "color"
]);

export function withoutEditableMembershipMetadata<T extends Record<string, unknown>>(row: T) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !editableMetadataColumns.has(key))
  );
}
