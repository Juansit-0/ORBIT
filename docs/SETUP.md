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

## Deploy to Vercel

Add `YOUTUBE_API_KEY` under **Project Settings > Environment Variables** and redeploy.

## Quota

The free quota is 10,000 units per day. Resolving a new song costs about 101 units, so around 99 new songs per day. Resolved songs are cached in the browser and on the server, so replaying them costs nothing. When the quota runs out, Orbit falls back to the 30 second iTunes preview and marks the song as `Preview`.
