import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { randomToken } from "@/lib/security";
import { xAuthorizationUrl } from "@/lib/sources/x";

export async function GET() {
  if (!process.env.X_CLIENT_ID || !process.env.X_REDIRECT_URI) {
    return NextResponse.json({ error: "X OAuth is not configured." }, { status: 503 });
  }
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  const response = NextResponse.redirect(xAuthorizationUrl(state, challenge));
  const options = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/"
  };
  response.cookies.set("x_oauth_state", state, options);
  response.cookies.set("x_oauth_verifier", verifier, options);
  return response;
}
