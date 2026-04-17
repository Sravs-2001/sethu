export default function JiraLogo({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Black background */}
      <rect width="32" height="32" rx="8" fill="#000000" />

      {/* Cursor pointer — large, centered, clean */}
      <path
        d="M8 6 L8 23 L12.5 19 L16.5 26 L19.5 24.5 L15.5 18 L23 18 Z"
        fill="white"
      />
    </svg>
  )
}
