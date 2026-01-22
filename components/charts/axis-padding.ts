export function computeLeftPad(label: string, axisFontSize: number) {
  const estimated = Math.ceil(label.length * axisFontSize * 0.62) + 18;
  return Math.min(130, Math.max(46, estimated));
}
