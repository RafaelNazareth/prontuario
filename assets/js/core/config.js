// ============================================================
// core/config.js
// ------------------------------------------------------------
// Ponto único de configuração da aplicação.
//
// A comunicação com o servidor Node (server/index.mjs) fica em
// infrastructure/jsonDataSource.js; parâmetros de segurança e
// conformidade compartilhados com o servidor ficam em
// shared/configuracao.js. Aqui ficam só opções da interface.
// ============================================================

export const config = {
  /** "development" | "production". Controla logs de debug (ver logger.js). */
  ENVIRONMENT: "development",

  /** Fuso horário assumido pela aplicação. Ver core/dateService.js. */
  TIMEZONE: "America/Sao_Paulo",

  /**
   * Feature flags simples (Fase 27 do plano de refatoração).
   * Mantido deliberadamente pequeno — não é um sistema de flags
   * remoto, apenas interruptores locais para funcionalidades que
   * podem ser ligadas/desligadas sem editar várias telas.
   */
  FEATURES: {
    // Auto-logout por inatividade (ver core/utils.js).
    AUTO_LOGOUT: true,
  },
};
