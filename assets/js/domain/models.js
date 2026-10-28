// ============================================================
// domain/models.js
// ------------------------------------------------------------
// Modelos de domínio do PEP, descritos como JSDoc typedefs.
//
// Este projeto continua em JavaScript puro (ver docs/ARCHITECTURE_TARGET.md
// para a análise de por que não migramos para TypeScript nesta etapa).
// JSDoc dá boa parte do benefício de tipos — autocomplete e checagem
// leve em editores — sem exigir build step nem mudar a stack.
//
// Estes typedefs descrevem a FORMA ATUAL dos dados no mock. Os campos
// definitivos (nomes, tipos, obrigatoriedade) do contrato com o backend
// Java estão em docs/API_DTOS.md e docs/DATABASE_MONGODB.md — não são
// necessariamente idênticos a este arquivo, que documenta apenas o
// estado presente do frontend.
// ============================================================

/**
 * @typedef {"tecnico"|"supervisor"|"estudante"|"paciente"} UserRoleValue
 */

/**
 * @typedef {Object} User
 * @property {number} id
 * @property {string} login
 * @property {string} pass          Texto puro no mock — nunca mantido em memória após login (ver sanitizarUsuario).
 * @property {string} nome
 * @property {UserRoleValue} papel
 * @property {string} avatar        Iniciais, ex.: "CM".
 * @property {string} color         Cor hex do avatar.
 */

/**
 * @typedef {Object} Patient
 * @property {number} id
 * @property {string} nome
 * @property {string} cpf
 * @property {string} nascimento        Data ISO "AAAA-MM-DD".
 * @property {string} telefone
 * @property {string} email
 * @property {number[]} estudantesIds   Até 3 estudantes responsáveis pelo caso.
 * @property {number} supervisorId
 * @property {"ativo"|"inativo"} status
 * @property {string} cor               Cor institucional do avatar (fixa: #1b5e20).
 * @property {string} ini               Iniciais do nome.
 */

/**
 * @typedef {Object} Anamnesis
 * @property {string} queixa
 * @property {string} historia
 * @property {string} historico_medico
 * @property {string} medicamentos
 * @property {string} contexto
 * @property {string} hipoteses
 * @property {"rascunho"|"finalizada"} status   Uma vez "finalizada", é imutável (exigência do CRP).
 * @property {boolean} rascunho
 * @property {string} [criadoPor]
 * @property {string} [criadoEm]
 * @property {string} [atualizadoEm]
 */

/**
 * @typedef {Object} Evolution
 * @property {number} id
 * @property {number} num          Número sequencial dentro do prontuário do paciente.
 * @property {string} data         "AAAA-MM-DD HH:mm".
 * @property {string} autor
 * @property {UserRoleValue} papel
 * @property {"atendimento"|"supervisao"} tipo
 * @property {string} conteudo     Imutável após salva — nunca editada nem apagada.
 * @property {string[]} tags
 */

/**
 * @typedef {Object} Appointment
 * @property {number} id
 * @property {number} pacienteId
 * @property {number} estudanteId
 * @property {number} supervisorId
 * @property {string} data           "AAAA-MM-DD".
 * @property {string} hora           "HH:mm".
 * @property {string} local
 * @property {"presencial"|"online"} modalidade
 * @property {"confirmado"|"pendente"|"cancelado"|"faltou"} status
 */

/**
 * @typedef {Object} DocumentMeta
 * @property {string} id
 * @property {string} nome
 * @property {"pdf"|"img"|"docx"} tipo
 * @property {string} tamanho    Metadado simulado — nunca inventado aleatoriamente sem necessidade (ver docs/FRONTEND_AUDIT.md).
 * @property {string} data       "AAAA-MM-DD".
 * @property {string} autor
 * @property {"termo"|"diagnostico_externo"|"laudo"|"outro"} [categoria]
 * @property {string} [titulo]
 * @property {{profissional:string, crp:string, instituicao?:string, emitidoEm?:string}} [origem]
 *           Quem emitiu o documento, quando ele vem de fora do Serviço-Escola.
 * @property {string} [resumo]  Conclusão/hipótese diagnóstica registrada no documento.
 */

/**
 * @typedef {Object} AuditEntry
 * @property {number} id
 * @property {string} tipo
 * @property {string} ator
 * @property {string} acao
 * @property {string} obj
 * @property {string} ts
 * @property {string} dot
 */

/**
 * @typedef {Object} AccessRequest
 * @property {number} id
 * @property {number} pacienteId
 * @property {string} nome
 * @property {"pendente"|"liberado"} status
 * @property {string} solicitacao   Data ISO.
 * @property {string} [liberacao]   Data ISO.
 * @property {string} protocolo
 */

/**
 * @typedef {Object} Notification
 * @property {string} id
 * @property {string} tipo
 * @property {number} [pacienteId]
 * @property {number[]} [estudantesIds]
 * @property {string} icone
 * @property {string} cor
 * @property {string} titulo
 * @property {string} desc
 * @property {string} [tipoAcao]
 * @property {boolean} lida
 * @property {string} ts
 */

/**
 * @typedef {Object} Absence
 * @property {string} id
 * @property {number} agId
 * @property {number} pacienteId
 * @property {string} data
 * @property {string} hora
 * @property {boolean} justificada
 * @property {number[]} estudantesIds
 * @property {string} registradoPor
 * @property {string} ts
 */

export {};
