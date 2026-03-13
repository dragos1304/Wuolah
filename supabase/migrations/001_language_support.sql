-- ============================================================
-- Migration 001: Language & Duration support for specializations
-- Run this in the Supabase SQL Editor AFTER the base schema.
-- ============================================================

-- 1. Add study_language and duration_years to specializations
--    Default existing rows to Romanian / 3-year duration.
ALTER TABLE specializations
    ADD COLUMN IF NOT EXISTS study_language TEXT NOT NULL DEFAULT 'RO',
    ADD COLUMN IF NOT EXISTS duration_years  SMALLINT NOT NULL DEFAULT 3;

-- 2. Replace the unique constraint to include study_language
--    (so "Management" in RO and HU can coexist)
ALTER TABLE specializations
    DROP CONSTRAINT IF EXISTS specializations_faculty_id_name_key;

ALTER TABLE specializations
    ADD CONSTRAINT specializations_faculty_id_name_language_key
    UNIQUE (faculty_id, name, study_language);

-- 3. Add study_language to user_profiles
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS study_language TEXT;

-- 4. Extend the year constraint to handle 4-year programmes (e.g. Law, Engineering)
ALTER TABLE user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_year_check;

ALTER TABLE user_profiles
    ADD CONSTRAINT user_profiles_year_check
    CHECK (year BETWEEN 1 AND 6);

-- 5. Same fix for documents (already 1-6, but ensure it holds)
-- (no change needed — already BETWEEN 1 AND 6)

-- ============================================================
-- RLS: extend specializations public-read policy (already set)
-- ============================================================
-- The existing "Specializations are publicly readable" policy
-- covers the new columns automatically. No changes needed.
