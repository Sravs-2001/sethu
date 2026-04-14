export default function JiraLogo({ size = 28, className }: { size?: number; className?: string }) {
  const id = 'jira-grad-' + size
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2684FF" />
          <stop offset="100%" stopColor="#0052CC" />
        </linearGradient>
      </defs>
      {/* Diamond */}
      <path
        d="M14 1L27 14L14 27L1 14L14 1Z"
        fill={`url(#${id})`}
      />
      {/* Inner white chevron arrows */}
      <path
        d="M10 14L14 10L18 14"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.55"
      />
      <path
        d="M10 17L14 13L18 17"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}
