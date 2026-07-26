import fs from "node:fs";
import path from "node:path";
import {
  copyDirectory,
  exec,
  latestRemoteTag,
  listLocalPackages,
  localPackage,
  manifestIdentity,
  parsePackageSpec,
  publicSkillsSearch,
  readSubscriptions,
  remoteUrl,
  tempDirectory,
  writeSubscriptions,
} from "./registry.js";
import { loadManifest } from "./manifest.js";

const HELP = `Atlantys — updates for your agents across the multiverse

Usage:
  atlantys publish <package-directory> [--no-push]
  atlantys pull <@publisher/package> [--version <version>] [--output <directory>]
  atlantys feed
  atlantys search <query> [--local]
  atlantys subscribe <@publisher/package|@publisher>
  atlantys diff <@publisher/package> <from-version> <to-version>
  atlantys deploy <@publisher/package> --target <directory> [--version <version>]
  atlantys assess <package-directory>
  atlantys validate <package-directory>
`;

function option(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function has(args, name) {
  return args.includes(name);
}

function requireArgument(value, usage) {
  if (!value || value.startsWith("--")) throw new Error(`missing argument\nUsage: ${usage}`);
  return value;
}

function repositoryRoot(start) {
  const result = exec("git", ["rev-parse", "--show-toplevel"], { cwd: start });
  return result.stdout.trim();
}

async function publish(args) {
  const packageDirectory = fs.realpathSync(
    path.resolve(requireArgument(args[0], "atlantys publish <package-directory> [--no-push]")),
  );
  const { manifest } = loadManifest(packageDirectory);
  const identity = manifestIdentity(manifest);
  const expectedVersionDirectory = `v${manifest.version}`;
  if (path.basename(packageDirectory) !== expectedVersionDirectory) {
    throw new Error(`manifest version ${manifest.version} must match directory ${expectedVersionDirectory}`);
  }

  const root = fs.realpathSync(repositoryRoot(packageDirectory));
  const relative = path.relative(root, packageDirectory);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("package directory must be inside the Git repository being published");
  }
  const tracked = exec("git", ["ls-files", "--error-unmatch", path.join(relative, "atlantys.yml")], {
    cwd: root,
    allowFailure: true,
  });
  if (tracked.status !== 0) throw new Error("manifest must be committed before publishing");

  const tag = `v${manifest.version}`;
  const existing = exec("git", ["tag", "--list", tag], { cwd: root }).stdout.trim();
  if (existing) throw new Error(`tag already exists: ${tag}`);
  exec("git", ["tag", "-a", tag, "-m", `Publish ${identity} ${tag}`], { cwd: root });

  if (!has(args, "--no-push")) {
    try {
      exec("git", ["push", "origin", tag], { cwd: root });
    } catch (error) {
      exec("git", ["tag", "-d", tag], { cwd: root, allowFailure: true });
      throw new Error(`${error.message}\nlocal tag rolled back`);
    }
  }
  console.log(`Published ${identity}@${manifest.version} as Git tag ${tag}${has(args, "--no-push") ? " (not pushed)" : ""}`);
}

async function pullPackage(args) {
  const spec = requireArgument(args[0], "atlantys pull <@publisher/package>");
  const parsed = parsePackageSpec(spec);
  const version = option(args, "--version");
  const destination = path.resolve(option(args, "--output") || parsed.name);
  if (fs.existsSync(destination) && fs.readdirSync(destination).length > 0) {
    throw new Error(`destination is not empty: ${destination}`);
  }

  const local = localPackage(spec, version);
  if (local) {
    copyDirectory(local.directory, destination);
    console.log(`Pulled ${local.canonical}@${local.version} to ${destination} (local registry)`);
    return { destination, version: local.version, canonical: local.canonical };
  }

  const tag = version ? `v${version.replace(/^v/, "")}` : latestRemoteTag(spec);
  const cloneArgs = ["clone", "--depth", "1"];
  if (tag) cloneArgs.push("--branch", tag);
  cloneArgs.push(remoteUrl(spec), destination);
  exec("git", cloneArgs);
  if (!fs.existsSync(path.join(destination, "atlantys.yml"))) {
    const versionDirectory = tag || "";
    const nested = path.join(destination, "packages", `@${parsed.publisher}`, parsed.name, versionDirectory);
    if (versionDirectory && fs.existsSync(path.join(nested, "atlantys.yml"))) {
      const staging = tempDirectory("atlantys-pull-");
      copyDirectory(nested, staging);
      fs.rmSync(destination, { recursive: true, force: true });
      copyDirectory(staging, destination);
      fs.rmSync(staging, { recursive: true, force: true });
    }
  }
  const { manifest } = loadManifest(destination);
  console.log(`Pulled ${parsed.canonical}@${manifest.version} to ${destination}`);
  return { destination, version: manifest.version, canonical: parsed.canonical };
}

async function search(args) {
  const query = requireArgument(args[0], "atlantys search <query>").toLowerCase();
  if (!has(args, "--local")) {
    if (process.env.ATLANTYS_OFFLINE === "1") {
      throw new Error("public skill search is unavailable offline; use --local for private development packages");
    }
    const results = publicSkillsSearch(query);
    console.log(results || "No public skills found.");
    return;
  }
  const local = listLocalPackages()
    .filter(({ canonical, manifest }) =>
      `${canonical} ${manifest.name} ${manifest.publisher} ${manifest.description || ""}`.toLowerCase().includes(query))
    .map(({ canonical, version, manifest }) => ({
      canonical,
      version,
      description: manifest.description || "",
      source: "local",
    }));

  if (local.length === 0) {
    console.log("No local/private packages found.");
    return;
  }
  console.log("LOCAL/PRIVATE DEVELOPMENT PACKAGES — not public registry results");
  for (const item of local) {
    console.log(`${item.canonical}@${item.version}${item.description ? ` — ${item.description}` : ""}`);
  }
}

async function subscribe(args) {
  const value = requireArgument(args[0], "atlantys subscribe <@publisher/package|@publisher>");
  if (!/^@[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)?$/.test(value)) {
    throw new Error("subscription must be @publisher or @publisher/package");
  }
  const subscriptions = readSubscriptions();
  if (!subscriptions.includes(value)) subscriptions.push(value);
  const file = writeSubscriptions(subscriptions.sort());
  console.log(`Subscribed to ${value} (${file})`);
}

async function feed() {
  const subscriptions = readSubscriptions();
  if (subscriptions.length === 0) {
    console.log("Feed is empty. Use `atlantys subscribe @publisher/package` first.");
    return;
  }
  const entries = listLocalPackages().filter(({ canonical }) =>
    subscriptions.some((value) => value === canonical || canonical.startsWith(`${value}/`)));
  for (const { canonical, version, manifest } of entries) {
    console.log(`${canonical}@${version} — risk ${manifest.risk_level}`);
  }
  const localIdentities = new Set(entries.map(({ canonical }) => canonical));
  let remoteCount = 0;
  if (process.env.ATLANTYS_OFFLINE !== "1") {
    for (const subscription of subscriptions) {
      if (!subscription.includes("/") || localIdentities.has(subscription)) continue;
      try {
        const tag = latestRemoteTag(subscription);
        if (tag) {
          console.log(`${subscription}@${tag.slice(1)} — GitHub`);
          remoteCount += 1;
        }
      } catch (error) {
        console.error(`Could not refresh ${subscription}: ${error.message}`);
      }
    }
  }
  if (entries.length === 0 && remoteCount === 0) {
    console.log("No updates found for your subscriptions.");
  }
}

async function diffPackage(args) {
  const spec = requireArgument(args[0], "atlantys diff <package> <from-version> <to-version>");
  const fromVersion = requireArgument(args[1], "atlantys diff <package> <from-version> <to-version>");
  const toVersion = requireArgument(args[2], "atlantys diff <package> <from-version> <to-version>");
  const from = localPackage(spec, fromVersion);
  const to = localPackage(spec, toVersion);

  if (from && to) {
    const result = exec("git", ["diff", "--no-index", "--", from.directory, to.directory], { allowFailure: true });
    if (![0, 1].includes(result.status)) throw new Error(result.stderr.trim());
    process.stdout.write(result.stdout || "No differences.\n");
    return;
  }

  const temporary = tempDirectory("atlantys-diff-");
  try {
    exec("git", ["clone", "--quiet", remoteUrl(spec), temporary]);
    const result = exec("git", ["diff", `v${fromVersion.replace(/^v/, "")}`, `v${toVersion.replace(/^v/, "")}`], {
      cwd: temporary,
    });
    process.stdout.write(result.stdout || "No differences.\n");
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

async function deploy(args) {
  const spec = requireArgument(args[0], "atlantys deploy <package> --target <directory>");
  const targetRoot = option(args, "--target");
  if (!targetRoot) throw new Error("deploy requires --target <directory>");
  const parsed = parsePackageSpec(spec);
  const temporary = tempDirectory("atlantys-deploy-");
  const pulled = path.join(temporary, parsed.name);
  try {
    await pullPackage([spec, "--output", pulled, ...(option(args, "--version") ? ["--version", option(args, "--version")] : [])]);
    const destination = path.resolve(targetRoot, parsed.name);
    copyDirectory(pulled, destination);
    console.log(`Deployed ${spec}@${loadManifest(pulled).manifest.version} to ${destination}`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

async function assess(args) {
  const target = requireArgument(args[0], "atlantys assess <package-directory>");
  const { manifest } = loadManifest(target);
  console.log(`${manifestIdentity(manifest)}@${manifest.version}`);
  console.log(`Risk: ${manifest.risk_level}`);
  console.log("Assessment:");
  console.log(JSON.stringify(manifest.assessment, null, 2));
}

async function validate(args) {
  const target = requireArgument(args[0], "atlantys validate <package-directory>");
  const { file, manifest } = loadManifest(target);
  console.log(`Valid: ${file} (${manifestIdentity(manifest)}@${manifest.version})`);
}

export async function run(args) {
  const [command, ...rest] = args;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }
  const commands = { publish, pull: pullPackage, feed, search, subscribe, diff: diffPackage, deploy, assess, validate };
  if (!commands[command]) throw new Error(`unknown command: ${command}\n\n${HELP}`);
  await commands[command](rest);
}
