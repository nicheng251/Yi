import i18n from "i18next";

export function formatMinutes(minutes: number): string {
  const t = i18n.t;
  if (minutes === 0) return `0 ${t("components.minute")}`;
  if (minutes < 60) return `${minutes} ${t("components.minute")}`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} ${t("components.minute")}`;
  if (mins === 0) return `${hours} ${t("components.hour")}`;
  return `${hours} ${t("components.hour")} ${mins} ${t("components.minute")}`;
}
