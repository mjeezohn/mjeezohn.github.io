#!/usr/bin/env python3
"""Sync all public uploads from @mjeezohn to data/youtube.json.

Requires: YOUTUBE_API_KEY (GitHub Actions secret). Uses only Python stdlib.
No API key is ever written to the repository or browser bundle.
"""
from __future__ import annotations

import json
import os
import re
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

API_BASE = "https://www.googleapis.com/youtube/v3"
ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "youtube.json"
HANDLE = "@mjeezohn"
VIDEO_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
DURATION_RE = re.compile(
    r"^P(?:(?P<days>\d+)D)?(?:T(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?)?$"
)
SHORTS_TAG_RE = re.compile(r"(?<!\w)#shorts\b", re.IGNORECASE)
# This video is confirmed by its publicly shared Shorts URL.
KNOWN_SHORTS = {"U_DMV9IbOGU"}


class SyncError(RuntimeError):
    """Fatal API or validation error. Existing JSON must not be overwritten."""


def api_get(endpoint: str, api_key: str, **parameters: object) -> dict:
    query = urlencode({"key": api_key, **parameters})
    request = Request(
        f"{API_BASE}/{endpoint}?{query}",
        headers={"Accept": "application/json", "User-Agent": "MjeeZohn-GitHubPages-Sync/1.0"},
    )
    try:
        with urlopen(request, timeout=30) as response:
            return json.load(response)
    except HTTPError as exc:
        # Never include the request URL: it contains the API key.
        try:
            message = json.load(exc).get("error", {}).get("message", "Unknown YouTube API error")
        except (ValueError, OSError):
            message = "Unknown YouTube API error"
        raise SyncError(f"YouTube API HTTP {exc.code}: {message}") from None
    except (URLError, TimeoutError, ValueError) as exc:
        raise SyncError(f"Cannot retrieve YouTube API response: {type(exc).__name__}") from exc


def seconds_from_iso8601(value: str) -> int | None:
    match = DURATION_RE.fullmatch(value)
    if not match:
        return None
    units = {key: int(amount or 0) for key, amount in match.groupdict().items()}
    return units["days"] * 86400 + units["hours"] * 3600 + units["minutes"] * 60 + units["seconds"]


def is_confirmed_short(video_id: str, title: str, description: str) -> bool:
    # YouTube Data API has no authoritative Shorts flag. Do not classify by duration alone.
    return video_id in KNOWN_SHORTS or bool(SHORTS_TAG_RE.search(title + "\n" + description))


def normalise_description(value: str, limit: int = 260) -> str:
    return " ".join((value or "").split())[:limit]


def convert_video(item: dict) -> dict | None:
    video_id = item.get("id", "")
    if not VIDEO_ID_RE.fullmatch(video_id):
        return None
    if item.get("status", {}).get("privacyStatus") != "public":
        return None
    snippet = item.get("snippet") or {}
    title = snippet.get("title", "").strip()
    if not title or title in {"Private video", "Deleted video"}:
        return None
    description = snippet.get("description", "")
    published = snippet.get("publishedAt", "")
    duration = seconds_from_iso8601(item.get("contentDetails", {}).get("duration", ""))
    short = is_confirmed_short(video_id, title, description)
    return {
        "id": video_id,
        "title": title,
        "description": normalise_description(description),
        "publishedAt": published,
        "durationSeconds": duration,
        "kind": "shorts" if short else "video",
        "url": f"https://www.youtube.com/{'shorts/' if short else 'watch?v='}{video_id}",
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
    }


def fetch_public_uploads(api_key: str) -> dict:
    channel_data = api_get("channels", api_key, part="snippet,contentDetails", forHandle=HANDLE)
    channel_items = channel_data.get("items") or []
    if len(channel_items) != 1:
        raise SyncError(f"Channel {HANDLE} not found or ambiguous")
    channel = channel_items[0]
    channel_id = channel.get("id", "")
    uploads_id = (channel.get("contentDetails") or {}).get("relatedPlaylists", {}).get("uploads", "")
    if not channel_id.startswith("UC") or not uploads_id:
        raise SyncError("Channel has no valid uploads playlist")

    ids: list[str] = []
    seen: set[str] = set()
    next_page = ""
    for _ in range(200):
        params: dict[str, object] = {
            "part": "contentDetails", "playlistId": uploads_id, "maxResults": 50
        }
        if next_page:
            params["pageToken"] = next_page
        response = api_get("playlistItems", api_key, **params)
        for playlist_item in response.get("items", []):
            video_id = (playlist_item.get("contentDetails") or {}).get("videoId", "")
            if VIDEO_ID_RE.fullmatch(video_id) and video_id not in seen:
                seen.add(video_id)
                ids.append(video_id)
        next_page = response.get("nextPageToken", "")
        if not next_page:
            break
    else:
        raise SyncError("Too many playlist pages; refusing incomplete sync")

    videos: list[dict] = []
    for offset in range(0, len(ids), 50):
        batch = ids[offset:offset + 50]
        response = api_get("videos", api_key, part="snippet,contentDetails,status", id=",".join(batch))
        for item in response.get("items", []):
            video = convert_video(item)
            if video:
                videos.append(video)
    videos.sort(key=lambda item: (item["publishedAt"], item["id"]), reverse=True)

    # Fail safe: if the API unexpectedly drops all previously synced videos, keep the last good data.
    if not videos and OUTPUT.exists():
        previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
        if previous.get("videos"):
            raise SyncError("API returned zero public videos; preserving previously synced catalogue")

    return {
        "schemaVersion": 1,
        "source": "YouTube Data API v3",
        "channel": {
            "id": channel_id,
            "handle": HANDLE,
            "title": (channel.get("snippet") or {}).get("title", "MjeeZohn Studio"),
            "url": "https://www.youtube.com/@mjeezohn",
            "uploadsPlaylistId": uploads_id,
        },
        "syncedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total": len(videos),
        "videos": videos,
    }


def write_json_atomically(data: dict) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    temp_name = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w", dir=OUTPUT.parent, suffix=".json.tmp", encoding="utf-8", delete=False
        ) as temp:
            temp_name = temp.name
            json.dump(data, temp, ensure_ascii=False, indent=2)
            temp.write("\n")
        os.replace(temp_name, OUTPUT)
    finally:
        if temp_name and os.path.exists(temp_name):
            os.unlink(temp_name)


def main() -> int:
    api_key = os.environ.get("YOUTUBE_API_KEY", "").strip()
    if not api_key:
        print("Set YOUTUBE_API_KEY as a GitHub Actions repository secret before syncing.", file=sys.stderr)
        return 2
    try:
        data = fetch_public_uploads(api_key)
        write_json_atomically(data)
    except (SyncError, ValueError, OSError) as exc:
        print(f"YouTube sync failed: {exc}", file=sys.stderr)
        return 1
    print(f"Synced {data['total']} public uploads from {HANDLE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
