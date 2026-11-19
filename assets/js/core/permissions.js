// ============================================================
// core/permissions.js
// ------------------------------------------------------------
// Camada explícita de autorização de UX no frontend.
//
// ANTES: cada arquivo de página repetia checagens como
//   ["tecnico","supervisor","estudante"].includes(currentUser.papel)
// espalhadas pelo código (pacientes.js, dashboard.js, modals.js...).
// Isso funciona, mas não é auditável em um único lugar e é fácil
// esquecer de replicar a regra ao criar uma nova tela.
//
// AGORA: toda decisão de "quem pode fazer o quê" passa por
// can(action, resource?) ou por canAccessPage(pageId). O restante
// do código não precisa mais saber quais papéis existem.
//
// ⚠️ AVISO DE SEGURANÇA (documentado também em
// docs/SECURITY_BACKEND_REQUIREMENTS.md e docs/PERMISSIONS_MATRIX.md):
// Isto é autorização de **experiência do usuário**, não segurança
// real. Como todo o estado (currentUser, PACIENTES, etc.) vive no
// navegador do próprio usuário, qualquer pessoa com o DevTools aberto
// pode alterar `currentUser.papel` em memória e contornar estas
// checagens. A autorização que realmente importa (impedir que um
// estudante leia o prontuário de um paciente que não é seu, por
// exemplo) é feita pelo servidor Node (assets/js/shared/politica.js,
// usado por server/index.mjs), que confere cada leitura e gravação
// independentemente do que o navegador envia. Ver docs/BACKEND_CONTRACT.md.
// ============================================================

import { currentUser } from "./auth.js";
import { getPacientesPermitidos } from "./store.js";
import { UserRole } from "./enums.js";

const STAFF_ROLES = [UserRole.TECNICO, UserRole.SUPERVISOR, UserRole.ESTUDANTE];

/**
 * Verifica se o usuário logado pode executar `action` sobre `resource`.
 * `resource`, quando aplicável, é a entidade de domínio inteira (ex.: um
 * objeto paciente), não apenas o ID — assim a checagem pode evoluir para
 * regras mais finas (ex.: dono do recurso) sem mudar a assinatura.
 *
 * @param {string} action  Ex.: "patient.read", "evolution.create".
 * @param {object} [resource] Entidade relacionada, quando fizer sentido.
 * @returns {boolean}
 */
export function can(action, resource) {
  if (!currentUser) return false;
  const role = currentUser.papel;

  switch (action) {
    // Apenas o técnico administra pacientes, usuários e acesso.
    case "patient.create":
    case "patient.update":
    case "user.create":
    case "user.read":
    case "access.manage":
    case "audit.read":
      return role === UserRole.TECNICO;

    // Ler um paciente específico exige que ele esteja no escopo
    // do usuário logado (mesma regra de getPacientesPermitidos()).
    case "patient.read":
      if (!resource) return true;
      return getPacientesPermitidos().some((p) => p.id === resource.id);

    // Equipe clínica (não paciente) pode registrar evolução, finalizar
    // anamnese e anexar documento.
    case "evolution.create":
    case "anamnese.update":
    case "document.create":
      return STAFF_ROLES.includes(role);

    // Agenda: só o técnico responsável cria, altera e cancela atendimentos
    // e responde os pedidos de agendamento dos pacientes.
    case "appointment.create":
    case "appointment.update":
    case "appointment.cancel":
    case "appointment.manage":
    case "appointment.respondRequest":
      return role === UserRole.TECNICO;

    // A equipe do caso registra que o paciente faltou; justificar a falta
    // fica com o técnico ou o supervisor.
    case "appointment.registerAbsence":
      return STAFF_ROLES.includes(role);
    case "appointment.justifyAbsence":
      return role === UserRole.TECNICO || role === UserRole.SUPERVISOR;

    // O paciente não agenda nem pede nada pelo sistema: o acesso dele é
    // só de consulta. Pedidos chegam presencialmente, por telefone ou e-mail.
    case "appointment.request":
      return false;

    // Qualquer papel autenticado pode consultar sua própria agenda.
    // Co-assinatura de registros de estagiários (Res. CFP 001/2009, art. 3º):
    // supervisor do caso ou técnico responsável.
    case "record.validate":
      if (role === UserRole.TECNICO) return true;
      return role === UserRole.SUPERVISOR && (!resource || resource.supervisorId === currentUser.id);

    // Encerramento/encaminhamento do caso (Res. CFP 001/2009, art. 2º IV)
    case "case.close":
      return role === UserRole.TECNICO || role === UserRole.SUPERVISOR;

    // Documentos psicológicos (Res. CFP 06/2019), comunicações, registro
    // documental e consentimentos: equipe do caso.
    case "document.emit":
    case "sharing.create":
    case "registroDocumental.read":
    case "registroDocumental.create":
    case "consent.manage":
      return STAFF_ROLES.includes(role);

    // Solicitações do titular (LGPD art. 18): o titular pede
    // presencialmente, por telefone ou e-mail; o técnico registra e responde.
    case "titular.request":
      return role === UserRole.TECNICO;
    case "titular.respond":
      return role === UserRole.TECNICO;

    case "appointment.read":
      return true;

    default:
      return false;
  }
}

// Mapa página → papéis autorizados. Espelha o NAV_CONFIG de auth.js:
// lá decide o que aparece no menu, aqui decide o que navigate() aceita
// renderizar de fato, mesmo se chamado diretamente (ex.: via console).
const PAGE_ROLES = {
  dashboard: STAFF_ROLES,
  pacientes: STAFF_ROLES,
  agenda: STAFF_ROLES,
  acesso: [UserRole.TECNICO],
  "acesso-pac": [UserRole.TECNICO],
  auditoria: [UserRole.TECNICO],
  "meu-prontuario": [UserRole.PACIENTE],
  privacidade: [...STAFF_ROLES, UserRole.PACIENTE],
};

/**
 * Indica se o usuário logado pode abrir a página `pageId` do SPA.
 * Páginas de detalhe (ex.: "prontuario_200") usam a mesma regra de
 * "pacientes", pois a checagem fina por paciente já acontece em
 * openProntuario() via can("patient.read", paciente).
 */
export function canAccessPage(pageId) {
  if (!currentUser) return false;
  const key = pageId.startsWith("prontuario_") ? "pacientes" : pageId;
  const allowed = PAGE_ROLES[key];
  return allowed ? allowed.includes(currentUser.papel) : false;
}
