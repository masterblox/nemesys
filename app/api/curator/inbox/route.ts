import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { curatorIdentity, curatorInbox, decideInboxItem } from "@/lib/curator";

const decisionSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  note: z.string().max(500).optional()
});

export async function GET() {
  if (!await curatorIdentity()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  return NextResponse.json({ items: await curatorInbox() });
}

export async function PATCH(request: NextRequest) {
  if (!await curatorIdentity()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  const parsed = decisionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid decision." }, { status: 400 });
  try {
    return NextResponse.json(await decideInboxItem(parsed.data.id, parsed.data.decision, parsed.data.note));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Decision failed." }, { status: 400 });
  }
}
