import assert from "node:assert/strict";
import { test } from "node:test";
import { getPackageGithubRepo, normalizeRepositoryUrl } from "../lib/npm-repo";

test("repository normalization handles registry GitHub forms and monorepo directories", () => {
  for (const source of ["https://github.com/owner/repo", "git+https://github.com/owner/repo.git",
    "git://github.com/owner/repo.git", "git+ssh://git@github.com/owner/repo.git", "git@github.com:owner/repo.git"]) {
    assert.equal(normalizeRepositoryUrl(source), "https://github.com/owner/repo");
  }
  assert.equal(normalizeRepositoryUrl({ url: "git@github.com:react/react.git", directory: "packages/react" }),
    "https://github.com/react/react/tree/HEAD/packages/react");
  for (const source of [null, "https://github.com.evil.test/owner/repo", "https://evil@github.com/owner/repo",
    "javascript:alert(1)", "ssh://git@github.com:1234/owner/repo", "https://github.com/owner"]) {
    assert.equal(normalizeRepositoryUrl(source), null);
  }
  assert.equal(normalizeRepositoryUrl({ url: "https://github.com/owner/repo", directory: "../other" }),
    "https://github.com/owner/repo");
});

test("scoped packages use the latest-version endpoint and missing metadata produces no link", async (t) => {
  const requests: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    requests.push(url);
    return Response.json({ name: "@test/audit-repo" });
  });
  assert.equal(await getPackageGithubRepo("@test/audit-repo"), null);
  assert.equal(await getPackageGithubRepo("../bad"), null);
  assert.deepEqual(requests, ["https://registry.npmjs.org/%40test%2Faudit-repo/latest"]);
});
