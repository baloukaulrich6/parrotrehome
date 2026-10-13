// Availability badge (F-04) — color-coded with text label
// WCAG 2.2 AA: never rely on color alone

export function AvailabilityBadge({
  label,
  className = "avail-available",
}: {
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`status-badge ${className} bg-opacity-90`}
      role="status"
      aria-label={`Availability: ${label}`}
    >
      {label}
    </span>
  );
}
