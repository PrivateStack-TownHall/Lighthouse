/** Logos from src/assets/tech/<id>.(svg|png|webp). Missing files fall back to a monogram (components/ui/TechLogo.jsx). */
const files = import.meta.glob('../../assets/tech/*.{svg,png,webp}', { eager: true, query: '?url', import: 'default' });

export const TECH_LOGOS = Object.fromEntries(
  Object.entries(files).map(([path, url]) => [path.split('/').pop().replace(/\.(svg|png|webp)$/, ''), url]),
);
