"use client";

export default function CompactSearch({
  value,
  onChange,
  placeholder,
  resultCount
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  resultCount?: number;
}) {
  return (
    <div className="compact-search">
      <span className="compact-search-icon" aria-hidden="true">
        🔎
      </span>
      <input
        className="compact-search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button type="button" className="compact-search-clear" onClick={() => onChange("")} aria-label="Clear search">
          ×
        </button>
      )}
      {resultCount !== undefined && (
        <span className="compact-search-count muted">
          {resultCount} match{resultCount === 1 ? "" : "es"}
        </span>
      )}
    </div>
  );
}
