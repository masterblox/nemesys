import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicSkills } from "@/lib/sources/skills";
import { xAuthorizationUrl } from "@/lib/sources/x";

afterEach(() => vi.unstubAllGlobals());

describe("public source boundaries", () => {
  it("filters duplicate and non-GitHub Skills.sh entries", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          { id: "owner/repo/good", slug: "good", name: "Good", source: "owner/repo", installs: 1, sourceType: "github", installUrl: "https://github.com/owner/repo", url: "https://skills.sh/owner/repo/good" },
          { id: "copy/repo/copy", slug: "copy", name: "Copy", source: "copy/repo", installs: 1, sourceType: "github", installUrl: null, url: "https://skills.sh/copy/repo/copy", isDuplicate: true },
          { id: "domain.com/skill", slug: "skill", name: "Well Known", source: "domain.com", installs: 1, sourceType: "well-known", installUrl: null, url: "https://skills.sh/domain.com/skill" }
        ]
      })
    }));
    const result = await fetchPublicSkills();
    expect(result.map((skill) => skill.id)).toEqual(["owner/repo/good"]);
  });

  it("requests only read scopes for Carlos's X connection", () => {
    process.env.X_CLIENT_ID = "client";
    process.env.X_REDIRECT_URI = "https://nemesys.dev/api/x/callback";
    const url = new URL(xAuthorizationUrl("state", "challenge"));
    expect(url.searchParams.get("scope")).toBe("bookmark.read tweet.read users.read offline.access");
    expect(url.searchParams.get("scope")).not.toContain("write");
  });
});
