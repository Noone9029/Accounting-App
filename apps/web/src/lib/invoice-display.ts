export function formatOptionalDate(value: string | null | undefined, emptyLabel = "No due date"): string {
  if (!value) {
    return emptyLabel;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return emptyLabel;
  }

  return date.toLocaleDateString();
}
