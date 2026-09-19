// node quickstart.mjs      (Node 18+, no dependencies)   EB_KEY=eb_live_… from https://exercisebank.net/signup
const EB = process.env.EB_BASE ?? "https://exercisebank.net/v1";
const headers = { authorization: `Bearer ${process.env.EB_KEY}` };
const get = (path) => fetch(`${EB}${path}`, { headers }).then((r) => r.json());

// 1. Search: squats this person can do with the gear they have, up to intermediate.
const { data: found, total } = await get("/exercises?q=squat&equipment=dumbbell,bench&maxDifficulty=3&limit=5");
console.log(`${total} matches:`, found.map((e) => `${e.name} [${e.id}]`).join(", "));

// 2. Substitutes: what can replace the first one for someone with a sore knee, and why.
const { data: subs } = await get(`/exercises/${found[0].id}/substitutes?excludeJoints=knee&limit=3`);
for (const s of subs) console.log(`  instead of ${found[0].name}: ${s.exercise.name} (${s.score}) ${s.reason}`);

// 3. Media: signed, expiring URLs for the exercises on screen, for one named person.
//    X-End-User is any stable opaque id (hash your own user id). Store exercise ids, never these URLs.
const { sample } = await get("/meta"); // a sandbox key gets media for these 50
const res = await fetch(`${EB}/media/urls`, {
  method: "POST",
  headers: { ...headers, "content-type": "application/json", "x-end-user": "user-7f3a" },
  body: JSON.stringify({ ids: sample.slice(0, 2), kinds: ["mp4", "still"] }),
});
const { data: media } = await res.json();
for (const [id, m] of Object.entries(media)) console.log(id, m.signed ? m.mp4 : "(no media on this plan)");
