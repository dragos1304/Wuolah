"use client";

import { useState, useTransition } from "react";
import {
  UNIVERSITIES_DATA,
  LANGUAGE_LABELS,
  type StudyLanguage,
} from "@/data/universities";
import { saveBackpack } from "./actions";

function ChevronDown() {
  return (
    <svg
      className="h-4 w-4 text-gray-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

interface SelectFieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  children: React.ReactNode;
}

function SelectField({
  label,
  id,
  value,
  onChange,
  disabled,
  placeholder,
  children,
}: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-sm font-medium text-[#0A2540]"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={[
            "w-full appearance-none rounded-xl border-2 bg-white px-4 py-3 pr-10 text-sm transition-colors",
            "focus:outline-none focus:ring-0",
            disabled
              ? "cursor-not-allowed border-gray-100 text-gray-300"
              : value
                ? "border-[#FF6A00] text-[#0A2540]"
                : "border-gray-200 text-gray-500 hover:border-gray-300 focus:border-[#FF6A00]",
          ].join(" ")}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <ChevronDown />
        </div>
      </div>
    </div>
  );
}

export default function OnboardingForm() {
  const [universitySlug, setUniversitySlug] = useState("");
  const [facultyName, setFacultyName] = useState("");
  const [language, setLanguage] = useState("");
  const [specializationName, setSpecializationName] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Derived selections
  const university = UNIVERSITIES_DATA.find((u) => u.slug === universitySlug);
  const faculty = university?.faculties.find((f) => f.name === facultyName);
  const availableLanguages = faculty
    ? (Object.keys(faculty.specializations_by_language) as StudyLanguage[])
    : [];
  const specializations =
    faculty && language
      ? (faculty.specializations_by_language[language as StudyLanguage] ?? [])
      : [];
  const specialization = specializations.find(
    (s) => s.name === specializationName
  );
  const maxYear = specialization?.duration_years ?? 0;
  const yearOptions = Array.from({ length: maxYear }, (_, i) => i + 1);

  const allSelected =
    !!universitySlug &&
    !!facultyName &&
    !!language &&
    !!specializationName &&
    !!year;

  // Cascade resets
  function handleUniversityChange(slug: string) {
    setUniversitySlug(slug);
    setFacultyName("");
    setLanguage("");
    setSpecializationName("");
    setYear("");
  }
  function handleFacultyChange(name: string) {
    setFacultyName(name);
    setLanguage("");
    setSpecializationName("");
    setYear("");
  }
  function handleLanguageChange(lang: string) {
    setLanguage(lang);
    setSpecializationName("");
    setYear("");
  }
  function handleSpecializationChange(name: string) {
    setSpecializationName(name);
    setYear("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allSelected || !university || !specialization) return;
    setError(null);

    startTransition(async () => {
      try {
        const result = await saveBackpack({
          university_name: university.university,
          university_location: university.location,
          faculty_name: facultyName,
          study_language: language,
          specialization_name: specializationName,
          duration_years: specialization.duration_years,
          year: parseInt(year, 10),
        });
        if ("error" in result) {
          setError(result.error);
        } else {
          // Hard navigation bypasses the Next.js client-side router cache so
          // the middleware re-evaluates onboarding_complete on a fresh request.
          window.location.href = "/dashboard";
        }
      } catch {
        setError("A apărut o eroare neașteptată. Te rugăm să încerci din nou.");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Step indicators */}
      <div className="mb-1 flex items-center gap-2">
        {[
          universitySlug,
          facultyName,
          language,
          specializationName,
          year,
        ].map((v, i) => (
          <div
            key={i}
            className={[
              "h-1.5 flex-1 rounded-full transition-colors",
              v ? "bg-[#FF6A00]" : "bg-gray-200",
            ].join(" ")}
          />
        ))}
      </div>

      {/* Dropdown 1: University */}
      <SelectField
        label="Universitate"
        id="university"
        value={universitySlug}
        onChange={handleUniversityChange}
        placeholder="Selectează universitatea..."
      >
        {UNIVERSITIES_DATA.map((u) => (
          <option key={u.slug} value={u.slug}>
            {u.university} — {u.location}
          </option>
        ))}
      </SelectField>

      {/* Dropdown 2: Faculty */}
      <SelectField
        label="Facultate"
        id="faculty"
        value={facultyName}
        onChange={handleFacultyChange}
        disabled={!university}
        placeholder={university ? "Selectează facultatea..." : "Alege mai întâi universitatea"}
      >
        {(university?.faculties ?? []).map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </SelectField>

      {/* Dropdown 3: Language of study */}
      <SelectField
        label="Limba de predare"
        id="language"
        value={language}
        onChange={handleLanguageChange}
        disabled={!faculty}
        placeholder={faculty ? "Selectează limba..." : "Alege mai întâi facultatea"}
      >
        {availableLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {LANGUAGE_LABELS[lang]}
          </option>
        ))}
      </SelectField>

      {/* Dropdown 4: Specialization */}
      <SelectField
        label="Specializare / Program"
        id="specialization"
        value={specializationName}
        onChange={handleSpecializationChange}
        disabled={!language}
        placeholder={language ? "Selectează specializarea..." : "Alege mai întâi limba"}
      >
        {specializations.map((s) => (
          <option key={s.name} value={s.name}>
            {s.name} ({s.duration_years} ani)
          </option>
        ))}
      </SelectField>

      {/* Dropdown 5: Year */}
      <SelectField
        label="Anul de studiu"
        id="year"
        value={year}
        onChange={setYear}
        disabled={!specializationName}
        placeholder={
          specializationName
            ? "Selectează anul..."
            : "Alege mai întâi specializarea"
        }
      >
        {yearOptions.map((y) => (
          <option key={y} value={String(y)}>
            Anul {y}
          </option>
        ))}
      </SelectField>

      {/* Error message */}
      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Summary pill when all selected */}
      {allSelected && (
        <div className="rounded-xl border border-[#FF6A00]/20 bg-[#FF6A00]/5 px-4 py-3 text-sm text-[#0A2540]">
          <span className="font-medium">Rezumat: </span>
          {specializationName} &middot; {LANGUAGE_LABELS[language as StudyLanguage]} &middot; Anul {year}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={!allSelected || isPending}
        className={[
          "mt-1 rounded-xl px-6 py-3.5 text-sm font-semibold text-white transition-all",
          allSelected && !isPending
            ? "bg-[#FF6A00] hover:bg-[#e55f00] active:scale-[0.98] shadow-sm"
            : "cursor-not-allowed bg-gray-200 text-gray-400",
        ].join(" ")}
      >
        {isPending ? "Se salvează..." : "Salvează și continuă →"}
      </button>
    </form>
  );
}
