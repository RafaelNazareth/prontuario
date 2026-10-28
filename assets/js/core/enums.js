// ============================================================
// core/enums.js
// ------------------------------------------------------------
// Constantes centralizadas para valores de status que hoje
// circulam como strings literais soltas ("ativo", "confirmado",
// "finalizada"...) por vários arquivos.
//
// Este arquivo NÃO substitui todas as ocorrências existentes de
// uma vez (isso tocaria dezenas de linhas em pacientes.js,
// dashboard.js, agenda.js, modals.js só por consistência
// cosmética, com risco de regressão desproporcional ao ganho).
// Novo código — e o código já migrado como core/store.js
// (badgeAgendamento) e os repositórios — deve importar daqui.
// A adoção nas telas restantes é dívida técnica documentada em
// docs/FUTURE_IMPROVEMENTS.md.
// ============================================================

export const UserRole = Object.freeze({
  TECNICO: "tecnico",
  SUPERVISOR: "supervisor",
  ESTUDANTE: "estudante",
  PACIENTE: "paciente",
});

export const PatientStatus = Object.freeze({
  ATIVO: "ativo",
  INATIVO: "inativo",
});

export const AppointmentStatus = Object.freeze({
  CONFIRMADO: "confirmado",
  PENDENTE: "pendente",
  CANCELADO: "cancelado",
  FALTOU: "faltou",
});

export const AnamnesisStatus = Object.freeze({
  RASCUNHO: "rascunho",
  FINALIZADA: "finalizada",
});

export const AccessRequestStatus = Object.freeze({
  PENDENTE: "pendente",
  LIBERADO: "liberado",
});

export const NotificationType = Object.freeze({
  EVOLUCAO_PENDENTE: "evolucao_pendente",
  TROCA_SOLICITADA: "troca_solicitada",
  TROCA_REALIZADA: "troca_realizada",
  FALTA_REGISTRADA: "falta_registrada",
});

export const AuditActionType = Object.freeze({
  LOGIN: "login",
  CADASTRO: "cadastro",
  EVOLUCAO: "evolucao",
  ANAMNESE: "anamnese",
  AGENDA: "agenda",
  ACESSO: "acesso",
  EXPORT: "export",
  FALTA: "falta",
  TROCA: "troca",
});
