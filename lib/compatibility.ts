import type { Assessment, FleetSelection, Skill, Verdict } from "./types";

const dangerousPermissions = ["shell", "credential", "secret", "delete", "payment", "production"];

export function deterministicAssessment(skill: Skill, fleet: FleetSelection): Assessment {
  const normalized = (values: string[]) => values.map((value) => value.toLowerCase());
  const fleetRuntimes = normalized(fleet.runtimes);
  const fleetModels = normalized(fleet.models);
  const fleetTools = normalized(fleet.tools);
  const requiredRuntimes = normalized(skill.runtime);
  const requiredModels = normalized(skill.models).filter((model) => model !== "any");
  const requiredTools = normalized(skill.tools);

  const runtimeMatches = skill.runtime.filter((runtime) => fleetRuntimes.includes(runtime.toLowerCase()));
  const modelMatches = skill.models.filter(
    (model) => model.toLowerCase() === "any" || fleetModels.includes(model.toLowerCase())
  );
  const toolMatches = skill.tools.filter((tool) => fleetTools.includes(tool.toLowerCase()));
  const incompatibilities: string[] = [];
  const missingInformation: string[] = [];
  const permissionConcerns = skill.permissions.filter((permission) =>
    dangerousPermissions.some((keyword) => permission.toLowerCase().includes(keyword))
  );

  if (requiredRuntimes.length && runtimeMatches.length === 0) {
    incompatibilities.push(`Requires one of: ${skill.runtime.join(", ")}`);
  }
  if (requiredModels.length && modelMatches.length === 0) {
    incompatibilities.push(`Model requirement not met: ${skill.models.join(", ")}`);
  }
  const missingTools = requiredTools.filter((tool) => !fleetTools.includes(tool));
  if (missingTools.length) incompatibilities.push(`Missing tools: ${missingTools.join(", ")}`);
  if (!skill.runtime.length) missingInformation.push("Runtime compatibility is not declared.");
  if (!skill.audits.length) missingInformation.push("No public security audit is available.");

  const failedAudit = skill.audits.some((audit) => audit.status === "fail") || skill.auditStatus === "fail";
  const strictPolicyConflict =
    fleet.policy === "strict" &&
    (skill.riskLevel === "high" || skill.riskLevel === "critical" || permissionConcerns.length > 0);

  let verdict: Verdict = "fits";
  if (failedAudit || incompatibilities.length > 0 || strictPolicyConflict) verdict = "blocked";
  else if (
    skill.auditStatus !== "pass" ||
    skill.riskLevel === "medium" ||
    skill.riskLevel === "high" ||
    missingInformation.length > 0 ||
    permissionConcerns.length > 0
  ) {
    verdict = "review";
  }

  const explanations: Record<Verdict, string> = {
    fits: "The declared requirements align with your selections and no blocking public risk evidence was found.",
    review: "The skill may run on your fleet, but incomplete or elevated-risk evidence needs a human check.",
    blocked: "A declared incompatibility, failed audit, or policy boundary prevents a safe recommendation."
  };
  const matchedCapabilities = [...runtimeMatches, ...modelMatches, ...toolMatches];

  return {
    verdict,
    explanation: explanations[verdict],
    matchedCapabilities: [...new Set(matchedCapabilities)],
    incompatibilities,
    permissionConcerns,
    missingInformation,
    confidence: missingInformation.length ? 0.66 : 0.9,
    recommendedAction:
      verdict === "fits"
        ? "Review the latest diff, then install in a disposable workspace first."
        : verdict === "review"
          ? "Inspect the flagged permissions and test in an isolated workspace."
          : "Do not install until the blocking requirement or audit issue is resolved."
  };
}

export function enforceHardRules(base: Assessment, candidate: Partial<Assessment>): Assessment {
  const cannotDowngrade = base.verdict === "blocked";
  const verdict = cannotDowngrade ? "blocked" : candidate.verdict || base.verdict;
  return {
    ...base,
    ...candidate,
    verdict,
    incompatibilities: [...new Set([...base.incompatibilities, ...(candidate.incompatibilities || [])])],
    permissionConcerns: [...new Set([...base.permissionConcerns, ...(candidate.permissionConcerns || [])])],
    missingInformation: [...new Set([...base.missingInformation, ...(candidate.missingInformation || [])])],
    matchedCapabilities: [...new Set([...base.matchedCapabilities, ...(candidate.matchedCapabilities || [])])],
    confidence: Math.min(Math.max(candidate.confidence ?? base.confidence, 0), 1)
  };
}
