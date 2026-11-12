# MjeeZohn Studio

Official static website for MjeeZohn Studio, built using accessible HTML, CSS, and vanilla JavaScript.

**Site:** https://mjeezohn.github.io  
**Repository:** https://github.com/mjeezohn/mjeezohn.github.io

## Pages / Sections

- **Home** — introduction to the studio
- **Music Library** — searchable, category-filtered catalogue
- **Music Videos** — YouTube Shorts teaser, loaded on click
- **Artist & Studio** — creative direction and background

## Editing releases

Open `app.js` and edit the `releases` array. Every entry requires a real title or a clearly labelled concept. Do not mark concepts as published until there is a verified public link.

## Preview locally

Open `index.html` in a browser, or run:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

## Publishing

The workflow in `.github/workflows/deploy.yml` deploys every push to `main` using GitHub Actions. If this is the first deploy, open **Repository → Settings → Pages → Build and deployment → Source → GitHub Actions** to enable Pages for this repository. Deployment success must be confirmed in the Actions tab.

## Security and privacy

- No application secrets or API keys.
- No third-party analytics or tracking scripts.
- YouTube embed is loaded only after the visitor clicks play.
- External links use `rel="noopener noreferrer"`.
- This is a static public repository; do not commit private files or credentials.

© MjeeZohn Studio.

## Automatically import all public videos from YouTube

This repository is configured for channel **https://www.youtube.com/@mjeezohn**.

The workflow `.github/workflows/youtube-sync.yml` runs daily at 02:17 UTC and can also be triggered manually from **Actions → Sync MjeeZohn YouTube catalogue → Run workflow**. It resolves the channel via YouTube Data API `channels.list(forHandle=@mjeezohn)`, reads the uploads playlist with pagination, verifies public status, and writes `data/youtube.json`. Successful changes are committed to `main`; the existing Pages workflow redeploys the updated catalogue.

### One-time Google Cloud configuration

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** in APIs & Services → Library.
3. Create an API key in APIs & Services → Credentials. Restrict it to **YouTube Data API v3**. GitHub-hosted runners use changing IPs, so avoid a browser referrer restriction for this server-side workflow.
4. Open **Repository → Settings → Secrets and variables → Actions → New repository secret**.
5. Set the secret name to **`YOUTUBE_API_KEY`** and paste the API key into its value. **Never paste it into source files or chat.**
6. Run the **Sync MjeeZohn YouTube catalogue** workflow manually once, check that it reports a positive number of public videos, then confirm the deploy workflow succeeds.

Until that API key is configured and the first sync completes, the site intentionally shows the existing starter catalogue. It is **not** yet a live view of all videos.

**Classification note:** YouTube Data API v3 does not provide a definitive Shorts flag. The sync marks a video as Shorts only when it is already known to be a Short or has a `#shorts` tag; otherwise it is listed under videos. The video is still imported even when its type cannot be determined. This means the Shorts filter is best-effort.

Only **public** uploads are imported. Private, unlisted, deleted, and inaccessible videos are excluded. The import covers video uploads, not separate YouTube Music audio tracks, playlists from other channels, or livestreams without a published video.

