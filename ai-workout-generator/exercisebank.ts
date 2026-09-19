/** A small client for the ExerciseBank API. Runs on your server: the key never ships in an app. */
const BASE = process.env.EB_BASE ?? "https://exercisebank.net/v1";
const KEY = process.env.EB_KEY;
if (!KEY) throw new Error("Set EB_KEY to your ExerciseBank key (free sandbox key: https://exercisebank.net/signup).");

export interface Exercise {
  id: string;
  name: string;
  nameFr?: string;
  description?: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  movementPattern: string;
  difficulty: number;
  loadedJoints: string[];
  impact: "low" | "moderate" | "high";
  unilateral: boolean;
  cues: string[];
  media: { mp4: boolean; still: boolean };
}
export interface Substitute { score: number; reason: string; exercise: Exercise }
export interface Media { signed: boolean; sandbox?: boolean; expires?: number; mp4?: string; still?: string }

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { authorization: `Bearer ${KEY}`, ...init.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(`ExerciseBank ${res.status} ${body?.error?.code}: ${body?.error?.message}`);
  return body as T;
}
const query = (params: Record<string, string | number | boolean | string[] | undefined>) =>
  new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v.length)).map(([k, v]) => [k, Array.isArray(v) ? v.join(",") : String(v)])).toString();

/** Search and filter. `equipment` is the gear the person HAS; `excludeJoints` skips anything that loads them. */
export const search = (params: { q?: string; muscle?: string[]; equipment?: string[]; pattern?: string[]; maxDifficulty?: number; minDifficulty?: number; excludeJoints?: string[]; impact?: string[]; ids?: string[]; limit?: number }) =>
  call<{ data: Exercise[]; total: number }>(`/exercises?${query(params)}`);

/** Ranked replacements for one exercise, each with a score and a reason. */
export const substitutes = (id: string, params: { equipment?: string[]; excludeJoints?: string[]; limit?: number } = {}) =>
  call<{ data: Substitute[] }>(`/exercises/${encodeURIComponent(id)}/substitutes?${query(params)}`);

/** The catalogue's vocabulary (muscles, equipment, movement patterns, joints) and the sandbox sample ids. */
export const meta = () => call<{ enums: Record<string, (string | number)[]>; sample: string[]; version: string }>("/meta");

/**
 * Signed, short-lived video and still URLs for the exercises a screen shows, for one named person.
 * `endUser` is any stable opaque id (hash your own user id). Store exercise ids, never these URLs.
 */
export const mediaUrls = (endUser: string, ids: string[], opts: { coach?: boolean; kinds?: ("mp4" | "still")[] } = {}) =>
  call<{ data: Record<string, Media> }>("/media/urls", {
    method: "POST",
    headers: { "content-type": "application/json", "x-end-user": endUser, ...(opts.coach ? { "x-end-user-role": "coach" } : {}) },
    body: JSON.stringify({ ids, ...(opts.kinds ? { kinds: opts.kinds } : {}) }),
  });
