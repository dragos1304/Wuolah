-- ============================================================
-- Wuolah Romania — Full Bootstrap Schema
-- Single idempotent script: run this once in the Supabase
-- SQL Editor on a fresh project.
-- Combines: base schema + Migration 001 (language support)
-- ============================================================

-- ---------- EXTENSIONS ----------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- LOOKUP TABLES ----------

CREATE TABLE IF NOT EXISTS universities (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    city        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS faculties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (university_id, name)
);

-- specializations includes language + duration from the start
-- (incorporates Migration 001 — no separate ALTER needed)
CREATE TABLE IF NOT EXISTS specializations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id      UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    study_language  TEXT NOT NULL DEFAULT 'RO',
    duration_years  SMALLINT NOT NULL DEFAULT 3,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (faculty_id, name, study_language)
);

-- ---------- USER PROFILES (extends auth.users) ----------

CREATE TABLE IF NOT EXISTS user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT,
    university_id       UUID REFERENCES universities(id),
    faculty_id          UUID REFERENCES faculties(id),
    specialization_id   UUID REFERENCES specializations(id),
    year                SMALLINT CHECK (year BETWEEN 1 AND 6),
    study_language      TEXT,
    avatar_url          TEXT,
    onboarding_complete BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- DOCUMENTS ----------

DO $$ BEGIN
    CREATE TYPE doc_type AS ENUM (
        'curs', 'seminar', 'laborator', 'examen', 'fisa', 'altele'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE doc_status AS ENUM (
        'PROCESSING', 'ACTIVE', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS documents (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    uploader_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    professor           TEXT NOT NULL,
    doc_type            doc_type NOT NULL,
    faculty_id          UUID NOT NULL REFERENCES faculties(id),
    specialization_id   UUID NOT NULL REFERENCES specializations(id),
    year                SMALLINT NOT NULL CHECK (year BETWEEN 1 AND 6),
    file_url            TEXT NOT NULL,
    file_hash           TEXT,
    file_size_bytes     BIGINT,
    status              doc_status NOT NULL DEFAULT 'ACTIVE',
    download_count      INTEGER NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_feed
    ON documents (faculty_id, specialization_id, year)
    WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_documents_uploader ON documents (uploader_id);

-- ---------- DOWNLOADS ----------

CREATE TABLE IF NOT EXISTS downloads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    credited        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for the 24-hour uniqueness check
CREATE INDEX IF NOT EXISTS idx_downloads_uniqueness
    ON downloads (user_id, document_id, created_at DESC);

-- ---------- WALLETS ----------

CREATE TABLE IF NOT EXISTS wallets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance     NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- WITHDRAWAL REQUESTS ----------

DO $$ BEGIN
    CREATE TYPE withdrawal_method AS ENUM ('iban', 'revolut');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE withdrawal_status AS ENUM (
        'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount          NUMERIC(10, 2) NOT NULL CHECK (amount >= 50),
    method          withdrawal_method NOT NULL,
    iban_or_revolut TEXT NOT NULL,
    status          withdrawal_status NOT NULL DEFAULT 'PENDING',
    admin_note      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user
    ON withdrawal_requests (user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE universities         ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads            ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests  ENABLE ROW LEVEL SECURITY;

-- ----- Lookup tables: publicly readable -----

DO $$ BEGIN
    CREATE POLICY "Universities are publicly readable"
        ON universities FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Faculties are publicly readable"
        ON faculties FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Specializations are publicly readable"
        ON specializations FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- User Profiles -----

DO $$ BEGIN
    CREATE POLICY "Users can read own profile"
        ON user_profiles FOR SELECT
        USING (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert own profile"
        ON user_profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update own profile"
        ON user_profiles FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- Documents -----

DO $$ BEGIN
    CREATE POLICY "Active documents are publicly readable"
        ON documents FOR SELECT
        USING (status = 'ACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can upload documents"
        ON documents FOR INSERT
        WITH CHECK (auth.uid() = uploader_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Uploaders can update own documents"
        ON documents FOR UPDATE
        USING (auth.uid() = uploader_id)
        WITH CHECK (auth.uid() = uploader_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Uploaders can delete own documents"
        ON documents FOR DELETE
        USING (auth.uid() = uploader_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- Downloads -----
-- SELECT and INSERT only. No UPDATE/DELETE from clients.
-- Financial fields (credited) are only written by credit_download() SECURITY DEFINER.

DO $$ BEGIN
    CREATE POLICY "Users can read own downloads"
        ON downloads FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Authenticated users can insert downloads"
        ON downloads FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- Wallets -----
-- READ ONLY for clients. All balance mutations happen via
-- credit_download() and requestWithdrawal server actions
-- using the service role key — never from the browser.

DO $$ BEGIN
    CREATE POLICY "Users can read own wallet"
        ON wallets FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----- Withdrawal Requests -----

DO $$ BEGIN
    CREATE POLICY "Users can read own withdrawal requests"
        ON withdrawal_requests FOR SELECT
        USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE POLICY "Users can create withdrawal requests"
        ON withdrawal_requests FOR INSERT
        WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create wallet and profile when a new user signs up

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data ->> 'full_name'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO wallets (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Drop and recreate trigger so it's idempotent

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_profiles_updated_at    ON user_profiles;
DROP TRIGGER IF EXISTS set_documents_updated_at        ON documents;
DROP TRIGGER IF EXISTS set_wallets_updated_at          ON wallets;
DROP TRIGGER IF EXISTS set_withdrawal_requests_updated_at ON withdrawal_requests;

CREATE TRIGGER set_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_wallets_updated_at
    BEFORE UPDATE ON wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_withdrawal_requests_updated_at
    BEFORE UPDATE ON withdrawal_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- CREDIT DOWNLOAD — atomic, server-only (SECURITY DEFINER)
-- Called via RPC from /api/download using the service role key.
-- The wallet balance and download_count are NEVER writable
-- by client RLS policies — only this function can touch them.
-- ============================================================

CREATE OR REPLACE FUNCTION credit_download(
    p_user_id     UUID,
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uploader_id        UUID;
    v_already_downloaded BOOLEAN;
    v_is_own_doc         BOOLEAN;
    v_credited           BOOLEAN := false;
BEGIN
    -- Fetch uploader; verify document is ACTIVE
    SELECT uploader_id INTO v_uploader_id
    FROM documents
    WHERE id = p_document_id AND status = 'ACTIVE';

    IF v_uploader_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'document_not_found');
    END IF;

    v_is_own_doc := (p_user_id = v_uploader_id);

    -- 24-hour uniqueness check
    SELECT EXISTS (
        SELECT 1 FROM downloads
        WHERE user_id    = p_user_id
          AND document_id = p_document_id
          AND created_at  > now() - INTERVAL '24 hours'
    ) INTO v_already_downloaded;

    -- Always log the download event
    INSERT INTO downloads (user_id, document_id, credited)
    VALUES (p_user_id, p_document_id, false);

    -- Credit only on unique, non-self downloads
    IF NOT v_already_downloaded AND NOT v_is_own_doc THEN
        UPDATE wallets
        SET balance = balance + 0.05
        WHERE user_id = v_uploader_id;

        UPDATE documents
        SET download_count = download_count + 1
        WHERE id = p_document_id;

        -- Mark the just-inserted row as credited
        UPDATE downloads
        SET credited = true
        WHERE id = (
            SELECT id FROM downloads
            WHERE user_id    = p_user_id
              AND document_id = p_document_id
            ORDER BY created_at DESC
            LIMIT 1
        );

        v_credited := true;
    END IF;

    RETURN jsonb_build_object(
        'success',      true,
        'credited',     v_credited,
        'is_duplicate', v_already_downloaded,
        'is_own_doc',   v_is_own_doc
    );
END;
$$;

-- ============================================================
-- STORAGE BUCKET SETUP (run separately in the Supabase dashboard
-- or via the Storage API — cannot be done via SQL directly)
-- ============================================================
-- Bucket name  : documents
-- Public       : false  (all downloads via signed URLs)
-- Max file size: 10485760  (10 MB)
-- Allowed types: application/pdf
--
-- Storage RLS policies (add in Dashboard > Storage > Policies):
--   INSERT: auth.uid() IS NOT NULL
--   SELECT: true
-- ============================================================
