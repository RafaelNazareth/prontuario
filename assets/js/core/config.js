// ============================================================
// core/config.js
// ------------------------------------------------------------
// Ponto único de configuração da aplicação.
//
// Hoje quase tudo aqui é decorativo (a aplicação roda 100% no
// frontend, sem API). O valor deste arquivo é estrutural: quando
// o backend Java existir, a troca de mock -> API acontece mudando
// USE_MOCK_BACKEND para false e apontando API_BASE_URL — sem
// precisar caçar URLs ou flags espalhadas pelo código-fonte.
//
// Ver docs/BACKEND_CONTRACT.md (versionamento /api/v1) e
// docs/MIGRATION_GUIDE.md.
// ============================================================

export const config = {
  /** "development" | "production". Controla logs de debug (ver logger.js). */
  ENVIRONMENT: "development",

  /**
   * Base da futura API REST Java. Não usado enquanto USE_MOCK_BACKEND
   * for true — mantido aqui para não precisar procurar onde declarar
   * quando a integração real começar.
   */
  API_BASE_URL: "/api/v1",

  /**
   * Enquanto true, os dados são lidos/gravados em data/db.json pelo
   * servidor local (server/index.mjs, rota /api/data).
   */
  USE_MOCK_BACKEND: true,

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
