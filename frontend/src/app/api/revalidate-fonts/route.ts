import { revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';

// Called by the admin Typography page right after a successful save/reset,
// so the change is live for the next request without waiting out
// getActiveFontsForLayout()'s 1-hour safety-net revalidate TTL. No shared
// secret to manage — instead it re-checks the caller's bearer token against
// the backend's own system:configure-gated catalog endpoint, the same
// permission every Site Font Engine mutation already requires.
export async function POST(request: Request): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const verifyResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/site-settings/fonts/catalog`, {
    headers: { authorization: authHeader },
    cache: 'no-store',
  });

  if (!verifyResponse.ok) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  revalidateTag('site-fonts');
  return NextResponse.json({ revalidated: true });
}
