# Lynx Athletics Live Deployment

This MVP uses two hosted apps:

- Backend API: Render Web Service
- Frontend website: Vercel Vite app

## 1. Backend on Render

Create a new Render Web Service from this repository.

Use these settings:

```text
Root Directory: lynx-ops-ai/server
Build Command: npm install
Start Command: npm start
```

Add these environment variables:

```text
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
OPENAI_IMAGE_MODEL=gpt-image-1.5
OPENAI_IMAGE_QUALITY=medium
ADMIN_EMAIL=your_admin_email
ADMIN_PASSWORD=your_admin_password
AUTH_SECRET=a_long_random_secret
CLIENT_ORIGIN=https://your-vercel-site.vercel.app
DATA_DIR=/opt/render/project/src/storage
```

Attach a Render persistent disk:

```text
Mount Path: /opt/render/project/src/storage
Size: 1 GB or larger
```

Copy the Render service URL after deployment. It will look like:

```text
https://lynx-ops-ai-api.onrender.com
```

## 2. Frontend on Vercel

Create a new Vercel project from this repository.

Use these settings:

```text
Framework Preset: Vite
Root Directory: lynx-ops-ai/client
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Add these environment variables:

```text
VITE_API_BASE_URL=https://your-render-api.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
VITE_GOOGLE_API_KEY=your_google_api_key
VITE_GOOGLE_CALENDAR_ID=lynxsoftballclub@gmail.com
```

## 3. Final Connection

After Vercel gives you the frontend URL, return to Render and update:

```text
CLIENT_ORIGIN=https://your-vercel-site.vercel.app
```

Redeploy the Render backend after changing `CLIENT_ORIGIN`.

## 4. Smoke Test

1. Open the Vercel site.
2. Click Admin Login.
3. Log in with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Create a coach invite.
5. Open the invite link in a private/incognito browser window.
6. Complete the profile, password, and waiver acknowledgement.
7. Log in through Coach Login using that new account.

## Notes Before Real Family Use

- Have final waiver language reviewed before relying on it.
- Render disk storage is okay for a small MVP test, but Supabase/Postgres is the better long-term database.
- Do not share admin credentials. Create individual coach/admin profiles instead.
