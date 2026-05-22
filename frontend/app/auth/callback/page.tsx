import { Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <Loader2 className="size-8 animate-spin text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Completing sign in
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            We’re finishing your zkLogin return flow and sending you back into
            the app.
          </p>
        </div>
      </div>
    </div>
  );
}
