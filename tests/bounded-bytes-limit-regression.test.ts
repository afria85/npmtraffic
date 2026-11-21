import assert from "node:assert/strict";
import { test } from "node:test";
import { ByteLimitError, readBoundedBytes } from "../lib/bounded-bytes";

function byteStream(chunks: number[][]) {
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      const next = chunks.shift();
      if (next) controller.enqueue(Uint8Array.from(next));
      else controller.close();
    },
  });
}

test("bounded upstream body accepts an exact byte-limit payload", async () => {
  const bytes = await readBoundedBytes(byteStream([[1, 2], [3, 4]]), 4);
  assert.deepEqual(Array.from(bytes), [1, 2, 3, 4]);
});

test("bounded upstream body rejects a streamed payload exceeding its byte limit", async () => {
  await assert.rejects(
    readBoundedBytes(byteStream([[1, 2], [3, 4, 5]]), 4),
    ByteLimitError,
  );
});

test("bounded upstream body rejects a single oversized chunk", async () => {
  await assert.rejects(
    readBoundedBytes(byteStream([[1, 2, 3]]), 2),
    ByteLimitError,
  );
});
