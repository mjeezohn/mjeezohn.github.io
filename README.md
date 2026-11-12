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
