BEGIN;

-- Create profiles table for Clerk user data storage
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY, -- Clerk user ID (string, not UUID)
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Browser clients access data only through the authenticated backend.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Backfill missing columns for existing installs
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Live transcript chunks persisted from meeting sessions
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  transcript_id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL,
  user_id TEXT,
  speaker_name TEXT,
  transcript_text TEXT NOT NULL,
  source TEXT DEFAULT 'browser-stt',
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Backfill missing columns for existing installs
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS transcript_id TEXT;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS meeting_id TEXT;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS speaker_name TEXT;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS transcript_text TEXT;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'browser-stt';
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE meeting_transcripts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Ensure primary key exists on transcript_id for upsert support
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'meeting_transcripts_pkey'
  ) THEN
    ALTER TABLE meeting_transcripts ADD PRIMARY KEY (transcript_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting_id_updated_at
  ON meeting_transcripts (meeting_id, updated_at);

DROP TRIGGER IF EXISTS update_meeting_transcripts_updated_at ON meeting_transcripts;

CREATE TRIGGER update_meeting_transcripts_updated_at
  BEFORE UPDATE ON meeting_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE meeting_transcripts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS meeting_members (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (meeting_id, user_id)
);
CREATE TABLE IF NOT EXISTS meeting_insights (
  meeting_id TEXT PRIMARY KEY REFERENCES meetings(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS meeting_chats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Older installations used an identity primary key on insights.
CREATE UNIQUE INDEX IF NOT EXISTS idx_meeting_insights_meeting_unique ON meeting_insights(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_chats_meeting_created ON meeting_chats(meeting_id, created_at);
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_chats ENABLE ROW LEVEL SECURITY;

-- Preserve legacy rows while scoping all new writes to meeting + verified author.
UPDATE meeting_transcripts SET user_id = 'legacy-unclaimed' WHERE user_id IS NULL;
UPDATE meeting_transcripts SET transcript_id = 'legacy-' || gen_random_uuid()::TEXT WHERE transcript_id IS NULL;
-- Preserve repeated legacy chunks with distinct IDs before adding the scoped key.
WITH ranked AS (
  SELECT ctid, row_number() OVER (
    PARTITION BY meeting_id, user_id, transcript_id
    ORDER BY updated_at DESC NULLS LAST, ctid DESC
  ) AS occurrence FROM meeting_transcripts
)
UPDATE meeting_transcripts AS transcript
SET transcript_id = 'legacy-' || gen_random_uuid()::TEXT
FROM ranked WHERE transcript.ctid = ranked.ctid AND ranked.occurrence > 1;
ALTER TABLE meeting_transcripts ALTER COLUMN user_id SET NOT NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meeting_transcripts'::regclass
      AND conname = 'meeting_transcripts_pkey'
      AND array_length(conkey, 1) = 1
  ) THEN
    ALTER TABLE meeting_transcripts DROP CONSTRAINT meeting_transcripts_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.meeting_transcripts'::regclass AND contype = 'p'
  ) THEN
    ALTER TABLE meeting_transcripts ADD PRIMARY KEY (meeting_id, user_id, transcript_id);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_transcript_cursor ON meeting_transcripts(meeting_id, updated_at, user_id, transcript_id);

-- Stable keyset pagination handles chunks that share a timestamp without skipping rows.
CREATE OR REPLACE FUNCTION read_meeting_transcripts(
  p_meeting_id TEXT,
  p_since TIMESTAMPTZ DEFAULT NULL,
  p_after_user TEXT DEFAULT '',
  p_after_id TEXT DEFAULT '',
  p_limit INTEGER DEFAULT 200
) RETURNS SETOF meeting_transcripts
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT * FROM meeting_transcripts
  WHERE meeting_id = p_meeting_id
    AND (p_since IS NULL OR (updated_at, user_id, transcript_id) > (p_since, p_after_user, p_after_id))
  ORDER BY updated_at, user_id, transcript_id
  LIMIT LEAST(GREATEST(p_limit, 1), 2000);
$$;

-- No permissive browser policies: the service_role backend enforces identity and membership.
REVOKE ALL ON profiles, meeting_transcripts, meetings, meeting_members, meeting_insights, meeting_chats FROM PUBLIC, anon, authenticated;
GRANT ALL ON profiles, meeting_transcripts, meetings, meeting_members, meeting_insights, meeting_chats TO service_role;
GRANT USAGE, SELECT ON SEQUENCE meeting_chats_id_seq TO service_role;
REVOKE ALL ON FUNCTION read_meeting_transcripts(TEXT, TIMESTAMPTZ, TEXT, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION read_meeting_transcripts(TEXT, TIMESTAMPTZ, TEXT, TEXT, INTEGER) TO service_role;

-- Keep the retired singular chat table private without deleting its history.
DO $$
DECLARE legacy_sequence TEXT;
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    ALTER FUNCTION public.handle_new_user() SET search_path = pg_catalog, public;
    REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regclass('public.meeting_chat') IS NOT NULL THEN
    ALTER TABLE public.meeting_chat ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.meeting_chat FROM PUBLIC, anon, authenticated;
    GRANT ALL ON public.meeting_chat TO service_role;
  END IF;
  FOR legacy_sequence IN
    SELECT pg_get_serial_sequence(attrelid::regclass::TEXT, attname)
    FROM pg_attribute
    WHERE attrelid IN ('public.meeting_transcripts'::regclass, 'public.meeting_insights'::regclass)
      AND attname = 'id' AND NOT attisdropped
  LOOP
    IF legacy_sequence IS NOT NULL THEN
      EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE %s TO service_role', legacy_sequence);
    END IF;
  END LOOP;
END $$;


COMMIT;
