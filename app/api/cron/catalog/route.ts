import { NextRequest, NextResponse } from "next/server";
import { syncPublicCatalog } from "@/lib/sources/skills";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Cron is not configured." }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    return NextResponse.json(await syncPublicCatalog());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Catalog sync failed." }, { status: 502 });
  }
}
