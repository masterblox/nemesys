import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSkill } from "@/lib/catalog";
import { deterministicAssessment } from "@/lib/compatibility";
import { hostedAssessment } from "@/lib/hosted-assessor";
import { consumeAssessment } from "@/lib/rate-limit";
import { randomToken, signDeviceId, verifyDeviceId } from "@/lib/security";

const requestSchema = z.object({
  skillId: z.string().regex(/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/),
  fleet: z.object({
    runtimes: z.array(z.string().max(50)).max(10),
    models: z.array(z.string().max(50)).max(10),
    tools: z.array(z.string().max(50)).max(15),
    policy: z.enum(["strict", "balanced", "experimental"])
  })
});

export async function POST(request: NextRequest) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid capability selection." }, { status: 400 });
  const [owner, repo, slug] = parsed.data.skillId.split("/");
  const skill = await getSkill(owner, repo, slug);
  if (!skill) return NextResponse.json({ error: "Public skill not found." }, { status: 404 });

  const existingCookie = request.cookies.get("atlantys_device")?.value;
  const deviceId = verifyDeviceId(existingCookie) || randomToken(18);
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limit = await consumeAssessment(deviceId, ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Three daily checks used. Your portal reopens after the reset.", resetAt: limit.resetAt },
      { status: 429 }
    );
  }
  const base = deterministicAssessment(skill, parsed.data.fleet);
  const assessment = await hostedAssessment(skill, parsed.data.fleet, base);
  const response = NextResponse.json({ assessment, remaining: limit.remaining, resetAt: limit.resetAt });
  if (!verifyDeviceId(existingCookie)) {
    response.cookies.set("atlantys_device", signDeviceId(deviceId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365
    });
  }
  return response;
}
