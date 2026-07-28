export function calculateOnboardingProgress(items: Array<{ complete: boolean }>) {
  if (items.length === 0) return 0;
  return Math.round((items.filter((item) => item.complete).length / items.length) * 100);
}
