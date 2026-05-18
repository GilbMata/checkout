/**
 * Lista extendida de dominios temporales conocidos
 * Esta lista se usa como fallback cuando ZeroBounce no está disponible
 */
export const KNOWN_DISPOSABLE_DOMAINS = [
  // Dominios comunes de temp mail
  "mails1.org",
  "mails2.org",
  "mails3.org",
  "maildrop.cc",
  "temp-mail.org",
  "tempmail.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamail.net",
  "mailinator.com",
  "mailinator.net",
  "10minutemail.com",
  "10minutemail.net",
  "throwaway.email",
  "throwawaymail.com",
  "fakeinbox.com",
  "tempail.com",
  "sharklasers.com",
  "spam4.me",
  "grr.la",
  "dispostable.com",
  "yopmail.com",
  "yopmail.fr",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "getnada.com",
  "getairmail.com",
  "mailnesia.com",
  "tempr.email",
  "discard.email",
  "discardmail.com",
  "spamgourmet.com",
  "mytrashmail.com",
  "mailcatch.com",
  "mailnull.com",
  "mailblocks.com",
  "tempmailaddress.com",
  "emailondeck.com",
  "mytemp.email",
  "spamzero.com",
  "burnermail.io",
  "tempemailco.com",
  // Nuevos dominios detectados
  "mailsac.com",
  "dropmail.me",
  "mohmal.com",
  "emailfake.com",
  "temp-mail.io",
  "tempmailo.com",
  "tempmail.plus",
  "fake-mail.net",
  "emailtemporal.org",
  "emailtemporaneo.com",
  "inboxkitten.com",
];

/**
 * Verificar si el dominio está en la lista de dominios temporales conocidos
 */
export function isKnownDisposableDomain(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return KNOWN_DISPOSABLE_DOMAINS.some(
    (known) => domain.includes(known) || known.includes(domain)
  );
}

/**
 * Agregar nuevos dominios a la lista
 */
export function addToDisposableList(domains: string[]): void {
  domains.forEach((domain) => {
    if (!KNOWN_DISPOSABLE_DOMAINS.includes(domain)) {
      KNOWN_DISPOSABLE_DOMAINS.push(domain.toLowerCase());
    }
  });
}

/**
 * Obtener copia de la lista de dominios
 */
export function getDisposableList(): string[] {
  return [...KNOWN_DISPOSABLE_DOMAINS];
}