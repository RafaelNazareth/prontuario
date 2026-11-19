// ============================================================
// server/banco/mongodb.mjs
// ------------------------------------------------------------
// Banco MongoDB, ligado com PEP_BANCO=mongodb (ver docs/IMPLANTACAO.md
// e docs/DATABASE_MONGODB.md). Mesma interface do banco JSON.
//
// Coleções (um documento por registro, nunca um documento gigante):
//   usuarios, pacientes, agendamentos, faltas, notificacoes,
//   solicitacoes_titular, solicitacoes_agendamento, auditoria
//                         → um documento por item, _id = id do item
//   evolucoes, documentos, registro_documental, compartilhamentos
//                         → um documento por item, com pacienteRef
//   anamneses             → um documento por paciente (_id = id do paciente)
//   arquivos              → anexos cifrados (AES-256-GCM), até 10 MB cada
//
// Gravação: o servidor lê o conjunto, aplica as regras de
// assets/js/shared/politica.js e chama gravar(); aqui só os
// documentos que mudaram são enviados (bulkWrite). As requisições
// são atendidas em fila pelo servidor, então rode UMA instância do
// servidor por banco. Com replica set (padrão no MongoDB Atlas) a
// gravação de cada requisição é feita numa transação.
//
// O driver oficial ("mongodb", em optionalDependencies) só é
// carregado quando este banco é escolhido.
// ============================================================

import { readFileSync } from "node:fs";
import { COLECOES, LISTAS, normalizar, validarDataset } from "../jsonDb.mjs";
import { idArquivoValido } from "../cofreArquivos.mjs";

export const NOMES_COLECOES = {
  USERS: "usuarios",
  PACIENTES: "pacientes",
  ANAMNESES: "anamneses",
  EVOLUCOES: "evolucoes",
  AGENDAMENTOS: "agendamentos",
  DOCUMENTOS: "documentos",
  AUDITORIA: "auditoria",
  ACESSO_PACIENTE: "solicitacoes_titular",
  NOTIFICACOES: "notificacoes",
  FALTAS: "faltas",
  REGISTRO_DOCUMENTAL: "registro_documental",
  COMPARTILHAMENTOS: "compartilhamentos",
  SOLICITACOES_AGENDAMENTO: "solicitacoes_agendamento",
};
const MAPA_DE_OBJETO = new Set(["ANAMNESES"]);

const INDICES = [
  ["usuarios", { login: 1 }, { unique: true }],
  ["pacientes", { supervisorId: 1 }],
  ["pacientes", { estudantesIds: 1 }],
  ["agendamentos", { pacienteId: 1, data: 1 }],
  ["agendamentos", { estudanteId: 1, data: 1 }],
  ["evolucoes", { pacienteRef: 1, _ordem: 1 }],
  ["documentos", { pacienteRef: 1, _ordem: 1 }],
  ["registro_documental", { pacienteRef: 1, _ordem: 1 }],
  ["compartilhamentos", { pacienteRef: 1, _ordem: 1 }],
  ["auditoria", { seq: -1 }, { unique: true }],
  ["auditoria", { pacienteId: 1, ts: -1 }],
  ["solicitacoes_agendamento", { pacienteId: 1, status: 1 }],
];

// ── Conversão dataset ⇄ documentos ───────────────────────────
const semInternos = ({ _id, _ordem, pacienteRef, ...resto }) => resto;

/** Converte uma coleção do dataset na lista de documentos do MongoDB. */
export function paraDocumentos(chave, valor) {
  if (LISTAS.includes(chave)) {
    return (valor || []).map((item, i) => ({
      ...item,
      _id: item.id != null ? String(item.id) : `idx_${i}`,
      ...(chave === "AUDITORIA" ? {} : { _ordem: i }),
    }));
  }
  const docs = [];
  for (const [pid, v] of Object.entries(valor || {})) {
    if (MAPA_DE_OBJETO.has(chave)) {
      if (v) docs.push({ ...v, _id: String(pid), pacienteRef: String(pid) });
      continue;
    }
    (v || []).forEach((item, i) =>
      docs.push({ ...item, _id: `${pid}:${item.id != null ? item.id : `idx_${i}`}`, pacienteRef: String(pid), _ordem: i }),
    );
  }
  return docs;
}

/** Converte os documentos de volta para o formato do dataset. */
export function deDocumentos(chave, docs) {
  if (LISTAS.includes(chave)) {
    const ordenados =
      chave === "AUDITORIA" ? [...docs].sort((a, b) => b.seq - a.seq) : [...docs].sort((a, b) => (a._ordem ?? 0) - (b._ordem ?? 0));
    return ordenados.map(semInternos);
  }
  const out = {};
  if (MAPA_DE_OBJETO.has(chave)) {
    for (const d of docs) out[d.pacienteRef] = semInternos(d);
    return out;
  }
  const porPaciente = {};
  for (const d of docs) (porPaciente[d.pacienteRef] ||= []).push(d);
  for (const [pid, lista] of Object.entries(porPaciente)) out[pid] = lista.sort((a, b) => a._ordem - b._ordem).map(semInternos);
  return out;
}

const assinatura = (doc) => JSON.stringify(doc);

/** Conteúdo binário como Buffer: aceita Buffer, Uint8Array e o Binary do driver. */
function paraBuffer(c) {
  if (Buffer.isBuffer(c)) return c;
  if (c instanceof Uint8Array) return Buffer.from(c.buffer, c.byteOffset, c.byteLength);
  if (c?.buffer instanceof Uint8Array) {
    const b = c.buffer;
    return Buffer.from(b.buffer, b.byteOffset, typeof c.position === "number" ? c.position : b.byteLength);
  }
  throw new Error("Conteúdo de arquivo em formato inesperado no banco.");
}

/**
 * @param {{uri?:string, nomeBanco?:string, seedPath:string, conectar?:()=>Promise<{db:object, client?:object}>, semearSeVazio?:boolean}} opts
 *   `conectar` existe para os testes; por padrão usa o driver oficial.
 *   `semearSeVazio`: banco vazio começa com data/seed.json (a migração desliga).
 */
export async function criarBancoMongo({ uri, nomeBanco = "pep", seedPath, conectar, semearSeVazio = true }) {
  let client = null;
  let mdb;
  if (conectar) ({ db: mdb, client = null } = await conectar());
  else {
    if (!uri) throw new Error("Defina PEP_MONGODB_URI (ex.: mongodb://usuario:senha@host:27017/?authSource=admin).");
    let MongoClient;
    try {
      ({ MongoClient } = await import("mongodb"));
    } catch {
      throw new Error('Driver do MongoDB não instalado. Rode "npm install" (o pacote "mongodb" está em optionalDependencies).');
    }
    client = new MongoClient(uri, { retryWrites: true });
    await client.connect();
    mdb = client.db(nomeBanco);
  }

  for (const [nome, chaves, opts] of INDICES) await mdb.collection(nome).createIndex(chaves, opts || {});

  // Cache do que foi lido por último: permite enviar só o que mudou.
  const ultimo = new Map(); // chave da coleção → Map(_id → JSON)

  async function lerColecao(chave) {
    const docs = await mdb.collection(NOMES_COLECOES[chave]).find({}).toArray();
    ultimo.set(chave, new Map(docs.map((d) => [String(d._id), assinatura(d)])));
    return deDocumentos(chave, docs);
  }

  async function gravarTudo(dados, { substituir = false } = {}) {
    const erro = validarDataset(dados);
    if (erro) throw Object.assign(new Error(erro), { status: 400 });
    const normal = normalizar(dados);
    const operacoes = [];
    for (const chave of COLECOES) {
      const docs = paraDocumentos(chave, normal[chave]);
      const antes = substituir ? new Map() : ultimo.get(chave) || new Map();
      const agora = new Map();
      const ops = [];
      for (const d of docs) {
        const id = String(d._id);
        const sig = assinatura(d);
        agora.set(id, sig);
        if (antes.get(id) !== sig) ops.push({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } });
      }
      for (const id of antes.keys()) if (!agora.has(id)) ops.push({ deleteOne: { filter: { _id: id } } });
      if (substituir) ops.unshift({ deleteMany: { filter: {} } });
      if (ops.length) operacoes.push([chave, ops, agora]);
    }
    const aplicar = async (session) => {
      for (const [chave, ops] of operacoes) await mdb.collection(NOMES_COLECOES[chave]).bulkWrite(ops, { ordered: true, session });
    };
    if (client?.startSession && operacoes.length > 1 && process.env.PEP_MONGODB_TRANSACOES !== "0") {
      const session = client.startSession();
      try {
        await session.withTransaction(() => aplicar(session));
      } catch (e) {
        // Servidor standalone não tem transações: grava sem elas.
        if (!/Transaction numbers are only allowed|replica set/i.test(e.message)) throw e;
        await aplicar(undefined);
      } finally {
        await session.endSession();
      }
    } else await aplicar(undefined);
    for (const [chave, , agora] of operacoes) ultimo.set(chave, agora);
  }

  const banco = {
    tipo: "mongodb",
    descricao: `MongoDB, banco "${nomeBanco}"`,
    async ler() {
      const dados = {};
      for (const chave of COLECOES) dados[chave] = await lerColecao(chave);
      return normalizar(dados);
    },
    async gravar(dados) {
      await gravarTudo(dados);
    },
    /** Substitui todo o conteúdo (migração e restauração de backup). */
    async importar(dados) {
      await gravarTudo(dados, { substituir: true });
    },
    async restaurarSeed() {
      await gravarTudo(JSON.parse(readFileSync(seedPath, "utf8")), { substituir: true });
    },
    async fechar() {
      await client?.close();
    },
    arquivos: {
      async salvar(id, cifrado) {
        if (!idArquivoValido(id)) throw new Error("Identificador de arquivo inválido.");
        await mdb.collection("arquivos").insertOne({ _id: id, conteudo: cifrado, tamanhoCifrado: cifrado.length, criadoEm: new Date() });
      },
      async ler(id) {
        if (!idArquivoValido(id)) return null;
        const d = await mdb.collection("arquivos").findOne({ _id: id });
        if (!d) return null;
        return paraBuffer(d.conteudo);
      },
    },
  };

  // Banco vazio: começa com os dados de demonstração (como o db.json).
  if (semearSeVazio && (await mdb.collection("usuarios").countDocuments({})) === 0) await banco.restaurarSeed();
  return banco;
}
