from exercisebank import search, substitutes, meta, media_urls

found = search(q="squat", equipment=["dumbbell", "bench"], maxDifficulty=3, limit=5)
print([f"{e['name']} [{e['id']}]" for e in found])

for s in substitutes(found[0]["id"], excludeJoints=["knee"], limit=3):
    print(f"  instead of {found[0]['name']}: {s['exercise']['name']} ({s['score']}) {s['reason']}")

sample = meta()["sample"]  # a sandbox key gets media for these 50
for exercise_id, m in media_urls("user-7f3a", sample[:2]).items():
    print(exercise_id, m.get("mp4", "(no media on this plan)"))
