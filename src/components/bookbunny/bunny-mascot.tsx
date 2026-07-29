/**
 * BookBunny Mascot SVG Component
 * Migrated from BookBunny/components/BunnyMascot.tsx
 */

export function BunnyMascot({
  size = 120,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Body */}
      <ellipse
        cx="60"
        cy="80"
        rx="35"
        ry="30"
        fill="#FFF5EE"
        stroke="#E8D5C4"
        strokeWidth="1.5"
      />
      {/* Head */}
      <circle
        cx="60"
        cy="44"
        r="28"
        fill="#FFF5EE"
        stroke="#E8D5C4"
        strokeWidth="1.5"
      />
      {/* Left Ear */}
      <ellipse
        cx="42"
        cy="14"
        rx="8"
        ry="22"
        fill="#FFF5EE"
        stroke="#E8D5C4"
        strokeWidth="1.5"
        transform="rotate(-8 42 14)"
      />
      <ellipse
        cx="42"
        cy="14"
        rx="4"
        ry="15"
        fill="#FF6B8A"
        opacity="0.3"
        transform="rotate(-8 42 14)"
      />
      {/* Right Ear */}
      <ellipse
        cx="78"
        cy="14"
        rx="8"
        ry="22"
        fill="#FFF5EE"
        stroke="#E8D5C4"
        strokeWidth="1.5"
        transform="rotate(8 78 14)"
      />
      <ellipse
        cx="78"
        cy="14"
        rx="4"
        ry="15"
        fill="#FF6B8A"
        opacity="0.3"
        transform="rotate(8 78 14)"
      />
      {/* Left Eye */}
      <circle cx="50" cy="38" r="4" fill="#2D2D2D" />
      <circle cx="51" cy="36" r="1.5" fill="white" />
      {/* Right Eye */}
      <circle cx="70" cy="38" r="4" fill="#2D2D2D" />
      <circle cx="71" cy="36" r="1.5" fill="white" />
      {/* Nose */}
      <ellipse cx="60" cy="45" rx="3" ry="2" fill="#FF6B8A" opacity="0.5" />
      {/* Cheeks */}
      <circle cx="43" cy="46" r="5" fill="#FF6B8A" opacity="0.15" />
      <circle cx="77" cy="46" r="5" fill="#FF6B8A" opacity="0.15" />
      {/* Belly */}
      <ellipse cx="60" cy="82" rx="22" ry="16" fill="white" opacity="0.5" />
      {/* Book */}
      <rect
        x="48"
        y="72"
        width="24"
        height="18"
        rx="3"
        fill="#C8A2E8"
        opacity="0.4"
      />
      <line
        x1="60"
        y1="72"
        x2="60"
        y2="90"
        stroke="#C8A2E8"
        strokeWidth="1"
        opacity="0.6"
      />
    </svg>
  );
}

export default BunnyMascot;
