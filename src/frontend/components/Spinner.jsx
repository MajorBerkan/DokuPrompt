/**
 * Spinner Component
 * Displays an animated loading spinner
 * 
 * @param {Object} props - Component props
 * @param {number} props.size - Size of the spinner in pixels (default: 24)
 * @param {string} props.color - Color of the spinner (default: "#3200c8")
 * @returns {React.ReactElement} The spinner component
 */
export default function Spinner({ size = 24, color = "#3200c8" }) {
  return (
    <div
      role="status"
      style={{
        width: size,
        height: size,
        border: `${size / 8}px solid ${color}33`,
        borderTop: `${size / 8}px solid ${color}`,
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }}
    />
  );
}
