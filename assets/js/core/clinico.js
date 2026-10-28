// ============================================================
// core/clinico.js
// ------------------------------------------------------------
// Regras e rótulos do registro psicológico usados por várias telas
// (prontuário, portal do paciente, impressões e documentos).
// ============================================================

import { ANAMNESES, COMPARTILHAMENTOS, DOCUMENTOS, EVOLUCOES, REGISTRO_DOCUMENTAL, SESSAO, escapeHTML } from "./store.js";
import { calculateAge, formatBR } from "./dateService.js";

const e = escapeHTML;

export const TIPOS_EVOLUCAO = {
  atendimento: "Atendimento",
  supervisao: "Supervisão",
  encerramento: "Encerramento",
  acolhimento: "Acolhimento",
};

export const MOTIVOS_ENCERRAMENTO = {
  alta: "Alta: objetivos terapêuticos atingidos",
  encaminhamento: "Encaminhamento a outro serviço",
  desistencia: "Desistência do paciente",
  abandono: "Abandono (sem comunicação)",
  interrupcao: "Interrupção (ex.: faltas, impossibilidade de continuar)",
  transferencia: "Transferência de serviço",
};

export const TIPOS_CONSENTIMENTO = {
  tcle_atendimento: { rotulo: "Termo de consentimento do atendimento", obrigatorio: true, descricao: "Inclui ciência de que é atividade educativa supervisionada e de registro em prontuário eletrônico (Res. CFP 13/2022, art. 8º, IV)." },
  autorizacao_responsavel: { rotulo: "Autorização do responsável legal", obrigatorio: true, descricao: "Obrigatória para menores de 18 anos (Código de Ética, art. 8º; Res. CFP 13/2022, art. 12)." },
  pesquisa: { rotulo: "Uso em pesquisa", obrigatorio: false, descricao: "Opcional e revogável; dados anonimizados e projeto aprovado em CEP (Código de Ética, art. 16)." },
  ensino_identificavel: { rotulo: "Uso em ensino com dados identificáveis", obrigatorio: false, descricao: "Opcional e revogável. Fora da supervisão do caso, o ensino usa apenas dados anonimizados." },
  gravacao: { rotulo: "Gravação de sessões", obrigatorio: false, descricao: "Opcional e revogável; consentimento prévio e escrito (Res. CFP 13/2022, art. 11)." },
};

export const TIPOS_COMPARTILHAMENTO = {
  comunicacao_autorizada: "Comunicação autorizada pelo paciente/responsável",
  encaminhamento_externo: "Encaminhamento a outro serviço",
  comunicacao_responsaveis: "Comunicação aos responsáveis (art. 13)",
  resposta_judicial: "Resposta a requisição judicial ou de órgão público",
  notificacao_compulsoria: "Notificação compulsória (ECA, violência etc.)",
  quebra_sigilo: "Quebra de sigilo (Código de Ética, art. 10)",
};

export const MODALIDADES_DOCUMENTO = {
  declaracao: { titulo: "Declaração", artigo: "art. 9º" },
  atestado: { titulo: "Atestado Psicológico", artigo: "art. 10" },
  relatorio: { titulo: "Relatório Psicológico", artigo: "art. 11" },
  laudo: { titulo: "Laudo Psicológico", artigo: "art. 13" },
  parecer: { titulo: "Parecer Psicológico", artigo: "art. 14" },
};

export const TIPOS_REGISTRO_DOCUMENTAL = {
  supervisao: "Registro de supervisão",
  instrucao: "Orientação do supervisor",
  anotacao: "Anotação não compartilhada com o paciente",
  administrativo: "Registro administrativo",
};

/** Remove o rótulo "Hipótese diagnóstica:" que alguns registros trazem no próprio texto. */
export function textoHipotese(txt) {
  return String(txt || "").replace(/^Hip[óo]tese diagn[óo]stica:\s*/i, "");
}

/** "100.111.111-11" → "***.111.111-**" (minimização em listas, LGPD art. 6º III). */
export function mascararCPF(cpf) {
  if (!cpf) return "—";
  const d = String(cpf).replace(/\D/g, "");
  if (d.length !== 11) return "***";
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}

export function ehMenor(p) {
  return p?.nascimento ? calculateAge(p.nascimento) < 18 : false;
}

/** Data do último registro do prontuário (ISO AAAA-MM-DD). */
export function ultimoRegistro(pid) {
  const datas = [
    ...(EVOLUCOES[pid] || []).map((x) => x.registradoEm || x.data),
    ...(DOCUMENTOS[pid] || []).map((x) => x.registradoEm || x.data),
    ...(REGISTRO_DOCUMENTAL[pid] || []).map((x) => x.registradoEm || x.data),
    ...(COMPARTILHAMENTOS[pid] || []).map((x) => x.registradoEm || x.data),
    ANAMNESES[pid]?.atualizadoEm,
  ]
    .filter(Boolean)
    .map((d) => String(d).slice(0, 10))
    .sort();
  return datas.at(-1) || null;
}

/**
 * Prazo mínimo de guarda: N anos após o último registro (Lei 13.787/2018,
 * art. 6º). Para menores, a contagem começa aos 18 anos (Manual
 * Orientativo CFP 2025).
 */
export function guardaAte(p) {
  const anos = SESSAO.institucional?.guardaAnos || 20;
  let base = ultimoRegistro(p.id) || new Date().toISOString().slice(0, 10);
  if (p.nascimento) {
    const [a, m, d] = p.nascimento.split("-").map(Number);
    const maioridade = `${a + 18}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (maioridade > base) base = maioridade;
  }
  const [a, m, d] = base.split("-").map(Number);
  return `${a + anos}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function fmtDataHora(iso) {
  if (!iso) return "—";
  const dt = new Date(iso);
  if (isNaN(dt)) return formatBR(String(iso).slice(0, 10));
  return dt.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

/** Linha de assinatura eletrônica + status de validação de um registro. */
export function htmlAssinaturas(reg) {
  const partes = [];
  if (reg.assinatura) partes.push(`Assinado por ${e(reg.assinatura.nome)}${reg.assinatura.registro ? ` (${e(reg.assinatura.registro)})` : ""} em ${fmtDataHora(reg.assinatura.em)}`);
  (reg.assinaturas || []).forEach((a) => partes.push(`Assinado por ${e(a.nome)}${a.registro ? ` (${e(a.registro)})` : ""} em ${fmtDataHora(a.em)}`));
  const v = reg.validacao;
  if (v?.status === "validada" && v.porId !== reg.autorId && !(reg.assinaturas || []).some((a) => a.userId === v.porId))
    partes.push(`Validado por ${e(v.por)}${v.registro ? ` (${e(v.registro)})` : ""} em ${fmtDataHora(v.em)}`);
  return partes.join(" · ");
}

export function badgeValidacao(reg) {
  const v = reg?.validacao;
  if (!v) return "";
  if (v.status === "pendente") return `<span class="badge badge-amber"><i class="bi bi-hourglass-split"></i>Aguardando validação do supervisor</span>`;
  return `<span class="badge badge-green"><i class="bi bi-patch-check"></i>Validado</span>`;
}
