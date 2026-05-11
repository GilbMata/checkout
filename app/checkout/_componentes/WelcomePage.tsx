"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export default function WelcomePage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => setIsVisible(true), 100);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a]">
      {/* Dynamic background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#ff5b00]/20 via-[#0a0a0a] to-[#0a0a0a]" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ff5b00%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-2h-2v2h-4v2h4v4h2v-4h4v-2h-4v-2zm2-2h-4v4h4v-4zm-8%204h-4v4h4v-4zm8-4V30h-2v-2h2v-2h2v2h2v2h-2v2h-2zm2%202h-2v-2h2v2z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />

      {/* Animated lines */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#ff5b00]/30 to-transparent animate-pulse" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-[#ff5b00]/20 to-transparent animate-pulse" style={{ animationDelay: "1s" }} />

      <div className={`relative z-10 min-h-screen flex flex-col items-center justify-center p-6 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#ff5b00] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-3xl font-black tracking-tight text-white">STATION<span className="text-[#ff5b00]">24</span></span>
          </div>
        </div>

        {/* Main content */}
        <div className="max-w-lg text-center">
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            BIENVENIDO A
            <span className="block text-[#ff5b00] mt-2">TU NUEVA VIDA</span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 leading-relaxed">
            Estás a un paso de transformar tu cuerpo y tu energía. 
            <span className="text-white font-semibold"> Elige tu plan perfecto</span> para comenzar hoy mismo.
          </p>

          {/* CTA Button */}
          <a
            href="https://station24.com.mx/unete"
            className="group relative inline-flex items-center gap-3 px-8 py-4 bg-[#ff5b00] text-white text-lg font-bold rounded-xl overflow-hidden transition-all hover:bg-[#ff6a1a] hover:scale-105 hover:shadow-[0_0_40px_rgba(255,91,0,0.4)]"
          >
            <span className="relative z-10">VER PLANES</span>
            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            {/* Shimmer effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </a>

          
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-gray-600 text-sm">
            🔥 Entrena sin límites • Matrícula gratis hoy
          </p>
        </div>
      </div>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .animate-pulse {
          animation: pulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}