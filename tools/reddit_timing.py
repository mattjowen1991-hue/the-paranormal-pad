#!/usr/bin/env python3
"""
reddit_timing.py - when should The Paranormal Pad post to each subreddit?

For each subreddit it downloads every post from the past year (from the Arctic Shift
Reddit archive, which needs no Reddit login), leaves out posts less than 48 hours old and
posts that got no reaction at all (nearly always ones a mod or Reddit's filters removed),
and works out, in UK time, which days and times give a post the
best chance of doing well. It compares rates, not counts: busy hours produce more
winners just by having more posts, so a time only ranks well if a post made then is
more likely than usual to do well.

Usage (from the repo folder)
    python3 tools/reddit_timing.py               analyse the seven subreddits and open the report
    python3 tools/reddit_timing.py --demo        preview the report with made-up data
    python3 tools/reddit_timing.py --subs Paranormal Ghosts
    python3 tools/reddit_timing.py --awake 08-01 only recommend times you can post at and
                                                 then stay online for an hour (default 08-01:
                                                 up from 08:00, in bed by 01:00)
    python3 tools/reddit_timing.py --refresh     download everything again

It also finds your own posts in those subreddits (u/MattJowen, or --user) and shows how each did:
how many of the subreddit's posts it beat, how good its time slot was, and whether it got no
reaction at all (often a sign it was removed).

Output (tools/reddit_timing_out/, or --out; kept out of git)
    reddit_timing_report.html    best times, a one-week posting rota, your posts and a heatmap per subreddit
    reddit_timing_data.csv       the numbers behind them
    reddit_timing_my_posts.csv   your posts and how each did
    cache/                       downloaded posts; later runs only fetch what's new

The first run can take a long time (r/Paranormal alone is about 25,000 posts a year, and the
archive makes us wait when it's busy). Later runs only fetch new posts. Needs Python 3.9 or
newer and nothing else.

Checking with Reddit (optional)
    Without Reddit credentials the script guesses which posts were removed. With them, it asks
    Reddit for each post's current score and whether it was removed, 100 posts per request
    (about 5 minutes for all seven subs the first time, then only new posts). Reddit only gives
    credentials to approved apps: once yours is approved, put them either in environment
    variables REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET, or in
    tools/reddit_timing_out/reddit_credentials.json (kept out of git) like this:
        {"client_id": "...", "client_secret": "..."}
    --no-reddit skips the check even when credentials are set.
"""

import argparse
import base64
import bisect
import csv
import html
import json
import math
import os
import random
import statistics
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import webbrowser
from datetime import datetime, timezone
from pathlib import Path

try:
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
except ImportError:
    sys.exit("This script needs Python 3.9 or newer.")

DEFAULT_SUBS = [
    "Paranormal",
    "Ghoststories",
    "Thetruthishere",
    "ParanormalEncounters",
    "HighStrangeness",
    "Humanoidencounters",
    "Ghosts",
]
ARCHIVE = "https://arctic-shift.photon-reddit.com/api/posts/search"
USER_AGENT = "paranormal-pad-timing/2.0 (theparanormalpad.com)"
REDDIT_AGENT = "script:paranormal-pad-timing:v2.0 (by /u/MattJowen)"
REDDIT_TOKEN_URL = "https://www.reddit.com/api/v1/access_token"
REDDIT_INFO_URL = "https://oauth.reddit.com/api/info"
PAGE_DELAY = 1.0        # seconds between requests
FIELDS = "id,created_utc,score,num_comments,distinguished"  # full records are heavily rate-limited
YEAR = 365 * 86400
SETTLE_HOURS = 48       # ignore posts younger than this; their scores are still moving
BLOCK = 3               # hours per heatmap block
MIN_POSTS = 15          # blocks with fewer posts are shown but never recommended
PRIOR = 20.0            # smoothing: a block counts as this many average posts before its own
QUIET_PER_DAY = 3       # below this many posts a day, timing barely matters
DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
OUT_DEFAULT = Path(__file__).resolve().parent / "reddit_timing_out"
MY_USER = "MattJowen"
CLOSE_MINUTES = 30      # posts this close together across subs look like a blast to spam filters
GOOD_SLOT = 1.1         # a slot at least this much better than average counts as a good one
COMPARE_MIN = 8         # posts needed in each group before comparing good slots with the rest


# ---------------------------------------------------------------- fetching

def get_json(url, tries=8):
    for attempt in range(tries):
        wait = 5 * (attempt + 1)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = json.load(r)
            if data.get("error"):
                print(f"    The archive is busy ({data['error']}). Waiting {wait}s.")
                time.sleep(wait)
                continue
            return data.get("data") or []
        except urllib.error.HTTPError as e:
            if e.code in (422, 429) or e.code >= 500:   # the archive reports overload as 422 "Timeout"
                try:
                    wait = max(wait, float(e.headers.get("x-ratelimit-reset") or 0))
                except ValueError:
                    pass
                print(f"    The archive asked us to slow down (HTTP {e.code}). Waiting {wait:.0f}s.")
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"    Network problem ({getattr(e, 'reason', e)}). Retrying in {wait}s.")
            time.sleep(wait)
    sys.exit("Gave up after several failed attempts. The archive may be down; try again later.")


def fetch_range(sub, start, end):
    """Every post in r/sub created between start and end (epoch seconds), oldest first."""
    posts, seen, after = [], set(), start
    while True:
        params = {"subreddit": sub, "limit": "auto", "sort": "asc", "after": int(after), "before": int(end),
                  "fields": FIELDS}
        page = get_json(f"{ARCHIVE}?{urllib.parse.urlencode(params)}")
        fresh = [p for p in page if p.get("id") not in seen]
        for p in fresh:
            seen.add(p["id"])
            posts.append({
                "id": p["id"],
                "t": p.get("created_utc"),
                "score": p.get("score") or 0,
                "comments": p.get("num_comments") or 0,
                "mod": bool(p.get("distinguished")),
            })
        if posts:
            day = datetime.fromtimestamp(posts[-1]["t"], timezone.utc).strftime("%d %b %Y")
            print(f"\r    r/{sub}: {len(posts):,} posts, up to {day}   ", end="", flush=True)
        if not fresh:
            break
        after = posts[-1]["t"] - 1   # overlap by a second so posts sharing a timestamp aren't lost
        time.sleep(PAGE_DELAY)
    print()
    return posts


def load_my_posts(user, subs):
    """All your posts in the subreddits being analysed, newest first."""
    wanted = {s.lower() for s in subs}
    posts, seen, before = [], set(), None
    while True:
        params = {"author": user, "limit": 100, "sort": "desc", "fields": FIELDS + ",subreddit,title"}
        if before:
            params["before"] = int(before)
        page = get_json(f"{ARCHIVE}?{urllib.parse.urlencode(params)}")
        fresh = [p for p in page if p.get("id") not in seen]
        for p in fresh:
            seen.add(p["id"])
            if (p.get("subreddit") or "").lower() in wanted:
                posts.append({
                    "id": p["id"], "t": p["created_utc"], "score": p.get("score") or 0,
                    "comments": p.get("num_comments") or 0, "mod": bool(p.get("distinguished")),
                    "sub": p["subreddit"], "title": p.get("title") or "",
                })
        if len(page) < 100 or not fresh:
            break
        before = page[-1]["created_utc"] + 1
        time.sleep(PAGE_DELAY)
    return posts


def reddit_token(out):
    """An app-only Reddit token, or None when no credentials are set."""
    cid, secret = os.environ.get("REDDIT_CLIENT_ID"), os.environ.get("REDDIT_CLIENT_SECRET")
    creds_file = out / "reddit_credentials.json"
    if not (cid and secret) and creds_file.exists():
        try:
            creds = json.loads(creds_file.read_text())
        except ValueError:
            sys.exit(f"{creds_file} isn't valid JSON. It should look like "
                     '{"client_id": "...", "client_secret": "..."}')
        cid, secret = creds.get("client_id"), creds.get("client_secret")
    if not (cid and secret):
        return None
    auth = base64.b64encode(f"{cid}:{secret}".encode()).decode()
    req = urllib.request.Request(
        REDDIT_TOKEN_URL,
        data=urllib.parse.urlencode({"grant_type": "client_credentials"}).encode(),
        headers={"User-Agent": REDDIT_AGENT, "Authorization": f"Basic {auth}"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            token = json.load(r).get("access_token")
    except urllib.error.HTTPError as e:
        token = None
        print(f"Reddit refused the credentials (HTTP {e.code}).")
    if not token:
        sys.exit("Couldn't log in to Reddit. Check the client ID and secret, or run with --no-reddit.")
    print("Checking posts with Reddit using your app credentials.")
    return token


def reddit_get(url, token, tries=6):
    headers = {"User-Agent": REDDIT_AGENT, "Authorization": f"bearer {token}"}
    for attempt in range(tries):
        wait = 10 * (attempt + 1)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers), timeout=60) as r:
                remaining = float(r.headers.get("x-ratelimit-remaining") or 100)
                reset = float(r.headers.get("x-ratelimit-reset") or 0)
                data = json.load(r)
            if remaining < 2:   # out of requests until the window resets
                time.sleep(reset + 1)
            return data
        except urllib.error.HTTPError as e:
            if e.code == 429 or e.code >= 500:
                try:
                    wait = max(wait, float(e.headers.get("x-ratelimit-reset") or 0))
                except ValueError:
                    pass
                print(f"    Reddit asked us to slow down (HTTP {e.code}). Waiting {wait:.0f}s.")
                time.sleep(wait)
                continue
            if e.code in (401, 403):
                sys.exit(f"Reddit refused the request (HTTP {e.code}). Your app may not be approved for "
                         "this yet. Run with --no-reddit to use the archive alone.")
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            print(f"    Network problem ({getattr(e, 'reason', e)}). Retrying in {wait}s.")
            time.sleep(wait)
    sys.exit("Gave up asking Reddit after several failed attempts. Try again later, or use --no-reddit.")


def reddit_check(sub, posts, token, save):
    """Replace the archive's numbers with Reddit's own, and record which posts were removed."""
    todo = [p for p in posts if not p.get("checked")]
    for i in range(0, len(todo), 100):
        batch = todo[i:i + 100]
        ids = ",".join(f"t3_{p['id']}" for p in batch)
        data = reddit_get(f"{REDDIT_INFO_URL}?{urllib.parse.urlencode({'id': ids, 'raw_json': 1})}", token)
        found = {c["data"]["id"]: c["data"] for c in (data.get("data") or {}).get("children") or []}
        for p in batch:
            d = found.get(p["id"])
            if d is None:   # Reddit no longer has it at all
                p.update(removed=True, checked=True)
                continue
            p.update(
                score=d.get("score") or 0,
                comments=d.get("num_comments") or 0,
                removed=bool(d.get("removed_by_category")),
                mod=bool(d.get("stickied") or d.get("distinguished")),
                checked=True,
            )
        print(f"\r    r/{sub}: checked {min(i + 100, len(todo)):,} of {len(todo):,} with Reddit   ",
              end="", flush=True)
        if (i // 100) % 20 == 19:
            save()
        time.sleep(0.7)
    if todo:
        print()
        save()


def load_posts(sub, cache_dir, now, refresh, token=None):
    """Posts from the past year, older than SETTLE_HOURS. Cached; later runs only fetch new ones."""
    path = cache_dir / f"{sub.lower()}.json"
    cutoff = now - SETTLE_HOURS * 3600
    cache = {"until": now - YEAR, "posts": []}
    if path.exists() and not refresh:
        cache = json.loads(path.read_text())
    if cutoff - cache["until"] > 3600:
        new = fetch_range(sub, cache["until"], cutoff)
        if not new and not cache["posts"]:
            raise LookupError("no posts")
        known = {p["id"] for p in cache["posts"]}
        cache["posts"] += [p for p in new if p["id"] not in known]
        cache["until"] = cutoff
    else:
        print(f"    r/{sub}: up to date ({len(cache['posts']):,} posts cached)")
    cache["posts"] = [p for p in cache["posts"] if p["t"] >= now - YEAR - 7 * 86400]
    path.write_text(json.dumps(cache))
    if token:
        recent = [p for p in cache["posts"] if now - YEAR <= p["t"] < cutoff]
        reddit_check(sub, recent, token, lambda: path.write_text(json.dumps(cache)))
    return [p for p in cache["posts"] if now - YEAR <= p["t"] < cutoff]


def demo_posts(sub, now):
    """A made-up year of posts with a US-centred daily rhythm, so the report can be previewed offline."""
    rng = random.Random(sub.lower())
    per_day = rng.choice([2, 8, 15, 30, 60])
    second_peak = rng.choice([0, 1, 2, 3, 20, 21, 22])

    def activity(h):
        return 0.2 + 0.8 * max(0.0, math.cos((h - 17) / 24 * 2 * math.pi))

    def bonus(h, wd):
        b = 0.6 if 11 <= h <= 14 else 0.0
        if min(abs(h - second_peak), 24 - abs(h - second_peak)) <= 1:
            b += 0.4
        return b + (0.2 if wd >= 5 else 0.0)

    posts = []
    while len(posts) < per_day * 365:
        t = now - SETTLE_HOURS * 3600 - rng.uniform(0, YEAR - SETTLE_HOURS * 3600)
        dt = datetime.fromtimestamp(t, timezone.utc)
        if rng.random() > activity(dt.hour):
            continue
        score = int(rng.lognormvariate(1.4 + bonus(dt.hour, dt.weekday()), 1.3))
        if rng.random() < 0.3:
            score = rng.choice([0, 1])   # removed or spam
        posts.append({"id": f"d{len(posts)}", "t": t, "score": score, "comments": score // 4, "mod": False})
    return posts


# ---------------------------------------------------------------- analysis

def percentile(sorted_vals, q):
    i = (len(sorted_vals) - 1) * q
    lo, hi = math.floor(i), math.ceil(i)
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * (i - lo)


def parse_awake(spec):
    try:
        a, b = (int(x) % 24 for x in spec.split("-"))
    except ValueError:
        sys.exit("--awake should look like 08-01 (up at 08:00, in bed by 01:00).")
    span = (b - a) % 24 or 24
    return {(a + i) % 24 for i in range(span)}  # hours you can post at and still have an hour online


def usable(p):
    """Leave out removed posts and mod posts. Without Reddit's word on removals, leave out posts that
    got no reaction: removed and spam posts almost always sit at 1 point with no comments or just
    the automod one."""
    if p["mod"]:
        return False
    if p.get("checked"):
        return not p["removed"]
    return p["score"] >= 2 or p["comments"] >= 2


def analyse(sub, posts, tz, allowed):
    kept = [p for p in posts if usable(p)]
    if len(kept) < 50:
        return {"sub": sub, "error": f"Only {len(kept)} usable posts in the past year, too few to analyse."}

    scores = sorted(p["score"] for p in kept)
    strong_at = max(percentile(scores, 0.75), 1)
    top_at = max(percentile(scores, 0.95), strong_at)
    rows = []
    for p in kept:
        dt = datetime.fromtimestamp(p["t"], tz)
        rows.append((dt.weekday(), dt.hour, p["score"], p["score"] >= strong_at, p["score"] >= top_at))
    n = len(rows)
    base_strong = sum(r[3] for r in rows) / n
    base_top = sum(r[4] for r in rows) / n

    def stats(match):
        sel = [r for r in rows if match(r[0], r[1])]
        v, s, t = len(sel), sum(r[3] for r in sel), sum(r[4] for r in sel)
        strong_lift = (s + PRIOR * base_strong) / (v + PRIOR) / base_strong
        top_lift = (t + PRIOR * base_top) / (v + PRIOR) / base_top
        # how far the strong-post count sits above chance, in standard deviations
        z = (s - v * base_strong) / math.sqrt(v * base_strong * (1 - base_strong)) if v and base_strong < 1 else 0
        return {"posts": v, "strong": s, "top": t, "strong_lift": strong_lift, "top_lift": top_lift,
                "lift": math.sqrt(strong_lift * top_lift), "z": z,
                "median": statistics.median([r[2] for r in sel]) if sel else None}

    grid = []
    for d in range(7):
        row = []
        for b in range(24 // BLOCK):
            s = b * BLOCK
            c = stats(lambda dd, hh, d=d, s=s: dd == d and s <= hh < s + BLOCK)
            c.update(day=d, start=s, end=(s + BLOCK) % 24)
            row.append(c)
        grid.append(row)
    hours = [{**stats(lambda dd, hh, h=h: hh == h), "hour": h} for h in range(24)]
    days = [{**stats(lambda dd, hh, d=d: dd == d), "day": d} for d in range(7)]

    candidates = []
    for c in (c for row in grid for c in row):
        post_hours = [h % 24 for h in range(c["start"], c["start"] + BLOCK) if h % 24 in allowed]
        if c["posts"] >= MIN_POSTS and post_hours:
            # within the block, the hour you're awake for that does best across the week
            best = max(post_hours, key=lambda h: hours[h]["lift"])
            candidates.append({**c, "post_at": best})
    candidates.sort(key=lambda c: c["lift"], reverse=True)
    eligible = [c for row in grid for c in row if c["posts"] >= MIN_POSTS]
    span = (max(p["t"] for p in kept) - min(p["t"] for p in kept)) / 86400

    return {
        "sub": sub, "grid": grid, "hours": hours, "days": days, "scores": scores,
        "candidates": candidates, "picks": candidates[:3],
        "weakest": min(eligible, key=lambda c: c["lift"]) if eligible else None,
        "best_day": max(days, key=lambda d: d["lift"]),
        "n": n, "n_all": len(posts), "per_day": len(posts) / max(span, 1),
        "checked": sum(1 for p in posts if p.get("checked")) / len(posts),
        "strong_at": strong_at, "top_at": top_at, "span_days": span,
    }


def rate_my_posts(mine, results, tz, now):
    """How each of your posts did against its subreddit, and whether good slots are paying off."""
    by_sub = {r["sub"].lower(): r for r in results if "error" not in r}
    times_sorted = sorted(p["t"] for p in mine)
    rated = []
    for p in sorted(mine, key=lambda p: p["t"], reverse=True):
        r = by_sub.get(p["sub"].lower())
        dt = datetime.fromtimestamp(p["t"], tz)
        slot = None
        if r:
            c = r["grid"][dt.weekday()][dt.hour // BLOCK]
            slot = c["lift"] if c["posts"] >= MIN_POSTS else None
        if now - p["t"] < SETTLE_HOURS * 3600:
            status = "settling"
        elif p["mod"]:
            status = "mod post"
        elif p.get("checked") and p["removed"]:
            status = "removed"
        elif not p.get("checked") and p["score"] < 2 and p["comments"] < 2:
            status = "no reaction"
        else:
            status = "ok"
        beat = None
        if r and status == "ok":
            sc = r["scores"]
            below = bisect.bisect_left(sc, p["score"])
            ties = bisect.bisect_right(sc, p["score"]) - below
            beat = (below + ties / 2) / len(sc)
        i = bisect.bisect_left(times_sorted, p["t"])
        gaps = [abs(times_sorted[j] - p["t"]) for j in (i - 1, i + 1) if 0 <= j < len(times_sorted)]
        close = min(gaps) / 60 if gaps and min(gaps) < CLOSE_MINUTES * 60 else None
        rated.append({**p, "dt": dt, "slot": slot, "status": status, "beat": beat, "close": close,
                      "older": p["t"] < now - YEAR})

    # the heatmaps describe the past year, so only posts from that year count towards the comparison
    scored = [p for p in rated if p["beat"] is not None and p["slot"] is not None and not p["older"]]
    good = [p["beat"] for p in scored if p["slot"] >= GOOD_SLOT]
    other = [p["beat"] for p in scored if p["slot"] < GOOD_SLOT]
    return {
        "posts": rated,
        "good": good, "other": other,
        "no_reaction": sum(p["status"] in ("no reaction", "removed") for p in rated),
        "close": sum(p["close"] is not None for p in rated),
        "ready": len(good) >= COMPARE_MIN and len(other) >= COMPARE_MIN,
    }


def evidence(c):
    if c["z"] >= 2.5:
        return "solid"
    if c["z"] >= 1.5:
        return "fair"
    return "thin"


def build_rota(results):
    """One subreddit a day for a week, each at its best time on a day not already taken."""
    def evening(c):   # a post just after midnight belongs to the night before
        return (c["day"] - 1) % 7 if c["post_at"] < 6 else c["day"]

    rota, used = [], set()
    # busiest subs choose first: the more posts competing, the more timing matters
    for r in sorted((r for r in results if "error" not in r), key=lambda r: -r["per_day"]):
        if not r["candidates"]:
            continue
        pick = next((c for c in r["candidates"] if evening(c) not in used), r["candidates"][0])
        used.add(evening(pick))
        rota.append({"sub": r["sub"], **pick})
    return sorted(rota, key=lambda c: (evening(c), (c["post_at"] - 6) % 24))


# ---------------------------------------------------------------- output

def hhmm(h):
    return f"{h % 24:02d}:00"


def when(c, short=False):
    """'Saturday 13:00', with a reminder that a post just after midnight belongs to the night before."""
    names = DAYS if short else DAY_NAMES
    text = f"{names[c['day']]} {hhmm(c['post_at'])}"
    if c["post_at"] < 6:
        text += f" ({DAYS[(c['day'] - 1) % 7]} night)"
    return text


def block_label(c):
    return f"{DAYS[c['day']]} {hhmm(c['start'])}-{hhmm(c['end'])}"


def times(x):
    return f"{x:.1f}×"


def print_summary(r):
    print(f"\n  r/{r['sub']}")
    if "error" in r:
        print(f"    {r['error']}")
        return
    print(f"    {r['n']:,} usable posts over {r['span_days']:.0f} days (about {r['per_day']:.0f} a day)")
    for i, c in enumerate(r["picks"], 1):
        print(f"    {i}. {when(c)}: {c['lift']:.2f}x average, "
              f"from {c['posts']} posts ({evidence(c)} evidence)")
    if r["weakest"]:
        print(f"    Weakest: {block_label(r['weakest'])} ({r['weakest']['lift']:.2f}x)")


def slot_word(lift):
    if lift is None:
        return "unrated"
    return "good" if lift >= GOOD_SLOT else "weak" if lift <= 0.85 else "average"


def comparison_text(m):
    if not m["ready"]:
        n = len(m["good"]) + len(m["other"])
        return (f"Too early to compare good slots with the rest: {n} scored posts in the past year, and it needs "
                f"at least {COMPARE_MIN} in each group ({len(m['good'])} in good slots, "
                f"{len(m['other'])} elsewhere).")
    g, o = statistics.mean(m["good"]), statistics.mean(m["other"])
    return (f"Posts in good slots beat {g:.0%} of their subreddit's posts on average, against {o:.0%} "
            f"for posts at other times ({len(m['good'])} and {len(m['other'])} posts).")


def print_my_posts(m, user):
    print(f"\nYour posts (u/{user})")
    if not m["posts"]:
        print("    None found in these subreddits.")
        return
    for p in m["posts"][:15]:
        result = f"beat {p['beat']:.0%}" if p["beat"] is not None else p["status"]
        print(f"    {p['dt'].strftime('%a %d %b %Y %H:%M')}  r/{p['sub']:<22} {slot_word(p['slot']):<8} "
              f"{p['score']:>4} pts  {result}")
    if len(m["posts"]) > 15:
        print(f"    ... and {len(m['posts']) - 15} more in the report")
    print(f"    {comparison_text(m)}")


def write_my_csv(m, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["posted_uk", "subreddit", "title", "score", "comments", "older_than_a_year", "slot_lift", "status",
                    "beat_share", "minutes_from_nearest_post", "link"])
        for p in m["posts"]:
            w.writerow([p["dt"].strftime("%Y-%m-%d %H:%M"), p["sub"], p["title"], p["score"], p["comments"],
                        "yes" if p["older"] else "",
                        f"{p['slot']:.2f}" if p["slot"] is not None else "", p["status"],
                        f"{p['beat']:.3f}" if p["beat"] is not None else "",
                        f"{p['close']:.0f}" if p["close"] is not None else "",
                        f"https://www.reddit.com/r/{p['sub']}/comments/{p['id']}/"])


def my_posts_html(m, user):
    if m is None:
        return ""
    if not m["posts"]:
        return (f'<section class="mine"><h3>Your posts</h3><p class="note">No posts by u/{html.escape(user)} '
                f'in these subreddits.</p></section>')
    rows = []
    for p in m["posts"]:
        title = p["title"] if len(p["title"]) <= 70 else p["title"][:67].rstrip() + "..."
        link = f"https://www.reddit.com/r/{p['sub']}/comments/{p['id']}/"
        if p["beat"] is not None:
            result = f'<span class="beat">beat {p["beat"]:.0%}</span>'
        else:
            result = f'<span class="flag flag-{p["status"].replace(" ", "-")}">{p["status"]}</span>'
        close = (f'<span class="close">{p["close"]:.0f} min from another post</span>'
                 if p["close"] is not None else "")
        slot = slot_word(p["slot"])
        rows.append(
            ('<tr class="older">' if p["older"] else "<tr>") + f'<td class="w">{p["dt"].strftime("%a %d %b")}<br>'
            f'{p["dt"].strftime("%Y" if p["older"] else "%H:%M")}'
            + (f'<br>{p["dt"].strftime("%H:%M")}' if p["older"] else "") + '</td>'
            f'<td><a href="{html.escape(link)}">{html.escape(title)}</a>'
            f'<span class="where">r/{html.escape(p["sub"])} &middot; {p["score"]} pts &middot; '
            f'{p["comments"]} comments</span>{close}</td>'
            f'<td class="s s-{slot}">{slot}'
            + (f'<br>{times(p["slot"])}' if p["slot"] is not None else "")
            + f'</td><td class="r">{result}</td></tr>'
        )
    flags = []
    if m["no_reaction"]:
        flags.append(f'{m["no_reaction"]} got no reaction at all. That usually means a mod or Reddit\'s '
                     f'filters removed them: open them while logged out to check, and read the sub\'s rules.')
    if m["close"]:
        flags.append(f'{m["close"]} went up within {CLOSE_MINUTES} minutes of another of your posts. '
                     f'Spacing them out (the rota above) is less likely to trip spam filters.')
    flag_html = "".join(f'<p class="advice">{html.escape(f)}</p>' for f in flags)
    return f"""
<section class="mine">
  <h3>Your posts</h3>
  <p class="note">Everything u/{html.escape(user)} has posted in these subreddits. "Beat" is the share of
  that subreddit's posts from the past year your post scored higher than. The slot is how good that time has
  been in the heatmap. Posts over a year old are shaded: they're measured against this year's posts, and
  they're left out of the comparison below.</p>
  {flag_html}
  <p class="compare">{html.escape(comparison_text(m))}</p>
  <div class="scroll"><table class="myposts"><thead><tr><th>Posted</th><th>Post</th><th>Slot</th><th>Result</th></tr></thead>
  <tbody>{"".join(rows)}</tbody></table></div>
</section>"""


def write_csv(results, path):
    with open(path, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["subreddit", "view", "day", "start_uk", "end_uk", "posts", "strong_posts", "top_posts",
                    "strong_lift", "top_lift", "combined_lift", "z", "median_score"])
        for r in results:
            if "error" in r:
                continue
            for c in (c for row in r["grid"] for c in row):
                w.writerow([r["sub"], "block", DAYS[c["day"]], hhmm(c["start"]), hhmm(c["end"]), c["posts"],
                            c["strong"], c["top"], f"{c['strong_lift']:.3f}", f"{c['top_lift']:.3f}",
                            f"{c['lift']:.3f}", f"{c['z']:.2f}", c["median"]])
            for c in r["hours"]:
                w.writerow([r["sub"], "hour", "all", hhmm(c["hour"]), hhmm(c["hour"] + 1), c["posts"],
                            c["strong"], c["top"], f"{c['strong_lift']:.3f}", f"{c['top_lift']:.3f}",
                            f"{c['lift']:.3f}", f"{c['z']:.2f}", c["median"]])


def heat(lift):
    """Position on the colour scale: -100 (half as good) .. 0 (average) .. 100 (twice as good)."""
    return round(max(-1.0, min(1.0, math.log2(max(lift, 1e-6)))) * 100)


def cell(c, label):
    tip = (f"{label}: {c['posts']} posts, {c['strong']} strong, {c['top']} in the top 5%. "
           f"{c['lift']:.2f} times average.")
    if c["posts"] < MIN_POSTS:
        return f'<td class="thin" title="{html.escape(tip)} Too few posts to judge.">&middot;</td>'
    x = heat(c["lift"])
    cls = "hot" if x >= 0 else "cold"
    deep = " deep" if abs(x) >= 55 else ""
    return (f'<td class="{cls}{deep}" style="--k:{abs(x)}%" title="{html.escape(tip)}">'
            f'{c["lift"]:.1f}</td>')


def section_html(r):
    sub = html.escape(r["sub"])
    anchor = sub.lower()
    if "error" in r:
        return (f'<section class="sub" id="{anchor}"><h2>r/{sub}</h2>'
                f'<p class="note">{html.escape(r["error"])}</p></section>')
    quiet = r["per_day"] < QUIET_PER_DAY
    picks = "".join(
        f'<li><span class="when">{when(c)}</span>'
        f'<span class="lift">{times(c["lift"])}</span>'
        f'<span class="ev ev-{evidence(c)}">{evidence(c)}</span>'
        f'<span class="from">{c["posts"]} posts in {hhmm(c["start"])}&ndash;{hhmm(c["end"])}</span></li>'
        for c in r["picks"]
    ) or '<li class="none">No time has enough posts yet to recommend.</li>'
    advice = ""
    if quiet:
        advice = (f'<p class="advice">Only about {r["per_day"]:.0f} posts a day go up here, so a new post '
                  f'stays near the top for a day or more whatever time it goes up. Timing matters much '
                  f'less than in the busy subs.</p>')
    elif r["picks"] and r["picks"][0]["lift"] < 1.2:
        advice = ('<p class="advice">No time stands out much here. Post when you can be around to reply.</p>')
    weakest = ""
    if r["weakest"]:
        wk = r["weakest"]
        weakest = (f'<p class="note">Avoid {DAY_NAMES[wk["day"]]} {hhmm(wk["start"])}&ndash;'
                   f'{hhmm(wk["end"])} ({times(wk["lift"])} average).</p>')
    head = "".join(f"<th>{b * BLOCK:02d}</th>" for b in range(24 // BLOCK))
    body = "".join(
        f"<tr><th>{DAYS[d]}</th>" + "".join(cell(c, block_label(c)) for c in r["grid"][d]) + "</tr>"
        for d in range(7)
    )
    strip = "".join(cell(c, f"{hhmm(c['hour'])} any day") for c in r["hours"])
    hour_labels = "".join(f"<td>{h:02d}</td>" if h % 3 == 0 else "<td></td>" for h in range(24))
    return f"""
<section class="sub" id="{anchor}">
  <header class="sub-head">
    <h2>r/{sub}</h2>
    <p class="file">{r['n']:,} posts &middot; ~{r['per_day']:.0f}/day &middot; strong = {r['strong_at']:.0f}+ upvotes</p>
  </header>
  {advice}
  <ol class="picks">{picks}</ol>
  {weakest}
  <div class="scroll"><table class="heat"><thead><tr><th></th>{head}</tr></thead><tbody>{body}</tbody></table></div>
  <p class="caption">Each block is three hours from the time shown. By hour, any day:</p>
  <div class="scroll"><table class="strip"><tbody><tr>{strip}</tr><tr class="labels">{hour_labels}</tr></tbody></table></div>
</section>"""


CSS = """
:root {
  --paper:#efe8dc; --card:#f7f0e4; --ink:#1a1918; --ink-2:#3b352e; --muted:#6f6557;
  --rule:#2b2723; --rule-soft:#b8ab98; --blood:#8b1e19; --cold:#4e6274; --mid:#e2d9c8;
  --on-deep:#fbf6ee; --ok:#3f6b3a; --warn:#8a6414;
  --f-type:'Special Elite','Courier Prime','Courier New',monospace;
  --f-mono:'Courier Prime','Courier New',Courier,monospace;
  --f-serif:'Libre Baskerville',Georgia,'Times New Roman',serif;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    color-scheme:dark;
    --paper:#181614; --card:#211e1b; --ink:#ede5d8; --ink-2:#d2c8b8; --muted:#a39885;
    --rule:#cfc4b2; --rule-soft:#4a433a; --blood:#d0574c; --cold:#7f9bb3; --mid:#2c2824;
    --on-deep:#14110f; --ok:#8fbf86; --warn:#d9ad55;
  }
}
:root[data-theme="dark"] {
  color-scheme:dark;
  --paper:#181614; --card:#211e1b; --ink:#ede5d8; --ink-2:#d2c8b8; --muted:#a39885;
  --rule:#cfc4b2; --rule-soft:#4a433a; --blood:#d0574c; --cold:#7f9bb3; --mid:#2c2824;
  --on-deep:#14110f; --ok:#8fbf86; --warn:#d9ad55;
}
* { box-sizing:border-box; }
body { margin:0; background:var(--paper); color:var(--ink); font:16px/1.6 var(--f-serif); }
main { max-width:780px; margin:0 auto; padding-block:40px 72px; padding-inline:18px; display:grid; gap:36px;
  grid-template-columns:minmax(0, 1fr); }
main > *, .sub > * { min-width:0; }
h1, h2, h3 { font-family:var(--f-type); font-weight:400; text-transform:uppercase; line-height:1.1; text-wrap:balance; margin:0; }
h1 { font-size:clamp(30px, 6vw, 46px); }
h2 { font-size:22px; letter-spacing:.04em; }
h3 { font-size:15px; letter-spacing:.12em; }
a { color:var(--ink); text-underline-offset:3px; }
a:focus-visible { outline:2px solid var(--blood); outline-offset:2px; }
.stamp { font-family:var(--f-mono); font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:var(--blood); margin:0 0 10px; }
.lede { max-width:62ch; color:var(--ink-2); margin:12px 0 0; }
.meta { font-family:var(--f-mono); font-size:12.5px; color:var(--muted); margin:10px 0 0; }
.warning { border:1px solid var(--blood); color:var(--blood); padding:10px 14px; font-family:var(--f-mono); font-size:13px; margin:0; }
.panel { background:var(--card); border:1px solid var(--rule); padding:18px 18px 8px; }
.panel h3 { border-bottom:1px solid var(--rule); padding-bottom:8px; margin-bottom:4px; }
.panel p.note { margin:10px 0 8px; }
.rota { width:100%; border-collapse:collapse; font-family:var(--f-mono); font-size:14px; font-variant-numeric:tabular-nums; }
.rota td { padding:9px 10px 9px 0; border-bottom:1px dashed var(--rule-soft); vertical-align:baseline; }
.rota tr:last-child td { border-bottom:0; }
.rota td.d { font-family:var(--f-type); text-transform:uppercase; letter-spacing:.06em; width:7.5em; }
.rota td.t { width:4.5em; font-weight:700; }
.rota .night { font-weight:400; font-size:11px; color:var(--muted); white-space:nowrap; }
.rota td.x { text-align:right; color:var(--muted); white-space:nowrap; }
.glance { width:100%; border-collapse:collapse; font-family:var(--f-mono); font-size:13.5px; font-variant-numeric:tabular-nums; }
.glance th { text-align:left; font-weight:400; font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; color:var(--muted); padding:0 10px 6px 0; }
.glance td { padding:7px 10px 7px 0; border-top:1px dashed var(--rule-soft); }
.legend { display:flex; align-items:center; gap:10px; font-family:var(--f-mono); font-size:12px; color:var(--muted); }
.legend .bar { flex:1; height:10px; border:1px solid var(--rule-soft);
  background:linear-gradient(90deg, var(--cold), var(--mid), var(--blood)); }
.sub { border-top:2px solid var(--rule); padding-top:20px; display:grid; gap:14px; grid-template-columns:minmax(0, 1fr); }
.sub-head { display:flex; flex-wrap:wrap; align-items:baseline; justify-content:space-between; gap:4px 16px; }
.file { font-family:var(--f-mono); font-size:12px; color:var(--muted); margin:0; }
.advice { margin:0; padding:10px 14px; background:var(--card); border-left:3px solid var(--warn); font-size:15px; max-width:66ch; }
.note { color:var(--muted); margin:0; font-size:14.5px; }
.picks { list-style:none; margin:0; padding:0; display:grid; gap:6px; counter-reset:pick; }
.picks li { display:grid; grid-template-columns:auto 1fr auto auto; align-items:baseline; gap:4px 12px;
  font-family:var(--f-mono); font-size:14px; font-variant-numeric:tabular-nums; counter-increment:pick; }
.picks li::before { content:counter(pick) "."; color:var(--muted); }
.picks .when { font-weight:700; }
.picks .lift { color:var(--blood); font-weight:700; }
.picks .from { grid-column:2 / -1; color:var(--muted); font-size:12.5px; }
.picks .none::before { content:none; }
.ev { font-size:11px; letter-spacing:.1em; text-transform:uppercase; padding:1px 7px; border:1px solid currentColor; }
.ev-solid { color:var(--ok); } .ev-fair { color:var(--warn); } .ev-thin { color:var(--muted); }
.scroll { overflow-x:auto; }
table.heat, table.strip { border-collapse:separate; border-spacing:3px; font-family:var(--f-mono); }
table.heat { width:100%; min-width:330px; font-size:12.5px; }
table.heat th { font-weight:400; color:var(--muted); padding:2px 0; font-size:11.5px; }
table.heat thead th { text-align:left; padding-left:4px; }
table.heat tbody th { text-align:left; width:2.8em; font-family:var(--f-type); text-transform:uppercase; }
table.heat td { text-align:center; height:32px; font-variant-numeric:tabular-nums; color:var(--ink); }
td.hot { background:color-mix(in oklab, var(--blood) var(--k), var(--mid)); }
td.cold { background:color-mix(in oklab, var(--cold) var(--k), var(--mid)); }
td.deep { color:var(--on-deep); }
td.thin { background:transparent; color:var(--muted); border:1px dashed var(--rule-soft); }
table.strip { min-width:300px; width:100%; table-layout:fixed; }
table.strip td { height:22px; font-size:0; }
table.strip td.thin { font-size:0; }
table.strip tr.labels td { height:auto; font-size:11px; white-space:nowrap; overflow:visible; color:var(--muted); background:none; border:0; }
.caption { margin:0; font-family:var(--f-mono); font-size:12px; color:var(--muted); }
footer { border-top:2px solid var(--rule); padding-top:18px; color:var(--ink-2); font-size:14.5px; display:grid; gap:10px; }
footer p { max-width:66ch; margin:0; }
footer code { font-family:var(--f-mono); font-size:13px; background:var(--card); padding:1px 5px; white-space:nowrap; }
.mine { display:grid; gap:12px; }
.mine h3 { border-bottom:1px solid var(--rule); padding-bottom:8px; }
.compare { margin:0; font-family:var(--f-mono); font-size:13px; color:var(--ink-2); }
.myposts { width:100%; min-width:520px; border-collapse:collapse; font-size:14px; }
.myposts th { text-align:left; font-weight:400; font-family:var(--f-mono); font-size:11.5px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--muted); padding:0 10px 6px 0; }
.myposts td { padding:9px 10px 9px 0; border-top:1px dashed var(--rule-soft); vertical-align:top; }
.myposts td.w, .myposts td.s, .myposts td.r { font-family:var(--f-mono); font-size:12.5px; white-space:nowrap;
  font-variant-numeric:tabular-nums; }
.myposts a { display:block; line-height:1.4; }
.myposts .where, .myposts .close { display:block; font-family:var(--f-mono); font-size:11.5px; color:var(--muted); margin-top:3px; }
.myposts .close { color:var(--warn); }
.s-good { color:var(--ok); } .s-weak { color:var(--blood); } .s-average, .s-unrated { color:var(--muted); }
.beat { font-weight:700; }
.myposts tr.older td { background:var(--card); }
.flag { font-size:11px; letter-spacing:.08em; text-transform:uppercase; padding:1px 6px; border:1px solid currentColor; }
.flag-no-reaction, .flag-removed { color:var(--blood); }
.flag-settling, .flag-mod-post { color:var(--muted); }
@media (max-width:520px) {
  .picks li { grid-template-columns:auto 1fr auto; }
  .picks .ev { grid-column:2; justify-self:start; }
  .rota td.x { display:none; }
}
"""


def page_html(results, tz_name, awake, demo, mine=None, user=MY_USER):
    rota = build_rota(results)
    rota_rows = "".join(
        f'<tr><td class="d">{DAY_NAMES[c["day"]]}</td><td class="t">{hhmm(c["post_at"])}'
        + (f'<br><span class="night">{DAYS[(c["day"] - 1) % 7]} night</span>' if c["post_at"] < 6 else "")
        + '</td>'
        f'<td><a href="#{html.escape(c["sub"].lower())}">r/{html.escape(c["sub"])}</a></td>'
        f'<td class="x">{times(c["lift"])} &middot; {evidence(c)}</td></tr>'
        for c in rota
    )
    glance = "".join(
        f'<tr><td><a href="#{html.escape(r["sub"].lower())}">r/{html.escape(r["sub"])}</a></td>'
        + ("".join(f"<td>{when(c, short=True)}</td>" for c in r["picks"][:2])
           + "<td></td>" * (2 - len(r["picks"][:2]))
           if "error" not in r and r["picks"] else '<td colspan="2">Not enough data</td>')
        + "</tr>"
        for r in results
    )
    sections = "".join(section_html(r) for r in results)
    ok = [r for r in results if "error" not in r]
    checked = bool(ok) and all(r["checked"] > 0.9 for r in ok)
    if checked:
        removal_note = "posts Reddit says were removed."
        source_note = ("Posts come from the Arctic Shift Reddit archive; scores and removals were checked "
                       "with Reddit.")
    else:
        removal_note = ("posts that got no reaction at all (a point or less and at most one comment), "
                        "which are nearly always posts a mod or Reddit's spam filter removed.")
        source_note = "Data comes from the Arctic Shift Reddit archive."
    generated = datetime.now(ZoneInfo(tz_name)).strftime("%d %B %Y, %H:%M")
    title = "Reddit Posting Times" + (" (demo)" if demo else "")
    demo_note = ('<p class="warning">Demo data. These numbers are made up. Run the script without --demo '
                 'for the real ones.</p>') if demo else ""
    return f"""<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&family=Libre+Baskerville:ital@0;1&display=swap" rel="stylesheet">
<style>{CSS}</style></head><body><main>
<header>
  <p class="stamp">The Paranormal Pad &middot; Field notes</p>
  <h1>{title}</h1>
  <p class="lede">When a post on each subreddit is most likely to do well, in UK clock time. A number
  like {times(1.4)} means a post at that time has done 1.4 times as well as an average post in the same
  subreddit. Only times you can post at and stay online for an hour are recommended (awake {html.escape(awake)}).</p>
  <p class="meta">{html.escape(tz_name)} &middot; past 12 months &middot; generated {generated}</p>
</header>
{demo_note}
<section class="panel">
  <h3>A week's rota for one report</h3>
  <p class="note">One subreddit a day, each at its best time on a free day, so a report never goes
  out everywhere at once. Skip the subs a report doesn't suit.</p>
  <div class="scroll"><table class="rota"><tbody>{rota_rows}</tbody></table></div>
</section>
<section>
  <div class="scroll"><table class="glance"><thead><tr><th>Subreddit</th><th>Best</th><th>Runner-up</th></tr></thead>
  <tbody>{glance}</tbody></table></div>
</section>
{my_posts_html(mine, user)}
<div class="legend"><span>Weaker</span><span class="bar"></span><span>Stronger</span></div>
{sections}
<footer>
<h3>How it's worked out</h3>
<p>Every post from the past year, leaving out anything under 48 hours old and {removal_note} A post
counts as strong if it reached the subreddit's top quarter of scores, and as a top post if it reached the
top 5%. Each time slot is scored on how often its posts did either, compared with the subreddit's
average, so busy hours don't win just by having more posts. Slots with few posts are pulled towards
average, and those with under {MIN_POSTS} posts are dotted and never recommended.</p>
<p>Evidence shows how unlikely a result is to be luck: solid is well clear of chance, fair is probably
real, thin could be noise. {source_note}</p>
<p>This shows which times have worked, not a guarantee. A strong story still beats good timing. Rerun it
every few months, and watch "Your posts" to see whether the good slots are paying off for you.</p>
<h3>Rerun it</h3>
<p>In Terminal: <code>cd ~/projects/the-paranormal-pad</code> then <code>python3 tools/reddit_timing.py</code>.
Add <code>--awake 09-02</code> to change your hours (up at 09:00, in bed by 02:00),
<code>--subs Paranormal Ghosts Experiencers</code> to check particular subs (a new sub's first run downloads
its whole year, so it can take a while), or <code>--demo</code> for a preview with made-up data.
Full notes are in PUBLISHING.md under "Posting to Reddit".</p>
</footer>
</main></body></html>"""


# ---------------------------------------------------------------- main

def main():
    ap = argparse.ArgumentParser(description="Find the best UK times to post to each subreddit.")
    ap.add_argument("--subs", nargs="+", default=DEFAULT_SUBS, help="subreddit names, without r/")
    ap.add_argument("--demo", action="store_true", help="use made-up data to preview the report")
    ap.add_argument("--refresh", action="store_true", help="download everything again")
    ap.add_argument("--awake", default="08-01", help="hours you're up, e.g. 08-01 (default)")
    ap.add_argument("--tz", default="Europe/London", help="timezone for the report")
    ap.add_argument("--out", default=str(OUT_DEFAULT), help="folder for the report and data")
    ap.add_argument("--no-open", action="store_true", help="don't open the report when done")
    ap.add_argument("--no-reddit", action="store_true", help="don't check posts with Reddit")
    ap.add_argument("--user", default=MY_USER, help="whose posts to track (default MattJowen)")
    args = ap.parse_args()

    try:
        tz = ZoneInfo(args.tz)
    except ZoneInfoNotFoundError:
        sys.exit(f"Unknown timezone {args.tz}. On Windows, run `pip install tzdata` first.")
    allowed = parse_awake(args.awake)
    out = Path(args.out)
    cache = out / "cache"
    cache.mkdir(parents=True, exist_ok=True)
    now = time.time()
    token = None if args.demo or args.no_reddit else reddit_token(out)

    results, demo_mine = [], []
    for sub in args.subs:
        sub = sub.removeprefix("r/").strip("/")
        print(f"\nr/{sub}")
        if args.demo:
            posts = demo_posts(sub, now)
            rng = random.Random(sub)
            demo_mine += [{**p, "sub": sub, "title": f"Demo post {i + 1} in r/{sub}"}
                          for i, p in enumerate(rng.sample(posts, 3))]
        else:
            try:
                posts = load_posts(sub, cache, now, args.refresh, token)
            except LookupError:
                results.append({"sub": sub, "error": "No posts found. Check the spelling."})
                continue
        results.append(analyse(sub, posts, tz, allowed))

    print("\nBest times (UK)")
    for r in results:
        print_summary(r)

    if args.demo:
        mine_raw = demo_mine
    else:
        print(f"\nLooking up u/{args.user}'s posts")
        mine_raw = load_my_posts(args.user, [r["sub"] for r in results])
        if token and mine_raw:
            reddit_check("your posts", mine_raw, token, lambda: None)
    mine = rate_my_posts(mine_raw, results, tz, now)
    print_my_posts(mine, args.user)
    write_my_csv(mine, out / "reddit_timing_my_posts.csv")
    report = out / "reddit_timing_report.html"
    write_csv(results, out / "reddit_timing_data.csv")
    report.write_text(page_html(results, args.tz, args.awake, args.demo, mine, args.user), encoding="utf-8")
    print(f"\nReport: {report.resolve()}")
    print(f"Data:   {(out / 'reddit_timing_data.csv').resolve()}")
    if not args.no_open:
        webbrowser.open(report.resolve().as_uri())


if __name__ == "__main__":
    main()
