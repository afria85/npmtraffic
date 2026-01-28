type InteractionEvent = PointerEvent | TouchEvent | MouseEvent;

export type DropdownController = {
  handlePointerDown: (event: InteractionEvent) => void;
  handleKeyDown: (event: KeyboardEvent) => void;
};

type DropdownControllerOptions =
  | {
      /** Legacy single-container API (kept for compatibility). */
      container: HTMLElement;
      onClose: () => void;
      onKeyDown?: (event: KeyboardEvent) => void;
    }
  | {
      /** Multiple containers: click is considered "inside" if it falls within any container. */
      containers: Array<HTMLElement | null | undefined>;
      onClose: () => void;
      onKeyDown?: (event: KeyboardEvent) => void;
    }
  | {
      /** Dynamic container resolver (best for portaled menus). */
      getContainers: () => Array<HTMLElement | null | undefined>;
      onClose: () => void;
      onKeyDown?: (event: KeyboardEvent) => void;
    };

function resolveContainers(options: DropdownControllerOptions): HTMLElement[] {
  if ("getContainers" in options) {
    return (options.getContainers() ?? []).filter(Boolean) as HTMLElement[];
  }
  if ("containers" in options) {
    return (options.containers ?? []).filter(Boolean) as HTMLElement[];
  }
  return [options.container].filter(Boolean) as HTMLElement[];
}

export function makeDropdownController(options: DropdownControllerOptions): DropdownController {
  const { onClose } = options;

  const handlePointerDown = (event: InteractionEvent) => {
    const target = event.target as Node | null;
    if (!target) return;

    const containers = resolveContainers(options);
    // If the click is inside ANY container, do nothing.
    for (const container of containers) {
      if (container.contains(target)) return;
    }
    onClose();
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
      return;
    }
    options.onKeyDown?.(event);
  };

  return { handlePointerDown, handleKeyDown };
}
