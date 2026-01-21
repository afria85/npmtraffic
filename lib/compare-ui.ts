export function getCompareButtonLabel(count: number) {
  return `Compare (${count})`;
}

export function getCompareStatusLabel(count: number) {
  if (count <= 0) return "Select 2–5 packages to compare";
  if (count === 1) return "1 selected • add 1 more to compare";
  return `${count} selected`;
}

export function isCompareReady(count: number) {
  return count >= 2;
}
