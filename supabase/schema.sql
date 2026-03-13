-- ============================================================
-- Wuolah Romania — Supabase SQL Schema
-- Run this in the Supabase SQL Editor to bootstrap the database.
-- ============================================================

-- ---------- EXTENSIONS ----------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------- LOOKUP TABLES ----------

CREATE TABLE universities (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        TEXT NOT NULL UNIQUE,
    city        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE faculties (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    university_id   UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (university_id, name)
);

CREATE TABLE specializations (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id  UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (faculty_id, name)
);

-- ---------- USER PROFILES (extends auth.users) ----------

CREATE TABLE user_profiles (
    id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name           TEXT,
    university_id       UUID REFERENCES universities(id),
    faculty_id          UUID REFERENCES faculties(id),
    specialization_id   UUID REFERENCES specializations(id),
    year                SMALLINT CHECK (year BETWEEN 1 AND 6),
    avatar_url          TEXT,
    onboarding_complete BOOLEAN NOT NULL DEFAULT false,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- DOCUMENTS ----------

CREATE TYPE doc_type AS ENUM (
    'curs', 'seminar', 'laborator', 'examen', 'fisa', 'altele'
);

CREATE TYPE doc_status AS ENUM (
    'PROCESSING', 'ACTIVE', 'REJECTED'
);

CREATE TABLE documents (
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

CREATE INDEX idx_documents_feed ON documents (faculty_id, specialization_id, year)
    WHERE status = 'ACTIVE';

CREATE INDEX idx_documents_uploader ON documents (uploader_id);

-- ---------- DOWNLOADS ----------

CREATE TABLE downloads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id     UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    credited        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index for the 24-hour uniqueness check
CREATE INDEX idx_downloads_uniqueness ON downloads (user_id, document_id, created_at DESC);

-- ---------- WALLETS ----------

CREATE TABLE wallets (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    balance     NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- WITHDRAWAL REQUESTS ----------

CREATE TYPE withdrawal_method AS ENUM ('iban', 'revolut');

CREATE TYPE withdrawal_status AS ENUM (
    'PENDING', 'APPROVED', 'COMPLETED', 'REJECTED'
);

CREATE TABLE withdrawal_requests (
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

CREATE INDEX idx_withdrawals_user ON withdrawal_requests (user_id, created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculties ENABLE ROW LEVEL SECURITY;
ALTER TABLE specializations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ----- Lookup tables: publicly readable -----

CREATE POLICY "Universities are publicly readable"
    ON universities FOR SELECT
    USING (true);

CREATE POLICY "Faculties are publicly readable"
    ON faculties FOR SELECT
    USING (true);

CREATE POLICY "Specializations are publicly readable"
    ON specializations FOR SELECT
    USING (true);

-- ----- User Profiles -----

CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ----- Documents -----

CREATE POLICY "Active documents are publicly readable"
    ON documents FOR SELECT
    USING (status = 'ACTIVE');

CREATE POLICY "Authenticated users can upload documents"
    ON documents FOR INSERT
    WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can update own documents"
    ON documents FOR UPDATE
    USING (auth.uid() = uploader_id)
    WITH CHECK (auth.uid() = uploader_id);

CREATE POLICY "Uploaders can delete own documents"
    ON documents FOR DELETE
    USING (auth.uid() = uploader_id);

-- ----- Downloads -----

CREATE POLICY "Users can read own downloads"
    ON downloads FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert downloads"
    ON downloads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- ----- Wallets -----

CREATE POLICY "Users can read own wallet"
    ON wallets FOR SELECT
    USING (auth.uid() = user_id);

-- Wallet balance updates happen via server-side functions only (service role key).
-- No direct INSERT/UPDATE/DELETE policies for users.

-- ----- Withdrawal Requests -----

CREATE POLICY "Users can read own withdrawal requests"
    ON withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create withdrawal requests"
    ON withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

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
    INSERT INTO user_profiles (id) VALUES (NEW.id);
    INSERT INTO wallets (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$;

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
-- CREDIT DOWNLOAD FUNCTION (called from API with service role)
-- Atomically checks 24h uniqueness, inserts download, and
-- credits the uploader's wallet.
-- ============================================================

CREATE OR REPLACE FUNCTION credit_download(
    p_user_id    UUID,
    p_document_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uploader_id   UUID;
    v_already_downloaded BOOLEAN;
    v_is_own_doc    BOOLEAN;
    v_credited      BOOLEAN := false;
BEGIN
    -- Get the uploader
    SELECT uploader_id INTO v_uploader_id
    FROM documents
    WHERE id = p_document_id AND status = 'ACTIVE';

    IF v_uploader_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'reason', 'document_not_found');
    END IF;

    -- Check if user is downloading own document
    v_is_own_doc := (p_user_id = v_uploader_id);

    -- Check for duplicate download within 24h
    SELECT EXISTS (
        SELECT 1 FROM downloads
        WHERE user_id = p_user_id
          AND document_id = p_document_id
          AND created_at > now() - INTERVAL '24 hours'
    ) INTO v_already_downloaded;

    -- Always record the download
    INSERT INTO downloads (user_id, document_id, credited)
    VALUES (p_user_id, p_document_id, false);

    -- Credit only if unique and not own document
    IF NOT v_already_downloaded AND NOT v_is_own_doc THEN
        UPDATE wallets
        SET balance = balance + 0.05
        WHERE user_id = v_uploader_id;

        UPDATE documents
        SET download_count = download_count + 1
        WHERE id = p_document_id;

        -- Mark this download as credited
        UPDATE downloads
        SET credited = true
        WHERE user_id = p_user_id
          AND document_id = p_document_id
          AND created_at = (
              SELECT MAX(created_at) FROM downloads
              WHERE user_id = p_user_id AND document_id = p_document_id
          );

        v_credited := true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'credited', v_credited,
        'is_duplicate', v_already_downloaded,
        'is_own_doc', v_is_own_doc
    );
END;
$$;

-- ============================================================
-- STORAGE BUCKET (run via Supabase dashboard or API)
-- ============================================================
-- CREATE POLICY on storage.objects for the 'documents' bucket:
--   - INSERT: auth.uid() IS NOT NULL
--   - SELECT: true (public reads for active docs)
--
-- Bucket name: "documents"
-- Public: false (signed URLs used for downloads)
-- File size limit: 52428800 (50 MB)
-- Allowed MIME types: ['application/pdf']
