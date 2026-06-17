import { Link } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Session } from "@contracts/constants";

function getOAuthUrl() {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // CSRF protection: bind a random nonce to this login attempt. The same nonce
  // travels in `state` (echoed by Auth0) and in a SameSite=Lax cookie; the
  // callback rejects the request unless both match.
  const nonce = crypto.randomUUID();
  document.cookie = `${Session.oauthStateCookie}=${nonce}; path=/; max-age=600; SameSite=Lax${
    window.location.protocol === "https:" ? "; Secure" : ""
  }`;
  const state = btoa(JSON.stringify({ r: redirectUri, n: nonce }));

  const url = new URL(`https://${domain}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);

  return url.toString();
}

export default function Login() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center mb-8">
          <Logo className="h-14" />
        </div>
        <Card className="bg-white border-[#E8E2DA] shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="font-serif text-xl text-[#3D3632]">Welcome back</CardTitle>
            <p className="text-sm text-[#6B6058]">Sign in to create and manage your lists</p>
          </CardHeader>
          <CardContent className="pt-4">
            <Button
              className="w-full bg-[#C67C5A] hover:bg-[#B56A48] text-white"
              size="lg"
              onClick={() => {
                window.location.href = getOAuthUrl();
              }}
            >
              Sign in with Auth0
            </Button>
            <p className="mt-6 text-center text-xs text-[#A39B92]">
              By signing in, you agree to our{" "}
              <Link to="/terms" className="underline hover:text-[#6B6058]">Terms of Service</Link> and{" "}
              <Link to="/privacy" className="underline hover:text-[#6B6058]">Privacy Policy</Link>.
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-sm text-[#6B6058]">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={() => {
              window.location.href = getOAuthUrl();
            }}
            className="text-[#C67C5A] hover:underline"
          >
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}
