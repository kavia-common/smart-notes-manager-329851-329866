import { createApiClient } from "./client";

/**
 * Notes API contract (frontend -> backend).
 * Inputs/Outputs:
 * - listNotes({q, tag}): returns {items: Note[]} or Note[] depending on backend
 * - getNote(id): returns Note
 * - createNote(payload): returns Note
 * - updateNote(id, payload): returns Note
 * - deleteNote(id): returns void or {ok:true}
 * - listTags(): returns string[]
 *
 * Errors:
 * - throws Error/HttpError (from client) with message suitable for UI.
 */
function normalizeNotesResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Some backends return tags as {items:[...]} or simple array.
 */
function normalizeTagsResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

// PUBLIC_INTERFACE
export function createNotesApi({ baseUrl }) {
  const client = createApiClient({ baseUrl });

  return {
    // PUBLIC_INTERFACE
    async listNotes({ q, tag } = {}) {
      const data = await client.requestJson("GET", "/notes", {
        query: { q, tag },
      });
      return normalizeNotesResponse(data);
    },

    // PUBLIC_INTERFACE
    async getNote(id) {
      if (!id) throw new Error("getNote requires id");
      return client.requestJson("GET", `/notes/${encodeURIComponent(id)}`);
    },

    // PUBLIC_INTERFACE
    async createNote({ title, content, tags } = {}) {
      return client.requestJson("POST", "/notes", {
        body: { title, content, tags },
      });
    },

    // PUBLIC_INTERFACE
    async updateNote(id, { title, content, tags } = {}) {
      if (!id) throw new Error("updateNote requires id");
      return client.requestJson("PUT", `/notes/${encodeURIComponent(id)}`, {
        body: { title, content, tags },
      });
    },

    // PUBLIC_INTERFACE
    async deleteNote(id) {
      if (!id) throw new Error("deleteNote requires id");
      return client.requestJson("DELETE", `/notes/${encodeURIComponent(id)}`);
    },

    // PUBLIC_INTERFACE
    async listTags() {
      const data = await client.requestJson("GET", "/tags");
      return normalizeTagsResponse(data);
    },
  };
}
