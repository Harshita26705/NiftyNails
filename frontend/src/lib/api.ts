/**
 * API client.
 * - In the browser: relative `/api/v1/...` (proxied by Next rewrites → same-origin httpOnly cookie).
 * - On the server: direct to the FastAPI origin, forwarding the session cookie when asked.
 */

export class ApiError extends Error {
  status: number;
  details: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const SERVER_API = process.env.API_URL ?? "http://localhost:8000";

function baseUrl() {
  return typeof window === "undefined" ? `${SERVER_API}/api/v1` : "/api/v1";
}

function messageFrom(body: unknown, status: number): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) return String((detail as { message: string }).message);
  }
  if (status === 429) return "You're going a little fast — please try again in a moment.";
  if (status >= 500) return "Something went wrong on our side. Please try again.";
  return "Something went wrong.";
}

type Options = Omit<RequestInit, "body"> & {
  body?: unknown;
  cookie?: string; // server-side forwarding
  query?: Record<string, string | number | boolean | string[] | undefined | null>;
};

export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const { body, cookie, query, headers, ...rest } = opts;
  let url = `${baseUrl()}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null || v === "") continue;
      if (Array.isArray(v)) v.forEach((x) => params.append(k, x));
      else params.set(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  const res = await fetch(url, {
    credentials: "include",
    ...rest,
    headers: {
      ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new ApiError(res.status, messageFrom(data, res.status), data);
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/** Server-side fetch that never throws for catalogue pages — returns fallback on failure. */
export async function apiOr<T>(path: string, fallback: T, opts: Options = {}): Promise<T> {
  try {
    return await api<T>(path, { next: { revalidate: 30 }, ...opts } as Options);
  } catch {
    return fallback;
  }
}
