// ============================================================
// server/banco/json.mjs
// ------------------------------------------------------------
// Banco em arquivo JSON (padrão; bom para desenvolvimento e para a
// implantação inicial de um serviço pequeno).
//
//   data/db.json        → dados (ver server/jsonDb.mjs)
//   data/arquivos/*.bin → arquivos anexados, cifrados (cofreArquivos.mjs)
//
// Mesma interface do banco MongoDB (server/banco/mongodb.mjs), assim
// o servidor não sabe qual dos dois está em uso.
// ============================================================

import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import { createJsonDb } from "../jsonDb.mjs";
import { idArquivoValido } from "../cofreArquivos.mjs";

export function criarBancoJson(dataDir) {
  const db = createJsonDb(dataDir);
  const pastaArquivos = join(dataDir, "arquivos");
  const caminho = (id) => {
    if (!idArquivoValido(id)) throw new Error("Identificador de arquivo inválido.");
    return join(pastaArquivos, `${id}.bin`);
  };

  return {
    tipo: "json",
    descricao: `arquivo JSON em ${db.dbPath}`,
    dbPath: db.dbPath,
    async ler() {
      return db.ler();
    },
    async gravar(dados) {
      db.gravar(dados);
    },
    async restaurarSeed() {
      db.restaurarSeed();
    },
    async fechar() {},

    arquivos: {
      /** Grava o conteúdo JÁ CIFRADO. Arquivos nunca são sobrescritos. */
      async salvar(id, cifrado) {
        mkdirSync(pastaArquivos, { recursive: true });
        const destino = caminho(id);
        if (existsSync(destino)) throw new Error("Já existe arquivo com este identificador.");
        const tmp = `${destino}.${process.pid}.tmp`;
        writeFileSync(tmp, cifrado, { mode: 0o600 });
        renameSync(tmp, destino);
      },
      async ler(id) {
        const arq = caminho(id);
        return existsSync(arq) ? readFileSync(arq) : null;
      },
      /** Copia para `destino` os arquivos que ainda não estão lá (já cifrados). */
      async copiarPara(destino) {
        if (!existsSync(pastaArquivos)) return 0;
        mkdirSync(destino, { recursive: true });
        let n = 0;
        for (const f of readdirSync(pastaArquivos).filter((x) => x.endsWith(".bin"))) {
          if (existsSync(join(destino, f))) continue;
          copyFileSync(join(pastaArquivos, f), join(destino, f));
          n++;
        }
        return n;
      },
    },
  };
}
