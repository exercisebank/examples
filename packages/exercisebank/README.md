# exercisebank

Official JavaScript / TypeScript client for the [ExerciseBank API](https://exercisebank.net): an exercise
video API for fitness, coaching, physiotherapy and AI-trainer apps. 1,492 exercises filmed with real
people in one studio, each with a looping video clip, a start/end still, a hand-checked classification
(muscles, equipment, movement pattern, difficulty, loaded joints, impact), coaching cues, English and
French, and a ranked map of which exercises can replace which.

No dependencies. Node 18 or later. **Server-side only: the API key never ships in an app binary or a
web bundle**, and the client refuses to start in a browser.

```bash
npm install exercisebank
```

## The sandbox flow

A free sandbox key (no card) at https://exercisebank.net/signup gives the whole catalogue, and video
for a 50-exercise sample.

```ts
import { ExerciseBank } from "exercisebank";

const eb = new ExerciseBank(); // reads EB_KEY; or new ExerciseBank({ apiKey })

// 1. Search: squats this person can do with the gear they have, up to intermediate.
const { data: found, total } = await eb.search({ q: "squat", equipment: ["dumbbell", "bench"], maxDifficulty: 3, limit: 5 });

// 2. Substitutes: what can replace the first one for someone with a sore shoulder, and why.
for (const s of await eb.substitutes(found[0].id, { excludeJoints: ["shoulder"], limit: 3 }))
  console.log(`${s.exercise.name} (${s.score}): ${s.reason}`);

// 3. Media: signed, expiring URLs for the exercises on screen, for one named person.
const { sample } = await eb.meta(); // a sandbox key gets media for these 50
const { data: media } = await eb.mediaUrls({ endUser: "user-7f3a", ids: sample.slice(0, 2) });
for (const [id, m] of Object.entries(media)) console.log(id, m.signed ? m.mp4 : "(not in the sandbox sample)");
```

## Four rules of an integration

1. **Call from your server.** Your backend calls ExerciseBank and hands the app what it needs.
2. **`search`, `get`, `substitutes` and `catalog` return data only.** `media` there says which assets an
   exercise has (`{ mp4: true, still: true }`).
3. **Video and stills come from `mediaUrls`, for a named person.** `endUser` is any stable opaque id (a
   hash of your own user id). Ask for what the screen shows. Mark people who build programs for others
   with `coach: true`.
4. **Store exercise ids, never media URLs.** Signed URLs expire after 15 minutes by default (`ttl`, up
   to 3600 s). Ask for fresh ones when a screen opens.

## Methods

| Method | Returns |
|---|---|
| `search(params)` | `{ data: Exercise[], total, next, … }`. Filters: `q`, `muscle`, `equipment` (the gear the person has), `pattern`, `minDifficulty`, `maxDifficulty`, `excludeJoints`, `impact`, `unilateral`, `demonstrator`, `ids`, `limit`, `offset` |
| `get(id)` | One `Exercise` |
| `substitutes(id, { equipment, excludeJoints, limit })` | `Substitute[]`: `{ score, reason, exercise }`, best first |
| `mediaUrls({ endUser, ids, coach, kinds, ttl })` | `{ data: { [id]: { signed, expires, mp4, still } }, missing }` |
| `meta()` | Catalogue version, the vocabulary (`enums`: muscles, equipment, movement patterns, joints), sandbox `sample` ids |
| `catalog(etag?)` | The whole catalogue with its `etag`, or `null` when nothing changed. Keeping a local copy of the metadata is encouraged |

Errors are `ExerciseBankError` with `status`, `code` (`not_found`, `end_user_required`, `rate_limited`,
`mau_exceeded`, …) and `retryAfter` in seconds when the API sent one.

```ts
import { ExerciseBankError } from "exercisebank";
try { await eb.get("nope"); } catch (e) { if (e instanceof ExerciseBankError && e.status === 404) { /* … */ } }
```

## Reference

- API reference: https://exercisebank.net/docs (Markdown: https://exercisebank.net/docs.md, OpenAPI: https://exercisebank.net/openapi.json)
- For coding agents: https://exercisebank.net/llms.txt, and the MCP server [`exercisebank-mcp`](https://www.npmjs.com/package/exercisebank-mcp)
- Guide: [an AI workout generator with Claude](https://exercisebank.net/guides/ai-workout-generator)
- Pricing, by monthly end users: https://exercisebank.net/pricing

The client is MIT licensed. The library itself is licensed through a plan: https://exercisebank.net/license
