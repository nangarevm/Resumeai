"use client";

export type AutosaveState = "idle" | "saving" | "saved" | "error";

export default function AutosaveStatus({ state }: { state: AutosaveState }) {
  if (state === "idle") return null;
  const text = state === "saving" ? "Saving…" : state === "saved" ? "✓ Saved just now" : "⚠ Unable to save";
  return (
    <span className={`autosave-status autosave-${state}`} role="status" aria-live="polite">
      {text}
    </span>
  );
}
