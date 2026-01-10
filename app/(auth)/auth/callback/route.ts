import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Auth callback handler will be implemented in Phase 3
  return NextResponse.redirect(new URL('/', request.url));
}
