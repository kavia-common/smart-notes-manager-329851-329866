import React from "react";
import "../App.css";

// PUBLIC_INTERFACE
export function StatusBanner({ type = "info", title, message, onRetry }) {
  return (
    <div className={`banner banner-${type}`} role={type === "error" ? "alert" : "status"}>
      <div className="banner-text">
        {title ? <div className="banner-title">{title}</div> : null}
        {message ? <div className="banner-message">{message}</div> : null}
      </div>
      {onRetry ? (
        <button className="btn btn-secondary" onClick={onRetry}>
          Retry
        </button>
      ) : null}
    </div>
  );
}
