import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ message: 'Auth refresh not implemented' }, { status: 501 });
}
