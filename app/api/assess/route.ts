import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSkill } from "@/lib/catalog";
import { deterministicAssessment } from "@/lib/compatibility";
import { hostedAssessment } from "@/lib/hosted-assessor";
import { consumeAssessment } from "@/lib/rate-limit";
import { signAssessmentReceipt } from "@/lib/assessment-receipt";
import { trustedClientIp } from "@/lib/client-ip";
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
  const ip = trustedClientIp(request);
  if (process.env.NODE_ENV === "production" && !ip) {
    return NextResponse.json({ error: "Assessment proxy protection is not configured." }, { status: 503 });
  }
  const limit = await consumeAssessment(deviceId, ip);
  if (!limit.allowed) {
    const response = NextResponse.json(
      { error: "Three daily checks used. Your portal reopens after the reset.", resetAt: limit.resetAt },
      { status: 429 }
    );
    setDeviceCookie(response, existingCookie, deviceId);
    return response;
  }
  const base = deterministicAssessment(skill, parsed.data.fleet);
  const assessment = await hostedAssessment(skill, parsed.data.fleet, base);
  const receipt = await signAssessmentReceipt(skill, assessment.verdict);
  const response = NextResponse.json({ assessment, receipt, remaining: limit.remaining, resetAt: limit.resetAt });
  setDeviceCookie(response, existingCookie, deviceId);
  return response;
}

function setDeviceCookie(response: NextResponse, existingCookie: string | undefined, deviceId: string) {
  if (!verifyDeviceId(existingCookie)) {
    response.cookies.set("atlantys_device", signDeviceId(deviceId), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }
}
