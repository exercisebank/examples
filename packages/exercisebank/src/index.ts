/**
 * Official client for the ExerciseBank API (https://exercisebank.net).
 * Runs on your server: the key never ships in an app binary or a web bundle.
 */

export interface Exercise {
  id: string;
  name: string;
  nameFr?: string;
  /** Coach-style name: Region- Movement- Position- Equipment. */
  variant?: string;
  description?: string;
  descriptionFr?: string;
  /** Which assets exist. URLs come from `mediaUrls()`. */
  media: { mp4: boolean; still: boolean };
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  movementPattern: string;
  /** 1 (beginner) to 5. */
  difficulty: number;
  loadedJoints: string[];
  impact: "low" | "moderate" | "high";
  unilateral: boolean;
  /** Who demonstrates the clip. */
  demonstrator?: "female" | "male";
  cues: string[];
  cuesFr?: string[];
  aliases?: string[];
  /** Changes when any field changes; use it to sync a local copy. */
  hash: string;
}

export interface SearchParams {
  /** Text: name, French name, coach name, aliases. */
  q?: string;
  /** Primary or secondary muscle. */
  muscle?: string[];
  /** The gear the person HAS; bodyweight is always allowed. */
  equipment?: string[];
  /** Movement pattern. */
  pattern?: string[];
  minDifficulty?: number;
  maxDifficulty?: number;
  /** Skip anything that loads these joints. */
  excludeJoints?: string[];
  impact?: ("low" | "moderate" | "high")[];
  unilateral?: boolean;
  /** Who demonstrates the clip. */
  demonstrator?: ("female" | "male")[];
  /** Restrict to these ids. */
  ids?: string[];
  /** Default 25, at most 100. */
  limit?: number;
  offset?: number;
}
export interface SearchResult { data: Exercise[]; total: number; offset: number; limit: number; next: number | null; version: string }

export interface SubstituteParams {
  /** The gear the person has. */
  equipment?: string[];
  /** Skip substitutes that load these joints. */
  excludeJoints?: string[];
  /** Default 10, at most 50. */
  limit?: number;
}
export interface Substitute { score: number; reason: string; exercise: Exercise }

export interface MediaParams {
  /** Stable opaque id of the person who will watch (a hash of your own user id). Required. */
  endUser: string;
  /** Up to 50 exercise ids: what the screen shows. */
  ids: string[];
  /** Mark someone who builds programs for others. */
  coach?: boolean;
  /** Default both. */
  kinds?: ("mp4" | "still")[];
  /** Seconds the URLs stay valid: 60 to 3600, default 900. */
  ttl?: number;
}
export interface Media {
  signed: boolean;
  /** True when a sandbox key asked for an exercise outside the sample. */
  sandbox?: boolean;
  /** Unix seconds. */
  expires?: number;
  mp4?: string;
  still?: string;
  note?: string;
}
export interface MediaResult { data: Record<string, Media>; coach: boolean; missing: string[] }

export interface Meta {
  version: string;
  generatedAt: string;
  count: number;
  /** The exercises a sandbox key gets media for. */
  sample: string[];
  /** The catalogue's vocabulary: muscles, equipment, movement patterns, joints and more. */
  enums: Record<string, (string | number)[]>;
  plan: string;
  [key: string]: unknown;
}
export interface Catalog { version: string; count: number; exercises: Exercise[] }

export interface ExerciseBankOptions {
  /** Default: the `EB_KEY` environment variable. Free sandbox key: https://exercisebank.net/signup */
  apiKey?: string;
  /** Default: https://exercisebank.net/v1 */
  baseUrl?: string;
  fetch?: typeof fetch;
}

/** Any non-2xx answer. `code` is the API's error code, e.g. `end_user_required`, `rate_limited`, `mau_exceeded`. */
export class ExerciseBankError extends Error {
  readonly status: number;
  readonly code: string;
  /** Seconds, when the API sent Retry-After. */
  readonly retryAfter?: number;
  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(`ExerciseBank ${status} ${code}: ${message}`);
    this.name = "ExerciseBankError";
    this.status = status;
    this.code = code;
    if (retryAfter !== undefined) this.retryAfter = retryAfter;
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined>;
const qs = (params: Query) => {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length))
    .map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)] as [string, string]);
  return pairs.length ? `?${new URLSearchParams(pairs)}` : "";
};

export class ExerciseBank {
  readonly #key: string;
  readonly #base: string;
  readonly #fetch: typeof fetch;

  constructor(options: ExerciseBankOptions = {}) {
    if (typeof (globalThis as { document?: unknown }).document !== "undefined")
      throw new Error("The ExerciseBank client runs on your server: an API key in a web page is public. Call your own backend from the browser.");
    const key = options.apiKey ?? (typeof process !== "undefined" ? process.env?.EB_KEY : undefined);
    if (!key) throw new Error("No API key: pass { apiKey } or set EB_KEY. Free sandbox key: https://exercisebank.net/signup");
    this.#key = key;
    this.#base = (options.baseUrl ?? (typeof process !== "undefined" ? process.env?.EB_BASE : undefined) ?? "https://exercisebank.net/v1").replace(/\/$/, "");
    this.#fetch = options.fetch ?? fetch;
  }

  async #call(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await this.#fetch(`${this.#base}${path}`, { ...init, headers: { authorization: `Bearer ${this.#key}`, ...init.headers } });
    if (res.ok || res.status === 304) return res;
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    const retry = Number(res.headers.get("retry-after"));
    throw new ExerciseBankError(res.status, body?.error?.code ?? "http_error", body?.error?.message ?? res.statusText, Number.isFinite(retry) && retry > 0 ? retry : undefined);
  }
  async #json<T>(path: string, init?: RequestInit): Promise<T> {
    return (await this.#call(path, init)).json() as Promise<T>;
  }

  /** Search and filter. Data only: `media` says which assets exist, URLs come from `mediaUrls()`. */
  search(params: SearchParams = {}): Promise<SearchResult> {
    return this.#json(`/exercises${qs({ ...params })}`);
  }

  /** One exercise by id. */
  async get(id: string): Promise<Exercise> {
    return (await this.#json<{ data: Exercise }>(`/exercises/${encodeURIComponent(id)}`)).data;
  }

  /** Ranked replacements for one exercise, each with a score and the reason. */
  async substitutes(id: string, params: SubstituteParams = {}): Promise<Substitute[]> {
    return (await this.#json<{ data: Substitute[] }>(`/exercises/${encodeURIComponent(id)}/substitutes${qs({ ...params })}`)).data;
  }

  /**
   * Signed, short-lived video and still URLs for the exercises a screen shows, for one named person.
   * Store exercise ids, never these URLs: ask again when a screen opens.
   */
  mediaUrls(params: MediaParams): Promise<MediaResult> {
    const { endUser, coach, ...body } = params;
    return this.#json("/media/urls", {
      method: "POST",
      headers: { "content-type": "application/json", "x-end-user": endUser, ...(coach ? { "x-end-user-role": "coach" } : {}) },
      body: JSON.stringify(body),
    });
  }

  /** Catalogue version, the vocabulary (`enums`) and the sandbox sample ids. */
  meta(): Promise<Meta> {
    return this.#json("/meta");
  }

  /**
   * The whole catalogue, for keeping a local copy of the metadata. Pass the `etag` from the last call:
   * the answer is `null` when nothing changed.
   */
  async catalog(etag?: string): Promise<(Catalog & { etag: string }) | null> {
    const res = await this.#call("/catalog", etag ? { headers: { "if-none-match": etag } } : {});
    if (res.status === 304) return null;
    return { ...((await res.json()) as Catalog), etag: res.headers.get("etag") ?? "" };
  }
}

export default ExerciseBank;
