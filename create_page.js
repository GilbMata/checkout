const fs = require('fs');
const path = require('path');

const content = `"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registrationSchema, otpSchema, type RegistrationFormData, type OTPFormData } from "@/lib/validations"
import { extractBirthDateFromCURP, isValidCURP } from "@/lib/curp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Toaster, toast } from "sonner"

interface PackageInfo {
  id: string
  name: string
  description: string
  price: number
  duration: number
  durationType: string
}

interface BranchInfo {
  id: string
  name: string
  address: string
}

export default function CheckoutPage() {
  const searchParams = useSearchParams()
  const packageId = searchParams.get("packageId")
  const branchId = searchParams.get("branchId")

  const [packageInfo, setPackageInfo] = useState<PackageInfo | null>(null)
  const [branchInfo, setBranchInfo] = useState<BranchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showOTP, setShowOTP] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    defaultValues: {
      curp: "",
      firstName: "",
      lastName: "",
      birthDate: "",
      email: "",
    },
  })

  const otpForm = useForm<OTPFormData>({
    resolver: zodResolver(otpSchema),
    defaultValues: {
      email: "",
      code: "",
    },
  })

  useEffect(() => {
    async function fetchPackage() {
      if (!packageId) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(\`/api/packages?packageId=\${packageId}&branchId=\${branchId || ""}\`)
        const data = await res.json()

        if (data.package) {
          setPackageInfo(data.package)
          setBranchInfo(data.branch)
        }
      } catch (error) {
        console.error("Error fetching package:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchPackage()
  }, [packageId, branchId])

  const handleCURPChange = (value: string) => {
    const upperValue = value.toUpperCase()
    form.setValue("curp", upperValue)

    if (upperValue.length === 18 && isValidCURP(upperValue)) {
      const birthDate = extractBirthDateFromCURP(upperValue)
      if (birthDate) {
        form.setValue("birthDate", birthDate)
      }
    }
  }

  const onSubmit = async (data: RegistrationFormData) => {
    setIsVerifying(true)
    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          packageId,
          branchId,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Error al crear prospecto")
        return
      }

      toast.success("Codigo de verificacion enviado a tu correo")
      otpForm.setValue("email", data.email)
      setShowOTP(true)
    } catch (error) {
      toast.error("Error al procesar la solicitud")
    } finally {
      setIsVerifying(false)
    }
  }

  const onOTPSubmit = async (data: OTPFormData) => {
    setIsVerifying(true)
    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        toast.error(result.error || "Codigo invalido")
        return
      }

      toast.success("Verificacion exitosa!")
      setTimeout(() => {
        window.location.href = \`/payment/\${packageId}?prospectId=\${result.prospect?.id}\`
      }, 1500)
    } catch (error) {
      toast.error("Error al verificar codigo")
    } finally {
      setIsVerifying(false)
    }
  }

  const resendOTP = async () => {
    const email = form.getValues("email")
    try {
      const res = await fetch("/api/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const result = await res.json()

      if (res.ok) {
        toast.success("Nuevo codigo enviado")
      } else {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error("Error al reenviar codigo")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50 py-12 px-4">
      <Toaster position="top-center" />
      <div className="max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Registro</CardTitle>
              <CardDescription>
                Ya tienes registro? <a href="/login" className="text-primary hover:underline">Clic aqui para iniciar sesion</a>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showOTP ? (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="curp"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CURP *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ingresa tu CURP (18 digitos)"
                              {...field}
                              onChange={(e) => handleCURPChange(e.target.value)}
                              maxLength={18}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingresa tu nombre" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Apellido *</FormLabel>
                          <FormControl>
                            <Input placeholder="Ingresa tu apellido" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fecha de nacimiento (ddmmaaaa) *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej: 15051990"
                              {...field}
                              maxLength={8}
                            />
     
