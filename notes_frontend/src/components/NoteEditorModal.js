import React, { useMemo, useState } from "react";
import { Modal } from "./Modal";
import "../App.css";

function parseTags(tagsText) {
  return tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

// PUBLIC_INTERFACE
export function NoteEditorModal({ mode, initialNote, onCancel, onSubmit, submitting }) {
  const initial = useMemo(() => {
    const note = initialNote || {};
    return {
      title: note.title || "",
      content: note.content || "",
      tagsText: Array.isArray(note.tags) ? note.tags.join(", ") : "",
    };
  }, [initialNote]);

  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [tagsText, setTagsText] = useState(initial.tagsText);

  const canSave = title.trim().length > 0 || content.trim().length > 0;

  return (
    <Modal
      title={mode === "edit" ? "Edit note" : "New note"}
      onClose={onCancel}
      footer={
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSubmit?.({
                title: title.trim(),
                content: content.trim(),
                tags: parseTags(tagsText),
              })
            }
            disabled={!canSave || submitting}
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      }
    >
      <div className="form">
        <label className="form-label">
          Title
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Meeting notes"
            autoFocus
          />
        </label>

        <label className="form-label">
          Content
          <textarea
            className="textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note…"
            rows={8}
          />
        </label>

        <label className="form-label">
          Tags (comma separated)
          <input
            className="input"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="e.g. work, ideas"
          />
        </label>
      </div>
    </Modal>
  );
}
