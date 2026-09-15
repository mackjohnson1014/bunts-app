/**
 * The app mark, drawn rather than loaded.
 *
 * Same geometry as make-icons.py: a ball of radius r, with seam arcs from
 * circles centred 1.5r to each side at radius 1.05r, clipped to the ball. Two
 * circles that close together cross in the middle and make a lens, not a
 * baseball -- which is what the first attempt did.
 */
export function Logo({ size = 96 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      role="img"
      aria-label="Bunts"
      focusable="false"
    >
      <defs>
        <clipPath id="bunts-ball">
          <circle cx="50" cy="50" r="33" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="33" fill="var(--chalk)" />
      <g clipPath="url(#bunts-ball)" fill="none" stroke="var(--clay)" strokeWidth="2.6">
        <circle cx="0.5" cy="50" r="34.65" />
        <circle cx="99.5" cy="50" r="34.65" />
      </g>
    </svg>
  );
}
