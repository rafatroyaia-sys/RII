/**
 * Helpers visuales compartidos del Radar de Asimetría:
 * mapeo de señales y niveles de riesgo a variantes de color (semáforo).
 */
import { AsymmetrySignal, AsymmetryRiskLevel } from "../../types/asymmetry";
import { BadgeProps } from "../ui/Badge";

type BadgeVariant = NonNullable<BadgeProps["variant"]>;

/** Variante de color del Badge para la señal (verde/amarillo/rojo). */
export function signalVariant(signal: AsymmetrySignal): BadgeVariant {
  switch (signal) {
    case "Oportunidad excepcional":
    case "Muy interesante":
      return "success";
    case "Interesante":
      return "info";
    case "Vigilar":
      return "warning";
    case "Descartar":
      return "error";
    default:
      return "neutral";
  }
}

/** Variante de color del Badge para el nivel de riesgo. */
export function riskVariant(risk: AsymmetryRiskLevel): BadgeVariant {
  switch (risk) {
    case "Bajo":
      return "success";
    case "Medio":
      return "warning";
    case "Alto":
    case "Muy alto":
      return "error";
    default:
      return "neutral";
  }
}

/** Formatea capitalización en millones a un texto legible (B/M). */
export function formatMarketCap(millions: number | null, currency: string): string {
  if (millions === null) return "N/D";
  if (millions >= 1000) {
    return `${(millions / 1000).toFixed(1)} B ${currency}`;
  }
  return `${Math.round(millions)} M ${currency}`;
}
