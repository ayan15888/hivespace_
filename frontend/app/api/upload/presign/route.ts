import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Upload presign not implemented' }, { status: 501 });
}
