const TEMPORARY_EMAIL_DOMAINS = [
  'tempmail.com',
  'throwaway.email',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'fakeinbox.com',
  'trashmail.com',
  'yopmail.com',
  'dispostable.com',
  'mailcatch.com',
  'mailexpire.com',
  'mintemail.com',
  'sharklasers.com',
  'spamgourmet.com',
  'spammail.com',
  'tempemail.net',
  'throwemail.com',
  'emailondeck.com',
  'fakeemailgenerator.com',
  'email-temp.com',
  'mohmal.com',
  'tempail.com',
  'tempr.email',
  'discard.email',
  'maildrop.cc',
]

export function isValidCURP(curp: string): boolean {
  const curpRegex = /^[A-Z]{4}\d{6}[A-Z]{6}\d{2}$/
  return curpRegex.test(curp.toUpperCase())
}



export function extractBirthDateFromCURP(curp: string): string | null {
  if (!isValidCURP(curp)) return null

  const year = curp.substring(4, 6)
  const month = curp.substring(6, 8)
  const day = curp.substring(8, 10)

  const fullYear = parseInt(year) >= 0 && parseInt(year) <= 24
    ? `20${year}`
    : `19${year}`

  return `${day}${month}${fullYear}`
}

export function isTemporaryEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return TEMPORARY_EMAIL_DOMAINS.includes(domain)
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return false
  if (isTemporaryEmail(email)) return false
  return true
}
