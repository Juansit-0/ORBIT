# Setup

## Requirements

- Node.js 22 or newer
- A YouTube Data API v3 key (free)

## Get a YouTube Data API key

1. Open https://console.cloud.google.com/ and create a project named `orbit`.
2. Go to **APIs & Services > Library**, search for **YouTube Data API v3** and click **Enable**.
3. Go to **APIs & Services > Credentials > Create credentials > API key**.
4. Click the new key and under **API restrictions** choose **Restrict key** and select **YouTube Data API v3**.
5. Copy the key.

The key is only used by the server functions in `api/`, it is never sent to the browser.

## Run locally

```bash
cp .env.example .env
```

Paste the key after `YOUTUBE_API_KEY=` in `.env`, then:

```bash
npm install
npm run dev
```

## Link Spotify Premium (optional)

Orbit can play through a listener's own Spotify Premium account. Spotify needs Orbit to be registered once:

1. Open https://developer.spotify.com/dashboard and click **Create app**.
2. Name it `Orbit`, and under **Which API/SDKs are you planning to use?** tick **Web API** and **Web Playback SDK**.
3. Add these **Redirect URIs** exactly:
   - `http://127.0.0.1:5199/app/` for local use (Spotify does not accept `localhost`, so open Orbit at `http://127.0.0.1:5199/app/`)
   - `https://<your-vercel-domain>/app/` once deployed
4. Save, open **Settings**, and copy the **Client ID**. No client secret is needed: Orbit uses the PKCE flow in the browser.
5. Open **User Management** and add the name and email of every Spotify account that should be able to link, for example yours and your teacher's. While the app is in development mode Spotify only allows up to 25 accounts added here.
6. Paste the Client ID after `VITE_SPOTIFY_CLIENT_ID=` in `.env` and restart `npm run dev`.

Only Premium accounts can play full songs in other apps. Free accounts, accounts that are not on the list, or browsers without protected playback get a clear message and can continue with YouTube.

## Deploy to Vercel

Add `YOUTUBE_API_KEY` and, if you use Spotify, `VITE_SPOTIFY_CLIENT_ID` under **Project Settings > Environment Variables** and redeploy. Add the Vercel URL followed by `/app/` as a Redirect URI in the Spotify dashboard.

## Quota

The free quota is 10,000 units per day. Resolving a new song costs about 101 units, so around 99 new songs per day. Resolved songs are cached in the browser and on the server, so replaying them costs nothing. When the quota runs out, Orbit falls back to the 30 second iTunes preview and marks the song as `Preview`.
