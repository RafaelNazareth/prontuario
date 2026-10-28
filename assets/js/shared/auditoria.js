// ============================================================
// shared/auditoria.js
// ------------------------------------------------------------
// Trilha de auditoria gravada SOMENTE pelo servidor (ou pelo servidor
// simulado do modo demonstração, com as mesmas regras).
//
//   - Contínua: o navegador não consegue desligar nem apagar
//     registros (SBIS NGS1.07.01/02).
//   - Campos: id, data/hora com fuso, tipo do evento, IP, usuário,
//     paciente e registro afetados por ID (NGS1.07.05).
//   - Sem dados clínicos nem nome do paciente no log: só IDs
//     (NGS1.07.06). A tela de auditoria resolve os nomes para quem
//     tem permissão de vê-los.
//   - Encadeada por hash (SHA-256): cada registro guarda o hash do
//     anterior, então qualquer alteração ou remoção no meio da trilha
//     é detectada por verificarTrilha().
// ============================================================

import { sha256Hex } from "./sha256.js";

// Eventos e descrições exibidas na tela de auditoria.
export const EVENTOS = {
  login_sucesso: "Entrou no sistema",
  login_falha: "Tentativa de login sem sucesso",
  login_bloqueado: "Conta bloqueada por tentativas inválidas",
  logout: "Saiu do sistema",
  sessao_expirada: "Sessão encerrada por inatividade",
  senha_alterada: "Alterou a própria senha",
  termo_aceito: "Aceitou o aviso de privacidade e termo de uso",
  usuario_criado: "Cadastrou usuário",
  usuario_desbloqueado: "Desbloqueou usuário",
  usuario_inativado: "Inativou usuário",
  usuario_reativado: "Reativou usuário",
  consulta_prontuario: "Consultou prontuário",
  consulta_documento: "Consultou documento",
  consulta_registro_documental: "Consultou registro documental",
  impressao: "Imprimiu prontuário ou documento",
  exportacao: "Exportou dados",
  consulta_auditoria: "Consultou a trilha de auditoria",
  exportacao_auditoria: "Exportou a trilha de auditoria",
  paciente_criado: "Cadastrou paciente",
  paciente_atualizado: "Atualizou cadastro do paciente",
  caso_encerrado: "Registrou encerramento do atendimento",
  consentimento_registrado: "Registrou consentimento",
  consentimento_revogado: "Registrou revogação de consentimento",
  anamnese_salva: "Salvou rascunho da avaliação de demanda",
  anamnese_finalizada: "Finalizou avaliação de demanda",
  evolucao_criada: "Registrou evolução",
  evolucao_validada: "Validou (co-assinou) evolução",
  evolucao_retificada: "Retificou evolução (nova versão)",
  documento_anexado: "Anexou documento",
  documento_emitido: "Emitiu documento psicológico",
  documento_validado: "Co-assinou documento emitido",
  documento_atualizado: "Registrou devolutiva/entrega de documento",
  registro_documental_criado: "Registrou no registro documental",
  compartilhamento_registrado: "Registrou comunicação/compartilhamento de informações",
  agendamento_criado: "Criou agendamento",
  agendamento_atualizado: "Alterou agendamento",
  falta_registrada: "Registrou falta",
  falta_atualizada: "Atualizou falta",
  notificacao_criada: "Gerou notificação",
  notificacao_atualizada: "Atualizou notificação",
  solicitacao_titular_criada: "Registrou solicitação do titular",
  solicitacao_titular_respondida: "Respondeu solicitação do titular",
  backup_criado: "Gerou cópia de segurança",
  backup_restaurado: "Restaurou cópia de segurança",
};

// Eventos de leitura que o navegador pode informar (o servidor carimba
// usuário, IP e horário; o navegador não escolhe quem fez).
export const EVENTOS_INFORMADOS_PELO_CLIENTE = new Set([
  "consulta_prontuario",
  "consulta_documento",
  "consulta_registro_documental",
  "impressao",
  "exportacao",
]);

const GENESE = "0".repeat(64);

function canonico(e) {
  const { hash, ...resto } = e;
  return JSON.stringify(resto, Object.keys(resto).sort());
}

function calcularHash(e) {
  return sha256Hex(canonico(e));
}

/**
 * Acrescenta um evento à trilha (em `db.AUDITORIA`, mais recente primeiro).
 * @param {object} db dataset completo (mutado)
 * @param {{tipo:string, userId?:number|null, papel?:string|null, ip?:string,
 *          pacienteId?:number|null, registroId?:string|number|null, complemento?:string}} ev
 */
export function registrarEvento(db, ev) {
  if (!EVENTOS[ev.tipo]) throw new Error(`Evento de auditoria desconhecido: ${ev.tipo}`);
  db.AUDITORIA ||= [];
  const anterior = db.AUDITORIA[0];
  const seq = (anterior?.seq || 0) + 1;
  const entrada = {
    id: `aud_${String(seq).padStart(6, "0")}`,
    seq,
    ts: new Date().toISOString(),
    tipo: ev.tipo,
    userId: ev.userId ?? null,
    papel: ev.papel ?? null,
    ip: ev.ip || null,
    pacienteId: ev.pacienteId ?? null,
    registroId: ev.registroId != null ? String(ev.registroId) : null,
    complemento: ev.complemento ? String(ev.complemento).slice(0, 200) : null,
    anterior: anterior?.hash || GENESE,
  };
  entrada.hash = calcularHash(entrada);
  db.AUDITORIA.unshift(entrada);
  return entrada;
}

/**
 * Sela uma lista de eventos já datados (ordem cronológica), gerando a
 * cadeia de hashes. Usado só para montar dados de demonstração.
 * Retorna no formato da trilha (mais recente primeiro).
 */
export function selarHistorico(eventos) {
  let anterior = GENESE;
  const selados = eventos.map((ev, i) => {
    const e = {
      id: `aud_${String(i + 1).padStart(6, "0")}`,
      seq: i + 1,
      ts: ev.ts,
      tipo: ev.tipo,
      userId: ev.userId ?? null,
      papel: ev.papel ?? null,
      ip: ev.ip || null,
      pacienteId: ev.pacienteId ?? null,
      registroId: ev.registroId != null ? String(ev.registroId) : null,
      complemento: ev.complemento ?? null,
      anterior,
    };
    e.hash = calcularHash(e);
    anterior = e.hash;
    return e;
  });
  return selados.reverse();
}

/** Recalcula a cadeia inteira. Retorna {integra, total, falhaEm?}. */
export function verificarTrilha(auditoria = []) {
  const cronologica = [...auditoria].reverse();
  let anterior = GENESE;
  for (const e of cronologica) {
    if (e.anterior !== anterior || calcularHash(e) !== e.hash) {
      return { integra: false, total: cronologica.length, falhaEm: e.id };
    }
    anterior = e.hash;
  }
  return { integra: true, total: cronologica.length };
}

/** Filtra a trilha para a tela de consulta (NGS1.07.07). */
export function filtrarTrilha(auditoria, { de, ate, tipo, userId, pacienteId } = {}) {
  return auditoria.filter(
    (e) =>
      (!de || e.ts.slice(0, 10) >= de) &&
      (!ate || e.ts.slice(0, 10) <= ate) &&
      (!tipo || e.tipo === tipo) &&
      (!userId || String(e.userId) === String(userId)) &&
      (!pacienteId || String(e.pacienteId) === String(pacienteId)),
  );
}

/** Exporta em CSV com identificação do software e da instituição (NGS1.07.08). */
export function trilhaCsv(entradas, { software, instituicao, geradoPor }) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const linhas = [
    `# ${software.nome} ${software.versao} — ${instituicao}`,
    `# Trilha de auditoria exportada em ${new Date().toISOString()} por usuário ${geradoPor}`,
    "id;seq;data_hora;evento;descricao;usuario_id;papel;ip;paciente_id;registro_id;complemento;hash_anterior;hash",
    ...entradas.map((e) =>
      [e.id, e.seq, e.ts, e.tipo, EVENTOS[e.tipo], e.userId, e.papel, e.ip, e.pacienteId, e.registroId, e.complemento, e.anterior, e.hash]
        .map(esc)
        .join(";"),
    ),
  ];
  return "﻿" + linhas.join("\r\n") + "\r\n";
}
