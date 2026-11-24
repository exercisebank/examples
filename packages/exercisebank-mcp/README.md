# exercisebank-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for the
[ExerciseBank API](https://exercisebank.net): 1,492 studio-filmed exercises with a hand-checked
classification and a ranked map of which exercises can replace which. It lets Claude, Cursor and other
MCP clients search real exercises by muscle, equipment, movement pattern, difficulty and joints to
avoid, so a plan is built from exercises that exist, with videos your app is licensed to show.

Use it while you build on the API (your coding agent explores the catalogue and the vocabulary as it
writes your integration) or to prototype a workout generator before writing any code.

## Install

Get a free sandbox key (no card) at https://exercisebank.net/signup, then:

**Claude Code**

```bash
claude mcp add exercisebank --env EB_KEY=eb_live_… -- npx -y exercisebank-mcp
```

**Claude Desktop, Cursor, Windsurf and other clients** (`claude_desktop_config.json`, `.cursor/mcp.json`, …)

```json
{
  "mcpServers": {
    "exercisebank": {
      "command": "npx",
      "args": ["-y", "exercisebank-mcp"],
      "env": { "EB_KEY": "eb_live_…" }
    }
  }
}
```

It runs on your machine over stdio; the key stays in your client's configuration. Node 18 or later.

## Tools

| Tool | What it does |
|---|---|
| `get_vocabulary` | The exact filter values: muscles, equipment, movement patterns, joints, impact; the catalogue version; the ids a sandbox key gets video for |
| `search_exercises` | Search and filter: `q`, `muscle`, `equipment` (the gear the person has), `pattern`, `minDifficulty`, `maxDifficulty`, `excludeJoints`, `impact`, `unilateral`, `demonstrator`, `limit`, `offset` |
| `get_exercise` | The full record: description, coaching cues, French, classification |
| `get_substitutes` | Ranked replacements with a score and a reason each, filtered by gear and joints to avoid |
| `get_media_urls` | Signed video and still URLs. Only when `EB_END_USER` is set (below) |

### Video

ExerciseBank signs media only for a named person, and that person counts as an end user on the plan.
To get `get_media_urls`, add an opaque id for whoever is at this machine:

```json
"env": { "EB_KEY": "eb_live_…", "EB_END_USER": "dev-laptop-anna" }
```

URLs expire after 15 minutes. A sandbox key gets media for the 50-exercise sample listed by
`get_vocabulary`; a paid plan gets all 1,492.

## In your product

This server is for the developer's desk. A product calls the API from its own backend, with its own
users' ids: use the [`exercisebank`](https://www.npmjs.com/package/exercisebank) client and see the
guide, [an AI workout generator with Claude](https://exercisebank.net/guides/ai-workout-generator).

- API reference: https://exercisebank.net/docs · for language models: https://exercisebank.net/llms.txt
- Pricing, by monthly end users: https://exercisebank.net/pricing

MIT licensed. The library itself is licensed through a plan: https://exercisebank.net/license
