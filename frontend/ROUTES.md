# Arktion Frontend Route Map

## Public

- `/`
- `/about`
- `/explore`
- `/series/[slug]`
- `/roadmap`
- `/privacy`
- `/terms`

## Auth

- `/sign-in`
- `/sign-up`
- `/onboarding`
- `/auth/callback`

## Reader

- `/dashboard`
- `/library`
- `/journal`
- `/history`
- `/search`
- `/reading`
- `/reader/[slug]/[chapterNum]`
- `/badges`
- `/notifications`
- `/passport`
- `/settings`
- `/wallet`
- `/submissions`
- `/support`
- `/tip/[seriesId]`
- `/read/[seriesId]/[chapterId]`

## Creator

- `/creator`
- `/creator/dashboard`
- `/creator/earnings`
- `/creator/wallet`
- `/creator/withdrawals`
- `/creator/publish`
- `/creator/publish/new`
- `/creator/publish/[seriesId]`
- `/creator/licensing`
- `/creator/bounties`
- `/creator/translations`
- `/creator/subscriptions`
- `/creator/world-bibles`
- `/creator/studio`
- `/creator/studio/text`
- `/creator/studio/comic`
- `/creator/studio/fanfiction`
- `/creator/studio/translation`
- `/creator/studio/drafts`
- `/creator/studio/queue`
- `/creator/studio/imports`
- `/creator/studio/settings`
- `/creator/analytics`
- `/creator/predictions`
- `/creator/gacha`
- `/creator/dao`
- `/creator/fan-dao`
- `/creator/community`

## Admin

- `/admin`
- `/admin/dashboard`
- `/admin/moderation`
- `/admin/reports`
- `/admin/reports/[reportId]`
- `/admin/content-reports`
- `/admin/users`
- `/admin/logs`
- `/admin/contracts`
- `/admin/settings`

## Notes

- Route groups like `(public)`, `(auth)`, `(protected)`, `(reader)`, and `(creator)` do not appear in the URL.
- There is no separate `app/(creator)` tree in the repo; the creator routes live under `app/(protected)/creator`.
- `app/auth/callback` and `app/reader/[slug]/[chapterNum]` are visible top-level routes outside the route groups so they can use chrome-free layouts.
- Reader routes are intentionally separate from creator routes by using a visible `/creator` path.
