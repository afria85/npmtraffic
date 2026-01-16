import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeRepositoryUrl } from "../lib/npm-repo";

test("normalizeRepositoryUrl handles strings and objects", () => {
  const first = normalizeRepositoryUrl("https://github.com/user/repo");
  assert.equal(first, "https://github.com/user/repo");
  assert.equal(
    normalizeRepositoryUrl("git+https://github.com/user/repo.git"),
    "https://github.com/user/repo"
  );
  assert.equal(
    normalizeRepositoryUrl({ url: "git://github.com/user/repo.git" }),
    "https://github.com/user/repo"
  );
  assert.equal(
    normalizeRepositoryUrl({ url: "https://gitlab.com/user/repo" }),
    null
  );
});
