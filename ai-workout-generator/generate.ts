/**
 * An AI workout generator on real exercises.
 *
 *   EB_KEY=eb_live_… ANTHROPIC_API_KEY=sk-ant-… node generate.ts \
 *     "35 minutes, dumbbells and a bench at home, sore left knee, intermediate, glutes and back"
 *
 * Claude never invents an exercise: it searches the ExerciseBank catalogue through two tools,
 * swaps anything that does not fit with the substitute map, and hands in the plan through a third.
 * Your server then attaches signed videos for the person who will watch.
 */
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import * as eb from "./exercisebank.ts";

const request = process.argv.slice(2).join(" ") || "30 minutes, bodyweight only, beginner, full body, no jumping";
const endUser = process.env.END_USER ?? "demo-user-1"; // in your app: a hash of your user's id

const { enums } = await eb.meta();
const slim = (e: eb.Exercise) => ({ id: e.id, name: e.name, primaryMuscles: e.primaryMuscles, equipment: e.equipment, movementPattern: e.movementPattern, difficulty: e.difficulty, loadedJoints: e.loadedJoints, impact: e.impact, unilateral: e.unilateral });

const searchExercises = betaZodTool({
  name: "search_exercises",
  description: "Search the exercise catalogue. Every filter is optional. `equipment` is the gear the person HAS (bodyweight is always allowed); `excludeJoints` removes anything that loads those joints. Returns up to `limit` exercises with their classification.",
  inputSchema: z.object({
    q: z.string().optional().describe("Free text against exercise names and aliases"),
    muscle: z.array(z.string()).optional().describe("Primary or secondary muscles"),
    equipment: z.array(z.string()).optional(),
    pattern: z.array(z.string()).optional().describe("Movement patterns, e.g. squat, hinge, push, pull"),
    maxDifficulty: z.number().int().min(1).max(5).optional(),
    excludeJoints: z.array(z.string()).optional(),
    impact: z.array(z.enum(["low", "moderate", "high"])).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  run: async (input) => {
    const { data, total } = await eb.search({ ...input, limit: input.limit ?? 12 });
    return JSON.stringify({ total, exercises: data.map(slim) });
  },
});

const getSubstitutes = betaZodTool({
  name: "get_substitutes",
  description: "Ranked replacements for one exercise, each with a score (0-1) and the reason it fits. Use it when an exercise is right for the plan but wrong for this person's gear or joints.",
  inputSchema: z.object({ id: z.string(), equipment: z.array(z.string()).optional(), excludeJoints: z.array(z.string()).optional() }),
  run: async ({ id, ...filters }) => {
    const { data } = await eb.substitutes(id, { ...filters, limit: 6 });
    return JSON.stringify(data.map((s) => ({ score: s.score, reason: s.reason, exercise: slim(s.exercise) })));
  },
});

const Plan = z.object({
  title: z.string(),
  summary: z.string().describe("Two sentences for the person: what this session does and why it suits them"),
  blocks: z.array(z.object({
    name: z.string().describe("Warm-up, Main, Finisher, Cool-down…"),
    items: z.array(z.object({
      exerciseId: z.string().describe("An id returned by search_exercises or get_substitutes. Never invent one."),
      sets: z.number().int().min(1),
      reps: z.string().describe('"10", "8 per side", "40 s"'),
      restSeconds: z.number().int().min(0),
      note: z.string().optional().describe("Why this exercise, or what to watch, in one line"),
    })),
  })),
});
let plan: z.infer<typeof Plan> | undefined;

const submitPlan = betaZodTool({
  name: "submit_plan",
  description: "Hand in the finished workout. Call it exactly once, last.",
  inputSchema: Plan,
  run: async (input) => { plan = input; return "Plan received."; },
});

const client = new Anthropic(); // ANTHROPIC_API_KEY, or an `ant auth login` profile

const final = await client.beta.messages.toolRunner({
  model: "claude-opus-5",
  max_tokens: 16000,
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default", // if the model declines a request, the API retries it on a fallback model in the same call
  system: [
    "You are a strength and conditioning coach building one workout from a catalogue of filmed exercises.",
    "Only exercises the tools return exist for you; the person will watch a video of each, so an invented exercise is a broken screen.",
    "Respect the person's equipment and anything they say hurts: pass their gear as `equipment` and the joints to protect as `excludeJoints`, and use get_substitutes when a good exercise does not fit them.",
    "Balance the session across movement patterns, order it sensibly, and match difficulty to their level. When the plan is complete, call submit_plan.",
    `Catalogue vocabulary. Muscles: ${enums.muscles?.join(", ")}. Equipment: ${enums.equipment?.join(", ")}. Movement patterns: ${enums.movementPatterns?.join(", ")}. Joints: ${enums.joints?.join(", ")}.`,
  ].join("\n"),
  tools: [searchExercises, getSubstitutes, submitPlan],
  messages: [{ role: "user", content: request }],
});

if (final.stop_reason === "refusal") throw new Error("The model declined this request.");
if (!plan) throw new Error("No plan was submitted. Last message: " + JSON.stringify(final.content));

// The videos, for the person who will watch. One call for the whole screen.
const ids = [...new Set(plan.blocks.flatMap((b) => b.items.map((i) => i.exerciseId)))];
const [{ data: media }, { data: details }] = await Promise.all([eb.mediaUrls(endUser, ids), eb.search({ ids, limit: 100 })]);
const nameOf = new Map(details.map((e) => [e.id, e.name]));

console.log(`\n${plan.title}\n${plan.summary}\n`);
for (const block of plan.blocks) {
  console.log(block.name.toUpperCase());
  for (const item of block.items) {
    const m = media[item.exerciseId];
    console.log(`  ${nameOf.get(item.exerciseId) ?? item.exerciseId}: ${item.sets} × ${item.reps}, rest ${item.restSeconds}s${item.note ? `  (${item.note})` : ""}`);
    console.log(`    ${m?.mp4 ?? (m?.sandbox ? "video: outside the sandbox sample; a paid key returns it" : "no clip")}`);
  }
  console.log();
}
