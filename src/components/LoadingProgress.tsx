"use client";

export default function LoadingProgress({ label }: { label: string }) {
  return (
    <div className="loading-progress" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      {label}
    </div>
  );
}
