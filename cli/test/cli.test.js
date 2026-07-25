import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import { validateManifest } from "../src/manifest.js";

const cliRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = path.resolve(cliRoot, "..");
const executable = path.join(cliRoot, "bin", "nemesys.js");
const sample = path.join(cliRoot, "test", "fixtures", "gdpr-data-handling", "v1.0.0");

function temporaryDirectory(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function runCli(args, { cwd = repositoryRoot, env = {}, expectedStatus = 0 } = {}) {
  const result = spawnSync(process.execPath, [executable, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, NEMESYS_OFFLINE: "1", ...env },
  });
  assert.equal(result.status, expectedStatus, `stderr:\n${result.stderr}\nstdout:\n${result.stdout}`);
  return result;
}

test("sample manifest validates against the Phase 1 contract", () => {
  const manifest = YAML.parse(fs.readFileSync(path.join(sample, "nemesys.yml"), "utf8"));
  assert.deepEqual(validateManifest(manifest), { valid: true, errors: [] });
});

test("validator reports every required top-level field", () => {
  const result = validateManifest({});
  assert.equal(result.valid, false);
  for (const field of [
    "name",
    "version",
    "publisher",
    "runtime",
    "requires",
    "permissions",
    "risk_level",
    "source",
    "assessment",
  ]) {
    assert.ok(result.errors.includes(`missing required field: ${field}`));
  }
});

test("validator rejects an invalid risk type", () => {
  const manifest = YAML.parse(fs.readFileSync(path.join(sample, "nemesys.yml"), "utf8"));
  manifest.risk_level = 1;
  const result = validateManifest(manifest);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("risk_level must be one of: low, medium, high, critical"));
});

test("search, pull, subscribe, feed, assess, validate, diff, and deploy work locally", () => {
  const sandbox = temporaryDirectory("nemesys-cli-");
  const registry = path.join(sandbox, "registry");
  const packageRoot = path.join(registry, "packages", "@wshobson", "gdpr-data-handling");
  const v100 = path.join(packageRoot, "v1.0.0");
  const v110 = path.join(packageRoot, "v1.1.0");
  const state = path.join(sandbox, "state");
  fs.mkdirSync(registry, { recursive: true });
  fs.cpSync(sample, v100, { recursive: true });
  fs.cpSync(sample, v110, { recursive: true });
  const nextManifestPath = path.join(v110, "nemesys.yml");
  const nextManifest = YAML.parse(fs.readFileSync(nextManifestPath, "utf8"));
  nextManifest.version = "1.1.0";
  nextManifest.assessment.summary = "Second human review.";
  fs.writeFileSync(nextManifestPath, YAML.stringify(nextManifest));

  const searchResult = runCli(["search", "gdpr", "--local"], { cwd: registry }).stdout;
  assert.match(searchResult, /LOCAL\/PRIVATE DEVELOPMENT PACKAGES/);
  assert.match(searchResult, /@wshobson\/gdpr-data-handling@1\.1\.0/);
  assert.match(runCli(["validate", v100], { cwd: registry }).stdout, /^Valid:/);
  assert.match(runCli(["assess", v100], { cwd: registry }).stdout, /Risk: low/);

  const pulled = path.join(sandbox, "pulled");
  assert.match(
    runCli(["pull", "@wshobson/gdpr-data-handling", "--version", "1.0.0", "--output", pulled], { cwd: registry }).stdout,
    /Pulled .*@1\.0\.0/,
  );
  assert.ok(fs.existsSync(path.join(pulled, "nemesys.yml")));

  assert.match(
    runCli(["subscribe", "@wshobson/gdpr-data-handling"], {
      cwd: registry,
      env: { NEMESYS_HOME: state },
    }).stdout,
    /Subscribed/,
  );
  assert.match(
    runCli(["feed"], { cwd: registry, env: { NEMESYS_HOME: state } }).stdout,
    /@wshobson\/gdpr-data-handling@1\.1\.0 — risk low/,
  );

  assert.match(
    runCli(["diff", "@wshobson/gdpr-data-handling", "1.0.0", "1.1.0"], { cwd: registry }).stdout,
    /Second human review/,
  );

  const fleet = path.join(sandbox, "fleet");
  assert.match(
    runCli(["deploy", "@wshobson/gdpr-data-handling", "--target", fleet, "--version", "1.0.0"], {
      cwd: registry,
    }).stdout,
    /Deployed .*@1\.0\.0/,
  );
  assert.ok(fs.existsSync(path.join(fleet, "gdpr-data-handling", "nemesys.yml")));
});

test("publish validates, creates an annotated tag, and pushes it to origin", () => {
  const sandbox = temporaryDirectory("nemesys-publish-");
  const remoteBase = path.join(sandbox, "github");
  const remote = path.join(remoteBase, "wshobson", "gdpr-data-handling.git");
  const repository = path.join(sandbox, "repository");
  fs.mkdirSync(path.dirname(remote), { recursive: true });
  fs.mkdirSync(repository);

  assert.equal(spawnSync("git", ["init", "--bare", remote]).status, 0);
  assert.equal(spawnSync("git", ["init"], { cwd: repository }).status, 0);
  for (const [key, value] of [["user.name", "Nemesys Test"], ["user.email", "nemesys@example.invalid"]]) {
    assert.equal(spawnSync("git", ["config", key, value], { cwd: repository }).status, 0);
  }
  assert.equal(spawnSync("git", ["remote", "add", "origin", remote], { cwd: repository }).status, 0);

  const packageDirectory = path.join(repository, "packages", "@wshobson", "gdpr-data-handling", "v1.0.0");
  fs.cpSync(sample, packageDirectory, { recursive: true });
  assert.equal(spawnSync("git", ["add", "."], { cwd: repository }).status, 0);
  assert.equal(spawnSync("git", ["commit", "-m", "Add package"], { cwd: repository }).status, 0);

  assert.match(runCli(["publish", packageDirectory], { cwd: repository }).stdout, /Published .* Git tag v1\.0\.0/);
  const tags = spawnSync("git", ["ls-remote", "--tags", remote], { encoding: "utf8" });
  assert.equal(tags.status, 0);
  assert.match(tags.stdout, /refs\/tags\/v1\.0\.0/);

  const pulled = path.join(sandbox, "remote-pull");
  assert.match(
    runCli(["pull", "@wshobson/gdpr-data-handling", "--output", pulled], {
      cwd: sandbox,
      env: { NEMESYS_GITHUB_BASE_URL: remoteBase },
    }).stdout,
    /Pulled .*@1\.0\.0/,
  );
  assert.ok(fs.existsSync(path.join(pulled, "nemesys.yml")));
});

test("publish refuses an invalid manifest before tagging", () => {
  const sandbox = temporaryDirectory("nemesys-invalid-");
  const repository = path.join(sandbox, "repository");
  const packageDirectory = path.join(repository, "packages", "@example", "broken", "v1.0.0");
  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.writeFileSync(path.join(packageDirectory, "nemesys.yml"), "name: broken\nversion: nope\n");
  spawnSync("git", ["init"], { cwd: repository });
  const result = runCli(["publish", packageDirectory, "--no-push"], {
    cwd: repository,
    expectedStatus: 1,
  });
  assert.match(result.stderr, /manifest validation failed/);
  assert.equal(spawnSync("git", ["tag"], { cwd: repository, encoding: "utf8" }).stdout.trim(), "");
});
