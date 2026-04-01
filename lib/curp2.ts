export const CURP_STATES: Record<string, string> = {
  AS: "Aguascalientes",
  BC: "Baja California",
  BS: "Baja California Sur",
  CC: "Campeche",
  CL: "Coahuila",
  CM: "Colima",
  CS: "Chiapas",
  CH: "Chihuahua",
  DF: "Ciudad de México",
  DG: "Durango",
  GT: "Guanajuato",
  GR: "Guerrero",
  HG: "Hidalgo",
  JC: "Jalisco",
  MC: "Estado de México",
  MN: "Michoacán",
  MS: "Morelos",
  NT: "Nayarit",
  NL: "Nuevo León",
  OC: "Oaxaca",
  PL: "Puebla",
  QT: "Querétaro",
  QR: "Quintana Roo",
  SP: "San Luis Potosí",
  SL: "Sinaloa",
  SR: "Sonora",
  TC: "Tabasco",
  TS: "Tamaulipas",
  TL: "Tlaxcala",
  VZ: "Veracruz",
  YN: "Yucatán",
  ZS: "Zacatecas",
  NE: "Nacido en el extranjero"
}

const CURP_FORBIDDEN_WORDS = [
  "BACA", "BAKA", "BUEI", "BUEY", "CACA", "CACO", "CAGA", "CAGO",
  "CAKA", "CAKO", "COGE", "COGI", "COJA", "COJE", "COJI", "COJO",
  "COLA", "CULO", "FALO", "FETO", "GETA", "GUEI", "GUEY", "JETA",
  "JOTO", "KACA", "KACO", "KAGA", "KAGO", "KAKA", "KULO", "MAME",
  "MAMO", "MEAR", "MEAS", "MEON", "MIAR", "MION", "MOCO", "MULA",
  "PEDA", "PEDO", "PENE", "PUTA", "PUTO", "QULO", "RATA", "RUIN"
]

export function hasForbiddenWord(curp: string) {
  const prefix = curp.substring(0, 4)
  return CURP_FORBIDDEN_WORDS.includes(prefix)
}

export function normalizeCURP(curp: string) {
  const upper = curp.toUpperCase()
  const prefix = upper.substring(0, 4)
  if (CURP_FORBIDDEN_WORDS.includes(prefix)) {
    return prefix[0] + "X" + prefix.substring(2) + upper.substring(4)
  }
  return upper
}

export function validateCURP(curp: string) {
  const year = curp.substring(4, 6)
  const month = curp.substring(6, 8)
  const day = curp.substring(8, 10)

  const fullYear = Number(year) > 30
    ? `19${year}`
    : `20${year}`

  if (!isValidDate(fullYear, month, day)) {
    return false
  }

  const expectedDigit = calculateVerifier(curp.slice(0, 17))
  const actualDigit = Number(curp[17])
  return expectedDigit === actualDigit
}

export function validateCURPStructrual(curp: string) {
  const CURP_REGEX =
    /^[A-Z][AEIOU][A-Z]{2}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/

  if (!CURP_REGEX.test(curp)) {
    return false
  }
  return true
}

function isValidDate(year: string, month: string, day: string) {
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  )
  return (
    date.getFullYear() === Number(year) &&
    date.getMonth() + 1 === Number(month) &&
    date.getDate() === Number(day)
  )
}

const CURP_TABLE = "0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ"
export function calculateVerifier(curp17: string) {
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const value = CURP_TABLE.indexOf(curp17[i])
    sum += value * (18 - i)
  }
  const digit = 10 - (sum % 10)
  return digit === 10 ? 0 : digit
}

export function parseCURP(curp: string) {
  const upper = curp.toUpperCase()
  const year = upper.substring(4, 6)
  const month = upper.substring(6, 8)
  const day = upper.substring(8, 10)

  const fullYear =
    Number(year) > 30
      ? 1900 + Number(year)
      : 2000 + Number(year)

  const birthDate = new Date(fullYear, Number(month) - 1, Number(day))

  const genderCode = upper[10]
  const stateCode = upper.substring(11, 13)

  return {
    birthDate,
    birthDateString: `${fullYear}-${month}-${day}`,
    // age: calculateAge(birthDate),
    gender: genderCode === "H" ? "Masculino" : "Femenino",
    stateCode,
    state: CURP_STATES[stateCode] ?? "Desconocido",
    rfcBase: upper.substring(0, 10)
  }
}