import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

const REQUIRED_FIELDS = [
  "name",
  "version",
  "publisher",
  "runtime",
  "requires",
  "permissions",
  "risk_level",
  "source",
  "assessment",
];
const REQUIREMENT_FIELDS = ["models", "tools", "skills", "api_keys"];
const RISK_LEVELS = new Set(["low", "medium", "high", "critical"]);
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
const PACKAGE_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PUBLISHER = /^@?[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireString(manifest, field, errors) {
  if (typeof manifest[field] !== "string" || manifest[field].trim() === "") {
    errors.push(`${field} must be a non-empty string`);
  }
}

export function validateManifest(manifest) {
  const errors = [];

  if (!isObject(manifest)) {
    return { valid: false, errors: ["manifest must be a YAML mapping"] };
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in manifest)) errors.push(`missing required field: ${field}`);
  }

  for (const field of ["name", "version", "publisher", "runtime"]) {
    if (field in manifest) requireString(manifest, field, errors);
  }

  if (typeof manifest.name === "string" && !PACKAGE_NAME.test(manifest.name)) {
    errors.push("name must use lowercase letters, numbers, and single hyphens");
  }
  if (typeof manifest.version === "string" && !SEMVER.test(manifest.version)) {
    errors.push("version must be valid semantic versioning without a leading v");
  }
  if (typeof manifest.publisher === "string" && !PUBLISHER.test(manifest.publisher)) {
    errors.push("publisher must be a valid GitHub-style owner name");
  }

  if ("requires" in manifest) {
    if (!isObject(manifest.requires)) {
      errors.push("requires must be a mapping");
    } else {
      for (const field of REQUIREMENT_FIELDS) {
        if (!(field in manifest.requires)) {
          errors.push(`missing required field: requires.${field}`);
        } else if (!Array.isArray(manifest.requires[field])) {
          errors.push(`requires.${field} must be an array`);
        } else if (manifest.requires[field].some((item) => typeof item !== "string" || item.trim() === "")) {
          errors.push(`requires.${field} entries must be non-empty strings`);
        }
      }
    }
  }

  if ("permissions" in manifest) {
    if (!Array.isArray(manifest.permissions)) {
      errors.push("permissions must be an array");
    } else if (manifest.permissions.some((item) => typeof item !== "string" || item.trim() === "")) {
      errors.push("permissions entries must be non-empty strings");
    }
  }

  if ("risk_level" in manifest && (typeof manifest.risk_level !== "string" || !RISK_LEVELS.has(manifest.risk_level))) {
    errors.push("risk_level must be one of: low, medium, high, critical");
  }

  if ("source" in manifest) {
    if (!isObject(manifest.source)) {
      errors.push("source must be a mapping");
    } else {
      if (typeof manifest.source.type !== "string" || manifest.source.type.trim() === "") {
        errors.push("source.type must be a non-empty string");
      }
      if (typeof manifest.source.grabber !== "string" || manifest.source.grabber.trim() === "") {
        errors.push("source.grabber must be a non-empty string");
      }
    }
  }

  if ("assessment" in manifest && (!isObject(manifest.assessment) || Object.keys(manifest.assessment).length === 0)) {
    errors.push("assessment must be a non-empty human-authored mapping");
  }

  return { valid: errors.length === 0, errors };
}

export function manifestPath(packagePath) {
  const resolved = path.resolve(packagePath);
  const stat = fs.existsSync(resolved) ? fs.statSync(resolved) : null;
  return stat?.isDirectory() ? path.join(resolved, "nemesys.yml") : resolved;
}

export function loadManifest(packagePath) {
  const file = manifestPath(packagePath);
  if (!fs.existsSync(file)) throw new Error(`manifest not found: ${file}`);

  let manifest;
  try {
    manifest = YAML.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`invalid YAML in ${file}: ${error.message}`);
  }

  const result = validateManifest(manifest);
  if (!result.valid) {
    throw new Error(`manifest validation failed:\n- ${result.errors.join("\n- ")}`);
  }
  return { file, manifest };
}

export function normalizedPublisher(publisher) {
  return publisher.replace(/^@/, "");
}
