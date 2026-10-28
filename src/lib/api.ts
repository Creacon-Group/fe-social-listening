// Thin client for the backend, reached through the /api rewrite (same origin, httpOnly cookie).

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 401 && typeof window !== "undefined" && !location.pathname.startsWith("/login")) {
    // Outside React (shared fetch helper): a full navigation also clears client caches.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  }
  if (!res.ok) {
    let message = `Request failed (HTTP ${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(", ") : (body.message ?? message);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/*
 * Count of data requests in flight, so the toolbar can say "Updating" and content can dim
 * while a filter change is loading. Read it with useBusy().
 */
let inflight = 0;
let episode = 0; // increments each time loading starts from idle
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const busyStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => inflight,
  episode: () => episode,
};

export const fetcher = <T>(url: string) => {
  if (inflight === 0) episode++;
  inflight++;
  emit();
  return fetch(url, { credentials: "include" })
    .then((r) => parse<T>(r))
    .finally(() => {
      inflight--;
      emit();
    });
};

export async function apiSend<T>(url: string, method: "POST" | "PUT" | "DELETE", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: body === undefined || body instanceof FormData ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  return parse<T>(res);
}
