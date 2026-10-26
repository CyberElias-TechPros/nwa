/**
 * NaWeAgree handshake illustration — warm, slightly hand-drawn, with subtle
 * ankara-pattern accents. Inline SVG so it picks up the current theme's colors
 * via currentColor and CSS variables. No external images (keeps the bundle tiny
 * for 2G Nigeria).
 */
export function HandshakeIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 320"
      className={className}
      role="img"
      aria-label="Two hands meeting over a shared agreement card"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: '100%', height: 'auto', maxWidth: 560, display: 'block', margin: '0 auto' }}
    >
      <defs>
        <linearGradient id="nwa-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--nwa-color-primarySoft)" />
          <stop offset="100%" stopColor="var(--nwa-color-goldSoft)" />
        </linearGradient>
        <pattern id="nwa-ankara" width="16" height="16" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="var(--nwa-color-primarySoft)" />
          <circle cx="8" cy="8" r="2.5" fill="var(--nwa-color-primary)" opacity="0.4" />
          <path d="M0 0l16 16M16 0L0 16" stroke="var(--nwa-color-gold)" strokeWidth="1" opacity="0.4" />
        </pattern>
        <filter id="nwa-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
          <feOffset dx="0" dy="6" result="offsetblur" />
          <feComponentTransfer><feFuncA type="linear" slope="0.18" /></feComponentTransfer>
          <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* backdrop circle */}
      <circle cx="240" cy="160" r="140" fill="url(#nwa-bg)" />

      {/* card/paper */}
      <g filter="url(#nwa-shadow)">
        <rect x="130" y="110" width="220" height="130" rx="16" fill="var(--nwa-color-surface)" stroke="var(--nwa-color-border)" strokeWidth="1.5" />
        <rect x="148" y="130" width="120" height="10" rx="5" fill="var(--nwa-color-ink)" opacity="0.85" />
        <rect x="148" y="150" width="180" height="6" rx="3" fill="var(--nwa-color-textMuted)" opacity="0.7" />
        <rect x="148" y="164" width="150" height="6" rx="3" fill="var(--nwa-color-textMuted)" opacity="0.6" />
        <rect x="148" y="178" width="160" height="6" rx="3" fill="var(--nwa-color-textMuted)" opacity="0.5" />
        {/* stamps */}
        <circle cx="310" cy="200" r="22" fill="var(--nwa-color-tealSoft)" stroke="var(--nwa-color-teal)" strokeWidth="2" strokeDasharray="3 2" />
        <text x="310" y="205" textAnchor="middle" fontSize="10" fontWeight="700" fill="var(--nwa-color-teal)" fontFamily="system-ui">AGREED</text>
        <rect x="148" y="204" width="50" height="20" rx="6" fill="url(#nwa-ankara)" />
      </g>

      {/* left hand */}
      <g fill="var(--nwa-color-ink)">
        <path d="M60 200 C80 180, 110 170, 150 178 C160 180, 165 188, 162 197 C158 210, 140 224, 118 228 C95 232, 70 225, 58 210 Z" />
        <path d="M150 178 C155 168, 168 162, 178 166 C185 169, 188 178, 185 186 C182 196, 174 204, 165 205 Z" opacity="0.9" />
      </g>
      {/* right hand */}
      <g fill="var(--nwa-color-primary)">
        <path d="M420 200 C400 180, 370 170, 330 178 C320 180, 315 188, 318 197 C322 210, 340 224, 362 228 C385 232, 410 225, 422 210 Z" />
        <path d="M330 178 C325 168, 312 162, 302 166 C295 169, 292 178, 295 186 C298 196, 306 204, 315 205 Z" opacity="0.9" />
      </g>

      {/* sparkle check */}
      <g fill="var(--nwa-color-gold)">
        <path d="M240 70 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" />
        <circle cx="180" cy="80" r="3" />
        <circle cx="300" cy="90" r="2" />
        <circle cx="350" cy="250" r="3" />
        <circle cx="130" cy="260" r="2" />
      </g>
    </svg>
  );
}
