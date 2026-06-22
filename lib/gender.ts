/**
 * Utilidades centralizadas para manejo de género.
 *
 * Formato canónico interno: "male" | "female" | "other".
 * Formato esperado por Evo: "M" | "F" | "P".
 */

export type GenderCanonical = "male" | "female" | "other";

export const GENDER_LABELS: Record<GenderCanonical, string> = {
  male: "Hombre",
  female: "Mujer",
  other: "Prefiero no decir",
};

export const GENDER_EVO_MAP: Record<GenderCanonical, string> = {
  male: "M",
  female: "F",
  other: "P",
};

/**
 * Normaliza un valor de género de entrada (español/inglés) al formato canónico.
 * Retorna null si no se puede determinar.
 */
export function normalizeGender(
  value: string | null | undefined,
): GenderCanonical | null {
  if (!value) return null;

  const normalized = value.toLowerCase().trim();

  if (["male", "masculino", "hombre"].includes(normalized)) {
    return "male";
  }

  if (["female", "femenino", "mujer"].includes(normalized)) {
    return "female";
  }

  if (["other", "prefiero no decir", "no binario", "non-binary"].includes(normalized)) {
    return "other";
  }

  return null;
}

/**
 * Convierte un género canónico al valor esperado por la API de Evo.
 * Retorna undefined si no hay género.
 */
export function genderToEvo(
  value: string | null | undefined,
): string | undefined {
  const gender = normalizeGender(value);
  if (!gender) return undefined;
  return GENDER_EVO_MAP[gender];
}

/**
 * Normaliza un valor de género proveniente de Evo al formato canónico.
 * Evo usa "M" / "F" (también puede venir como "Male" / "Female" o en español).
 * Retorna null si no se puede determinar.
 */
export function genderFromEvo(
  value: string | null | undefined,
): GenderCanonical | null {
  if (!value) return null;

  const normalized = value.toLowerCase().trim();

  if (["m", "male", "masculino", "hombre"].includes(normalized)) {
    return "male";
  }

  if (["f", "female", "femenino", "mujer"].includes(normalized)) {
    return "female";
  }

  return null;
}

/**
 * Retorna una etiqueta legible para un género canónico.
 * Si el valor no es canónico, retorna el valor original o cadena vacía.
 */
export function genderLabel(value: string | null | undefined): string {
  if (!value) return "";

  const gender = normalizeGender(value);
  if (gender) return GENDER_LABELS[gender];

  return value;
}
