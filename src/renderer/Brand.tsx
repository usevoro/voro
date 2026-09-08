import worldArt from '../../brand/art/little-world.png';
import identity from '../../brand/identity.json';

export function BrandMark({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox={identity.viewBox} fill="none" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d={identity.bodyPath} />
      <path className="brand-cut" d={identity.accentPath} fill="var(--voro-apricot)" />
    </svg>
  );
}
export function BrandLockup() {
  return (
    <div className="brand">
      <BrandMark className="brand-mark" />
      <span className="brand-wordmark">voro</span>
    </div>
  );
}
export function BrandStudy() {
  return (
    <figure className="brand-study">
      <img
        src={worldArt}
        alt="A painted miniature game world with a mushroom cottage, a forest sprite, and a winding stream"
      />
      <figcaption>Big worlds start with little things.</figcaption>
    </figure>
  );
}
