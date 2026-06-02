# SmashOrPass

**SmashOrPass** is a mobile MVP for discovering racket-sport partners (squash, tennis, pickleball), mutual matching, chat, session proposals, and a Strava-style activity feed. The stack is **Expo (React Native + TypeScript)**, **FastAPI**, **PostgreSQL** (compatible with **Supabase**), **Supabase Auth**, and **Supabase Storage** URLs for images.

## Repository layout

- `mobile/` - Expo app for **iOS, Android, and web** (tabs: Discover, Matches, Feed, Profile). Same codebase; web builds to static files in `mobile/dist/`.
- `backend/` - FastAPI API, SQLAlchemy 2.x models, Alembic migrations, seed script.

## Prerequisites

- Node 20+ and npm (Expo SDK 54 may warn below 20.19.4; upgrade if Metro fails).
- Python 3.11+.
- PostgreSQL 14+ (local or Supabase pooled connection string).

## Backend setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env: DATABASE_URL, SUPABASE_JWT_SECRET (Settings → API → JWT Secret in Supabase)
```

Run migrations:

```bash
alembic upgrade head
```

If you see **`FATAL: role "postgres" does not exist`** while connecting to **`localhost`**, your Postgres was probably installed via **Homebrew on macOS**: the default superuser is your **Mac login name**, not `postgres`. Fix by setting `DATABASE_URL` to use that user, for example `postgresql://YOUR_USERNAME@localhost:5432/racketmatch`, then create the DB if needed (`createdb racketmatch`). Alternatively create the role: `createuser -s postgres`.

If **`could not translate host name "db....supabase.co"`** (DNS failure): Supabase’s **direct** host `db.<ref>.supabase.co` often has **IPv6-only** DNS records. Many home/office networks don’t route IPv6, so Python/psycopg2 cannot resolve or reach it. **Fix:** In Supabase go to **Project Settings → Database → Connection pooling** and copy the **Session pooler** URI (host looks like `aws-0-<region>.pooler.supabase.com`, user looks like `postgres.<project-ref>`). Paste that as `DATABASE_URL`. Optionally append `?sslmode=require` if the client requires it.

Optional seed data (prints demo user UUIDs; use one for mock mobile auth):

```bash
python scripts/seed.py
```

Start the API:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Mock auth (no JWT)

For local testing without Supabase tokens, set in `backend/.env`:

```env
MOCK_AUTH_USER_ID=<paste-a-seed-uuid>
```

Leave `SUPABASE_JWT_SECRET` set to any non-empty placeholder if you only use mock mode, or use a real secret when verifying tokens. When `MOCK_AUTH_USER_ID` is set, the API ignores the `Authorization` header and uses that user id.

### CORS

`CORS_ORIGINS` in `.env` should include your Expo dev URLs (e.g. `http://localhost:8081`) and, for web testers, your deployed site (e.g. `https://racketmatch.vercel.app`). Use your machine’s LAN IP for a physical device.

## Mobile setup

```bash
cd mobile
cp .env.example .env
# Set EXPO_PUBLIC_API_URL to your machine IP if using a device (e.g. http://192.168.1.10:8000)
npm install
npx expo start          # phone simulators / Expo Go
npx expo start --web    # browser at http://localhost:8081
```

### Web (shareable test build)

The web app lives in **`mobile/`** (not a separate repo) so it shares screens, API client, and auth with the native app.

**Local web dev**

```bash
cd mobile
npm run web
```

**Production static export** (output: `mobile/dist/`)

```bash
cd mobile
npm run build:web
npx serve dist   # optional: preview locally
```

Set `EXPO_PUBLIC_*` env vars before `build:web` (Vercel/Netlify project env or a `.env` file). The API must allow your web origin in `CORS_ORIGINS`.

**Deploy to Vercel**: set the project **Root Directory** to `mobile`, then connect the repo. `mobile/vercel.json` runs `npm run build:web` and publishes `dist/`.

**Deploy to Netlify**: same root directory `mobile`; `mobile/netlify.toml` is included.

For Supabase email auth on web, add your site URL under **Authentication → URL configuration** (Site URL + redirect URLs).

### Environment variables (`mobile/.env`)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_API_URL` | FastAPI base URL (no trailing slash). |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key. |
| `EXPO_PUBLIC_DEV_MOCK_AUTH` | `true` to skip Supabase session and use backend mock user. |
| `EXPO_PUBLIC_DEV_MOCK_USER_ID` | UUID matching `MOCK_AUTH_USER_ID` on the backend. |

With seed + mock auth, you can exercise the full app without signing up.

### Supabase Auth (real flow)

1. Create a Supabase project; enable Email auth (or your chosen provider).
2. After signup, the app calls `GET /profiles/me`. If the profile is missing (`404`), onboarding runs.
3. Onboarding uses `PUT /profiles/me` (creates row on first save with the authenticated user id) and `PUT /profiles/me/sports`.
4. Point `SUPABASE_JWT_SECRET` in the backend to the **JWT secret** from Supabase (not the anon key). The API validates `Authorization: Bearer <access_token>`.

### Storage (profile / post images)

The app picks photos from the device library (`expo-image-picker`), uploads them to **Supabase Storage**, and saves the returned **public URL** in `photo_url` / `image_url` via the FastAPI API.

**Production:** keep `EXPO_PUBLIC_DEV_MOCK_AUTH=false` so users sign in with Supabase email/password. Uploads use the user’s Supabase JWT; mock dev login cannot upload (by design).

**One-time Supabase setup:** in the [SQL Editor](https://supabase.com/dashboard), run [`supabase/storage-setup.sql`](supabase/storage-setup.sql). That creates public buckets `avatars` and `post-images` and RLS policies so each user can only write under `{their-user-id}/`.

| Bucket | Path pattern | Used for |
|--------|----------------|----------|
| `avatars` | `{userId}/avatar-….jpg` | Profile photo |
| `post-images` | `{userId}/post-….jpg` | Feed post image |

## API overview

| Area | Endpoints |
|------|-----------|
| Profiles | `GET/PUT /profiles/me`, `GET /profiles/{id}`, `GET /profiles/discover`, `PUT /profiles/me/sports`, `GET /profiles/{id}/sports`, `GET /profiles/{id}/posts`, follow/unfollow, followers/following |
| Swipes | `POST /swipes` |
| Matches & messages | `GET /matches`, `GET/POST /matches/{id}/messages`, proposals under `/matches/{id}/proposals`, `PATCH /proposals/{id}` |
| Feed | `GET /feed`, `POST /posts`, likes, comments |

OpenAPI docs: `http://localhost:8000/docs`.

## Design notes

- **Discover**: swipe cards with `react-native-reanimated` pan + a small “swoosh” orb; sport-specific accent colors (tennis green/yellow, squash black/red, pickleball teal/orange).
- **Feed**: card layout with sport stripe, likes, inline comments, follow on authors.
- **Chat**: 5s polling; structure allows WebSockets later.

## License

Course / project use. Adjust as needed.
