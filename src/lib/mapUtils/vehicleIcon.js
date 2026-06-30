import L from 'leaflet';

/**
 * Generates a Google-Maps-style "navigation puck" SVG icon for a vehicle:
 * a directional, slightly 3D-shaded arrow/car shape that rotates to match
 * heading, with a soft ground shadow and a colored halo ring for status.
 *
 * Used by both the live Vehicles map and the Track Player so the two stay visually consistent.
 */
export function createVehiclePuckIcon({ color = '#3b82f6', heading = 0, isSelected = false, isMoving = false, size = null }) {
  const s = size || (isSelected ? 52 : 40);
  const half = s / 2;

  // Slightly larger when selected, with a glow ring
  const haloR = half - 2;
  const bodyScale = s / 40; // base design at 40px

  return L.divIcon({
    html: `
      <div style="
        width:${s}px; height:${s}px;
        position: relative;
        transform: translateZ(0);
      ">
        ${isMoving ? `
        <div style="
          position:absolute; inset:0;
          border-radius:50%;
          background: radial-gradient(circle, ${color}55 0%, ${color}00 70%);
          animation: fv-radar-pulse 2.2s ease-out infinite;
        "></div>` : ''}

        <!-- ground shadow -->
        <div style="
          position:absolute; left:50%; top:62%;
          width:${22 * bodyScale}px; height:${10 * bodyScale}px;
          background: rgba(0,0,0,0.45);
          border-radius:50%;
          filter: blur(3px);
          transform: translate(-50%,-50%);
        "></div>

        <!-- rotating puck -->
        <div style="
          position:absolute; inset:0;
          display:flex; align-items:center; justify-content:center;
          transform: rotate(${heading}deg);
          transition: transform 0.6s linear;
        ">
          <svg width="${28 * bodyScale}" height="${28 * bodyScale}" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="puckBody-${color.replace('#','')}" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
                <stop offset="100%" stop-color="${color}" stop-opacity="0.75"/>
              </linearGradient>
              <filter id="puckShadow-${color.replace('#','')}" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" flood-color="#000" flood-opacity="0.5"/>
              </filter>
            </defs>
            <!-- outer halo ring -->
            <circle cx="14" cy="14" r="${isSelected ? 13 : 12}" fill="${color}1A" stroke="${color}" stroke-width="${isSelected ? 2 : 1.4}" />
            <!-- directional arrow / nav puck shape (points "up" = 0deg heading = north) -->
            <g filter="url(#puckShadow-${color.replace('#','')})">
              <path d="M14 5 L20 19 L14 15.5 L8 19 Z" fill="url(#puckBody-${color.replace('#','')})" stroke="white" stroke-width="1" stroke-linejoin="round"/>
            </g>
          </svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [s, s],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
}

/** Inject the radar pulse keyframes once (call at app init or first map mount). */
export function ensurePuckStyles() {
  if (document.getElementById('fv-puck-styles')) return;
  const style = document.createElement('style');
  style.id = 'fv-puck-styles';
  style.textContent = `
    @keyframes fv-radar-pulse {
      0%   { transform: scale(0.6); opacity: 0.9; }
      70%  { transform: scale(1.6); opacity: 0; }
      100% { transform: scale(1.6); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
