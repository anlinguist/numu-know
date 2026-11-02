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
npm test               # unit tests (node --test)
npm run seed:dev       # seed the dev Firebase project from seed/fixtures.mjs (see below)
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
- **Sanitize every HTML string before rendering it.** Anything passed to `html-react-parser`'s `parse()` or to `dangerouslySetInnerHTML` goes through `sanitizeHTML` / `sanitizeSearchHighlight` from `lib/sanitize.ts` first. Don't widen the allowed tags or attributes without saying why in the PR.
- **Keep the CSP strict.** New third-party origins (media, embeds, APIs) go in `proxy.ts` as exact hosts. Don't add `'unsafe-inline'`/`'unsafe-eval'` to the production `script-src`, and don't add new wildcards. Existing exceptions (production `style-src 'unsafe-inline'`, the Google wildcards, the dev-only branch) stay until an issue says otherwise.
- **Writes check auth first.** Every route handler or server action that writes data verifies the caller before doing anything else: route handlers call `rateLimitAdmin` and `requireAdmin` (see `app/api/newStory/route.ts`); server actions in `app/actions/` verify the user's token and admin claim (see `app/actions/story-actions.ts`). Public `GET` handlers don't write.
- **`firestore.rules`** mirrors the rules deployed to production and to `numu-know-dev`. Changing it needs the owner to deploy it.
- **Never commit secrets or `.env*` files.** Server secrets (Algolia admin key, Klaviyo, YouTube, WordPress) come from Secret Manager at deploy time. Only `NEXT_PUBLIC_*` Firebase web config is public.
- **Don't touch production data from dev, tests or previews.** `lib/firebase-admin.ts` uses `FIREBASE_PROJECT_ID`, else the build's `NEXT_PUBLIC_FIREBASE_PROJECT_ID`. CI, agent runs and previews build with `factory.yaml`'s `previewEnv`, which names the dev project `numu-know-dev`. Its content comes only from `seed/fixtures.mjs` (placeholder text, never copied from production); add fixtures there when a feature needs data. Analytics loads only in builds that name the production project (production and staging); Algolia search returns nothing and Klaviyo routes fail closed without their keys.
- **Dependencies:** exact-ish via `package-lock.json`; adding one needs a one-line reason in the PR. Renovate opens grouped weekly updates.
- **UI:** use Mantine components and the theme in `theme.ts`; keep pages working at mobile width (390px).

## Previews

Each PR into `main` by the owner or the factory bot gets `https://numu-know-web-pr-<n>.globalhost.ai` (behind Cloudflare Access, dev data from `numu-know-dev`) and a comment with desktop and mobile screenshots of `factory.yaml`'s `routes`. `globalhost-preview-build.yml` builds with no credentials; `globalhost-preview.yml` deploys from `main` only. Closing the PR tears the preview down.
