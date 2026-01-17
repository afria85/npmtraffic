import assert from "node:assert/strict";
import { test } from "node:test";
import { makeDropdownController } from "../lib/dropdown-controller";

test("dropdown controller closes on outside pointer", () => {
  let closed = false;
  const container = {
    contains: (target: Node) => {
      return target === inside;
    },
  } as const;
  const inside = {} as Node;
  const controller = makeDropdownController({
    container: container as unknown as HTMLElement,
    onClose: () => {
      closed = true;
    },
  });

  const outsideEvent = {
    target: {} as Node,
  } as PointerEvent;
  controller.handlePointerDown(outsideEvent);
  assert.equal(closed, true);
});

test("dropdown controller ignores inside pointer", () => {
  let closed = false;
  const inside = {} as Node;
  const container = {
    contains: () => true,
  } as const;
  const controller = makeDropdownController({
    container: container as unknown as HTMLElement,
    onClose: () => {
      closed = true;
    },
  });

  controller.handlePointerDown({ target: inside } as PointerEvent);
  assert.equal(closed, false);
});

test("dropdown controller closes on Escape", () => {
  let closed = false;
  const container = {} as HTMLElement;
  const controller = makeDropdownController({
    container,
    onClose: () => {
      closed = true;
    },
  });
  controller.handleKeyDown({ key: "Escape" } as KeyboardEvent);
  assert.equal(closed, true);
});
