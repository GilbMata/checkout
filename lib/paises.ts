export interface Country {
  code: string;
  name: string;
  iso: string;
}

export const LATAM_COUNTRIES: Country[] = [
  { code: "+52", name: "México", iso: "MX" },
  { code: "+1", name: "Estados Unidos", iso: "US" },
  { code: "+1", name: "Canadá", iso: "CA" },
  { code: "+54", name: "Argentina", iso: "AR" },
  { code: "+55", name: "Brasil", iso: "BR" },
  { code: "+56", name: "Chile", iso: "CL" },
  { code: "+57", name: "Colombia", iso: "CO" },
  { code: "+58", name: "Venezuela", iso: "VE" },
  { code: "+51", name: "Perú", iso: "PE" },
  { code: "+503", name: "El Salvador", iso: "SV" },
  { code: "+505", name: "Nicaragua", iso: "NI" },
  { code: "+506", name: "Costa Rica", iso: "CR" },
  { code: "+507", name: "Panamá", iso: "PA" },
  { code: "+509", name: "Haití", iso: "HT" },
  { code: "+591", name: "Bolivia", iso: "BO" },
  { code: "+592", name: "Guyana", iso: "GY" },
  { code: "+593", name: "Ecuador", iso: "EC" },
  { code: "+594", name: "Guayana Francesa", iso: "GF" },
  { code: "+595", name: "Paraguay", iso: "PY" },
  { code: "+596", name: "Martinica", iso: "MQ" },
  { code: "+597", name: "Surinam", iso: "SR" },
  { code: "+598", name: "Uruguay", iso: "UY" },
  { code: "+599", name: "Antillas Neerlandesas", iso: "AN" },
  { code: "+500", name: "Islas Malvinas", iso: "FK" },
  { code: "+501", name: "Belice", iso: "BZ" },
  { code: "+502", name: "Guatemala", iso: "GT" },
  { code: "+504", name: "Honduras", iso: "HN" },
  { code: "+509", name: "Haití", iso: "HT" },
];

export const DEFAULT_COUNTRY = LATAM_COUNTRIES[0];
