# Arktion API test UI

Minimal Vite + React developer tool for exercising the Arktion NestJS backend
(`http://localhost:3000`). Five sections on one page: health, zkLogin sign-in,
profile, passport, and a raw session debug panel.

## Run

```bash
pnpm install
pnpm dev
```

Open http://localhost:5173. The backend must be running at `http://localhost:3000`
(`cd ../backend && pnpm start:dev`). Dev CORS allows all origins, so no proxy is needed.

## Config (`.env`)

| Var | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Backend base, `http://localhost:3000/api/v1`. `/health` is read from the origin root (the backend mounts it unprefixed). |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client used for the zkLogin id_token flow. |
| `VITE_SUI_NETWORK` | `testnet` — used to read the current epoch for the zkLogin nonce. |

## zkLogin sign-in

The "Sign in with Google (zkLogin)" button generates an ephemeral Ed25519 keypair,
reads the current Sui epoch, computes a nonce, persists the ephemeral state to
`sessionStorage`, and redirects to Google with `response_type=id_token`. On return,
the `id_token` is read from the URL fragment and POSTed to `/auth/zklogin/complete`;
the returned `sessionToken` and `user` are stored in `localStorage`.

> **OAuth redirect note:** Google requires the redirect URI (`http://localhost:5173`,
> the current origin) and JS origin to be registered as **Authorized redirect URIs /
> JavaScript origins** on the Google client ID. If you get `redirect_uri_mismatch`,
> add `http://localhost:5173` in the Google Cloud console — the app code is correct.

## Build

```bash
pnpm build      # tsc -b && vite build
```
