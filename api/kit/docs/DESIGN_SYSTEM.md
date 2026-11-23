# Design system structure

Every app ships `src/styles/tokens.css` with the same four layers:

1. **Brand scale** `--color-brand-50 ... 900` (the only thing that changes per brand)
2. **Semantic tokens** `primary`, `secondary`, `accent`, `background`, `foreground`, `surface`, `muted`, `border`, `success`, `warning`, `destructive` (+ `-hover`, `-light`, `-foreground`)
3. **Typography** `--font-display` (Plus Jakarta Sans), `--font-body` (Inter), `--font-mono` (JetBrains Mono), optional `--font-serif` (Lora, for documents)
4. **Shape** radius and shadow

Rules:
- Components use semantic tokens only, never raw hex.
- Dark mode overrides semantic tokens under `:root[data-theme="dark"]`.
- A brand may swap `--font-display` when the concept needs it; keep the others.
- Document the brand's primary hex and the font choice in the app's own `docs/design-system.md`.

## Worked example: Lighthouse (`frontend/src/styles/tokens.lighthouse.css`)
Source colors: Deep Ocean Blue `#183B56`, Beacon Red `#D94B45`, Pearl White `#F8F6F0`. Fonts: Manrope + Lora.
The 50-900 scales are derived from those colors; the contrast numbers are computed (WCAG 2.x).

| Decision | Why |
|---|---|
| CTA uses `beacon-600` `#CE4742`, not the source `#D94B45` | White text on `#D94B45` is 4.16:1 (below 4.5 for small text). `#CE4742` is 4.56:1. |
| `destructive` `#B42318` is separate from the CTA red | "Delete" must never look like "Generate". 6.57:1 on white. |
| The design-system "Danger" `#E15554` is kept as `danger-soft` | 3.73:1: fine for icons and borders, not for text. |
| `warning` badges use dark text (`warning-foreground`) | White on `#D99A32` is 2.44:1; navy on it is 6.28:1. |
| `gray-500` is for placeholders and disabled only | 2.85:1 on white. |
| Dark mode is derived | It is not in the design-system image; review it before use. |
