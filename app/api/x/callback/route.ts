import { NextRequest, NextResponse } from "next/server";
import { signCuratorSession } from "@/lib/security";
import { exchangeXCode, saveXConnection, xMe } from "@/lib/sources/x";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get("x_oauth_state")?.value;
  const verifier = request.cookies.get("x_oauth_verifier")?.value;
  if (!code || !state || !expectedState || state !== expectedState || !verifier) {
    return NextResponse.json({ error: "Invalid or expired X OAuth state." }, { status: 400 });
  }
  try {
    const tokens = await exchangeXCode(code, verifier);
    const user = await xMe(tokens.access_token);
    const allowed = (process.env.CURATOR_ALLOWED_X_IDS || "").split(",").map((value) => value.trim()).filter(Boolean);
    if (!allowed.includes(user.id)) return NextResponse.json({ error: "This X account is not allowlisted." }, { status: 403 });
    await saveXConnection(user, tokens);
    const response = NextResponse.redirect(new URL("/curator", request.url));
    response.cookies.set("atlantys_curator", await signCuratorSession(user.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 8,
      path: "/"
    });
    response.cookies.delete("x_oauth_state");
    response.cookies.delete("x_oauth_verifier");
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "X connection failed." }, { status: 502 });
  }
}
