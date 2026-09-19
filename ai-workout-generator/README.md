# An AI workout generator on real exercises

A language model is good at planning a session and bad at remembering which exercises exist, what
they need and which joints they load. Here Claude plans, and the catalogue answers every factual
question through three tools:

- `search_exercises`: filter by muscle, the equipment the person **has**, movement pattern, difficulty, and joints to protect
- `get_substitutes`: ranked replacements for an exercise, each with a score and a reason
- `submit_plan`: the finished workout, validated against a schema; every item is a real exercise id

Your server then asks ExerciseBank for signed videos for the person who will watch, in one call.

```bash
npm install
export EB_KEY=eb_live_…            # free sandbox key: https://exercisebank.net/signup
export ANTHROPIC_API_KEY=sk-ant-…  # https://console.anthropic.com
node generate.ts "35 minutes, dumbbells and a bench at home, sore left knee, intermediate, glutes and back"
```

Node 24 runs the TypeScript directly. On a sandbox key, exercises outside the 50-exercise sample
come back without a video link; a paid key returns all of them, with no change to the code.

Walkthrough: https://exercisebank.net/guides/ai-workout-generator

## Make it yours

- **The end user.** `END_USER` stands in for a hash of your own user id. It is what a plan is measured
  on and what lets one person open up to 150 distinct exercises a day.
- **Store the plan, not the links.** Save `exerciseId`s; ask for media again whenever the screen opens.
- **French.** Records carry `nameFr`, `descriptionFr` and `cuesFr` where available; ask the model to write in French and show those fields.
- **Catalogue on your side.** For heavy use, sync `GET /v1/catalog` once a day (see `../node/sync-catalog.mjs`) and let the tools search your copy.
