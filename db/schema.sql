CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handle text NOT NULL UNIQUE,
  display_name text NOT NULL,
  avatar_url text,
  github_url text,
  x_url text,
  bio text,
  verified_links jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid REFERENCES creators(id),
  source text NOT NULL UNIQUE,
  url text NOT NULL,
  description text,
  stars integer NOT NULL DEFAULT 0,
  default_branch text,
  last_public_push timestamptz,
  is_public boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skills (
  id text PRIMARY KEY,
  slug text NOT NULL,
  name text NOT NULL,
  source text NOT NULL,
  repository_id uuid REFERENCES repositories(id),
  description text NOT NULL DEFAULT '',
  installs integer NOT NULL DEFAULT 0,
  runtime text[] NOT NULL DEFAULT '{}',
  models text[] NOT NULL DEFAULT '{}',
  tools text[] NOT NULL DEFAULT '{}',
  permissions text[] NOT NULL DEFAULT '{}',
  risk_level text NOT NULL DEFAULT 'unknown',
  source_url text NOT NULL,
  install_url text,
  current_hash text,
  current_content text,
  audit_status text NOT NULL DEFAULT 'unknown',
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS skills_search_idx
  ON skills USING gin (to_tsvector('english', name || ' ' || description || ' ' || source));

CREATE TABLE IF NOT EXISTS revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id text NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  content_hash text NOT NULL,
  previous_hash text,
  summary text NOT NULL,
  diff text NOT NULL DEFAULT '',
  source_url text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(skill_id, content_hash)
);

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id text NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  provider text NOT NULL,
  status text NOT NULL,
  risk_level text,
  summary text NOT NULL,
  audited_at timestamptz,
  raw jsonb NOT NULL DEFAULT '{}',
  UNIQUE(skill_id, provider)
);

CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  source_url text NOT NULL UNIQUE,
  creator_handle text,
  repository_source text,
  skill_id text REFERENCES skills(id),
  verification_status text NOT NULL DEFAULT 'unverified',
  buzz_score integer NOT NULL DEFAULT 0,
  published_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curator_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  external_user_id text NOT NULL,
  encrypted_access_token text NOT NULL,
  encrypted_refresh_token text,
  expires_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS curator_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  external_id text NOT NULL,
  source_url text NOT NULL,
  original_text text NOT NULL,
  author_handle text,
  resolved_links jsonb NOT NULL DEFAULT '[]',
  status text NOT NULL DEFAULT 'pending',
  decision_note text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  UNIQUE(provider, external_id)
);

CREATE TABLE IF NOT EXISTS sync_state (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_limits (
  key_hash text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS share_cards (
  id text PRIMARY KEY,
  skill_id text NOT NULL REFERENCES skills(id),
  verdict text NOT NULL,
  explanation text NOT NULL,
  public_reasons jsonb NOT NULL DEFAULT '[]',
  source_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
