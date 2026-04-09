"use client";

import stationimg from "@/public/general-logotipo-05.png";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import Image from "next/image";

export default function HeaderComp() {
  const { branch } = useCheckoutStore();

  return (
    <div>
      <header className="bg-black shadow-md sticky top-0 z-50 backdrop-blur-md border-b w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="tracking-tighter">
              <Image
                src={stationimg}
                alt="Station 24 Fitness"
                className="h-7 w-auto object-contain"
                priority
              />
            </div>

            {/* Nombre de Sucursal */}
            {branch?.name && (
              <div className="flex flex-col items-end">
                <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                  Sucursal
                </span>
                <span className="text-white text-2xl font-black uppercase tracking-tight leading-none">
                  {branch.name}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
