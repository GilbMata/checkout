export function getAgeLabel(birthDate?: Date | string) {
    if (!birthDate) return null;

    const date = new Date(birthDate);
    const today = new Date();

    let years = today.getFullYear() - date.getFullYear();
    let months = today.getMonth() - date.getMonth();
    let days = today.getDate() - date.getDate();

    if (days < 0) months--;
    if (months < 0) {
        years--;
        months += 12;
    }

    return `${years} año${years !== 1 ? "s" : ""} · ${months} mes${months !== 1 ? "es" : ""}`;
}