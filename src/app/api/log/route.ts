import { NextResponse } from 'next/server';

let measurements: any[] = [];

export async function POST(req: Request) {
  const body = await req.json();
  measurements.push({ ...body, timestamp: Date.now() });
  return NextResponse.json({ success: true, data: body });
}

export async function GET() {
  return NextResponse.json({ measurements });
} 