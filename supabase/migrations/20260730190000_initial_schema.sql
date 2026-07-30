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
