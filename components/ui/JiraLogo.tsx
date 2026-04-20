export default function JiraLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Dark background — Cursor app style */}
      <rect width="28" height="28" rx="6.5" fill="#1C1C1C" />

      {/* Top arrow — pointing up (bright) */}
      <path
        d="M5 14.5 L14 4.5 L23 14.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Bottom arrow — pointing down (slightly dimmed for depth) */}
      <path
        d="M5 14.5 L14 23.5 L23 14.5"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
    </svg>
  )
}
