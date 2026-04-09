"use client";

import { useEffect, useState } from "react";

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem("cookie_consent");
    if (storedConsent) {
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(
      "cookie_consent",
      JSON.stringify({ accepted: true, timestamp: Date.now() }),
    );
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="sticky bottom-0 left-0 right-0 z-[60] flex items-center justify-center p-3 md:p-4"
      role="dialog"
      aria-label="Consentimiento de cookies"
    >
      <div className="w-full max-w-lg animate-in slide-in-from-bottom-4 duration-500 fade-in">
        <div className="flex items-center gap-3 rounded-xl border border-orange-500/50 bg-zinc-900/95 p-3 text-white shadow-lg shadow-orange-500/10 backdrop-blur-md md:gap-4 md:p-4">
          {/* Icono del Escudito */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/20 md:h-9 md:w-9">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-orange-500 md:w-[18px] md:h-[18px]"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>

          {/* Texto */}
          <div className="flex-1">
            <p className="text-xs text-zinc-300 md:text-sm">
              Utilizamos cookies de sesión para garantizar el correcto
              funcionamiento de tu cuenta.
            </p>
          </div>

          {/* Botón Entendido */}
          <button
            onClick={handleAccept}
            className="shrink-0 rounded-lg bg-orange-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600 md:px-4 md:py-2 md:text-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
