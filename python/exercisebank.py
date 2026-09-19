"""A small client for the ExerciseBank API. Runs on your server: the key never ships in an app.

    pip install requests
    EB_KEY=eb_live_... python example.py
"""
import os
import requests

EB = os.environ.get("EB_BASE", "https://exercisebank.net/v1")
HEADERS = {"Authorization": f"Bearer {os.environ['EB_KEY']}"}


def _get(path, **params):
    params = {k: ",".join(v) if isinstance(v, (list, tuple)) else v for k, v in params.items() if v is not None}
    r = requests.get(f"{EB}{path}", headers=HEADERS, params=params, timeout=20)
    r.raise_for_status()
    return r.json()


def search(**params):
    """q, muscle, equipment (the gear the person HAS), pattern, maxDifficulty, excludeJoints, impact, ids, limit, offset."""
    return _get("/exercises", **params)["data"]


def substitutes(exercise_id, **params):
    """Ranked replacements with a score and a reason. Filters: equipment, excludeJoints, limit."""
    return _get(f"/exercises/{exercise_id}/substitutes", **params)["data"]


def meta():
    return _get("/meta")


def media_urls(end_user, ids, coach=False, kinds=("mp4", "still")):
    """Signed, expiring URLs for the exercises on screen, for one named person.

    end_user is any stable opaque id (hash your own user id). Store exercise ids, never these URLs.
    """
    headers = {**HEADERS, "X-End-User": end_user, **({"X-End-User-Role": "coach"} if coach else {})}
    r = requests.post(f"{EB}/media/urls", headers=headers, json={"ids": list(ids), "kinds": list(kinds)}, timeout=20)
    r.raise_for_status()
    return r.json()["data"]
