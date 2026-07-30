# Personal Side-Income Discovery & Tracker — Build Plan (v2)

**Scope:** A personal-use tool (just for you, no other users, no billing). Three components: a **Discovery Agent** that finds legit opportunities, a **Tracker** that logs what you've earned, and a **Semi-Auto Setup Assistant** that speeds up signing up — with you clicking every "submit" button yourself.

---

## 1. Architecture at a glance

| Piece | Tool | Why |
|---|---|---|
| Backend / cron jobs | Cloudflare Workers | Same stack you already use for SnipeJob — no new hosting to learn |
| Database | Supabase (Postgres) | Simple tables, free tier is plenty for single-user data |
| AI research | Claude or Gemini API + web search tool | Either works; the architecture doesn't lock you to one vendor |
| Frontend | A lightweight dashboard (React or plain HTML on Cloudflare Pages) | Just for you, so keep it simple — no auth system beyond a basic password gate |
| Daily digest | Email (Resend/SendGrid) or a Telegram bot | Cheaper to check a Telegram message than to open a dashboard every day |
| Inbound email parsing | Cloudflare Email Routing → Worker | Catches "you've been paid" emails without a full mail client integration |

No Paystack in this build — with no other users paying you, there's nothing for it to collect. NOWPayments only shows up later, and only on the *cash-out* side (see §5).

---

## 2. Discovery Agent

**Trigger:** Cloudflare Cron Trigger, once a day (e.g. 6 AM WAT).

### System prompt (sent every run)
```
You are a research assistant finding legitimate online income opportunities
for a Nigeria-based user. Search the web for survey sites, GPT (get-paid-to)
platforms, affiliate programs, and microtask/testing platforms that currently
accept Nigerian users.

For each one, verify before including it:
1. It has a real track record of paying out (not just claiming to).
2. It does not require any upfront payment to join.
3. It lists at least one payout method usable from Nigeria (Payoneer,
   cryptocurrency, direct bank transfer, or gift card — NOT PayPal-receive-only,
   since PayPal is send-only for most Nigerian accounts).

Return ONLY a JSON array, no other text, no markdown fences, in this exact shape:
[
  {
    "name": string,
    "category": "surveys" | "watch_to_earn" | "microtasks" | "website_testing" | "affiliate" | "other",
    "payout_methods": string[],
    "payout_threshold_usd": number | null,
    "signup_url": string,
    "red_flags": string[]
  }
]

Omit anything you are not reasonably confident is currently active and
Nigeria-eligible. An empty array is a valid, correct response if nothing
new qualifies.
```

### User prompt (built from your profile row each run)
```
Find new or currently active opportunities in these categories:
{categories}.

Prioritize platforms with payout methods in {preferred_payout_methods}
and a payout threshold at or below ${min_acceptable_payout_usd * 5}.
```

### Worker cron handler (illustrative)
```js
export default {
  async scheduled(event, env, ctx) {
    const profile = await getProfile(env.SUPABASE);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        system: DISCOVERY_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildUserPrompt(profile) }],
        tools: [{ type: "web_search_20250305", name: "web_search" }],
      }),
    });

    const data = await res.json();
    const text = data.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    const opportunities = JSON.parse(text.replace(/```json|```/g, "").trim());

    await upsertOpportunities(env.SUPABASE, opportunities); // upsert on (name, category)
    await sendDigest(env, opportunities.filter((o) => o.isNew));
  },
};
```

**Dedup rule:** upsert on `(name, category)` — if a platform already exists, update `last_seen_at` and any changed fields (payout method, threshold) instead of inserting a duplicate.

---

## 3. Tracker Dashboard

### Supabase schema (SQL)
```sql
-- Single-row config, editable anytime
create table profile (
  id serial primary key,
  daily_time_budget_minutes int not null default 30,
  min_acceptable_payout_usd numeric(10,2) not null default 3.00,
  preferred_payout_methods text[] not null default array['payoneer','crypto','bank_transfer'],
  categories text[] not null default array['surveys','watch_to_earn','microtasks','website_testing','affiliate'],
  updated_at timestamptz default now()
);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in
    ('surveys','watch_to_earn','microtasks','website_testing','affiliate','other')),
  payout_methods text[] not null,
  payout_threshold_usd numeric(10,2),
  signup_url text,
  red_flags text[],
  status text not null default 'new' check (status in ('new','reviewed','rejected','approved')),
  first_seen_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique (name, category)
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id),
  status text not null default 'pending_setup' check (status in
    ('pending_setup','active','banned','abandoned')),
  signup_email text,
  notes text,
  created_at timestamptz default now()
);

create table earnings (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id),
  amount numeric(10,2) not null,
  currency text not null default 'USD',
  status text not null default 'pending' check (status in ('pending','paid')),
  payout_method text,
  earned_at timestamptz default now(),
  paid_at timestamptz,
  source text default 'manual' check (source in ('manual','email_parsed'))
);

create index idx_earnings_account on earnings(account_id);
create index idx_opportunities_status on opportunities(status);
```

### Dashboard views
- **Overview** — `sum(amount)` from `earnings` grouped by `status`, joined to `accounts` → `opportunities` for a per-platform breakdown, with a rough NGN conversion applied client-side.
- **Threshold tracker** — for each active account, `sum(pending earnings)` vs. its `opportunities.payout_threshold_usd`, rendered as a progress bar.
- **Quick-log form** — two fields (amount, account), a couple seconds to fill after any session.

**Stretch goal:** a browser bookmarklet that POSTs `{account_id, amount}` to a Worker endpoint, so you can log an earning without leaving the platform's tab.

---

## 4. Semi-Auto Setup Assistant

When you approve a new opportunity from the digest, the Worker sends this to the model:

```
Given this opportunity:
  name: {name}
  category: {category}
  payout_methods: {payout_methods}
  signup_url: {signup_url}

Produce:
1. A 3-bullet summary of likely eligibility/KYC requirements for a
   Nigeria-based signup.
2. Draft profile text (display name, short bio) based on this stored
   profile: {profile_json} — for the human to copy in, not to submit.
3. Any known submission quirks (e.g. "requires phone verification",
   "flags VPN usage", "asks for a referral code").

Do not attempt to access or submit the signup form. Output only the
summary and draft text for human review.
```

The draft gets attached to that row in `accounts` (status `pending_setup`) for you to review and submit yourself — keeping a real human click at registration, which matters because most platforms check for human behavior at signup too.

---

## 5. Money tracking (the realistic version of "automate the payout")

- **Neither Paystack nor NOWPayments can pull money out of a survey or affiliate site into your account** — payouts come from the platform itself, via Payoneer, crypto, bank transfer, or gift card.
- **Email parser (the real automation win):** point a Cloudflare Email Routing address at a Worker. On each inbound "you've been paid" email:
  1. Match the sender domain against known platforms in `opportunities`.
  2. Extract amount + currency with a quick regex first; fall back to a small AI call only if the regex misses (keeps cost near zero).
  3. Insert into `earnings` with `source = 'email_parsed'`, `status = 'paid'`.
  4. Flag anything it can't confidently parse for manual review instead of guessing.
- **NOWPayments' actual role:** only on withdrawal — if a platform pays you in crypto (Timebucks and a few others do), use it (or a Nigerian exchange) to convert to NGN when you want to cash out.
- **Paystack:** no role here — skip it for this build.

---

## 6. Build phases

**Phase 1 — Week 1: Foundations**
- Create Supabase project, run the schema above
- Seed `opportunities` manually with confirmed Nigeria-friendly platforms (ySense, Timebucks, SurveyLama, Toluna, Prolific, etc.)
- Set up your `profile` row

**Phase 2 — Week 2: Discovery Agent**
- Cloudflare Worker with the cron trigger
- Wire up the system/user prompts above, test JSON parsing against a few manual runs before trusting the cron
- Build the upsert + dedup logic

**Phase 3 — Week 3: Dashboard**
- Overview, threshold tracker, quick-log form
- Basic password gate (no need for full auth for a single user)

**Phase 4 — Week 4: Setup Assistant + Digest**
- Wire the semi-auto setup prompt to the "approve opportunity" action
- Daily digest via email or Telegram bot

**Phase 5 — Ongoing**
- Email-parser auto-logging
- Tune the discovery prompt as you see which "finds" turn out to be low quality
- Browser bookmarklet for quick-logging, if you want it

---

## 7. Guardrails to bake in from day one

- The agent **finds and drafts** — it never auto-submits signups or auto-completes tasks.
- Red-flag rubric for the discovery prompt to reject automatically: requires payment to join; no verifiable payout history; payout threshold implausibly high (>$50) for a new/unknown platform; heavy "get rich quick" language.
- Review `accounts` monthly — mark anything inactive 90+ days as `abandoned` so the dashboard stays honest about what's actually live.
- Track your own weekly "hit rate" — how many discovered opportunities were actually worth pursuing — and use it to refine the discovery prompt over time.
