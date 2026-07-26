import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSkill } from "@/lib/catalog";
import { createShareCard } from "@/lib/share-store";

const schema = z.object({
  skillId: z.string(),
  verdict: z.enum(["fits", "review", "blocked"])
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid share request." }, { status: 400 });
  const [owner, repo, slug] = parsed.data.skillId.split("/");
  const skill = await getSkill(owner, repo, slug);
  if (!skill) return NextResponse.json({ error: "Public skill not found." }, { status: 404 });
  const card = await createShareCard(skill, parsed.data.verdict);
  return NextResponse.json({ url: `/share/${card.id}` });
}
