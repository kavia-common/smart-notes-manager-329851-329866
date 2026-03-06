const DEFAULT_TIMEOUT_MS = 20000;

/**
 * Represents an HTTP error with parsed response context.
 */
class HttpError extends Error {
  constructor(message, { status, url, method, body } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.method = method;
    this.body = body;
  }
}

/**
 * Best-effort parse of response body.
 * If JSON parse fails, returns text.
 */
async function tryParseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await response.json();
    } catch {
      // fall through to text
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Creates a fetch wrapper with a stable contract:
 * - input: {baseUrl, timeoutMs, defaultHeaders}
 * - output: { requestJson(method, path, {query, body, headers, signal}) }
 * - errors: throws HttpError (non-2xx) or Error (network/abort/timeout)
 */
// PUBLIC_INTERFACE
export function createApiClient({ baseUrl, timeoutMs = DEFAULT_TIMEOUT_MS, defaultHeaders = {} }) {
  if (!baseUrl) {
    throw new Error("createApiClient requires baseUrl");
  }

  async function requestJson(method, path, { query, body, headers, signal } = {}) {
    const url = new URL(path, baseUrl);

    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        url.searchParams.set(key, String(value));
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error("timeout")), timeoutMs);

    const mergedSignal = signal
      ? new AbortSignal.any([signal, controller.signal])
      : controller.signal;

    try {
      const res = await fetch(url.toString(), {
        method,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...defaultHeaders,
          ...(headers || {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: mergedSignal,
      });

      if (!res.ok) {
        const parsed = await tryParseBody(res);
        throw new HttpError(`Request failed: ${res.status}`, {
          status: res.status,
          url: url.toString(),
          method,
          body: parsed,
        });
      }

      // Some endpoints may return empty bodies; tolerate that.
      const text = await res.text();
      if (!text) return null;

      try {
        return JSON.parse(text);
      } catch {
        // Unexpected non-JSON; return as string for debuggability.
        return text;
      }
    } catch (err) {
      if (err instanceof HttpError) throw err;
      if (err?.name === "AbortError") {
        throw new Error("Request aborted");
      }
      // Preserve original message where possible.
      throw new Error(err?.message || "Network error");
    } finally {
      clearTimeout(timeout);
    }
  }

  return { requestJson };
}
