"use client";

import { logoutAction } from "@/app/actions/logout";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import stationimg from "@/public/general-logotipo-05.png";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import Image from "next/image";
import Link from "next/link";

type SessionData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
} | null;

export default function HeaderComp({ session }: { session?: SessionData }) {
  const { branch } = useCheckoutStore();

  // Normalizar nombre: primera letra mayúscula, resto minúscula
  const normalizeName = (name: string) =>
    name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

  const displayName = session
    ? `${normalizeName(session.firstName)} ${normalizeName(session.lastName)}`
    : "";

  // Calcular iniciales: primera letra del nombre + primera letra del apellido
  const initials = session
    ? `${session.firstName.charAt(0)}${session.lastName.charAt(0)}`.toUpperCase()
    : "U";

  return (
    <header className=" shadow-md sticky top-0 z-50 w-full bg-white/10 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="shrink-0">
            <Link href="/" className="tracking-tighter">
              <Image
                src={stationimg}
                alt="Station 24 Fitness"
                className="h-4 w-auto object-contain md:h-7"
                priority
              />
            </Link>
          </div>

          {/* Right side: Branch info + User */}
          <div className="flex items-center gap-4">
            {branch?.name && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  Sucursal
                </span>
                <span className="text-white text-xl lg:text-2xl font-black uppercase tracking-tight leading-none">
                  {branch.name}
                </span>
              </div>
            )}

            {/* Botón de Usuario con Popover */}
            {session && (
              <Popover>
                <PopoverTrigger>
                  <button
                    title={displayName}
                    className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <span className="text-white text-sm font-bold">
                      {initials}
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-56 bg-zinc-900 border-zinc-700"
                  align="end"
                  sideOffset={8}
                >
                  <div className="flex flex-col gap-1">
                    <p className="text-white text-sm font-medium">
                      {displayName}
                    </p>
                    <p className="text-gray-400 text-xs truncate">
                      {session.email}
                    </p>
                  </div>
                  <div className="h-px bg-zinc-700 my-3" />
                  <button
                    onClick={() => logoutAction()}
                    className="w-full text-left text-gray-300 hover:text-white text-sm flex items-center gap-2 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                    Cerrar sesión
                  </button>
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
