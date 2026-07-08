import type { VehiclePuckIconProps } from '@/types';
import L from 'leaflet';

/**
 * Creates a navigation-puck vehicle icon matching the reference design:
 * - Vehicle name label embedded above the arrow (animates together)
 * - Dark circular body with a status-colored border ring
 * - A colored directional arrow/chevron inside, rotated to heading
 * - Status-colored pulsing rings around each vehicle
 * - Extra glow ring when selected
 *
 * ALL styling is inline to avoid CSS class dependency / HMR issues.
 * Only @keyframes are defined globally via ensurePuckStyles().
 */
export function createVehiclePuckIcon({ color = '#3b82f6', heading = 0, isSelected = false, isMoving = false, name = '' }: VehiclePuckIconProps): L.DivIcon {
  const s = isSelected ? 52 : 42;
  const half = s / 2;
  const arrowW = Math.round(s * 0.5);
  const bodyInset = 5;

  // Name label positioned above the arrow (overflows via overflow:visible)
  const nameHtml = name
    ? '<div style="' +
        'position:absolute;' +
        'bottom:100%;' +
        'left:50%;' +
        'transform:translateX(-50%);' +
        'margin-bottom:4px;' +
        'background:rgba(10,14,26,0.92);' +
        'border:1px solid ' + color + '55;' +
        'color:' + color + ';' +
        'font-family:JetBrains Mono,monospace;' +
        'font-size:10px;font-weight:700;' +
        'padding:1px 6px;border-radius:4px;' +
        'white-space:nowrap;pointer-events:none;' +
        'box-shadow:0 1px 4px rgba(0,0,0,0.4);' +
      '">' + name + '</div>'
    : '';

  const html =
    '<div style="' +
      'width:' + s + 'px;height:' + s + 'px;' +
      'position:relative;' +
    '">' +

      // Name label above
      nameHtml +

      // Pulse ring 1
      '<div style="' +
        'position:absolute;inset:0;border-radius:50%;' +
        'border:2px solid ' + color + ';' +
        'pointer-events:none;' +
        'animation:fvPulse 2.2s ease-out infinite;' +
      '"></div>' +

      // Pulse ring 2 (offset)
      '<div style="' +
        'position:absolute;inset:0;border-radius:50%;' +
        'border:2px solid ' + color + ';' +
        'pointer-events:none;' +
        'animation:fvPulse 2.2s ease-out 1.1s infinite;' +
      '"></div>' +

      // Dark circular body with colored border
      '<div style="' +
        'position:absolute;' +
        'left:' + bodyInset + 'px;top:' + bodyInset + 'px;' +
        'right:' + bodyInset + 'px;bottom:' + bodyInset + 'px;' +
        'border-radius:50%;' +
        'border:2.5px solid ' + color + ';' +
        'background:rgba(10,14,26,0.92);' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.5);' +
      '">' +
        // Rotating arrow
        '<div style="' +
          'display:flex;align-items:center;justify-content:center;' +
          'transform:rotate(' + heading + 'deg);' +
          'transition:transform 0.6s linear;' +
          'line-height:0;' +
        '">' +
          '<svg width="' + arrowW + '" height="' + arrowW + '" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
            '<path d="M12 3L19 19L12 14.5L5 19L12 3Z" ' +
              'fill="' + color + '" ' +
              'stroke="rgba(255,255,255,0.85)" ' +
              'stroke-width="1" ' +
              'stroke-linejoin="round"/>' +
          '</svg>' +
        '</div>' +
      '</div>' +

      // Selected glow ring
      (isSelected
        ? '<div style="' +
            'position:absolute;inset:-5px;border-radius:50%;' +
            'border:2px solid ' + color + ';' +
            'pointer-events:none;' +
            'box-shadow:0 0 14px ' + color + '66,0 0 6px ' + color + '44;' +
            'animation:fvGlow 1.6s ease-in-out infinite alternate;' +
          '"></div>'
        : '') +

    '</div>';

  return L.divIcon({
    html: html,
    className: '',
    iconSize: [s, s],
    iconAnchor: [half, half],
    popupAnchor: [0, -half],
  });
}

/**
 * Inject/update global keyframe animations for vehicle puck icons.
 * Always replaces content so HMR reloads work correctly.
 */
export function ensurePuckStyles() {
  let el = document.getElementById('fv-puck-styles');
  if (!el) {
    el = document.createElement('style');
    el.id = 'fv-puck-styles';
    document.head.appendChild(el);
  }
  // Always update — previous HMR version may have had different content
  el.textContent =
    '@keyframes fvPulse{' +
      '0%{transform:scale(0.5);opacity:0.8}' +
      '70%{transform:scale(1.6);opacity:0}' +
      '100%{transform:scale(1.6);opacity:0}' +
    '}' +
    '@keyframes fvGlow{' +
      '0%{opacity:0.4;transform:scale(0.95)}' +
      '100%{opacity:1;transform:scale(1.05)}' +
    '}' +
    '.leaflet-marker-icon{overflow:visible!important}';
}
