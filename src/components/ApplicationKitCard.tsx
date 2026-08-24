"use client";

import type { ReactNode } from "react";

export default function ApplicationKitCard({
  icon,
  title,
  description,
  defaultOpen,
  children
}: {
  icon: string;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="kit-card" open={defaultOpen}>
      <summary>
        <span className="kit-card-icon" aria-hidden="true">
          {icon}
        </span>
        <span className="kit-card-title">{title}</span>
      </summary>
      {description && <p className="muted kit-card-desc">{description}</p>}
      <div className="kit-card-body">{children}</div>
    </details>
  );
}
