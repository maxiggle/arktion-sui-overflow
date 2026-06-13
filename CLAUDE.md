# Arktion — Development Standards

## Project
Creator-owned manga/manhwa/web novel platform on Sui blockchain.
Hackathon deadline: June 20, 2026.

## Stack
- **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS v4, Zustand, shadcn/ui
- **Backend**: NestJS, Prisma, PostgreSQL, JWT sessions
- **Chain**: Sui testnet, Move smart contracts, zkLogin (Google OAuth → wallet)

---

## Code Standards

### 1. No unnecessary comments
Do not add comments that restate what the code already says.
Write comments only for non-obvious decisions, tradeoffs, or constraints.

```ts
// ✗ Bad
// Fetch the user balance
const balance = await getInkBalance();

// ✓ Good (explains the why, not the what)
// Fast path — reads Postgres mirror, not the chain. For on-chain-fresh data use passport/me.
const balance = await getInkBalance();
```

### 2. Production-grade completeness
Every feature, fix, patch, or chore must be complete before it is considered done.
No TODO stubs, no placeholder returns, no empty catch blocks left in merged code.
If a feature cannot be finished, open a tracked issue — do not ship a half-built shell.

### 3. Security is non-negotiable

**Frontend**
- Validate every user-facing field with Zod before submitting to the API.
- Never trust URL parameters or localStorage values without sanitisation.
- No sensitive data (tokens, wallet addresses) in URL query strings.

**Backend**
- Every protected endpoint must use `JwtAuthGuard`. Verify on every request — sessions are stateful and revocable.
- Use `class-validator` + `ValidationPipe(whitelist: true, forbidNonWhitelisted: true)` on every DTO.
- Parameterise all database queries (Prisma handles this — never use raw string interpolation in queries).

**Admin**
- Admin role assignment requires a second admin to confirm (four-eyes principle).
- Admin actions are audit-logged via `AuditLogInterceptor`.
- TOTP is required for all admin accounts.

### 4. Dependency hygiene
- Always install packages without pinning to a specific version: `pnpm install <package>` not `pnpm install package@1.2.3`.
- Before adding a dependency, check if an existing package already covers the use case.
- Prefer packages that are actively maintained and widely adopted.

### 5. Naming and readability
- Function names must be self-explanatory. `fetchInkBalance` not `getData`.
- Prefer explicit over clever. Avoid deep ternary chains and nested one-liners.
- Use syntax sugar (optional chaining, nullish coalescing, destructuring) to remove repetition — not to obscure logic.
- Variable names should read like English: `isAuthenticated`, `hasCompletedOnboarding`, `chaptersReadCount`.

### 6. SOLID + DRY
- **Single responsibility**: one file, one concern. API functions do not manage state. Stores do not render UI.
- **Open/closed**: extend behaviour through composition, not by editing core utilities.
- **DRY**: if the same logic appears twice, extract it. Shared types live in `lib/types/`, shared UI in `components/ui/`.
- Do not copy-paste error handling, loading skeletons, or empty states — build shared components.

### 7. Scalability and abstraction
- The API layer (`lib/api/`) must never be imported directly by components — only by Zustand stores or hooks.
- Domain types (`lib/types/`) are the single source of truth for all data shapes.
- New features follow the existing folder structure: `lib/types/` → `lib/api/` → `stores/` → `components/` → `app/`.
- Design components to accept data as props. Business logic belongs in stores, not in JSX.

---

## Architecture

```
lib/types/     Entity interfaces (source of truth, no runtime code)
lib/api/       Typed async functions — pure HTTP, no state
stores/        Zustand stores — state + actions, calls lib/api/
components/    Presentational UI, calls stores or receives props
app/           Next.js pages — compose stores + components only
```

## Git workflow

```
main          → stable, production-ready only
development   → integration branch; all features merge here first
feature/*     → one branch per major feature
fix/*         → one branch per bug fix
```

- Every major feature or fix gets its own branch cut from `development`.
- Branch naming: `feature/<short-description>` or `fix/<short-description>`.
- Merge feature branches into `development` first via PR/merge.
- `development` → `main` only when the build is stable and tested.
- Never commit directly to `main` or `development`.

---

## Key conventions
- `reset()` must exist on every Zustand store and be called from `signOut()` in auth-context.
- All dates from the API are ISO strings — format them in the component, not the store.
- Reading status, format types, badge categories are numeric enums — label maps live in `lib/types/`.
- The axios instance lives at `lib/api/client.ts` — never create a second one.
- Backend port: `3000`. Frontend port: `3001` (Next.js). API prefix: `/api/v1`.
