-- Add issue_type column to bugs table
ALTER TABLE bugs ADD COLUMN IF NOT EXISTS issue_type text DEFAULT 'bug'
  CHECK (issue_type IN ('epic', 'story', 'task', 'bug', 'subtask'));

-- Invite tokens for project invite links
CREATE TABLE IF NOT EXISTS invite_tokens (
  id          uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  token       text      UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  project_id  uuid      REFERENCES projects(id) ON DELETE CASCADE,
  role        text      NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_by  uuid      REFERENCES profiles(id),
  uses        integer   NOT NULL DEFAULT 0,
  max_uses    integer   DEFAULT NULL,
  expires_at  timestamptz DEFAULT NULL,
  created_at  timestamptz DEFAULT now()
);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read invite tokens"
  ON invite_tokens FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert invite tokens"
  ON invite_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Token creator can update their tokens"
  ON invite_tokens FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by);
