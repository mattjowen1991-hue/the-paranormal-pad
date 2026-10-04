# Running The Paranormal Pad — day-to-day guide

The site: **https://theparanormalpad.com** · Moderation desk: **https://theparanormalpad.com/#moderate**

What happens when people get in touch, and what you need to do. (For writing and publishing reports and tapes, see [PUBLISHING.md](PUBLISHING.md).)

There are **two different things** readers can send you, and they work differently:

| | **Contact form** (the "Pssst…" page) | **Witness statements** (comments under a report or tape) |
|---|---|---|
| What it's for | Someone sending you their own story | Someone reacting to a report or tape |
| Where it goes | Emailed to theparanormalpad@gmail.com **and** saved on the moderation desk (Incident submissions tab) | Saved on the site, **hidden** until you approve it |
| Email you get | "New incident submission - *place*" | "New witness statement on Report 008: …" |
| Shows on the public website? | Never - only you can see it on the desk | Only after you approve it |
| How you answer | Hit **Reply** in Gmail (or **Reply by email** on the desk) - it goes to them | Approve it on the moderation desk, with a reply if you like |

**In short: contact form = an email conversation, tracked on the desk. Comments = approve them on the moderation desk.**

---

## 1. Contact form submissions

1. An email arrives in **theparanormalpad@gmail.com** titled **"New incident submission — …"**.
   It contains their name, email, where it happened, and their story.
2. If it says **"Keep identity confidential: YES — do not publish their name"**, don't use their real name if you write it up.
3. Hit **Reply** - it goes straight to the person who wrote in.
4. A copy is also on the **moderation desk → Incident submissions** tab (only you can see it). There you can:
   - **Reply by email** (opens your email app addressed to them),
   - **Mark replied**, **Turned into a report** or **Archive** - it moves from *New* to *Handled*
     (**Move back to New** undoes it),
   - keep a **private note** ("Replied 4 Oct, waiting for photos") and **Save note**,
   - **Delete** it for good.
   If an email ever goes missing or into spam, the desk still has it.
5. Nothing appears on the public website. If you turn their story into an Incident Report, write it up as a new report (PUBLISHING.md).

If these emails ever land in spam, mark one as **Not spam**.

## 2. Witness statements (comments)

1. Someone files a statement under a report or tape. It's saved but **hidden**.
2. You get an alert email titled **"New witness statement on …"** with their comment and two links.
   (Replying to this email does **not** reach them — it comes from the form service, and commenters don't give an email address.)
3. Open the **moderation desk**:
   - type the **secret word** into the site's *Search files* box — or go to `…/#moderate`
   - enter the **PIN**
   - **Sign in with Google** as **theparanormalpad@gmail.com** (your personal account no longer works here)
   - The secret word and PIN are in the private repo: **github.com/mattjowen1991-hue/the-paranormal-pad-notes**
4. The desk has two tabs: **Witness statements** and **Incident submissions** (see section 1). Under
   **Witness statements → Awaiting review**, for each statement:
   - **Approve** — it appears under the report.
   - Type in the reply box first to **Approve with reply** — your reply shows under theirs as *"The Reporter replies:"*.
   - **Delete** → **Yes, delete** — for spam or anything you don't want.
5. Under **On the file** (already approved) you can **Add / Update / Remove reply**, **Hide** it again (back to Awaiting review), or **Delete** it.

Once you've entered the PIN you won't be asked again until you close the browser.

---

## Services behind the site

| What | Service | Where to manage it |
|---|---|---|
| The website | GitHub Pages | github.com/mattjowen1991-hue/the-paranormal-pad → Settings → Pages |
| Comments + moderator sign-in | Google Firebase (free plan) | console.firebase.google.com → *the-paranormal-pad* |
| Contact form + comment alert emails | Web3Forms (free: 250 emails/month) | web3forms.com (signed in as theparanormalpad@gmail.com) |
| Tape videos | YouTube (each narrator's channel) | — |
| Domain (theparanormalpad.com) | WordPress.com — domain only, auto-renews every October (next: Oct 2027) | wordpress.com → Domains (don't change its DNS records unless moving the site) |

## If something stops working

- **Comments won't load or save:** check the Firebase console for warnings, and that the Firestore **Rules** still match `firestore.rules`.
- **Can't sign in to the moderation desk:** in Firebase → Authentication → Settings → **Authorized domains**, make sure the site's current address is listed.
- **No emails arriving:** check spam first, then web3forms.com for your form's submission log and monthly limit.
- **Changes don't show on your phone:** bump the `?v=` numbers in `index.html` (README → "After changing CSS or JavaScript").
