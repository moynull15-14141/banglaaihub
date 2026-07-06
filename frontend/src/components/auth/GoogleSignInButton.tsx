import { Button } from '@/components/ui/button';
import { GoogleIcon } from '@/components/auth/GoogleIcon';

// A full-page navigation, not an API call — GET /api/v1/auth/google 302s
// straight to Google's OAuth consent screen, which then redirects back to
// the backend's callback route and finally to /auth/callback on this app.
const GOOGLE_AUTH_URL = `${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/google`;

export function GoogleSignInButton() {
  return (
    <Button asChild size="lg" variant="outline" className="w-full gap-2">
      <a href={GOOGLE_AUTH_URL}>
        <GoogleIcon className="size-4" />
        Continue with Google
      </a>
    </Button>
  );
}
