#!/usr/bin/env node
/**
 * MCP server for the ExerciseBank API (https://exercisebank.net), over stdio.
 * EB_KEY       your key (free sandbox key: https://exercisebank.net/signup)
 * EB_END_USER  optional: an opaque id for the person at this machine. Set it to get the get_media_urls tool;
 *              media is only ever signed for a named person, and that person counts as an end user on the plan.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ExerciseBank, ExerciseBankError, type Exercise } from "exercisebank";
import { z } from "zod";

let eb: ExerciseBank;
try {
  eb = new ExerciseBank();
} catch (e) {
  console.error(`exercisebank-mcp: ${(e as Error).message}`);
  process.exit(1);
}
const END_USER = process.env.EB_END_USER?.trim();

const server = new McpServer({ name: "exercisebank", version: "0.1.1" });

const text = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }] });
const guard = <A>(run: (args: A) => Promise<unknown>) => async (args: A) => {
  try {
    return text(await run(args));
  } catch (e) {
    const message = e instanceof ExerciseBankError ? `${e.message}${e.retryAfter ? ` (retry in ${e.retryAfter} s)` : ""}` : String(e);
    return { content: [{ type: "text" as const, text: message }], isError: true };
  }
};

/** What a model needs to choose between exercises; get_exercise has the description and cues. */
const brief = (e: Exercise) => ({
  id: e.id, name: e.name, ...(e.nameFr ? { nameFr: e.nameFr } : {}),
  primaryMuscles: e.primaryMuscles, secondaryMuscles: e.secondaryMuscles, equipment: e.equipment,
  movementPattern: e.movementPattern, difficulty: e.difficulty, loadedJoints: e.loadedJoints, impact: e.impact, unilateral: e.unilateral, ...(e.demonstrator ? { demonstrator: e.demonstrator } : {}),
});

const names = (what: string) => z.array(z.string()).optional().describe(`${what}. Values from get_vocabulary.`);

server.registerTool(
  "get_vocabulary",
  {
    title: "ExerciseBank vocabulary",
    description: "The exact values the ExerciseBank filters accept: muscles, equipment, movement patterns, joints, impact. Call this once before search_exercises or get_substitutes. Also returns the catalogue version and the ids a sandbox key gets video for.",
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  guard(async () => {
    const m = await eb.meta();
    return { version: m.version, count: m.count, plan: m.plan, enums: m.enums, sandboxMediaSample: m.sample };
  }),
);

server.registerTool(
  "search_exercises",
  {
    title: "Search ExerciseBank exercises",
    description: "Search 1,492 studio-filmed exercises. Every filter is optional and they combine. Only exercises returned here exist: never invent an exercise or an id. Without q the order is alphabetical, so filter rather than page.",
    inputSchema: {
      q: z.string().optional().describe("Text in the name, French name or aliases, e.g. 'goblet squat'"),
      muscle: names("Primary or secondary muscles"),
      equipment: names("The gear the person HAS (bodyweight is always allowed); exercises needing anything else are left out"),
      pattern: names("Movement patterns"),
      minDifficulty: z.number().int().min(1).max(5).optional(),
      maxDifficulty: z.number().int().min(1).max(5).optional().describe("1 beginner to 5 advanced"),
      excludeJoints: names("Leave out anything that loads these joints, e.g. a sore knee"),
      impact: z.array(z.enum(["low", "moderate", "high"])).optional(),
      unilateral: z.boolean().optional(),
      demonstrator: z.array(z.enum(["female", "male"])).optional().describe("Who demonstrates the clip"),
      limit: z.number().int().min(1).max(100).optional().describe("Default 25"),
      offset: z.number().int().min(0).optional(),
    },
    annotations: { readOnlyHint: true },
  },
  guard(async (args) => {
    const r = await eb.search(args);
    return { total: r.total, next: r.next, exercises: r.data.map(brief) };
  }),
);

server.registerTool(
  "get_exercise",
  {
    title: "Get one ExerciseBank exercise",
    description: "The full record for one exercise id: description, coaching cues, French, classification, which media exists.",
    inputSchema: { id: z.string().describe("An id from search_exercises, e.g. tc-2000") },
    annotations: { readOnlyHint: true },
  },
  guard(({ id }) => eb.get(id)),
);

server.registerTool(
  "get_substitutes",
  {
    title: "Substitutes for an exercise",
    description: "Ranked replacements for one exercise, each with a score and the reason it works as a swap. Filter by the gear the person has and by joints to avoid.",
    inputSchema: {
      id: z.string().describe("The exercise to replace"),
      equipment: names("The gear the person has"),
      excludeJoints: names("Leave out substitutes that load these joints"),
      limit: z.number().int().min(1).max(50).optional().describe("Default 10"),
    },
    annotations: { readOnlyHint: true },
  },
  guard(async ({ id, ...params }) => (await eb.substitutes(id, params)).map((s) => ({ score: s.score, reason: s.reason, exercise: brief(s.exercise) }))),
);

if (END_USER)
  server.registerTool(
    "get_media_urls",
    {
      title: "Signed video and still URLs",
      description: "Short-lived signed URLs (video clip and still) for up to 50 exercise ids, issued for the person named in EB_END_USER. They expire, 15 minutes by default: show them now, store exercise ids. A sandbox key gets media only for the ids in get_vocabulary.sandboxMediaSample.",
      inputSchema: {
        ids: z.array(z.string()).min(1).max(50),
        kinds: z.array(z.enum(["mp4", "still"])).optional().describe("Default both"),
      },
      annotations: { readOnlyHint: true },
    },
    guard(({ ids, kinds }) => eb.mediaUrls({ endUser: END_USER, ids, ...(kinds ? { kinds } : {}) })),
  );

await server.connect(new StdioServerTransport());
