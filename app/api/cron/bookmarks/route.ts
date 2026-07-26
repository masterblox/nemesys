import { NextRequest, NextResponse } from "next/server";
import { syncXBookmarks } from "@/lib/sources/x";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncXBookmarks());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Bookmark sync failed." }, { status: 502 });
  }
}
