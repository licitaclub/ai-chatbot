import { NextRequest, NextResponse } from "next/server";

const ADMIN_SUPABASE_URL = process.env.ADMIN_SUPABASE_URL!;
const ADMIN_SUPABASE_KEY = process.env.ADMIN_SUPABASE_KEY!;

const HEADERS = {
  "apikey": ADMIN_SUPABASE_KEY,
  "Authorization": `Bearer ${ADMIN_SUPABASE_KEY}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!ADMIN_SUPABASE_URL || !ADMIN_SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Admin Supabase not configured" },
      { status: 500 },
    );
  }

  const { path } = await params;
  const pathStr = path.join("/");

  const url = new URL(request.url);
  const target = `${ADMIN_SUPABASE_URL}/rest/v1/${pathStr}?${url.searchParams.toString()}`;

  try {
    const res = await fetch(target, {
      method: "GET",
      headers: HEADERS,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch from admin API" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  if (!ADMIN_SUPABASE_URL || !ADMIN_SUPABASE_KEY) {
    return NextResponse.json(
      { error: "Admin Supabase not configured" },
      { status: 500 },
    );
  }

  const { path } = await params;
  const pathStr = path.join("/");
  const body = await request.json();

  const url = new URL(request.url);
  const target = `${ADMIN_SUPABASE_URL}/rest/v1/${pathStr}?${url.searchParams.toString()}`;

  try {
    const res = await fetch(target, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to call admin API" },
      { status: 500 },
    );
  }
}
