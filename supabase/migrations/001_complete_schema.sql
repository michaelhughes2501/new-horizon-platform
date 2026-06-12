-- ================================================================
-- NEW HORIZON — COMPLETE DATABASE SCHEMA
-- Version: 2.0.0  |  Updated: 2025
-- ================================================================
-- HOW TO USE:
--   1. Create a new Supabase project at https://app.supabase.com
--   2. Go to SQL Editor → New Query
--   3. Paste this entire file and click Run
--   4. Done. All tables, policies, triggers, and seed data are set up.
-- ================================================================

-- ════════════════════════════════════════════════════════════════
-- SECTION 1 — EXTENSIONS
-- ════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";        -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";          -- Password hashing
CREATE EXTENSION IF NOT EXISTS "pg_cron";           -- Scheduled jobs
CREATE EXTENSION IF NOT EXISTS "pg_trgm";           -- Full-text search

-- ════════════════════════════════════════════════════════════════
-- SECTION 2 — CUSTOM TYPES (ENUMS)
-- ════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE offense_type AS ENUM (
    'non-violent', 'violent', 'drug', 'financial', 'prefer_not_to_say'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'member', 'moderator', 'admin', 'super_admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM (
    'match', 'message', 'job', 'resource', 'system', 'security', 'admin'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE job_type AS ENUM (
    'full-time', 'part-time', 'contract', 'temporary'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'pending', 'reviewing', 'resolved', 'dismissed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE connection_status AS ENUM (
    'pending', 'accepted', 'blocked'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'submitted', 'viewed', 'shortlisted', 'rejected', 'hired'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ════════════════════════════════════════════════════════════════
-- SECTION 3 — PROFILES TABLE
-- Primary user table, extends Supabase auth.users
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS profiles (
  -- Identity
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT UNIQUE NOT NULL,
  name             TEXT NOT NULL CHECK (LENGTH(TRIM(name)) BETWEEN 2 AND 60),
  avatar_initials  TEXT GENERATED ALWAYS AS (
    UPPER(
      LEFT(SPLIT_PART(TRIM(name), ' ', 1), 1) ||
      COALESCE(NULLIF(LEFT(SPLIT_PART(TRIM(name), ' ', 2), 1), ''), '')
    )
  ) STORED,

  -- Demographics (private fields — controlled by RLS)
  age              SMALLINT CHECK (age BETWEEN 18 AND 99),
  state            TEXT CHECK (state IN (
    'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID',
    'IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS',
    'MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK',
    'OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV',
    'WI','WY','DC','Other'
  )),
  phone_hash       TEXT,  -- SHA-256 hash only — plaintext never stored

  -- Public profile fields
  bio              TEXT CHECK (LENGTH(bio) <= 500),
  offense_type     offense_type NOT NULL DEFAULT 'prefer_not_to_say',
  release_year     SMALLINT CHECK (
    release_year BETWEEN 1970 AND EXTRACT(YEAR FROM NOW() + INTERVAL '10 years')::INT
  ),
  interests        TEXT[] NOT NULL DEFAULT '{}',

  -- Account status
  role             user_role NOT NULL DEFAULT 'member',
  is_verified      BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned        BOOLEAN NOT NULL DEFAULT FALSE,
  ban_reason       TEXT,
  ban_expires_at   TIMESTAMPTZ,  -- NULL = permanent ban

  -- Profile completion score (auto-calculated)
  profile_complete SMALLINT NOT NULL DEFAULT 0 CHECK (profile_complete BETWEEN 0 AND 100),

  -- Security tracking
  login_attempts   SMALLINT NOT NULL DEFAULT 0,
  locked_until     TIMESTAMPTZ,
  last_login       TIMESTAMPTZ,
  last_seen        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Timestamps
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_profiles_state
  ON profiles(state) WHERE is_banned = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_last_seen
  ON profiles(last_seen DESC) WHERE is_banned = FALSE;

CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_role
  ON profiles(role) WHERE is_banned = FALSE;

-- Full-text search on name and bio
CREATE INDEX IF NOT EXISTS idx_profiles_search
  ON profiles USING gin(to_tsvector('english', name || ' ' || COALESCE(bio, '')));

-- ── Trigger: Auto-calculate profile completion % ──────────────
CREATE OR REPLACE FUNCTION fn_calculate_profile_complete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE score INT := 0;
BEGIN
  IF NEW.name IS NOT NULL AND TRIM(NEW.name) != ''    THEN score := score + 20; END IF;
  IF NEW.age IS NOT NULL                               THEN score := score + 20; END IF;
  IF NEW.state IS NOT NULL                             THEN score := score + 20; END IF;
  IF NEW.bio IS NOT NULL AND TRIM(NEW.bio) != ''       THEN score := score + 20; END IF;
  IF array_length(NEW.interests, 1) > 0               THEN score := score + 20; END IF;
  NEW.profile_complete := score;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profile_complete ON profiles;
CREATE TRIGGER trg_profile_complete
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_calculate_profile_complete();

-- ── Trigger: Auto-create profile on auth.users insert ─────────
CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      SPLIT_PART(NEW.email, '@', 1)
    )
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- ── Trigger: Auto-lock after 5 failed logins ─────────────────
CREATE OR REPLACE FUNCTION fn_auto_lock_account()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.login_attempts >= 5 AND OLD.login_attempts < 5 THEN
    NEW.locked_until := NOW() + INTERVAL '15 minutes';
    INSERT INTO security_events (user_id, event_type, severity, details)
    VALUES (NEW.id, 'ACCOUNT_LOCKED', 'critical',
      jsonb_build_object('login_attempts', NEW.login_attempts));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_lock ON profiles;
CREATE TRIGGER trg_auto_lock
  BEFORE UPDATE OF login_attempts ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_auto_lock_account();

-- ── Trigger: Prevent privilege escalation ────────────────────
CREATE OR REPLACE FUNCTION fn_prevent_escalation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Prevent self-role changes (must use change_user_role() function)
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Permission denied: role changes require super_admin.';
    END IF;
  END IF;
  -- Prevent self-unbanning
  IF OLD.is_banned = TRUE AND NEW.is_banned = FALSE THEN
    IF NOT EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    ) AND auth.uid() = NEW.id THEN
      RAISE EXCEPTION 'Permission denied: cannot unban your own account.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_escalation ON profiles;
CREATE TRIGGER trg_prevent_escalation
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_prevent_escalation();

-- ════════════════════════════════════════════════════════════════
-- SECTION 4 — CONNECTIONS & PROFILE LIKES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS connections (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status       connection_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT connections_no_self CHECK (requester_id <> recipient_id),
  CONSTRAINT connections_unique  UNIQUE (
    LEAST(requester_id::TEXT, recipient_id::TEXT),
    GREATEST(requester_id::TEXT, recipient_id::TEXT)
  )
);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON connections(requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_recipient ON connections(recipient_id);
CREATE INDEX IF NOT EXISTS idx_connections_status    ON connections(status);

-- ── Profile Likes ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profile_likes (
  liker_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  liked_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (liker_id, liked_id),
  CONSTRAINT likes_no_self CHECK (liker_id <> liked_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_likes_liked ON profile_likes(liked_id);

-- ── Trigger: Auto-connect on mutual like ─────────────────────
CREATE OR REPLACE FUNCTION fn_handle_mutual_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_liker_name  TEXT;
  v_liked_name  TEXT;
BEGIN
  SELECT name INTO v_liker_name FROM profiles WHERE id = NEW.liker_id;
  SELECT name INTO v_liked_name FROM profiles WHERE id = NEW.liked_id;

  -- Check for mutual like
  IF EXISTS (
    SELECT 1 FROM profile_likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) THEN
    -- Create connection (ignore if already exists)
    INSERT INTO connections (requester_id, recipient_id, status)
    VALUES (NEW.liker_id, NEW.liked_id, 'accepted')
    ON CONFLICT DO NOTHING;

    -- Notify both users of the match
    INSERT INTO notifications (user_id, type, title, body, data)
    VALUES
      (NEW.liker_id, 'match', 'It''s a Match! 🎉',
       'You and ' || v_liked_name || ' liked each other!',
       jsonb_build_object('matched_user_id', NEW.liked_id)),
      (NEW.liked_id, 'match', 'It''s a Match! 🎉',
       'You and ' || v_liker_name || ' liked each other!',
       jsonb_build_object('matched_user_id', NEW.liker_id));
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mutual_like ON profile_likes;
CREATE TRIGGER trg_mutual_like
  AFTER INSERT ON profile_likes
  FOR EACH ROW EXECUTE FUNCTION fn_handle_mutual_like();

-- ════════════════════════════════════════════════════════════════
-- SECTION 5 — CONVERSATIONS & MESSAGES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS conversations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message    TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count_p1 INT NOT NULL DEFAULT 0,
  unread_count_p2 INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT conversations_no_self CHECK (participant1_id <> participant2_id),
  CONSTRAINT conversations_unique  UNIQUE (
    LEAST(participant1_id::TEXT, participant2_id::TEXT),
    GREATEST(participant1_id::TEXT, participant2_id::TEXT)
  )
);

CREATE INDEX IF NOT EXISTS idx_conversations_p1 ON conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_p2 ON conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- ── Messages ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (
    LENGTH(TRIM(body)) > 0 AND LENGTH(body) <= 2000
  ),
  body_hash       TEXT,        -- SHA-256 for deduplication audit
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted      BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged      BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at ASC)
  WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_messages_sender
  ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages(conversation_id)
  WHERE is_read = FALSE AND is_deleted = FALSE;

-- ── Trigger: Update conversation on new message ───────────────
CREATE OR REPLACE FUNCTION fn_update_conversation_on_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_recipient_id  UUID;
  v_sender_name   TEXT;
BEGIN
  -- Get the other participant
  SELECT
    CASE
      WHEN participant1_id = NEW.sender_id THEN participant2_id
      ELSE participant1_id
    END INTO v_recipient_id
  FROM conversations WHERE id = NEW.conversation_id;

  SELECT name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Update conversation preview
  UPDATE conversations
  SET
    last_message    = LEFT(NEW.body, 100),
    last_message_at = NEW.created_at,
    updated_at      = NEW.created_at,
    unread_count_p1 = CASE
      WHEN participant1_id = v_recipient_id THEN unread_count_p1 + 1
      ELSE unread_count_p1
    END,
    unread_count_p2 = CASE
      WHEN participant2_id = v_recipient_id THEN unread_count_p2 + 1
      ELSE unread_count_p2
    END
  WHERE id = NEW.conversation_id;

  -- Notify recipient
  INSERT INTO notifications (user_id, type, title, body, data)
  VALUES (
    v_recipient_id,
    'message',
    'New Message from ' || v_sender_name,
    LEFT(NEW.body, 80),
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'sender_id',       NEW.sender_id,
      'sender_name',     v_sender_name
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_message_insert ON messages;
CREATE TRIGGER trg_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION fn_update_conversation_on_message();

-- ════════════════════════════════════════════════════════════════
-- SECTION 6 — JOBS & APPLICATIONS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS jobs (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title          TEXT NOT NULL CHECK (LENGTH(TRIM(title)) BETWEEN 2 AND 100),
  company        TEXT NOT NULL CHECK (LENGTH(TRIM(company)) BETWEEN 2 AND 100),
  logo_emoji     TEXT NOT NULL DEFAULT '💼',
  location       TEXT NOT NULL,
  state          TEXT,  -- NULL = remote/nationwide
  job_type       job_type NOT NULL DEFAULT 'full-time',
  wage_min       NUMERIC(8, 2),
  wage_max       NUMERIC(8, 2),
  wage_display   TEXT,  -- e.g. "$18–$21/hr"
  description    TEXT CHECK (LENGTH(description) <= 1000),
  requirements   TEXT[],
  tags           TEXT[] NOT NULL DEFAULT '{}',
  felony_friendly BOOLEAN NOT NULL DEFAULT TRUE,
  ban_the_box    BOOLEAN NOT NULL DEFAULT FALSE,
  apply_url      TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  posted_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  views_count    INT NOT NULL DEFAULT 0,
  applications_count INT NOT NULL DEFAULT 0,
  posted_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '60 days',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_state   ON jobs(state)    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_type    ON jobs(job_type) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_active  ON jobs(posted_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_btb     ON jobs(ban_the_box)    WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_jobs_search
  ON jobs USING gin(to_tsvector('english', title || ' ' || company || ' ' || COALESCE(description, '')));

-- ── Job Applications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id       UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  cover_text   TEXT CHECK (LENGTH(cover_text) <= 1000),
  phone        TEXT,
  status       application_status NOT NULL DEFAULT 'submitted',
  notes        TEXT,  -- internal recruiter notes
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT job_applications_unique UNIQUE (job_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_job_applications_user   ON job_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_job    ON job_applications(job_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);

-- ── Trigger: Increment job application count ──────────────────
CREATE OR REPLACE FUNCTION fn_increment_job_applications()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE jobs SET applications_count = applications_count + 1 WHERE id = NEW.job_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_application_count ON job_applications;
CREATE TRIGGER trg_job_application_count
  AFTER INSERT ON job_applications
  FOR EACH ROW EXECUTE FUNCTION fn_increment_job_applications();

-- ── Saved Jobs ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_jobs (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id     UUID NOT NULL REFERENCES jobs(id)     ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_jobs_user ON saved_jobs(user_id);

-- ════════════════════════════════════════════════════════════════
-- SECTION 7 — BLOG POSTS, COMMENTS & LIKES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS blog_posts (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL CHECK (LENGTH(TRIM(title)) BETWEEN 5 AND 200),
  slug         TEXT UNIQUE,  -- URL-friendly identifier
  body         TEXT NOT NULL CHECK (LENGTH(body) BETWEEN 10 AND 20000),
  excerpt      TEXT CHECK (LENGTH(excerpt) <= 300),
  category     TEXT NOT NULL DEFAULT 'Story' CHECK (
    category IN ('Story', 'Legal', 'Jobs', 'Mental Health', 'Business', 'Resource')
  ),
  emoji_icon   TEXT NOT NULL DEFAULT '✍️',
  read_time    SMALLINT NOT NULL DEFAULT 5 CHECK (read_time BETWEEN 1 AND 60),
  likes_count  INT NOT NULL DEFAULT 0,
  views_count  INT NOT NULL DEFAULT 0,
  comments_count INT NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_featured  BOOLEAN NOT NULL DEFAULT FALSE,
  is_flagged   BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blog_published
  ON blog_posts(published_at DESC) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_category
  ON blog_posts(category)          WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_featured
  ON blog_posts(published_at DESC) WHERE is_featured = TRUE AND is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_blog_search
  ON blog_posts USING gin(to_tsvector('english', title || ' ' || COALESCE(excerpt, '')));

-- ── Trigger: Auto-set published_at ───────────────────────────
CREATE OR REPLACE FUNCTION fn_blog_publish()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published = TRUE AND OLD.is_published = FALSE THEN
    NEW.published_at := NOW();
  END IF;
  IF NEW.is_published = FALSE THEN
    NEW.published_at := NULL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_publish ON blog_posts;
CREATE TRIGGER trg_blog_publish
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION fn_blog_publish();

-- ── Trigger: Auto-generate slug from title ───────────────────
CREATE OR REPLACE FUNCTION fn_blog_slug()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_slug TEXT;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    v_slug := LOWER(REGEXP_REPLACE(TRIM(NEW.title), '[^a-zA-Z0-9\s]', '', 'g'));
    v_slug := REGEXP_REPLACE(v_slug, '\s+', '-', 'g');
    v_slug := LEFT(v_slug, 80);
    -- Append short UUID segment to ensure uniqueness
    v_slug := v_slug || '-' || LEFT(uuid_generate_v4()::TEXT, 8);
    NEW.slug := v_slug;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_blog_slug ON blog_posts;
CREATE TRIGGER trg_blog_slug
  BEFORE INSERT ON blog_posts
  FOR EACH ROW EXECUTE FUNCTION fn_blog_slug();

-- ── Blog Comments ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id)   ON DELETE CASCADE,
  body       TEXT NOT NULL CHECK (LENGTH(TRIM(body)) BETWEEN 1 AND 1000),
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  flag_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_post
  ON blog_comments(post_id, created_at ASC)
  WHERE is_flagged = FALSE;

-- ── Trigger: Update comments_count on post ───────────────────
CREATE OR REPLACE FUNCTION fn_update_comments_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_comments_count ON blog_comments;
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE ON blog_comments
  FOR EACH ROW EXECUTE FUNCTION fn_update_comments_count();

-- ── Blog Likes ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blog_likes (
  user_id    UUID NOT NULL REFERENCES profiles(id)    ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES blog_posts(id)  ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_blog_likes_post ON blog_likes(post_id);

-- ── Trigger: Update likes_count on post ──────────────────────
CREATE OR REPLACE FUNCTION fn_update_likes_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE blog_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE blog_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_likes_count ON blog_likes;
CREATE TRIGGER trg_likes_count
  AFTER INSERT OR DELETE ON blog_likes
  FOR EACH ROW EXECUTE FUNCTION fn_update_likes_count();

-- ════════════════════════════════════════════════════════════════
-- SECTION 8 — RESOURCES
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL CHECK (LENGTH(TRIM(name)) BETWEEN 3 AND 200),
  category    TEXT NOT NULL CHECK (
    category IN ('parole', 'mental', 'housing', 'education', 'employment', 'legal')
  ),
  description TEXT CHECK (LENGTH(description) <= 500),
  url         TEXT,
  phone       TEXT,
  state       TEXT,  -- NULL = national
  is_urgent   BOOLEAN NOT NULL DEFAULT FALSE,
  icon_emoji  TEXT NOT NULL DEFAULT '🔗',
  badge_label TEXT,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_resources_category
  ON resources(category, sort_order ASC)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_state
  ON resources(state) WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_resources_urgent
  ON resources(category) WHERE is_urgent = TRUE AND is_active = TRUE;

-- ════════════════════════════════════════════════════════════════
-- SECTION 9 — NOTIFICATIONS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  title      TEXT NOT NULL CHECK (LENGTH(TRIM(title)) BETWEEN 1 AND 100),
  body       TEXT NOT NULL CHECK (LENGTH(body) BETWEEN 1 AND 500),
  data       JSONB NOT NULL DEFAULT '{}',
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  sent_push  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread
  ON notifications(user_id, created_at DESC)
  WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_notif_user_all
  ON notifications(user_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- SECTION 10 — PUSH TOKENS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  platform   TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user
  ON push_tokens(user_id) WHERE is_active = TRUE;

-- ════════════════════════════════════════════════════════════════
-- SECTION 11 — REPORTS
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reports (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user   UUID REFERENCES profiles(id)    ON DELETE SET NULL,
  reported_post   UUID REFERENCES blog_posts(id)  ON DELETE SET NULL,
  reported_msg    UUID REFERENCES messages(id)    ON DELETE SET NULL,
  reason          TEXT NOT NULL CHECK (LENGTH(TRIM(reason)) BETWEEN 5 AND 500),
  details         TEXT CHECK (LENGTH(details) <= 1000),
  status          report_status NOT NULL DEFAULT 'pending',
  reviewed_by     UUID REFERENCES profiles(id)    ON DELETE SET NULL,
  resolution      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,

  CONSTRAINT reports_has_target CHECK (
    reported_user IS NOT NULL OR
    reported_post IS NOT NULL OR
    reported_msg  IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_reports_status   ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);

-- ════════════════════════════════════════════════════════════════
-- SECTION 12 — SENTENCE CALCULATIONS (AUDIT LOG)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sentence_calculations (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  state            TEXT,
  sentence_years   NUMERIC(5, 2) CHECK (sentence_years > 0),
  offense_type     offense_type,
  start_date       DATE,
  earliest_release DATE,
  latest_release   DATE,
  pct_served       SMALLINT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calc_user ON sentence_calculations(user_id, created_at DESC);

-- ════════════════════════════════════════════════════════════════
-- SECTION 13 — SECURITY EVENTS (IMMUTABLE AUDIT LOG)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS security_events (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type         TEXT NOT NULL,
  severity           TEXT NOT NULL DEFAULT 'info'
                       CHECK (severity IN ('info', 'warn', 'critical')),
  details            JSONB NOT NULL DEFAULT '{}',
  ip_address         INET,
  device_fingerprint TEXT,
  user_agent         TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_user
  ON security_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_type
  ON security_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_critical
  ON security_events(created_at DESC) WHERE severity = 'critical';

-- ════════════════════════════════════════════════════════════════
-- SECTION 14 — RATE LIMIT LOG
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS rate_limit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  identifier TEXT NOT NULL,
  action     TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_lookup
  ON rate_limit_log(identifier, action, created_at DESC);

-- ── Rate Limiter Function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_rate_limit(
  p_identifier TEXT,
  p_action     TEXT,
  p_limit      INT,
  p_window_sec INT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > NOW() - (p_window_sec || ' seconds')::INTERVAL;

  IF v_count >= p_limit THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limit_log (identifier, action) VALUES (p_identifier, p_action);
  RETURN TRUE;
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- SECTION 15 — ADMIN AUDIT LOG (IMMUTABLE)
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   UUID,
  details     JSONB NOT NULL DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin
  ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target
  ON admin_audit_log(target_id, target_type);

-- ════════════════════════════════════════════════════════════════
-- SECTION 16 — ADMIN FUNCTIONS (SECURITY DEFINER)
-- ════════════════════════════════════════════════════════════════

-- ── Change user role (super_admin only) ───────────────────────
CREATE OR REPLACE FUNCTION fn_change_user_role(
  p_target_id UUID,
  p_new_role  user_role
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_role user_role;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role != 'super_admin' THEN
    RAISE EXCEPTION 'Permission denied: only super_admin can change roles.';
  END IF;

  -- Never demote the last super_admin
  IF p_new_role != 'super_admin' THEN
    IF (SELECT role FROM profiles WHERE id = p_target_id) = 'super_admin' THEN
      IF (SELECT COUNT(*) FROM profiles WHERE role = 'super_admin') <= 1 THEN
        RAISE EXCEPTION 'Cannot demote the last super_admin.';
      END IF;
    END IF;
  END IF;

  UPDATE profiles SET role = p_new_role WHERE id = p_target_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'ROLE_CHANGE', 'profile', p_target_id,
    jsonb_build_object('new_role', p_new_role));
END;
$$;

-- ── Ban user (admin+ only, with audit trail) ──────────────────
CREATE OR REPLACE FUNCTION fn_ban_user(
  p_target_id  UUID,
  p_reason     TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_caller_role user_role;
BEGIN
  SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();

  IF v_caller_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Permission denied.';
  END IF;
  IF p_target_id = auth.uid() THEN
    RAISE EXCEPTION 'Admins cannot ban themselves.';
  END IF;
  IF v_caller_role = 'admin' AND EXISTS (
    SELECT 1 FROM profiles WHERE id = p_target_id AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only super_admin can ban other admins.';
  END IF;

  UPDATE profiles
  SET
    is_banned      = TRUE,
    ban_reason     = p_reason,
    ban_expires_at = p_expires_at
  WHERE id = p_target_id;

  -- Deactivate all push tokens to force re-login
  UPDATE push_tokens SET is_active = FALSE WHERE user_id = p_target_id;

  INSERT INTO admin_audit_log (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'BAN_USER', 'profile', p_target_id,
    jsonb_build_object('reason', p_reason, 'expires_at', p_expires_at));

  INSERT INTO security_events (user_id, event_type, severity, details)
  VALUES (p_target_id, 'ACCOUNT_BANNED', 'critical',
    jsonb_build_object('reason', p_reason, 'banned_by', auth.uid()));
END;
$$;

-- ── Content moderation check (server-side) ───────────────────
CREATE OR REPLACE FUNCTION fn_moderate_content(p_text TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_clean TEXT := TRIM(p_text);
BEGIN
  IF LENGTH(v_clean) = 0 THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'Content cannot be empty.');
  END IF;
  IF LENGTH(v_clean) > 2000 THEN
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'Content exceeds 2000 characters.');
  END IF;
  -- SQL injection guard
  IF v_clean ~* '(union\s+select|drop\s+table|insert\s+into\s+\w|delete\s+from\s+\w|exec\s*\(|<script[\s>]|javascript:)' THEN
    INSERT INTO security_events (event_type, severity, details)
    VALUES ('INJECTION_ATTEMPT', 'critical',
      jsonb_build_object('preview', LEFT(v_clean, 100)));
    RETURN jsonb_build_object('ok', FALSE, 'reason', 'Invalid content detected.');
  END IF;
  RETURN jsonb_build_object('ok', TRUE, 'clean', v_clean);
END;
$$;

-- ════════════════════════════════════════════════════════════════
-- SECTION 17 — ANALYTICS VIEWS
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_platform_stats AS
SELECT
  (SELECT COUNT(*) FROM profiles WHERE is_banned = FALSE)                         AS total_members,
  (SELECT COUNT(*) FROM profiles WHERE created_at > NOW() - INTERVAL '7 days')    AS new_members_7d,
  (SELECT COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '15 minutes') AS online_now,
  (SELECT COUNT(*) FROM messages WHERE created_at > NOW() - INTERVAL '24 hours')  AS messages_24h,
  (SELECT COUNT(*) FROM jobs WHERE is_active = TRUE)                               AS active_jobs,
  (SELECT COUNT(*) FROM job_applications WHERE created_at > NOW() - INTERVAL '7 days') AS applications_7d,
  (SELECT COUNT(*) FROM reports WHERE status = 'pending')                          AS pending_reports,
  (SELECT COUNT(*) FROM blog_posts WHERE is_published = TRUE)                      AS published_posts;

CREATE OR REPLACE VIEW v_member_stats AS
SELECT
  p.id,
  p.name,
  p.state,
  p.offense_type,
  p.interests,
  p.is_verified,
  p.profile_complete,
  p.last_seen,
  p.created_at,
  CASE
    WHEN p.last_seen > NOW() - INTERVAL '15 minutes' THEN 'Online'
    WHEN p.last_seen > NOW() - INTERVAL '24 hours'   THEN 'Recently active'
    WHEN p.last_seen > NOW() - INTERVAL '7 days'     THEN 'Active this week'
    ELSE 'Active this month'
  END AS presence_label,
  (SELECT COUNT(*) FROM connections c
    WHERE (c.requester_id = p.id OR c.recipient_id = p.id) AND c.status = 'accepted'
  ) AS connection_count,
  (SELECT COUNT(*) FROM messages m WHERE m.sender_id = p.id) AS message_count,
  (SELECT COUNT(*) FROM job_applications ja WHERE ja.user_id = p.id) AS job_apps
FROM profiles p
WHERE p.is_banned = FALSE;

CREATE OR REPLACE VIEW v_public_profiles AS
SELECT
  id,
  name,
  avatar_initials,
  age,
  state,
  bio,
  offense_type,
  release_year,
  interests,
  is_verified,
  profile_complete,
  CASE
    WHEN last_seen > NOW() - INTERVAL '15 minutes' THEN 'Online'
    WHEN last_seen > NOW() - INTERVAL '24 hours'   THEN 'Recently active'
    WHEN last_seen > NOW() - INTERVAL '7 days'     THEN 'Active this week'
    ELSE 'Active this month'
  END AS last_seen_label,
  created_at
FROM profiles
WHERE is_banned = FALSE;

-- ════════════════════════════════════════════════════════════════
-- SECTION 18 — ROW LEVEL SECURITY (RLS)
-- ════════════════════════════════════════════════════════════════

-- Enable RLS on all tables
ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log     ENABLE ROW LEVEL SECURITY;

-- ── profiles ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_select_public"  ON profiles;
DROP POLICY IF EXISTS "profiles_insert_self"    ON profiles;
DROP POLICY IF EXISTS "profiles_update_self"    ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin"   ON profiles;

CREATE POLICY "profiles_select_public" ON profiles
  FOR SELECT USING (is_banned = FALSE);

-- Only the auth trigger (SECURITY DEFINER) can insert — no direct inserts
CREATE POLICY "profiles_insert_trigger_only" ON profiles
  FOR INSERT WITH CHECK (FALSE);

CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE USING (auth.uid() = id AND is_banned = FALSE)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
    AND is_banned = (SELECT is_banned FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "profiles_delete_superadmin" ON profiles
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- ── connections ────────────────────────────────────────────────
DROP POLICY IF EXISTS "connections_select" ON connections;
DROP POLICY IF EXISTS "connections_insert" ON connections;
DROP POLICY IF EXISTS "connections_update" ON connections;
DROP POLICY IF EXISTS "connections_delete" ON connections;

CREATE POLICY "connections_select" ON connections
  FOR SELECT USING (
    requester_id = auth.uid() OR recipient_id = auth.uid()
  );
CREATE POLICY "connections_insert" ON connections
  FOR INSERT WITH CHECK (
    requester_id = auth.uid()
    AND requester_id <> recipient_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = recipient_id AND is_banned = TRUE)
    AND fn_check_rate_limit(auth.uid()::TEXT, 'connect', 20, 3600)
  );
CREATE POLICY "connections_update" ON connections
  FOR UPDATE USING (
    recipient_id = auth.uid() OR requester_id = auth.uid()
  );
CREATE POLICY "connections_delete" ON connections
  FOR DELETE USING (
    requester_id = auth.uid() OR recipient_id = auth.uid()
  );

-- ── profile_likes ──────────────────────────────────────────────
DROP POLICY IF EXISTS "likes_manage_own" ON profile_likes;
CREATE POLICY "likes_manage_own" ON profile_likes
  FOR ALL USING (liker_id = auth.uid())
  WITH CHECK (
    liker_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
    AND fn_check_rate_limit(auth.uid()::TEXT, 'like', 50, 3600)
  );

-- ── conversations ──────────────────────────────────────────────
DROP POLICY IF EXISTS "conversations_participants" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_participants" ON conversations
  FOR SELECT USING (
    participant1_id = auth.uid() OR participant2_id = auth.uid()
  );
CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (
    (participant1_id = auth.uid() OR participant2_id = auth.uid())
    AND participant1_id <> participant2_id
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
  );

-- ── messages ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages_read"   ON messages;
DROP POLICY IF EXISTS "messages_send"   ON messages;
DROP POLICY IF EXISTS "messages_delete" ON messages;

CREATE POLICY "messages_read" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
    AND is_deleted = FALSE
  );
CREATE POLICY "messages_send" ON messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
    AND fn_check_rate_limit(auth.uid()::TEXT, 'message', 30, 60)
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
        AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
    )
  );
CREATE POLICY "messages_soft_delete" ON messages
  FOR UPDATE USING (sender_id = auth.uid())
  WITH CHECK (is_deleted = TRUE);  -- can only set is_deleted, no other changes

-- ── jobs ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "jobs_public_read" ON jobs;
DROP POLICY IF EXISTS "jobs_admin_write" ON jobs;

CREATE POLICY "jobs_public_read" ON jobs
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "jobs_admin_write" ON jobs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ── job_applications ───────────────────────────────────────────
DROP POLICY IF EXISTS "applications_own" ON job_applications;
CREATE POLICY "applications_own" ON job_applications
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
    AND fn_check_rate_limit(auth.uid()::TEXT, 'job_apply', 5, 86400)
  );

-- ── saved_jobs ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "saved_jobs_own" ON saved_jobs;
CREATE POLICY "saved_jobs_own" ON saved_jobs
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── blog_posts ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_published_read" ON blog_posts;
DROP POLICY IF EXISTS "blog_own_write"      ON blog_posts;
DROP POLICY IF EXISTS "blog_admin_write"    ON blog_posts;

CREATE POLICY "blog_published_read" ON blog_posts
  FOR SELECT USING (is_published = TRUE AND is_flagged = FALSE);
CREATE POLICY "blog_own_write" ON blog_posts
  FOR ALL USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid() AND NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE
  ));
CREATE POLICY "blog_admin_manage" ON blog_posts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','admin','super_admin'))
  );

-- ── blog_comments ──────────────────────────────────────────────
DROP POLICY IF EXISTS "comments_read"   ON blog_comments;
DROP POLICY IF EXISTS "comments_insert" ON blog_comments;
DROP POLICY IF EXISTS "comments_delete" ON blog_comments;

CREATE POLICY "comments_read" ON blog_comments
  FOR SELECT USING (is_flagged = FALSE);
CREATE POLICY "comments_insert" ON blog_comments
  FOR INSERT WITH CHECK (
    author_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
    AND fn_check_rate_limit(auth.uid()::TEXT, 'comment', 10, 3600)
  );
CREATE POLICY "comments_own_delete" ON blog_comments
  FOR DELETE USING (author_id = auth.uid());

-- ── blog_likes ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "blog_likes_own" ON blog_likes;
CREATE POLICY "blog_likes_own" ON blog_likes
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_banned = TRUE)
  );

-- ── resources ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "resources_public_read" ON resources;
DROP POLICY IF EXISTS "resources_admin_write" ON resources;

CREATE POLICY "resources_public_read" ON resources
  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "resources_admin_write" ON resources
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ── notifications ──────────────────────────────────────────────
DROP POLICY IF EXISTS "notifications_own" ON notifications;
CREATE POLICY "notifications_own" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- ── push_tokens ────────────────────────────────────────────────
DROP POLICY IF EXISTS "push_tokens_own" ON push_tokens;
CREATE POLICY "push_tokens_own" ON push_tokens
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── reports ────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reports_own_read"   ON reports;
DROP POLICY IF EXISTS "reports_own_insert" ON reports;
DROP POLICY IF EXISTS "reports_admin_all"  ON reports;

CREATE POLICY "reports_own_read" ON reports
  FOR SELECT USING (reporter_id = auth.uid());
CREATE POLICY "reports_own_insert" ON reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND fn_check_rate_limit(auth.uid()::TEXT, 'report', 10, 86400)
  );
CREATE POLICY "reports_admin_all" ON reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('moderator','admin','super_admin'))
  );

-- ── sentence_calculations ─────────────────────────────────────
DROP POLICY IF EXISTS "calc_own" ON sentence_calculations;
CREATE POLICY "calc_own" ON sentence_calculations
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── security_events ───────────────────────────────────────────
DROP POLICY IF EXISTS "security_admin_read"  ON security_events;
DROP POLICY IF EXISTS "security_no_update"   ON security_events;
DROP POLICY IF EXISTS "security_no_delete"   ON security_events;

CREATE POLICY "security_admin_read" ON security_events
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
CREATE POLICY "security_no_update" ON security_events
  FOR UPDATE USING (FALSE);
CREATE POLICY "security_no_delete" ON security_events
  FOR DELETE USING (FALSE);

-- ── admin_audit_log ───────────────────────────────────────────
DROP POLICY IF EXISTS "audit_superadmin_read" ON admin_audit_log;
DROP POLICY IF EXISTS "audit_admin_insert"    ON admin_audit_log;
DROP POLICY IF EXISTS "audit_no_update"       ON admin_audit_log;
DROP POLICY IF EXISTS "audit_no_delete"       ON admin_audit_log;

CREATE POLICY "audit_superadmin_read" ON admin_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
  );
CREATE POLICY "audit_admin_insert" ON admin_audit_log
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );
CREATE POLICY "audit_no_update" ON admin_audit_log
  FOR UPDATE USING (FALSE);
CREATE POLICY "audit_no_delete" ON admin_audit_log
  FOR DELETE USING (FALSE);

-- ════════════════════════════════════════════════════════════════
-- SECTION 19 — REALTIME SUBSCRIPTIONS
-- (Enable in Supabase Dashboard → Database → Replication)
-- ════════════════════════════════════════════════════════════════

-- These are configured via Dashboard, but the SQL for reference:
-- ALTER PUBLICATION supabase_realtime ADD TABLE messages;
-- ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
-- ALTER PUBLICATION supabase_realtime ADD TABLE connections;

-- ════════════════════════════════════════════════════════════════
-- SECTION 20 — SCHEDULED JOBS (pg_cron)
-- ════════════════════════════════════════════════════════════════

-- Clean rate limit log every 30 min (keep last 24h only)
SELECT cron.schedule('clean-rate-limits', '*/30 * * * *',
  $$DELETE FROM rate_limit_log WHERE created_at < NOW() - INTERVAL '24 hours'$$
);

-- Expire old jobs at 2am daily
SELECT cron.schedule('expire-jobs', '0 2 * * *',
  $$UPDATE jobs SET is_active = FALSE
    WHERE expires_at < NOW() AND is_active = TRUE$$
);

-- Auto-lift temporary bans every 6 hours
SELECT cron.schedule('lift-temp-bans', '0 */6 * * *',
  $$UPDATE profiles
    SET is_banned = FALSE, ban_reason = NULL, ban_expires_at = NULL
    WHERE ban_expires_at IS NOT NULL AND ban_expires_at < NOW() AND is_banned = TRUE$$
);

-- Clean old read notifications (older than 90 days) weekly on Sunday
SELECT cron.schedule('clean-old-notifications', '0 3 * * 0',
  $$DELETE FROM notifications
    WHERE is_read = TRUE AND created_at < NOW() - INTERVAL '90 days'$$
);

-- Clean old security events (info-level, older than 30 days) weekly
SELECT cron.schedule('clean-old-security-events', '0 4 * * 0',
  $$DELETE FROM security_events
    WHERE severity = 'info' AND created_at < NOW() - INTERVAL '30 days'$$
);

-- ════════════════════════════════════════════════════════════════
-- SECTION 21 — SEED DATA
-- ════════════════════════════════════════════════════════════════

-- ── Jobs ──────────────────────────────────────────────────────
INSERT INTO jobs (title, company, logo_emoji, location, state, job_type, wage_display, description, tags, felony_friendly, ban_the_box) VALUES
  ('Warehouse Associate',     'Amazon Logistics',    '📦', 'Dallas, TX',     'TX', 'full-time',  '$18–$21/hr', 'Receive, store, and ship products. No background disqualification for non-violent offenses. Benefits from day one.', ARRAY['Physical','Team','Benefits','Training'], TRUE, TRUE),
  ('Electrician Apprentice',  'City Electric Co.',   '⚡',  'Orlando, FL',    'FL', 'full-time',  '$22–$26/hr', 'Learn the trade under licensed electricians. Union job with full benefits and pension plan.', ARRAY['Trade','Union','Growth','Outdoor'], TRUE, FALSE),
  ('Culinary Assistant',      'Fresh Start Kitchens','🍳',  'Atlanta, GA',    'GA', 'part-time',  '$15–$17/hr', 'Founded by formerly incarcerated chefs. All backgrounds welcome. Flexible hours and a supportive environment.', ARRAY['Nonprofit','Flexible','Community'], TRUE, TRUE),
  ('CDL-A Truck Driver',      'Horizon Transport',   '🚛',  'Houston, TX',    'TX', 'full-time',  '$28–$34/hr', 'Home weekly routes. We sponsor CDL licensing for qualified candidates. Full benefits package.', ARRAY['License','Travel','Benefits'], TRUE, TRUE),
  ('Construction Laborer',    'BuildRight LLC',      '🏗️', 'New York, NY',   'NY', 'full-time',  '$20–$24/hr', 'Site work, demolition, and general labor. OSHA-10 training provided on the job.', ARRAY['Physical','Outdoor','Training'], TRUE, FALSE),
  ('Data Entry / Admin',      'RemoteWork Inc.',     '💻',  'Remote',          NULL, 'part-time',  '$14–$16/hr', 'Fully remote, flexible hours. Laptop provided. Perfect for parole travel restrictions. No background check.', ARRAY['Remote','Flexible','WFH'], TRUE, TRUE),
  ('Peer Support Specialist', 'Hope Reentry Center', '🤝',  'Chicago, IL',    'IL', 'full-time',  '$17–$20/hr', 'Lived experience preferred. Help others navigate the system you know. Certification assistance provided.', ARRAY['Purpose','Social Work','Cert'], TRUE, TRUE),
  ('Forklift Operator',       'Harbor Freight Co.',  '🏭',  'Memphis, TN',    'TN', 'full-time',  '$19–$23/hr', 'Certified training provided. Day/night shifts available. Immediate hire for non-violent offenses.', ARRAY['Certification','Physical','Benefits'], TRUE, TRUE),
  ('Landscaping Crew',        'GreenPath Services',  '🌿',  'Phoenix, AZ',    'AZ', 'full-time',  '$16–$18/hr', 'Outdoor work managing commercial properties. No experience needed, full training provided.', ARRAY['Outdoor','Team','Physical'], TRUE, TRUE),
  ('Call Center Agent',       'Televerde Foundation','📞',  'Phoenix, AZ',    'AZ', 'full-time',  '$15–$19/hr', 'Sales and customer service training. This organization specifically employs returning citizens.', ARRAY['Communication','Training','Purpose'], TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- ── Resources ────────────────────────────────────────────────
INSERT INTO resources (name, category, description, url, phone, state, is_urgent, icon_emoji, badge_label, sort_order) VALUES
  -- Parole & Legal
  ('National Parole Resource Center', 'parole', 'State-by-state guidelines, rights, and parole board contacts.', 'https://nationalparoleresource.org', NULL, NULL, FALSE, '⚖️', 'Federal', 1),
  ('Justice.gov Reentry Hub', 'parole', 'Official federal reentry programs and financial assistance.', 'https://www.justice.gov/reentry', NULL, NULL, FALSE, '🏛️', 'Federal', 2),
  ('CSOSA Supervision Services', 'parole', 'Court supervision, drug testing locations, and case manager contacts.', 'https://www.csosa.gov', NULL, NULL, FALSE, '📋', 'DC/Federal', 3),
  ('Restore Justice Foundation', 'parole', 'Legal aid, expungement help, and parole board preparation.', 'https://restorejustice.org', NULL, NULL, FALSE, '🔓', 'Nonprofit', 4),
  ('ACLU Know Your Rights', 'parole', 'Know-your-rights guides for people on parole or probation.', 'https://www.aclu.org/know-your-rights/rights-people-conviction-record', NULL, NULL, FALSE, '📖', 'Rights', 5),

  -- Mental Health
  ('SAMHSA National Helpline', 'mental', 'Free, confidential treatment referrals 24/7. Call 1-800-662-4357.', 'https://www.samhsa.gov/find-help/national-helpline', '1-800-662-4357', NULL, TRUE, '📞', '24/7 FREE', 1),
  ('Crisis Text Line', 'mental', 'Text HOME to 741741. Free crisis counseling anytime.', 'https://www.crisistextline.org', '741741', NULL, TRUE, '💬', 'Text 24/7', 2),
  ('988 Suicide & Crisis Lifeline', 'mental', 'Call or text 988. Chat at 988lifeline.org.', 'https://988lifeline.org', '988', NULL, TRUE, '🆘', 'Emergency', 3),
  ('Prison Policy Mental Health', 'mental', 'Evidence-based mental health resources for formerly incarcerated.', 'https://www.prisonpolicy.org', NULL, NULL, FALSE, '🧠', 'Resource', 4),
  ('Mental Health America', 'mental', 'Peer-led support groups run by returning citizens, for returning citizens.', 'https://www.mentalhealthamerica.net', NULL, NULL, FALSE, '🤝', 'Peer Support', 5),

  -- Housing
  ('HUD Reentry Housing Program', 'housing', 'Federal rental and transitional housing assistance.', 'https://www.hud.gov/reentry', NULL, NULL, FALSE, '🏠', 'Federal', 1),
  ('Volunteers of America', 'housing', 'Transitional housing and long-term reentry programs nationwide.', 'https://www.voa.org', NULL, NULL, FALSE, '🏘️', 'National', 2),
  ('Homeward Bound Network', 'housing', 'Directory of sober living and transitional homes by state.', 'https://www.homelessshelterdirectory.org', NULL, NULL, FALSE, '📍', 'National', 3),
  ('National Reentry Resource Center', 'housing', 'Federal housing assistance and legal guidance for returning citizens.', 'https://nationalreentryresourcecenter.org', NULL, NULL, FALSE, '🔑', 'Federal', 4),

  -- Education
  ('Pell Grants for Incarcerated Students', 'education', 'Pell Grant eligibility restored for currently and formerly incarcerated students.', 'https://studentaid.gov', NULL, NULL, FALSE, '🎓', 'Federal Aid', 1),
  ('College & Community Fellowship', 'education', 'Supporting women with criminal legal histories in higher education.', 'https://collegeandcommunityfellowship.org', NULL, NULL, FALSE, '📚', 'Nonprofit', 2),
  ('Defy Ventures', 'education', 'Entrepreneurship, employment, and character training for returning citizens.', 'https://defyventures.org', NULL, NULL, FALSE, '💡', 'Business', 3),
  ('Prison Education Program', 'education', 'GED, vocational, and college programs available during and after incarceration.', 'https://www.prisonpolicy.org/education.html', NULL, NULL, FALSE, '✏️', 'Programs', 4),

  -- Employment
  ('Fair Chance Business Pledge', 'employment', 'List of companies that have pledged to hire returning citizens.', 'https://www.whitehouse.gov/fair-chance-pledge', NULL, NULL, FALSE, '🤝', 'Federal', 1),
  ('Honest Jobs', 'employment', 'Job board specifically for people with criminal records.', 'https://www.honestjobs.co', NULL, NULL, FALSE, '💼', 'Job Board', 2),
  ('Homeboy Industries', 'employment', 'Gang intervention and reentry jobs in Los Angeles.', 'https://homeboyindustries.org', NULL, NULL, FALSE, '🏠', 'Nonprofit', 3),
  ('Televerde Foundation', 'employment', 'Call center employment specifically for incarcerated and returning citizens.', 'https://televerde.com', NULL, NULL, FALSE, '📞', 'Employer', 4)
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════════════════════════════
-- SECTION 22 — STORAGE BUCKETS
-- (Configure in Supabase Dashboard → Storage)
-- ════════════════════════════════════════════════════════════════

-- Run in Dashboard SQL Editor after enabling Storage:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES
--   ('avatars',     'avatars',     true,  2097152,  ARRAY['image/jpeg','image/png','image/webp','image/gif']),
--   ('blog-images', 'blog-images', true,  5242880,  ARRAY['image/jpeg','image/png','image/webp']),
--   ('documents',   'documents',   false, 10485760, ARRAY['application/pdf'])
-- ON CONFLICT DO NOTHING;

-- Storage RLS (run after creating buckets):
-- CREATE POLICY "avatar_public_read" ON storage.objects
--   FOR SELECT USING (bucket_id = 'avatars');
-- CREATE POLICY "avatar_own_upload" ON storage.objects
--   FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
-- CREATE POLICY "avatar_own_update" ON storage.objects
--   FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);
-- CREATE POLICY "avatar_own_delete" ON storage.objects
--   FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

-- ════════════════════════════════════════════════════════════════
-- END OF SCHEMA
-- ================================================================
-- VERIFICATION QUERIES (run these to confirm everything worked):
-- ================================================================
--
-- Check all tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;
--
-- Check all RLS policies:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' ORDER BY tablename;
--
-- Check all triggers:
-- SELECT trigger_name, event_object_table FROM information_schema.triggers
-- WHERE trigger_schema = 'public' ORDER BY event_object_table;
--
-- Check all indexes:
-- SELECT indexname, tablename FROM pg_indexes
-- WHERE schemaname = 'public' ORDER BY tablename;
--
-- Check seed data:
-- SELECT COUNT(*) FROM jobs;       -- should be 10
-- SELECT COUNT(*) FROM resources;  -- should be 22
-- ════════════════════════════════════════════════════════════════
