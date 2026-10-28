// ============================================================
// core/logger.js
// ------------------------------------------------------------
// Abstração fina sobre console.*, para que:
//   1) logs de debug possam ser desligados em produção sem
//      procurar/apagar console.log espalhados pelo código;
//   2) quando o backend existir, seja simples trocar o destino
//      dos logs (ex.: enviar erros para um serviço de monitoramento)
//      trocando a implementação aqui, sem tocar nos chamadores.
//
// Uso: import { logger } from "./logger.js"; logger.warn(...)
// ============================================================

import { config } from "./config.js";

function shouldLog(level) {
  if (level === "debug") return config.ENVIRONMENT !== "production";
  return true;
}

export const logger = {
  debug(...args) {
    if (shouldLog("debug")) console.debug("[PEP]", ...args);
  },
  info(...args) {
    if (shouldLog("info")) console.info("[PEP]", ...args);
  },
  warn(...args) {
    if (shouldLog("warn")) console.warn("[PEP]", ...args);
  },
  error(...args) {
    if (shouldLog("error")) console.error("[PEP]", ...args);
  },
};
