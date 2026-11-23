# Design system: Lighthouse

- Tokens: `ui/src/styles/tokens.css` = `contract-kit/frontend/src/styles/tokens.lighthouse.css`.
- Primary (CTA): `beacon-600` `#CE4742` (white text 4.56:1). Source colours: Deep Ocean Blue `#183B56`, Beacon Red `#D94B45`, Pearl White `#F8F6F0`.
- Destructive `#B42318`, separate from the CTA red.
- Fonts: Manrope (UI, headings), Lora (document preview, login wordmark), JetBrains Mono (code). Bundled with @fontsource.
- Icons: lucide-react (Lucide style). Brand icons are not in Lucide 1.x, so the header links to the API docs instead of GitHub.
- Logos and the sign-in background: `ui/src/assets/brand/` (vector redraws; the background is an upscaled raster).
- Motion: framer-motion for accordions, drawers, stepper, toasts and the generate button; `MotionConfig reducedMotion="user"` respects the OS setting.
- Top bar (84 px, `h-24` with the 14 px base): `assets/brand/header-bg.webp` (2172×188, the scene band of the supplied artwork), right-aligned at full height from `lg`; its left part is the same navy as the bar. Below `lg` the bar is the plain gradient.
- Base font 14 px (`html { font-size: 87.5% }`); inputs use `text-base` (14 px).
- Technology logos: `assets/tech/<id>.svg|png|webp`, shown by `components/ui/TechLogo.jsx` (monogram fallback).
- Page: `.bg-page` (navy band under the top bar fading into `--color-canvas`); panels are white, radius 20 px.
- Output tiles use `--color-violet-*` (decorative, from the mockup) besides the semantic colours.
