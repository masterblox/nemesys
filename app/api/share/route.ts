import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSkill } from "@/lib/catalog";
import { createShareCard } from "@/lib/share-store";
import { assessmentEvidenceDigest, verifyAssessmentReceipt } from "@/lib/assessment-receipt";

const schema = z.object({
  receipt: z.string().min(1).max(4096)
}).strict();

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid share request." }, { status: 400 });
  const verified = await verifyAssessmentReceipt(parsed.data.receipt);
  if (!verified) return NextResponse.json({ error: "Assessment receipt is invalid or expired." }, { status: 401 });
  const [owner, repo, slug] = verified.sub.split("/");
  const skill = await getSkill(owner, repo, slug);
  if (!skill) return NextResponse.json({ error: "Public skill not found." }, { status: 404 });
  if (assessmentEvidenceDigest(skill) !== verified.evidenceDigest) {
    return NextResponse.json(
      { error: "Public evidence changed. Run Ask Dev again before sharing." },
      { status: 409 }
    );
  }
  const card = await createShareCard(skill, verified.verdict);
  return NextResponse.json({ url: `/share/${card.id}` });
}
