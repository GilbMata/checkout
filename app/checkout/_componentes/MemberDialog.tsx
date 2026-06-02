"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, MessageCircle } from "lucide-react";

interface MemberDialogProps {
  open: boolean;
  member?: boolean;
  onGoHome: () => void;
}

/**
 * Diálogo que se muestra cuando se detecta que el teléfono ya está registrado
 * como miembro en Evo (aunque no tenga membresía activa).
 * Invita a contactar por WhatsApp para retomar la compra.
 */
export default function MemberDialog({ open, onGoHome }: MemberDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) return;
      }}
      disablePointerDismissal
    >
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[90vh] flex-col rounded-2xl border-zinc-700 bg-linear-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-0 text-white sm:max-w-lg gap-0"
      >
        {/* Barra decorativa superior */}
        <div className="absolute top-0 left-0 right-0 z-10 h-1.5 shrink-0 rounded-t-2xl bg-linear-to-r from-orange-500 via-orange-400 to-orange-600" />

        {/* Header con icono de alerta — fijo */}
        <div className="shrink-0 border-b border-zinc-800 px-6 pb-2 pt-6">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
              <AlertTriangle className="h-7 w-7 text-orange-400" />
            </div>
            <DialogTitle className="pr-8 text-xl font-bold">
              Proceso de compra pendiente
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Contenido — mensaje + WhatsApp */}
        <div className="flex flex-col items-center gap-6 px-6 py-8">
          <p className="text-center text-sm text-zinc-400">
            Notamos que dejaste un proceso de compra pendiente. <br /> ¡Nos
            encantaría ayudarte a terminarlo!
          </p>

          <a
            href="https://api.whatsapp.com/send/?phone=523315840335&text=Hola%2C+inicie+la+compra+de+mi+membres%C3%ADa+en+la+web+y+quiero+completarla"
            target="_blank"
            rel="noopener noreferrer"
            className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500"
          >
            <MessageCircle className="h-4 w-4" />
            Contactanos por WhatsApp
          </a>
        </div>

        {/* Footer — fijo abajo */}
        <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-4">
          <Button
            onClick={onGoHome}
            className="h-10 w-full rounded-xl bg-orange-500 font-semibold text-white transition-all duration-200 hover:bg-orange-600"
          >
            Volver al inicio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
