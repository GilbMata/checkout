"use client";

import { type ActiveMemberResult } from "@/app/actions/evoActions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Calendar, MapPin, Shield, MessageCircle } from "lucide-react";

interface ActiveMemberDialogProps {
  open: boolean;
  members: ActiveMemberResult[];
  onGoHome: () => void;
}

/**
 * Diálogo modal que se muestra cuando el usuario ya tiene una membresía activa.
 * Se usa tanto en PhoneForm (antes de enviar OTP) como en StepPayment.
 */
export default function ActiveMemberDialog({
  open,
  members,
  onGoHome,
}: ActiveMemberDialogProps) {
  const firstActive = members[0];

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

        {/* Header con icono de alerta — fijo, no scroll */}
        <div className="shrink-0 border-b border-zinc-800 px-6 pb-2 pt-6">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-orange-500/20 bg-orange-500/10">
              <AlertTriangle className="h-7 w-7 text-orange-400" />
            </div>
            <DialogTitle className="pr-8 text-xl font-bold">
              Ya tienes una membresía activa
            </DialogTitle>
            <p className="mt-2 text-sm text-zinc-400">
              El usuario{" "}
              <span className="font-medium text-white">
                {firstActive?.name}
              </span>{" "}
              ya cuenta con{" "}
              {members.length > 1
                ? `${members.length} membresías activas`
                : "una membresía activa"}{" "}
              en Station24.
            </p>
          </DialogHeader>
        </div>

        {/* Contenido del diálogo — scrollable */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-6">
          {members.map((member, idx) => (
            <div
              key={`${member.idMember}-${member.idMembership}`}
              className="overflow-hidden rounded-xl border border-zinc-700/50 bg-zinc-800/40"
            >
              {/* Nombre del plan */}
              <div className="border-b border-zinc-700/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
                    <Shield className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      {members.length > 1 ? `Plan #${idx + 1}` : "Plan actual"}
                    </p>
                    <p className="text-base font-semibold text-white">
                      {member.nameMembership}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sucursal y terminación */}
              <div className="grid grid-cols-2 divide-x divide-zinc-700/50">
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Sucursal
                    </p>
                  </div>
                  <p className="text-sm font-medium text-zinc-200">
                    {member.branch
                      ? `${member.branch.name}`
                      : `ID: ${member.idBranch}`}
                  </p>
                </div>
                <div className="p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                    <p className="text-xs uppercase tracking-wider text-zinc-500">
                      Terminación
                    </p>
                  </div>
                  <p className="mt-1 text-sm font-medium text-zinc-200">
                    {member.membershipEnd?.split("T")[0] ?? "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))}

        </div>

        {/* Bloque fijo — mensaje + WhatsApp */}
        <div className="shrink-0 border-t border-zinc-800 px-6 py-4">
          <div className="rounded-xl border border-zinc-700/30 bg-zinc-800/30 p-4">
            <p className="mb-4 text-center text-sm text-zinc-400">
              No es posible realizar una nueva compra mientras tengas una
              membresía activa.
            </p>
            <a
              href="https://api.whatsapp.com/send/?phone=523315840335&text=Hola%2C+inicie+la+compra+de+mi+membres%C3%ADa+en+la+web+y+quiero+completarla"
              target="_blank"
              rel="noopener noreferrer"
              className="mx-auto flex w-fit items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-500"
            >
              <MessageCircle className="h-4 w-4" />
              Contactar por WhatsApp
            </a>
          </div>
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
