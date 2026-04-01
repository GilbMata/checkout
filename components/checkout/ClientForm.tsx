"use client";

import {
  getMemberAction,
  getMemberbyPhoneAction,
} from "@/app/actions/evoMember";
import {
  createProspectAction,
  getProspectByEmailAction,
  getProspectByPhoneAction,
} from "@/app/actions/prospects";
import { FloatingInput } from "@/components/ui/FloatingInput";
import { FloatingLabel } from "@/components/ui/FloatingInput2";
import { Button } from "@/components/ui/button";
import { DisposableEmailAlert } from "@/components/ui/disposable-email-alert";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// import { sendOTP } from "@/lib/api/auth";
import { normalizeCURP, parseCURP } from "@/lib/curp2";
import { cn } from "@/lib/utils";
import {
  registrationSchema,
  type RegistrationFormData,
} from "@/lib/validations";
import { useCheckoutStore } from "@/store/useCheckoutStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { FormProvider, useForm } from "react-hook-form";
import "react-phone-number-input/style.css";
// import "react-phone-input-2/lib/style.css";
import { toast } from "sonner";
import { Card, CardHeader } from "../ui/card";

import { sendOTP } from "@/app/actions/send-otp";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import PhoneInput from "react-phone-number-input/react-hook-form";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
export default function ClientForm({
  initialData,
  planId,
}: {
  initialData?: any;
  planId: any;
}) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [phoneValid, setPhoneValid] = useState(false);
  const [showDisposableAlert, setShowDisposableAlert] = useState(false);
  // const [emailValid, setEmailValid] = useState(true);
  const { setStep, setEmail, setPhone, setProspectId } = useCheckoutStore();
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [autoFilled, setAutoFilled] = useState(false);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
    mode: "onChange",
    defaultValues: {
      curp: "",
      firstName: "",
      lastName: "",
      genero: "",
      birthDate: "",
      email: "",
      phone: "",
    },
  });

  const {
    handleSubmit,
    watch,
    control,
    setValue,
    setError,
    clearErrors,
    setFocus,
    formState,
  } = form;
  const { isDirty, dirtyFields } = formState;
  console.debug(
    "🚀 ~ ClientForm ~ form.formState.errors:",
    form.formState.errors,
  );

  // useEffect(() => {
  //   const value = watch("email");

  //   if (!value) return;

  //   const timeout = setTimeout(async () => {
  //     const isValid = await form.trigger("email");
  //     if (!isValid) return;

  //     validateEmail(value);
  //   }, 500);

  //   return () => clearTimeout(timeout);
  // }, [watch("email")]);

  // useEffect(() => {
  //   setFocus("phone");
  // }, [setFocus]);

  useEffect(() => {
    const value = watch("phone");
    console.debug("🚀 ~ ClientForm ~ value:", value?.length);
    // if (!value || value.length <= 11) return;
    const timeout = setTimeout(async () => {
      if (!dirtyFields?.phone) return;
      const isValid = await form.trigger("phone");
      if (!isValid) return;
      if (value) validatePhone(value);
    }, 500);
    clearErrors("phone");
    return () => clearTimeout(timeout);
  }, [watch("phone")]);

  useEffect(() => {
    const emailValue = watch("email");
    const timeout = setTimeout(() => {
      const emailError = form.formState.errors.email;
      if (emailError?.message?.includes("temporal")) {
        setShowDisposableAlert(true);
      } else {
        setShowDisposableAlert(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [watch("email"), form.formState.errors.email]);

  const handleCURPChange = (value: string) => {
    const curp = normalizeCURP(value);

    setValue("curp", curp, {
      shouldValidate: true,
      shouldDirty: true,
    });

    if (curp.length === 18) {
      const data = parseCURP(curp);
      setValue("birthDate", data.birthDateString);
      setValue("genero", data.gender);
      setAutoFilled(true);
      setTimeout(() => setAutoFilled(false), 1500);
    }
  };

  const validateEmail = async (email: string) => {
    try {
      toast.loading("Validando email...");
      const prospect = await getProspectByEmailAction(email);

      if (prospect) {
        console.debug("🚀 ~ Existe el prospecto");

        // El prospecto existe - enviar OTP
        await sendOTP({ prospectId: prospect.id });
        setEmail(email);
        setPhone(prospect.phone || "");
        setProspectId(prospect.id);
        setStep("otp");
        return;
      }

      const member = await getMemberAction(email);

      if (member) {
        console.debug("🚀 ~ Existe el member");
        // El miembro existe - crear prospecto y enviar OTP
        const phoneNumber = member.phone || "";
        const newProspect = await createProspectAction({
          email: member.email || email,
          curp: "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          genero: member.gender || "",
          birthDate: member.birthDate || "",
          areaCode: phoneNumber.slice(0, 3),
          phone: phoneNumber.slice(3, phoneNumber.length),
          planId: planId,
        });

        // Guardar prospectId en el store
        setProspectId(newProspect.id);

        await sendOTP({ prospectId: newProspect.id });
        setEmail(member.email || email);
        setPhone(phoneNumber);
        setStep("otp");
        return;
      }

      setEmailValid(true);
    } catch (err) {
      console.error(err);
      toast.error("Error API");
    } finally {
      toast.dismiss();
    }
  };

  const validatePhone = async (phone: string) => {
    try {
      toast.loading("Validando teléfono...");
      const prospect = await getProspectByPhoneAction(phone);

      if (prospect && prospect.id) {
        await sendOTP({ prospectId: prospect.id });

        setEmail(prospect.email);
        setPhone(phone);
        setProspectId(prospect.id);
        setStep("otp");
        // setStep("payment");
        return;
      }

      const member = await getMemberbyPhoneAction(phone.slice(3, phone.length));
      console.debug("🚀 ~ validatePhone ~ member:", member);

      if (member) {
        // El miembro existe - crear prospecto y enviar OTP
        const phoneNumber = phone;
        const newProspect = await createProspectAction({
          email: member.email || "",
          curp: "",
          firstName: member.firstName || "",
          lastName: member.lastName || "",
          genero: member.gender || "",
          birthDate: member.birthDate || "",
          areaCode: phoneNumber.slice(0, 3),
          phone: phoneNumber.slice(3, phoneNumber.length),
          planId: planId,
        });

        // Guardar prospectId en el store
        setProspectId(newProspect.id);

        await sendOTP({ prospectId: newProspect.id });

        setEmail(member.email || "");
        setPhone(phoneNumber);
        setStep("otp");
        return;
      }

      setPhoneValid(true);
    } catch (err) {
      console.error(err);
      toast.error("Error API");
    } finally {
      toast.dismiss();
    }
  };

  const onSubmit = async (data: RegistrationFormData) => {
    try {
      const phoneNumber = data.phone || "";
      toast.loading("Guardando usuario...");
      const prospect = await createProspectAction({
        email: data.email,
        curp: data.curp,
        firstName: data.firstName,
        lastName: data.lastName,
        genero: data.genero,
        birthDate: data.birthDate,
        areaCode: phoneNumber.slice(0, 3),
        phone: phoneNumber.slice(3, phoneNumber.length),
        planId: planId,
      });

      // Guardar prospectId en el store
      setProspectId(prospect.id);

      await sendOTP({ prospectId: prospect.id });
      setEmail(data.email);
      setPhone(phoneNumber);
      setStep("otp");
      toast.dismiss();
    } catch (error) {
      console.error("Error creating prospect:", error);
      toast.dismiss();
      toast.error("Error al registrar usuario");
    }
  };

  return (
    // <Card className="px- md:px-6 lg:px-8 bg-[#1e1e1e] ">
    <Card className="w-full max-w-xl mx-auto bg-[#1e1e1e] text-white p-4 md:p-6 rounded-2xl shadow-xl space-y-6">
      <CardHeader className="space-y-4 px-6 pt-6">
        <div className="space-y-1">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
            Crea tu cuenta
          </h1>

          <p className="text-sm md:text-base text-zinc-400">
            Completa tu registro para continuar con tu planId
          </p>
        </div>

        <div className="pt-2">
          <p className="text-sm text-zinc-500">
            ¿Ya tienes cuenta?{" "}
            <button className="text-orange-400 hover:text-orange-300 font-medium transition-all hover:underline underline-offset-4">
              Iniciar sesión
            </button>
          </p>
        </div>
      </CardHeader>
      {/* <CardHeader className="m-2">
        <h1 className="text-4xl text-white mb-2">
          Registro
        </h1>
        <p className="text-white mb-10 text-xl">
          ¿Tiene registro? Clic aquí para iniciar sesión.
        </p>
      </CardHeader> */}

      {/* <ScrollArea className="h-125 overflow-y-auto w-full"> */}
      <FormProvider {...form}>
        <Form form={form} onSubmit={onSubmit}>
          <div className=" flex flex-col gap-3 px-8">
            {/* <div className="flex flex-col space-y-4"> */}

            {/* Phone - visible from start */}
            <FormField
              control={control}
              name="phone"
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-col items-start">
                  {/* <FormLabel className="text-gray-700 font-medium text-md">
                    Teléfono
                  </FormLabel> */}
                  <FormControl>
                    <PhoneInput
                      autoFocus
                      // country={"mx"}
                      defaultCountry="MX"
                      value={field.value || ""}
                      onChange={(value?: string | undefined) =>
                        field.onChange(value || "")
                      }
                      autoComplete="on"
                      name="phone"
                      className="w-full"
                      inputComponent={FloatingInput}
                      // @ts-ignore
                      label="Teléfono *"
                      // focusInputOnCountrySelection
                      // rules={{ required: true }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <motion.div
              initial={false}
              animate={{
                opacity: phoneValid ? 1 : 0,
                height: phoneValid ? "auto" : 0,
                y: phoneValid ? 0 : -10,
              }}
              transition={{
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="overflow-hidden"
            >
              <div className=" flex flex-col  gap-6 pt-2">
                <FormField
                  control={control}
                  name="curp"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      {/* <FormLabel>
                      CURP <span className="text-red-500 font-medium">*</span>
                    </FormLabel> */}
                      <FormControl>
                        <FloatingInput
                          label="CURP *"
                          {...field}
                          value={field.value}
                          onChange={(e) => handleCURPChange(e.target.value)}
                          // error={fieldState.error?.message}
                          maxLength={18}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="firstName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FloatingInput
                        label="Nombre *"
                        {...field}
                        // error={fieldState.error?.message}
                        // value={field.value ?? ""}
                        // className="h-12 border-gray-300 "
                      />
                      <FloatingLabel htmlFor="floating-customize">
                        Customize
                      </FloatingLabel>
                      {/* </FormControl> */}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* lastName */}
                <FormField
                  control={control}
                  name="lastName"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      {/* <FormLabel className="text-gray-700 font-medium">Apellido *</FormLabel> */}
                      <FormControl>
                        <FloatingInput label="Apellido *" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Genero */}
                  <FormField
                    control={control}
                    name="genero"
                    render={({ field, fieldState }) => (
                      <FormItem
                        className={cn(
                          " transition-all duration-400",
                          autoFilled &&
                            "animate-in fade-in slide-in-from-bottom-2 ",
                        )}
                      >
                        <FormLabel>Genero</FormLabel>
                        <FormControl className="  ">
                          <Select
                            readOnly
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <SelectTrigger className=" bg-transparent!  w-full h-12 border-0 border-b-2 rounded-none">
                              <SelectValue
                                placeholder="Selecciona genero"
                                className=""
                              />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectGroup>
                                <SelectItem value="Masculino">
                                  Masculino
                                </SelectItem>
                                <SelectItem value="Femenino">
                                  Femenino
                                </SelectItem>
                              </SelectGroup>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* birthDate */}
                  <FormField
                    control={control}
                    name="birthDate"
                    render={({ field }) => {
                      return (
                        <FormItem
                          className={cn(
                            "w-full transition-all duration-300",
                            autoFilled &&
                              "animate-in fade-in slide-in-from-bottom-2 ",
                          )}
                        >
                          <FormLabel className="">
                            <span>Fecha de nacimiento</span>
                          </FormLabel>
                          <Popover
                            open={calendarOpen}
                            onOpenChange={setCalendarOpen}
                          >
                            <PopoverTrigger
                              disabled
                              className=" w-full  border-0 border-b-2 rounded-none"
                            >
                              <FormControl>
                                <Button
                                  aria-readonly="true"
                                  className={`w-full bg-transparent px-  outline-none transition-all rounded-none  text-left font-normal ${
                                    !field.value && "text-muted-foreground"
                                  }`}
                                >
                                  {field.value ? (
                                    format(new Date(field.value), "PPP", {
                                      locale: es,
                                    })
                                  ) : (
                                    <span>Selecciona una fecha</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) => {
                                  if (date) {
                                    const normalized = new Date(
                                      date.setHours(0, 0, 0, 0),
                                    );
                                    field.onChange(normalized.toISOString());
                                    // field.onChange(date.toISOString().split("T")[0]); // guarda como YYYY-MM-DD
                                    setCalendarOpen(false);
                                  }
                                }}
                                disabled={(date) =>
                                  date > new Date() ||
                                  date < new Date("2005-01-01")
                                }
                                captionLayout="dropdown"
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                </div>

                <FormField
                  control={control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      {/* <FormLabel className="text-gray-700 font-medium">Correo electrónico *</FormLabel> */}
                      <FormControl>
                        <FloatingInput
                          label="Correo electrónico *"
                          type="email"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      {showDisposableAlert && (
                        <DisposableEmailAlert className="mt-2" />
                      )}
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={!form.formState.isValid || isPending}
                  className="w-full h-12 mt-4 hover:bg-orange-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? "Validando..." : "Continuar"}
                </Button>
                <p className="text-xs text-gray-400 text-center">
                  Tus datos personales están seguros y serán utilizados
                  únicamente para el registro de tu membresía.
                </p>
              </div>
              {/* </div> */}

              {/* <div className="flex justify-end gap-3 mb-4">

              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
              >
                Cancelar
              </Button>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-linear-to-r from-orange-400 to-pink-500 hover:from-orange-600 hover:to-pink-600"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? "Guardando..." : "Guardar"}
              </Button>

            </div> */}
            </motion.div>
          </div>
        </Form>
      </FormProvider>
      {/* </ScrollArea> */}
    </Card>
  );
}
