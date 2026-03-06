import React, { useEffect } from "react";
import "../App.css";

/**
 * Generic modal with escape-to-close and backdrop click-to-close.
 */
// PUBLIC_INTERFACE
export function Modal({ title, children, onClose, footer }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={title}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="icon-button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-footer">{footer}</div> : null}
      </div>
      <button className="modal-backdrop-click" aria-label="Close modal" onClick={onClose} />
    </div>
  );
}
