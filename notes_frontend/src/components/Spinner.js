import React from "react";
import "../App.css";

// PUBLIC_INTERFACE
export function Spinner({ label = "Loading…" }) {
  return (
    <div className="spinner" role="status" aria-live="polite" aria-label={label}>
      <div className="spinner-dot" />
      <div className="spinner-dot" />
      <div className="spinner-dot" />
    </div>
  );
}
