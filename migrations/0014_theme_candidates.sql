-- Official-announcement signals are intentionally kept separate from the
-- public taxonomy. An administrator must approve a candidate before it
-- creates a public theme or any public stock-to-theme link.
create table if not exists theme_candidates (
  id integer primary key autoincrement,
  candidate_key text not null unique,
  theme_name text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  confidence_score real not null default 0,
  first_seen_at text not null,
  last_seen_at text not null,
  source_count integer not null default 0,
  stock_count integer not null default 0,
  source text not null,
  evidence_url text,
  rationale text,
  approved_theme_id integer,
  reviewed_by text,
  reviewed_at text,
  review_note text,
  created_at text not null,
  updated_at text not null
);

create table if not exists theme_candidate_evidence (
  id integer primary key autoincrement,
  candidate_id integer not null references theme_candidates(id) on delete cascade,
  stock_code text not null,
  stock_name text,
  announcement_date text not null,
  headline text not null,
  body_excerpt text,
  matched_keywords text,
  source_url text not null,
  source_key text not null unique,
  created_at text not null
);

create index if not exists idx_theme_candidates_status_updated
  on theme_candidates(status, updated_at desc, id desc);

create index if not exists idx_theme_candidate_evidence_candidate
  on theme_candidate_evidence(candidate_id, announcement_date desc, id desc);
