import { NextResponse } from "next/server";

const HEYGEN_API_URL =
  process.env.HEYGEN_API_URL ?? "https://api.liveavatar.com";
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY ?? "";
const HEYGEN_AVATAR_ID = process.env.HEYGEN_AVATAR_ID ?? "";
const HEYGEN_SANDBOX = process.env.HEYGEN_SANDBOX !== "false";

export async function POST() {
  if (!HEYGEN_API_KEY) {
    return NextResponse.json(
      { error: "HEYGEN_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (!HEYGEN_AVATAR_ID) {
    return NextResponse.json(
      { error: "HEYGEN_AVATAR_ID is not configured" },
      { status: 500 }
    );
  }

  const response = await fetch(`${HEYGEN_API_URL}/v1/sessions/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": HEYGEN_API_KEY,
    },
    body: JSON.stringify({
      mode: "LITE",
      avatar_id: HEYGEN_AVATAR_ID,
      is_sandbox: HEYGEN_SANDBOX,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json(
      { error: `HeyGen API error: ${text}` },
      { status: response.status }
    );
  }

  const data = await response.json();
  return NextResponse.json({
    session_token: data.session_token,
    session_id: data.session_id,
  });
}
