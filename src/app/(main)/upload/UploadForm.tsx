"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { createDocumentRecord, activateDocument } from "./actions";
import type { DocType } from "@/types/database";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const DOC_TYPES: { value: DocType; label: string; emoji: string }[] = [
  { value: "curs", label: "Curs", emoji: "📖" },
  { value: "seminar", label: "Seminar", emoji: "✏️" },
  { value: "laborator", label: "Laborator", emoji: "🔬" },
  { value: "examen", label: "Examen", emoji: "📝" },
  { value: "fisa", label: "Fișă", emoji: "📋" },
  { value: "altele", label: "Altele", emoji: "📎" },
];

type UploadStatus = "idle" | "uploading" | "processing" | "success" | "error";

const PROCESSING_STEPS = [
  "Verificare fișier",
  "Indexare conținut",
  "Activare document",
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm({ userId }: { userId: string }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [professor, setProfessor] = useState("");
  const [docType, setDocType] = useState<DocType>("curs");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [successDocId, setSuccessDocId] = useState<string | null>(null);
  const [successTitle, setSuccessTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File validation & selection ---

  const validateAndSetFile = useCallback((file: File) => {
    setFileError(null);

    if (file.type !== "application/pdf") {
      setFileError("Doar fișierele PDF sunt acceptate.");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setFileError(
        `Fișierul (${formatFileSize(file.size)}) depășește limita de 10MB.`
      );
      return;
    }
    setSelectedFile(file);
    // Pre-fill title from filename if empty
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, "");
      setTitle(nameWithoutExt);
    }
  }, [title]);

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // --- Drag & drop ---

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) validateAndSetFile(file);
  };

  // --- Form validation ---

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = "Titlul este obligatoriu.";
    else if (title.trim().length < 3)
      errors.title = "Titlul trebuie să aibă cel puțin 3 caractere.";
    if (!professor.trim()) errors.professor = "Profesorul este obligatoriu.";
    if (!selectedFile) errors.file = "Selectează un fișier PDF.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // --- Processing animation (3 seconds across 3 stages) ---

  const runProcessingAnimation = (): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      let step = 0;
      setProcessingStep(0);
      setProcessingProgress(0);

      const interval = setInterval(() => {
        progress += 1;
        setProcessingProgress(progress);

        const newStep = progress < 34 ? 0 : progress < 67 ? 1 : 2;
        if (newStep !== step) {
          step = newStep;
          setProcessingStep(newStep);
        }

        if (progress >= 100) {
          clearInterval(interval);
          resolve();
        }
      }, 30); // 30ms × 100 ticks = 3 000ms
    });
  };

  // --- Submit ---

  const handleSubmit = async () => {
    if (!validate()) return;

    setUploadStatus("uploading");
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const supabase = createClient();

      // Unique path scoped to this user
      const filePath = `${userId}/${Date.now()}.pdf`;

      // Simulate chunked progress (real progress events depend on SDK version)
      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 8, 90));
      }, 150);

      const { data: storageData, error: storageError } =
        await supabase.storage
          .from("documents")
          .upload(filePath, selectedFile!, {
            contentType: "application/pdf",
            upsert: false,
          });

      clearInterval(progressInterval);

      if (storageError) {
        throw new Error(
          storageError.message === "The resource already exists"
            ? "Un fișier cu același nume există deja. Încearcă din nou."
            : `Eroare stocare: ${storageError.message}`
        );
      }

      setUploadProgress(100);

      // Create PROCESSING record in DB
      const result = await createDocumentRecord({
        file_url: storageData.path,
        file_size_bytes: selectedFile!.size,
        title: title.trim(),
        professor: professor.trim(),
        doc_type: docType,
      });

      if ("error" in result) throw new Error(result.error);

      const { documentId } = result;

      // Simulated 3-second processing phase
      setUploadStatus("processing");
      await runProcessingAnimation();

      // Activate document
      const activateError = await activateDocument(documentId);
      if (activateError) throw new Error(activateError.error);

      setSuccessDocId(documentId);
      setSuccessTitle(title.trim());
      setUploadStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "A apărut o eroare neașteptată."
      );
      setUploadStatus("error");
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setFileError(null);
    setTitle("");
    setProfessor("");
    setDocType("curs");
    setFieldErrors({});
    setUploadStatus("idle");
    setUploadProgress(0);
    setProcessingStep(0);
    setProcessingProgress(0);
    setSuccessDocId(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Success State ───────────────────────────────────────────────────────

  if (uploadStatus === "success") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-deep-blue mb-2">
          Document publicat cu succes!
        </h2>
        <p className="text-sm text-medium-gray mb-1">
          <span className="font-semibold text-dark-gray">
            &ldquo;{successTitle}&rdquo;
          </span>{" "}
          este acum vizibil colegilor tăi.
        </p>
        <p className="text-sm text-medium-gray mb-8">
          Vei câștiga{" "}
          <span className="font-semibold text-accent-orange">0.05 RON</span>{" "}
          pentru fiecare descărcare unică.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-deep-blue text-white font-medium px-6 py-3 rounded-full hover:bg-blue-900 transition-colors text-sm"
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
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Mergi la Acasă
          </Link>
          <button
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-dark-gray font-medium px-6 py-3 rounded-full hover:bg-light-gray transition-colors text-sm"
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Încarcă alt document
          </button>
        </div>

        {successDocId && (
          <p className="mt-6 text-xs text-medium-gray">
            ID document:{" "}
            <span className="font-mono text-dark-gray">{successDocId}</span>
          </p>
        )}
      </div>
    );
  }

  // ─── Uploading State ─────────────────────────────────────────────────────

  if (uploadStatus === "uploading") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-light-gray rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-deep-blue animate-bounce"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-deep-blue mb-1">
          Se încarcă fișierul...
        </h2>
        <p className="text-sm text-medium-gray mb-6">{selectedFile?.name}</p>

        <div className="max-w-xs mx-auto">
          <div className="flex justify-between text-xs text-medium-gray mb-2">
            <span>Progres</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 bg-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-orange rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Processing State ────────────────────────────────────────────────────

  if (uploadStatus === "processing") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-light-gray rounded-full flex items-center justify-center mx-auto mb-5">
          <div className="w-8 h-8 border-4 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
        </div>
        <h2 className="text-lg font-bold text-deep-blue mb-1">
          Se procesează documentul...
        </h2>
        <p className="text-sm text-medium-gray mb-8">
          Verificăm și indexăm materialul tău.
        </p>

        {/* Stage steps */}
        <div className="max-w-xs mx-auto space-y-3 mb-6">
          {PROCESSING_STEPS.map((step, i) => {
            const isDone = processingStep > i;
            const isActive = processingStep === i;

            return (
              <div key={step} className="flex items-center gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors
                    ${
                      isDone
                        ? "bg-green-100 text-green-500"
                        : isActive
                        ? "bg-accent-orange/10 text-accent-orange"
                        : "bg-light-gray text-medium-gray"
                    }`}
                >
                  {isDone ? (
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
                    <span className="text-xs font-bold">{i + 1}</span>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    isDone
                      ? "text-green-600 line-through"
                      : isActive
                      ? "text-deep-blue font-medium"
                      : "text-medium-gray"
                  }`}
                >
                  {step}
                </span>
                {isActive && (
                  <div className="flex gap-0.5 ml-auto">
                    {[0, 1, 2].map((dot) => (
                      <div
                        key={dot}
                        className="w-1.5 h-1.5 bg-accent-orange rounded-full animate-bounce"
                        style={{ animationDelay: `${dot * 150}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Overall progress bar */}
        <div className="max-w-xs mx-auto">
          <div className="h-1.5 bg-light-gray rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-orange rounded-full transition-all duration-100"
              style={{ width: `${processingProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────

  if (uploadStatus === "error") {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-deep-blue mb-2">
          Eroare la încărcare
        </h2>
        <p className="text-sm text-medium-gray mb-8">{errorMessage}</p>
        <button
          onClick={resetForm}
          className="inline-flex items-center gap-2 bg-deep-blue text-white font-medium px-6 py-3 rounded-full hover:bg-blue-900 transition-colors text-sm"
        >
          Încearcă din nou
        </button>
      </div>
    );
  }

  // ─── Idle (Main Form) ────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Drag-and-Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed transition-all duration-200
          ${
            selectedFile
              ? "border-green-300 bg-green-50 cursor-default"
              : isDragging
              ? "border-accent-orange bg-orange-50 scale-[1.01] cursor-copy"
              : fileError
              ? "border-red-300 bg-red-50 cursor-pointer"
              : "border-gray-200 bg-white hover:border-accent-orange/60 hover:bg-orange-50/30 cursor-pointer"
          }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="p-8">
          {selectedFile ? (
            /* File selected — show info card */
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <svg
                  className="w-6 h-6 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 4h5v5a1 1 0 001 1h5v10H6V4z" />
                  <path d="M8 13h8v1H8zm0 3h5v1H8z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-deep-blue truncate">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-medium-gray mt-0.5">
                  {formatFileSize(selectedFile.size)} · PDF
                </p>
              </div>
              <button
                type="button"
                onClick={clearFile}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors shrink-0"
                aria-label="Elimină fișierul"
              >
                <svg
                  className="w-4 h-4 text-dark-gray"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ) : (
            /* Empty drop zone */
            <div className="text-center">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 transition-colors
                  ${isDragging ? "bg-accent-orange/20" : "bg-light-gray"}`}
              >
                <svg
                  className={`w-7 h-7 transition-colors ${
                    isDragging ? "text-accent-orange" : "text-medium-gray"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                  />
                </svg>
              </div>
              <p className="text-sm text-dark-gray font-medium">
                {isDragging
                  ? "Eliberează pentru a încărca"
                  : "Trage fișierul PDF aici"}
              </p>
              <p className="text-xs text-medium-gray mt-1">
                sau{" "}
                <span className="text-accent-orange font-medium underline underline-offset-2">
                  alege din calculator
                </span>
              </p>
              <p className="text-xs text-medium-gray mt-2">
                Doar PDF · Maxim 10MB
              </p>
            </div>
          )}
        </div>
      </div>

      {(fileError || fieldErrors.file) && (
        <p className="text-sm text-red-500 -mt-2 flex items-center gap-1.5">
          <svg
            className="w-4 h-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
            />
          </svg>
          {fileError ?? fieldErrors.file}
        </p>
      )}

      {/* Metadata fields */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-deep-blue mb-1.5">
            Titlu document
            <span className="text-accent-orange ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (fieldErrors.title)
                setFieldErrors((p) => ({ ...p, title: "" }));
            }}
            placeholder="ex. Curs 3 — Algoritmi de sortare"
            maxLength={120}
            className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors
              ${fieldErrors.title ? "border-red-300 bg-red-50" : "border-gray-200"}`}
          />
          {fieldErrors.title && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.title}</p>
          )}
        </div>

        {/* Professor */}
        <div>
          <label className="block text-sm font-semibold text-deep-blue mb-1.5">
            Profesor
            <span className="text-accent-orange ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={professor}
            onChange={(e) => {
              setProfessor(e.target.value);
              if (fieldErrors.professor)
                setFieldErrors((p) => ({ ...p, professor: "" }));
            }}
            placeholder="ex. Prof. dr. Ionescu Alexandru"
            maxLength={80}
            className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-transparent transition-colors
              ${fieldErrors.professor ? "border-red-300 bg-red-50" : "border-gray-200"}`}
          />
          {fieldErrors.professor && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.professor}</p>
          )}
        </div>

        {/* Document Type */}
        <div>
          <label className="block text-sm font-semibold text-deep-blue mb-2">
            Tip document
            <span className="text-accent-orange ml-0.5">*</span>
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {DOC_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setDocType(type.value)}
                className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 text-xs font-medium transition-all duration-150 cursor-pointer
                  ${
                    docType === type.value
                      ? "border-accent-orange bg-orange-50 text-accent-orange"
                      : "border-gray-200 bg-white text-dark-gray hover:border-accent-orange/40"
                  }`}
              >
                <span className="text-lg leading-none">{type.emoji}</span>
                <span>{type.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-medium-gray px-1">
        Prin încărcarea acestui document confirmi că deții drepturile de
        distribuire sau că materialul este creat de tine.
      </p>

      {/* Submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={uploadStatus !== "idle"}
        className="w-full flex items-center justify-center gap-2 bg-accent-orange text-white font-semibold py-4 rounded-full hover:bg-orange-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        Încarcă Document
      </button>
    </div>
  );
}
