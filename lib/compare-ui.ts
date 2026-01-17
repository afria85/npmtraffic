export function getCompareButtonLabel(count: number) {
  return `Compare (${count})`;
}

export function isCompareReady(count: number) {
  return count >= 2;
}
