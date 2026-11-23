import { TECH_LOGOS } from '../../features/configuration/tech-logos.js';

/** "React + Vite" -> "RV", "PostgreSQL" -> "Po" */
function monogram(name) {
  const words = String(name ?? '?').replace(/\(.*\)/, '').split(/[\s+.]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
}

export function TechLogo({ id, name, size = 20 }) {
  const url = TECH_LOGOS[id];
  if (url) return <img src={url} alt="" width={size} height={size} className="shrink-0 object-contain" style={{ width: size, height: size }} />;
  return (
    <span aria-hidden className="grid shrink-0 place-items-center rounded-md bg-brand-100 font-display font-extrabold text-brand-800"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}>
      {monogram(name)}
    </span>
  );
}
