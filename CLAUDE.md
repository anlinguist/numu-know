# CLAUDE.md — numu-know

Numu Know is a language-learning site for Numu (Northern Paiute): interlinear stories with audio, a dictionary, a learning hub (YouTube, blog, TikTok), and a store. Next.js 16 (App Router), React 19, TypeScript strict, Mantine 8. Firestore and Firebase Auth hold the data and accounts, Algolia powers search, and Klaviyo sends new-content emails.

The globalhost factory (github.com/anlinguist/globalhost) builds and maintains this repo. `factory.yaml` configures it. Product intent lives in `docs/product/` once that exists; when it conflicts with an issue, ask on the issue.

## Commands

```
npm ci                 # install (lockfile exact)
npm run dev            # dev server
npm run typecheck      # tsc --noEmit (if the script is missing, run npx tsc --noEmit)
npm run lint
npm run build          # production build; needs the NEXT_PUBLIC_FIREBASE_* values (factory.yaml previewEnv)
npx playwright test    # smoke test against the production build (e2e/)
```

CI (`.github/workflows/globalhost-ci.yml`) runs the same steps. The required `globalhost-ci` check must pass before merge.

## Layout

```
app/          routes (App Router); app/api/* are route handlers, app/actions/* server actions
components/   UI by feature (Dictionary, Stories, Learn, Store, Header, ...)
lib/          firebase (client), firebase-admin (server), algolia, sanitize, rate-limit, middleware/auth
proxy.ts      per-request CSP nonce and security headers (Next 16 "proxy", formerly middleware)
cloudbuild.yaml, Dockerfile   production build and deploy (Cloud Build → Cloud Run)
```

## Rules

- **Prod is reached only by merging to `main`.** Cloud Build builds and deploys `main` to Cloud Run. Don't add another deploy path, and don't change `cloudbuild.yaml`, the `Dockerfile`, `proxy.ts` or `lib/firebase*` unless the issue asks for it (they're `loadBearing` in factory.yaml).
- **Sanitize every HTML string before rendering it.** Use `sanitizeHTML` / `sanitizeSearchHighlight` from `lib/sanitize.ts` for anything passed to `dangerouslySetInnerHTML`. Don't widen the allowed tags or attributes without saying why in the PR.
- **Keep the CSP strict.** New third-party origins (media, embeds, APIs) go in `proxy.ts` explicitly; never add `'unsafe-inline'` or `'unsafe-eval'`, or a wildcard.
- **Admin routes check auth first.** Route handlers that write data call `rateLimitAdmin` and `requireAdmin` (see `app/api/newStory/route.ts`) before doing anything else.
- **Never commit secrets or `.env*` files.** Server secrets (Algolia admin key, Klaviyo, YouTube, WordPress) come from Secret Manager at deploy time. Only `NEXT_PUBLIC_*` Firebase web config is public.
- **Don't touch production data from dev, tests or previews.** `lib/firebase-admin.ts` falls back to the production project when `FIREBASE_PROJECT_ID` is unset; tests and previews must set it to a dev project or stub the call.
- **Dependencies:** exact-ish via `package-lock.json`; adding one needs a one-line reason in the PR. Renovate opens grouped weekly updates.
- **UI:** use Mantine components and the theme in `theme.ts`; keep pages working at mobile width (390px).
