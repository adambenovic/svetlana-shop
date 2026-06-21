export function Logo({ width = 164, height = 40 }: { width?: number; height?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 329.03 80.00"
      width={width}
      height={height}
      role="img"
      aria-label="Svetlana Lampe"
    >
      <g id="icon" transform="translate(0,0.000)">
        <path
          id="lamp-base"
          fill="currentColor"
          d="M 52.391,78.995 L 10.855,78.995 L 8.942,75.884 L 8.942,51.710 L 10.420,47.747 L 13.555,44.518 L 16.577,44.518 L 16.609,43.368 L 46.829,43.368 L 46.636,44.518 L 49.690,44.518 L 53.146,48.223 L 54.304,51.750 L 54.304,75.884 L 52.391,78.995 Z"
        />
        <path
          id="lamp-shade"
          fill="#E86A5C"
          d="M 63.161,43.408 L 0.085,43.408 L -0.028,0.986 L 63.257,0.966 L 63.161,43.408 Z"
        />
      </g>
      <text
        fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
        fill="currentColor"
        letterSpacing="-0.05em"
      >
        <tspan x="77.28" y="39.18" fontSize="51.61" fontWeight="700">Svetlana</tspan>
        <tspan x="77.28" y="70.09" fontSize="38.23" fontWeight="300">Lampe</tspan>
      </text>
    </svg>
  )
}
