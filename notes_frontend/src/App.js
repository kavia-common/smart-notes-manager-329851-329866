import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import { createNotesApi } from "./api/notesApi";
import { NoteEditorModal } from "./components/NoteEditorModal";
import { Spinner } from "./components/Spinner";
import { StatusBanner } from "./components/StatusBanner";

/**
 * NotesManagerFlow (SPA):
 * - Boundary: user input (search, tag selection, create/edit/delete)
 * - Orchestration: load tags + load notes, keep consistent state transitions
 * - I/O: Notes API client
 *
 * Debuggability:
 * - Single reloadNotes() path for list refresh
 * - UI surfaces error messages; console logs include operation context
 */

// PUBLIC_INTERFACE
function App() {
  // NOTE: Request this env var to be set by orchestration if needed.
  // REACT_APP_NOTES_API_BASE_URL should point to the backend root (e.g. http://localhost:3001)
  const apiBaseUrl = process.env.REACT_APP_NOTES_API_BASE_URL || "http://localhost:3001";

  const api = useMemo(() => createNotesApi({ baseUrl: apiBaseUrl }), [apiBaseUrl]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);

  const [tagsState, setTagsState] = useState({ loading: false, error: null, tags: [] });
  const [notesState, setNotesState] = useState({
    loading: false,
    error: null,
    notes: [],
  });

  const [activeNote, setActiveNote] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create");
  const [submitting, setSubmitting] = useState(false);

  const latestLoadRef = useRef(0);

  const loadTags = useCallback(async () => {
    setTagsState((s) => ({ ...s, loading: true, error: null }));
    try {
      const tags = await api.listTags();
      setTagsState({ loading: false, error: null, tags: tags || [] });
    } catch (e) {
      console.error("[NotesManagerFlow] loadTags failed", { error: e?.message || e });
      setTagsState({ loading: false, error: e?.message || "Failed to load tags", tags: [] });
    }
  }, [api]);

  const reloadNotes = useCallback(
    async ({ q, tag } = {}) => {
      const opId = Date.now();
      latestLoadRef.current = opId;

      setNotesState((s) => ({ ...s, loading: true, error: null }));
      try {
        const notes = await api.listNotes({ q, tag });
        // Ignore stale responses
        if (latestLoadRef.current !== opId) return;
        setNotesState({ loading: false, error: null, notes: notes || [] });
      } catch (e) {
        if (latestLoadRef.current !== opId) return;
        console.error("[NotesManagerFlow] reloadNotes failed", { q, tag, error: e?.message || e });
        setNotesState({
          loading: false,
          error: e?.message || "Failed to load notes",
          notes: [],
        });
      }
    },
    [api]
  );

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  useEffect(() => {
    reloadNotes({ q: searchQuery || undefined, tag: selectedTag || undefined });
  }, [reloadNotes, searchQuery, selectedTag]);

  const visibleNotes = notesState.notes;

  const allTags = tagsState.tags;
  const selectedTagCount = useMemo(() => {
    if (!selectedTag) return visibleNotes.length;
    return visibleNotes.length;
  }, [selectedTag, visibleNotes.length]);

  const openCreate = () => {
    setEditorMode("create");
    setActiveNote(null);
    setEditorOpen(true);
  };

  const openEdit = (note) => {
    setEditorMode("edit");
    setActiveNote(note);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (submitting) return;
    setEditorOpen(false);
  };

  const submitEditor = async (payload) => {
    setSubmitting(true);
    try {
      if (editorMode === "edit" && activeNote?.id) {
        await api.updateNote(activeNote.id, payload);
      } else {
        await api.createNote(payload);
      }
      setEditorOpen(false);
      await reloadNotes({ q: searchQuery || undefined, tag: selectedTag || undefined });
      await loadTags();
    } catch (e) {
      console.error("[NotesManagerFlow] submitEditor failed", { mode: editorMode, error: e?.message || e });
      // Keep modal open; surface error at top as banner by setting notes error (reused UI path).
      setNotesState((s) => ({ ...s, error: e?.message || "Failed to save note" }));
    } finally {
      setSubmitting(false);
    }
  };

  const deleteNote = async (note) => {
    const confirmed = window.confirm(`Delete "${note?.title || "this note"}"?`);
    if (!confirmed) return;

    setNotesState((s) => ({ ...s, error: null }));
    try {
      await api.deleteNote(note.id);
      await reloadNotes({ q: searchQuery || undefined, tag: selectedTag || undefined });
      await loadTags();
    } catch (e) {
      console.error("[NotesManagerFlow] deleteNote failed", { id: note?.id, error: e?.message || e });
      setNotesState((s) => ({ ...s, error: e?.message || "Failed to delete note" }));
    }
  };

  return (
    <div className="nm-app">
      <aside className="nm-sidebar">
        <div className="nm-brand">
          <div className="nm-brand-title">Smart Notes</div>
          <div className="nm-brand-subtitle">Taggable, searchable notes</div>
        </div>

        <button className="btn btn-primary btn-block" onClick={openCreate}>
          + New note
        </button>

        <div className="nm-sidebar-section">
          <div className="nm-sidebar-heading">Tags</div>

          {tagsState.loading ? (
            <div className="nm-muted">
              <Spinner label="Loading tags" />
            </div>
          ) : tagsState.error ? (
            <StatusBanner
              type="error"
              title="Tags unavailable"
              message={tagsState.error}
              onRetry={loadTags}
            />
          ) : (
            <div className="nm-tags">
              <button
                className={`nm-tag ${selectedTag === null ? "active" : ""}`}
                onClick={() => setSelectedTag(null)}
              >
                All
              </button>
              {allTags.length === 0 ? (
                <div className="nm-muted">No tags yet</div>
              ) : (
                allTags.map((t) => (
                  <button
                    key={t}
                    className={`nm-tag ${selectedTag === t ? "active" : ""}`}
                    onClick={() => setSelectedTag(t)}
                    title={`Filter by ${t}`}
                  >
                    {t}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="nm-sidebar-footer nm-muted">
          API: <span className="nm-mono">{apiBaseUrl}</span>
        </div>
      </aside>

      <main className="nm-main">
        <div className="nm-topbar">
          <div className="nm-search">
            <input
              className="input nm-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes…"
              aria-label="Search notes"
            />
            {searchQuery ? (
              <button className="btn btn-secondary" onClick={() => setSearchQuery("")}>
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {notesState.error ? (
          <StatusBanner
            type="error"
            title="Something went wrong"
            message={notesState.error}
            onRetry={() => reloadNotes({ q: searchQuery || undefined, tag: selectedTag || undefined })}
          />
        ) : null}

        <div className="nm-content">
          <div className="nm-header-row">
            <div>
              <div className="nm-title">
                {selectedTag ? `Tag: ${selectedTag}` : "All notes"}
              </div>
              <div className="nm-subtitle">
                {notesState.loading ? "Loading…" : `${selectedTagCount} note(s)`}
              </div>
            </div>
          </div>

          {notesState.loading ? (
            <div className="nm-center">
              <Spinner label="Loading notes" />
            </div>
          ) : visibleNotes.length === 0 ? (
            <div className="nm-empty">
              <div className="nm-empty-title">No notes found</div>
              <div className="nm-empty-text">
                {searchQuery || selectedTag
                  ? "Try clearing your search or tag filter."
                  : "Create your first note to get started."}
              </div>
              <button className="btn btn-primary" onClick={openCreate}>
                Create a note
              </button>
            </div>
          ) : (
            <div className="nm-notes-grid">
              {visibleNotes.map((note) => (
                <article key={note.id || `${note.title}-${note.created_at || ""}`} className="nm-note-card">
                  <div className="nm-note-card-head">
                    <div className="nm-note-title">{note.title || "(Untitled)"}</div>
                    <div className="nm-note-actions">
                      <button className="btn btn-secondary" onClick={() => openEdit(note)}>
                        Edit
                      </button>
                      <button className="btn btn-danger" onClick={() => deleteNote(note)}>
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="nm-note-content">
                    {note.content ? note.content : <span className="nm-muted">No content</span>}
                  </div>

                  <div className="nm-note-tags">
                    {(note.tags || []).length ? (
                      note.tags.map((t) => (
                        <button
                          key={t}
                          className="nm-chip"
                          onClick={() => setSelectedTag(t)}
                          title={`Filter by ${t}`}
                        >
                          {t}
                        </button>
                      ))
                    ) : (
                      <span className="nm-muted">No tags</span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>

      {editorOpen ? (
        <NoteEditorModal
          mode={editorMode}
          initialNote={activeNote}
          onCancel={closeEditor}
          onSubmit={submitEditor}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}

export default App;
