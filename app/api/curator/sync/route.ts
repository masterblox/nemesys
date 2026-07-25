import { NextResponse } from "next/server";
import { curatorIdentity } from "@/lib/curator";
import { syncXBookmarks } from "@/lib/sources/x";

export async function POST() {
  if (!await curatorIdentity()) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  try {
    return NextResponse.json(await syncXBookmarks());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Sync failed." }, { status: 502 });
  }
}
