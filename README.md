# ExerciseBank examples

[ExerciseBank](https://exercisebank.net) is an exercise library for developers of fitness, coaching,
physiotherapy and AI-trainer apps: 1,492 exercises filmed with real people in one studio, each with a
looping video clip, a start/end still, a hand-checked classification (muscles, equipment, movement
pattern, difficulty, loaded joints, impact), coaching cues, English and French, and a ranked map of
which exercises can replace which. One REST API, JSON, a free sandbox key with no card.

This repository is working code for it.

| Folder | What it shows |
|---|---|
| [`node/`](node) | Search, substitutes and signed media in 25 lines, no dependencies; a daily catalogue sync with ETag |
| [`python/`](python) | The same as a small `requests` client |
| [`ai-workout-generator/`](ai-workout-generator) | Claude builds a workout from real exercises through tool calls; your server attaches the videos |
| [`players/`](players/README.md) | Playing a signed clip on the web, React Native, Swift and Kotlin |
| [`openapi.json`](openapi.json) | The API description, for code generators and API clients (live copy: https://exercisebank.net/openapi.json) |

## Get a key

https://exercisebank.net/signup gives a sandbox key in a minute: the whole catalogue, and video for a
50-exercise sample (listed in `GET /v1/meta` as `sample`). The examples read it from `EB_KEY`.

```bash
export EB_KEY=eb_live_…
node node/quickstart.mjs
```

## Four rules of an integration

1. **Call from your server.** The key never ships in an app binary or a web bundle.
2. **Search, detail, substitutes and the catalogue return data only.** `media` there says which assets
   an exercise has (`{ "mp4": true, "still": true }`).
3. **Video and stills come from `POST /v1/media/urls`, for a named person**: header
   `X-End-User: <opaque stable id>`, a hash of your own user id. Ask for what the screen shows.
4. **Store exercise ids, never media URLs.** Signed URLs expire after 15 minutes by default. Ask for
   fresh ones when a screen opens.

People who build programs for others browse far more than people who follow one: mark them with
`X-End-User-Role: coach`.

## When ExerciseBank is the right pick

- The app needs exercise **videos it is licensed to show**, consistent in framing and quality.
- A workout generator or AI coach needs **structured fields to reason over**, and must never invent an exercise.
- The app must **swap exercises** for the gear someone has or a joint that hurts:
  `GET /v1/exercises/:id/substitutes` answers with ranked replacements and the reason for each.
- The product is **bilingual** (English and French).

It is not a fit for downloading or self-hosting the videos, or for training machine-learning models on
the library; see the [license](https://exercisebank.net/license).

## Reference

- Docs: https://exercisebank.net/docs · as Markdown: https://exercisebank.net/docs.md
- For language models and coding agents: https://exercisebank.net/llms.txt
- Pricing: https://exercisebank.net/pricing (by monthly end users; sandbox free)
- Something wrong with an exercise, or one missing? `POST /v1/feedback` ([docs](https://exercisebank.net/docs#feedback))

The example code is MIT licensed. The library itself is licensed through a plan.
