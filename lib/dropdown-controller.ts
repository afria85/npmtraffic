export function makeDropdownController({
  container,
  onClose,
}: {
  container: HTMLElement;
  onClose: () => void;
}) {
  const handlePointerDown = (event: PointerEvent) => {
    const target = event.target;
    if (!target) {
      return;
    }
    if (!container.contains(target as Node)) {
      onClose();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  };

  return { handlePointerDown, handleKeyDown };
}
