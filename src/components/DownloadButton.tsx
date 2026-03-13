"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const AD_DURATION_SECONDS = 5;

interface DownloadButtonProps {
  documentId: string;
  documentTitle: string;
  isLoggedIn: boolean;
}

type DownloadState =
  | "idle"
  | "ad"
  | "downloading"
  | "success"
  | "error";

export default function DownloadButton({
  documentId,
  documentTitle,
  isLoggedIn,
}: DownloadButtonProps) {
  const [state, setState] = useState<DownloadState>("idle");
  const [secondsLeft, setSecondsLeft] = useState(AD_DURATION_SECONDS);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [downloadResult, setDownloadResult] = useState<{
    credited: boolean;
    is_duplicate: boolean;
    is_own_doc: boolean;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown logic
  useEffect(() => {
    if (state !== "ad") return;

    setSecondsLeft(AD_DURATION_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // When countdown hits 0, fire the download
  useEffect(() => {
    if (state === "ad" && secondsLeft === 0) {
      executeDownload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, state]);

  const executeDownload = useCallback(async () => {
    setState("downloading");
    setErrorMessage(null);

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ document_id: documentId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Eroare la descărcare.");
      }

      setDownloadResult({
        credited: data.credited,
        is_duplicate: data.is_duplicate,
        is_own_doc: data.is_own_doc,
      });
      setState("success");

      // Trigger actual file download via the signed URL
      const link = document.createElement("a");
      link.href = data.url;
      link.download = `${documentTitle}.pdf`;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Eroare neașteptată."
      );
      setState("error");
    }
  }, [documentId, documentTitle]);

  const handleClick = () => {
    if (!isLoggedIn) {
      window.location.href = "/login";
      return;
    }
    setState("ad");
  };

  const handleClose = () => {
    setState("idle");
    setErrorMessage(null);
    setDownloadResult(null);
  };

  // --- CTA Button (always visible) ---
  const renderButton = () => (
    <button
      type="button"
      onClick={handleClick}
      disabled={state !== "idle"}
      className="inline-flex items-center gap-2 bg-accent-orange text-white font-semibold px-5 py-2.5 rounded-full hover:bg-orange-600 transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
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
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {isLoggedIn ? "Descarcă" : "Conectează-te pentru a descărca"}
    </button>
  );

  // --- Modal Overlay ---
  const renderModal = () => {
    if (state !== "ad" && state !== "downloading" && state !== "success" && state !== "error")
      return null;

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          {/* --- Ad Interstitial --- */}
          {state === "ad" && (
            <div>
              {/* Placeholder ad area */}
              <div className="relative bg-gradient-to-br from-deep-blue to-blue-900 p-8 text-center">
                <span className="absolute top-3 right-3 text-white/40 text-[10px] font-medium uppercase tracking-widest">
                  Reclamă
                </span>
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-accent-orange"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                    />
                  </svg>
                </div>
                <p className="text-white text-sm font-medium mb-1">
                  Spațiu rezervat pentru reclamă
                </p>
                <p className="text-white/60 text-xs">
                  Acest material este gratuit datorită sponsorilor noștri.
                </p>
              </div>

              {/* Countdown footer */}
              <div className="p-5 text-center">
                <p className="text-sm text-medium-gray mb-3">
                  Descărcarea începe în
                </p>
                <div className="relative w-16 h-16 mx-auto mb-3">
                  <svg
                    className="w-16 h-16 -rotate-90"
                    viewBox="0 0 64 64"
                  >
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#F5F7FA"
                      strokeWidth="4"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      fill="none"
                      stroke="#FF6A00"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 28}`}
                      strokeDashoffset={`${
                        2 * Math.PI * 28 * (secondsLeft / AD_DURATION_SECONDS)
                      }`}
                      className="transition-all duration-1000 ease-linear"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-deep-blue">
                    {secondsLeft}
                  </span>
                </div>
                <p className="text-xs text-medium-gray">
                  Mulțumim pentru răbdare!
                </p>
              </div>
            </div>
          )}

          {/* --- Downloading spinner --- */}
          {state === "downloading" && (
            <div className="p-10 text-center">
              <div className="w-12 h-12 mx-auto mb-4">
                <div className="w-12 h-12 border-4 border-accent-orange/30 border-t-accent-orange rounded-full animate-spin" />
              </div>
              <p className="text-sm font-medium text-deep-blue">
                Se pregătește descărcarea...
              </p>
            </div>
          )}

          {/* --- Success --- */}
          {state === "success" && downloadResult && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-green-500"
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
              <h3 className="text-lg font-bold text-deep-blue mb-1">
                Descărcare reușită!
              </h3>
              <p className="text-sm text-medium-gray mb-1">
                {downloadResult.is_own_doc
                  ? "Acesta este documentul tău — nu se acordă credit."
                  : downloadResult.is_duplicate
                  ? "Ai descărcat deja acest document în ultimele 24h."
                  : "Autorul a primit +0.05 RON pentru descărcarea ta."}
              </p>
              {downloadResult.credited && (
                <p className="text-xs text-accent-orange font-semibold">
                  +0.05 RON creditat autorului
                </p>
              )}
              <button
                onClick={handleClose}
                className="mt-5 text-sm font-medium text-deep-blue bg-light-gray hover:bg-gray-200 px-6 py-2.5 rounded-full transition-colors"
              >
                Închide
              </button>
            </div>
          )}

          {/* --- Error --- */}
          {state === "error" && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-red-400"
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
              </div>
              <h3 className="text-lg font-bold text-deep-blue mb-1">
                Eroare la descărcare
              </h3>
              <p className="text-sm text-medium-gray mb-4">{errorMessage}</p>
              <button
                onClick={handleClose}
                className="text-sm font-medium text-deep-blue bg-light-gray hover:bg-gray-200 px-6 py-2.5 rounded-full transition-colors"
              >
                Închide
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderButton()}
      {renderModal()}
    </>
  );
}
