# Assets folder

Drop images, icons, SVGs, or other static files here to use them in the webapp.

**Usage in the app:**
- Reference files by path from the site root, e.g. `/assets/logo.png` or `/assets/icons/star.svg`
- In React/Next.js: use `<img src="/assets/logo.png" alt="Logo" />` or `next/image`:  
  `<Image src="/assets/logo.png" width={120} height={40} alt="Logo" />`

Files in this folder are served as-is by Next.js (no build step). Add subfolders if you like (e.g. `assets/icons/`, `assets/images/`).
