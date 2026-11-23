# For Lidya ♥
A tiny universe of light, made for Lidya.

A lightweight, dependency-free romantic generative-art experience. The page uses an HTML5 canvas, a 3D parametric rose/mandala particle field, glowing stardust, a particle-built LIDYA wordmark, touch/mouse rotation, and a tap-to-reveal message.

## Run locally
Open `index.html` in a modern browser, or serve this directory with any static HTTP server.

## Publish with GitHub Pages
1. Create a **public** GitHub repository named `for-lidya` and push these files to its `main` branch.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **GitHub Actions** as the source.
4. The included workflow deploys automatically on every push to `main`. The first run may take a minute or two.
5. Share `https://YOUR-GITHUB-USERNAME.github.io/for-lidya/`.

## Controls
- Drag with a mouse or swipe with a finger to rotate the bloom.
- Tap/click the scene (or the small ✦ button) to reveal the message.
- The canvas adapts to portrait and landscape layouts and caps device pixel ratio for mobile performance.

## Performance & accessibility
No frameworks, external fonts, image assets, or network requests are required. The canvas uses a bounded device pixel ratio and pauses rendering while the tab is hidden. The interface includes a reduced-motion-aware CSS transition and an accessible message status region.
