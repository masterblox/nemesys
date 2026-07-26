import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { loadManifest, normalizedPublisher } from "./manifest.js";

const SEMVER_DIR = /^v(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

export function exec(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : "pipe",
    env: { ...process.env, ...options.env },
  });
  if (result.error) throw result.error;
  if (result.status !== 0 && !options.allowFailure) {
    const detail = result.stderr?.trim() || result.stdout?.trim() || `exit ${result.status}`;
    throw new Error(`${command} ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

export function findRegistryRoot(start = process.cwd()) {
  let current = path.resolve(start);
  while (true) {
    if (fs.existsSync(path.join(current, "packages"))) return current;
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

export function parsePackageSpec(spec) {
  const match = /^@?([^/]+)\/([^/]+)$/.exec(spec);
  if (!match) throw new Error(`package must be written as @publisher/name: ${spec}`);
  return { publisher: match[1], name: match[2], canonical: `@${match[1]}/${match[2]}` };
}

export function compareVersions(a, b) {
  const av = SEMVER_DIR.exec(a);
  const bv = SEMVER_DIR.exec(b);
  if (!av || !bv) return a.localeCompare(b);
  for (let index = 1; index <= 3; index += 1) {
    const difference = Number(av[index]) - Number(bv[index]);
    if (difference !== 0) return difference;
  }
  if (av[4] && !bv[4]) return -1;
  if (!av[4] && bv[4]) return 1;
  return (av[4] || "").localeCompare(bv[4] || "");
}

export function localPackage(spec, version, root = findRegistryRoot()) {
  if (!root) return null;
  const parsed = parsePackageSpec(spec);
  const packageRoot = path.join(root, "packages", `@${parsed.publisher}`, parsed.name);
  if (!fs.existsSync(packageRoot)) return null;

  const selected = version
    ? version.replace(/^v?/, "v")
    : fs.readdirSync(packageRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && SEMVER_DIR.test(entry.name))
      .map((entry) => entry.name)
      .sort(compareVersions)
      .at(-1);
  if (!selected) return null;
  const directory = path.join(packageRoot, selected);
  return fs.existsSync(directory) ? { directory, version: selected.slice(1), ...parsed } : null;
}

export function listLocalPackages(root = findRegistryRoot()) {
  if (!root) return [];
  const packagesRoot = path.join(root, "packages");
  if (!fs.existsSync(packagesRoot)) return [];
  const results = [];

  for (const publisherEntry of fs.readdirSync(packagesRoot, { withFileTypes: true })) {
    if (!publisherEntry.isDirectory() || !publisherEntry.name.startsWith("@")) continue;
    const publisherRoot = path.join(packagesRoot, publisherEntry.name);
    for (const packageEntry of fs.readdirSync(publisherRoot, { withFileTypes: true })) {
      if (!packageEntry.isDirectory()) continue;
      const found = localPackage(`${publisherEntry.name}/${packageEntry.name}`, undefined, root);
      if (!found) continue;
      try {
        const { manifest } = loadManifest(found.directory);
        results.push({ ...found, manifest });
      } catch {
        // Search and feed skip malformed packages; publish/assess report exact errors.
      }
    }
  }
  return results;
}

export function copyDirectory(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.cpSync(source, destination, { recursive: true, force: true });
}

export function tempDirectory(prefix = "atlantys-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function publicSkillsSearch(query) {
  const result = exec("npx", ["-y", "skills", "find", query], {
    env: { DISABLE_TELEMETRY: "1" },
  });
  return result.stdout.replace(/\u001b\[[0-9;]*m/g, "").trim();
}

export function remoteUrl(spec) {
  const parsed = parsePackageSpec(spec);
  const base = process.env.ATLANTYS_GITHUB_BASE_URL || "https://github.com";
  return `${base}/${parsed.publisher}/${parsed.name}.git`;
}

export function latestRemoteTag(spec) {
  const result = exec("git", ["ls-remote", "--tags", "--refs", remoteUrl(spec)]);
  return result.stdout
    .split("\n")
    .map((line) => line.trim().split(/\s+/)[1] || "")
    .map((ref) => ref.replace("refs/tags/", ""))
    .filter((tag) => SEMVER_DIR.test(tag))
    .sort(compareVersions)
    .at(-1) || null;
}

export function subscriptionFile() {
  const home = process.env.ATLANTYS_HOME || path.join(os.homedir(), ".atlantys");
  return path.join(home, "subscriptions.json");
}

export function readSubscriptions() {
  const file = subscriptionFile();
  if (!fs.existsSync(file)) return [];
  const value = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(value) ? value : [];
}

export function writeSubscriptions(subscriptions) {
  const file = subscriptionFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(subscriptions, null, 2)}\n`);
  return file;
}

export function manifestIdentity(manifest) {
  return `@${normalizedPublisher(manifest.publisher)}/${manifest.name}`;
}
