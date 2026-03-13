"use client";

import { useState, useTransition } from "react";
import { saveBackpack } from "./actions";

type University = { id: string; name: string; city: string };
type Faculty = { id: string; name: string };
type Specialization = { id: string; name: string };

interface BackpackFormProps {
  universities: University[];
}

const STEPS = [
  { number: 1, label: "Universitate" },
  { number: 2, label: "Facultate" },
  { number: 3, label: "Specializare" },
  { number: 4, label: "Anul" },
];

const YEARS = [
  { value: 1, label: "Anul I" },
  { value: 2, label: "Anul II" },
  { value: 3, label: "Anul III" },
  { value: 4, label: "Anul IV" },
  { value: 5, label: "Anul V" },
  { value: 6, label: "Anul VI" },
];

export default function BackpackForm({ universities }: BackpackFormProps) {
  const [step, setStep] = useState(1);

  const [selectedUniversity, setSelectedUniversity] =
    useState<University | null>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedSpecialization, setSelectedSpecialization] =
    useState<Specialization | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [specializations, setSpecializations] = useState<Specialization[]>([]);

  const [loadingFaculties, setLoadingFaculties] = useState(false);
  const [loadingSpecializations, setLoadingSpecializations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // --- Step handlers ---

  const handleSelectUniversity = async (university: University) => {
    setSelectedUniversity(university);
    setSelectedFaculty(null);
    setSelectedSpecialization(null);
    setSelectedYear(null);
    setFaculties([]);
    setSpecializations([]);
    setSearchQuery("");
    setLoadingFaculties(true);

    try {
      const res = await fetch(
        `/api/faculties?university_id=${university.id}`
      );
      const data: Faculty[] = await res.json();
      setFaculties(data);
    } catch {
      setFormError("Nu s-au putut încărca facultățile. Încearcă din nou.");
    } finally {
      setLoadingFaculties(false);
      setStep(2);
    }
  };

  const handleSelectFaculty = async (faculty: Faculty) => {
    setSelectedFaculty(faculty);
    setSelectedSpecialization(null);
    setSelectedYear(null);
    setSpecializations([]);
    setSearchQuery("");
    setLoadingSpecializations(true);

    try {
      const res = await fetch(
        `/api/specializations?faculty_id=${faculty.id}`
      );
      const data: Specialization[] = await res.json();
      setSpecializations(data);
    } catch {
      setFormError(
        "Nu s-au putut încărca specializările. Încearcă din nou."
      );
    } finally {
      setLoadingSpecializations(false);
      setStep(3);
    }
  };

  const handleSelectSpecialization = (spec: Specialization) => {
    setSelectedSpecialization(spec);
    setSearchQuery("");
    setStep(4);
  };

  const handleBack = () => {
    setFormError(null);
    setSearchQuery("");
    if (step === 2) {
      setSelectedUniversity(null);
      setFaculties([]);
    }
    if (step === 3) {
      setSelectedFaculty(null);
      setSpecializations([]);
    }
    if (step === 4) {
      setSelectedSpecialization(null);
      setSelectedYear(null);
    }
    setStep((s) => s - 1);
  };

  const handleSubmit = () => {
    if (
      !selectedUniversity ||
      !selectedFaculty ||
      !selectedSpecialization ||
      !selectedYear
    )
      return;

    setFormError(null);
    startTransition(async () => {
      const result = await saveBackpack({
        university_id: selectedUniversity.id,
        faculty_id: selectedFaculty.id,
        specialization_id: selectedSpecialization.id,
        year: selectedYear,
      });
      if (result?.error) {
        setFormError(result.error);
      }
    });
  };

  // --- Filtered lists ---

  const filteredUniversities = universities.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFaculties = faculties.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSpecializations = specializations.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Subcomponents ---

  const StepCard = ({
    children,
    onClick,
    selected,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    selected: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 cursor-pointer
        ${
          selected
            ? "border-accent-orange bg-orange-50 shadow-sm"
            : "border-gray-200 bg-white hover:border-accent-orange/50 hover:shadow-sm"
        }`}
    >
      {children}
    </button>
  );

  const SearchInput = ({ placeholder }: { placeholder: string }) => (
    <div className="relative mb-4">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-medium-gray"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent"
      />
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-10 text-medium-gray text-sm">{message}</div>
  );

  const Spinner = () => (
    <div className="flex justify-center py-10">
      <div className="w-8 h-8 border-4 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
    </div>
  );

  // --- Render ---

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center gap-2 mb-1">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center gap-2 flex-1">
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold shrink-0 transition-colors
                  ${
                    step > s.number
                      ? "bg-accent-orange text-white"
                      : step === s.number
                      ? "bg-deep-blue text-white"
                      : "bg-gray-100 text-medium-gray"
                  }`}
              >
                {step > s.number ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  s.number
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block ${
                  step === s.number ? "text-deep-blue" : "text-medium-gray"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 rounded-full transition-colors ${
                    step > s.number ? "bg-accent-orange" : "bg-gray-100"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Step 1 — Universitate */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-deep-blue mb-1">
              La ce universitate studiezi?
            </h2>
            <p className="text-sm text-medium-gray mb-4">
              Alege universitatea pentru a-ți personaliza feedul.
            </p>
            <SearchInput placeholder="Caută universitate sau oraș..." />
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredUniversities.length === 0 ? (
                <EmptyState
                  message={
                    universities.length === 0
                      ? "Nicio universitate disponibilă momentan."
                      : "Nicio universitate găsită."
                  }
                />
              ) : (
                filteredUniversities.map((u) => (
                  <StepCard
                    key={u.id}
                    onClick={() => handleSelectUniversity(u)}
                    selected={selectedUniversity?.id === u.id}
                  >
                    <p className="font-medium text-deep-blue text-sm">
                      {u.name}
                    </p>
                    <p className="text-xs text-medium-gray mt-0.5">{u.city}</p>
                  </StepCard>
                ))
              )}
            </div>
          </div>
        )}

        {/* Step 2 — Facultate */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold text-deep-blue mb-1">
              Ce facultate urmezi?
            </h2>
            <p className="text-sm text-medium-gray mb-4">
              {selectedUniversity?.name}
            </p>
            <SearchInput placeholder="Caută facultate..." />
            {loadingFaculties ? (
              <Spinner />
            ) : filteredFaculties.length === 0 ? (
              <EmptyState
                message={
                  faculties.length === 0
                    ? "Nicio facultate disponibilă pentru această universitate."
                    : "Nicio facultate găsită."
                }
              />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredFaculties.map((f) => (
                  <StepCard
                    key={f.id}
                    onClick={() => handleSelectFaculty(f)}
                    selected={selectedFaculty?.id === f.id}
                  >
                    <p className="font-medium text-deep-blue text-sm">
                      {f.name}
                    </p>
                  </StepCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Specializare */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-bold text-deep-blue mb-1">
              Ce specializare/program urmezi?
            </h2>
            <p className="text-sm text-medium-gray mb-4">
              {selectedFaculty?.name}
            </p>
            <SearchInput placeholder="Caută specializare..." />
            {loadingSpecializations ? (
              <Spinner />
            ) : filteredSpecializations.length === 0 ? (
              <EmptyState
                message={
                  specializations.length === 0
                    ? "Nicio specializare disponibilă pentru această facultate."
                    : "Nicio specializare găsită."
                }
              />
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {filteredSpecializations.map((s) => (
                  <StepCard
                    key={s.id}
                    onClick={() => handleSelectSpecialization(s)}
                    selected={selectedSpecialization?.id === s.id}
                  >
                    <p className="font-medium text-deep-blue text-sm">
                      {s.name}
                    </p>
                  </StepCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Anul de studiu */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-deep-blue mb-1">
              În ce an de studiu ești?
            </h2>
            <p className="text-sm text-medium-gray mb-6">
              {selectedSpecialization?.name}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {YEARS.map((y) => (
                <button
                  key={y.value}
                  type="button"
                  onClick={() => setSelectedYear(y.value)}
                  className={`py-5 rounded-xl border-2 text-center font-bold text-lg transition-all duration-150 cursor-pointer
                    ${
                      selectedYear === y.value
                        ? "border-accent-orange bg-orange-50 text-accent-orange shadow-sm"
                        : "border-gray-200 bg-white text-deep-blue hover:border-accent-orange/50 hover:shadow-sm"
                    }`}
                >
                  {y.label}
                </button>
              ))}
            </div>

            {/* Summary */}
            {selectedYear && (
              <div className="mt-6 p-4 bg-light-gray rounded-xl border border-gray-100">
                <p className="text-xs text-medium-gray font-medium uppercase tracking-wide mb-2">
                  Rezumatul rucsacului tău
                </p>
                <div className="space-y-1">
                  <SummaryRow
                    label="Universitate"
                    value={selectedUniversity?.name ?? ""}
                  />
                  <SummaryRow
                    label="Facultate"
                    value={selectedFaculty?.name ?? ""}
                  />
                  <SummaryRow
                    label="Specializare"
                    value={selectedSpecialization?.name ?? ""}
                  />
                  <SummaryRow
                    label="An"
                    value={`Anul ${selectedYear}`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {formError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {formError}
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
          {step > 1 ? (
            <button
              type="button"
              onClick={handleBack}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm font-medium text-dark-gray hover:text-deep-blue transition-colors disabled:opacity-50"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Înapoi
            </button>
          ) : (
            <div />
          )}

          {step === 4 && (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedYear || isPending}
              className="flex items-center gap-2 bg-accent-orange text-white font-semibold px-6 py-3 rounded-full transition-all hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Se salvează...
                </>
              ) : (
                <>
                  Salvează rucsacul
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-xs text-medium-gray shrink-0">{label}</span>
      <span className="text-xs font-medium text-deep-blue text-right">
        {value}
      </span>
    </div>
  );
}
