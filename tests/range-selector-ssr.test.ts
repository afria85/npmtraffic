import { test } from "node:test";

test("RangeSelector server module loads without window/document", async () => {
  await import("../components/RangeSelector");
});
