"use client";

export default function EmptyState({
  icon,
  title,
  detail,
  ctaLabel,
  onCta
}: {
  icon: string;
  title: string;
  detail: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <strong>{title}</strong>
      <p className="muted">{detail}</p>
      {ctaLabel && onCta && (
        <button type="button" className="btn-ghost" onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
