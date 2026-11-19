# Guia de Migração: banco JSON → MongoDB — PEP (FCMSCSP)

O plano original deste guia (trocar um mock no navegador por um backend Java) não vale mais: o backend é o servidor **Node.js** do repositório, que já faz autenticação, autorização, auditoria e gravação. O que resta migrar é o **banco**: do arquivo `data/db.json` para o MongoDB. O servidor e a interface não mudam.

```mermaid
flowchart LR
    subgraph Hoje [Padrão]
        UI1[Navegador] --> S1[server/index.mjs] --> J[(data/db.json + data/arquivos/)]
    end
    subgraph Depois [PEP_BANCO=mongodb]
        UI2[Navegador] --> S2[server/index.mjs] --> M[(MongoDB)]
    end
```

## O que já existe

- Adaptador MongoDB (`server/banco/mongodb.mjs`) com a mesma interface do banco JSON. Coleções e índices em [DATABASE_MONGODB.md](./DATABASE_MONGODB.md).
- Script de migração `npm run data:migrar-mongodb` (`scripts/migrar-para-mongodb.mjs`).
- Restauração de backup para os dois bancos (`npm run data:restaurar`).
- Testes automatizados da conversão e do adaptador (`tests/mongodb.test.mjs`).

Nenhum ambiente de produção foi migrado ainda; a migração da produção depende da publicação para uso real.

## Passo a passo

### 1. Preparar

- MongoDB 6+ acessível pelo servidor, de preferência com replica set (transações) e cifragem em repouso.
- Um usuário do MongoDB só para o PEP, com leitura e escrita no banco escolhido.
- `npm ci` (instala o driver `mongodb`, que está em `optionalDependencies`).
- Anote onde está a chave dos arquivos anexados: `PEP_ARQUIVOS_KEY` ou `data/.arquivos-key`. **Ela tem de ir junto.**

### 2. Parar o servidor e fazer um backup

```bash
# servidor parado
cp data/db.json data/db.antes-do-mongodb.json
```

Guarde também uma cópia de `data/arquivos/` e de `data/backups/`.

### 3. Migrar

```bash
PEP_MONGODB_URI="mongodb://usuario:senha@host:27017/?authSource=admin" \
PEP_MONGODB_BANCO=pep \
npm run data:migrar-mongodb
```

O script:

1. lê `data/db.json` e avisa se a trilha de auditoria de origem não estiver íntegra (ela é copiada como está);
2. para, sem mexer em nada, se o banco de destino já tiver usuários (use `npm run data:migrar-mongodb -- --substituir` para sobrescrever);
3. grava todas as coleções e copia os arquivos de `data/arquivos/*.bin` para a coleção `arquivos`, **ainda cifrados** (não precisa da chave para copiar, mas o servidor precisará dela para abrir);
4. relê o banco e compara a quantidade de registros de cada coleção com a origem; se algo divergir, termina com erro.

### 4. Subir o servidor no MongoDB

```bash
PEP_BANCO=mongodb PEP_MONGODB_URI="mongodb://..." PEP_ARQUIVOS_KEY=<a mesma chave> npm start
```

O console mostra `Banco: MongoDB, banco "pep"`.

### 5. Conferir

- [ ] Entrar com cada papel e abrir alguns prontuários.
- [ ] Baixar um arquivo anexado (confere a chave e o SHA-256).
- [ ] Abrir a Auditoria como técnico: a trilha deve aparecer como íntegra.
- [ ] Criar um registro de teste em um paciente de teste e conferir que ele aparece depois de reiniciar o servidor.
- [ ] Ajustar o backup: `mongodump` (ou o backup do provedor) passa a ser necessário para os arquivos anexados. Ver [IMPLANTACAO.md](./IMPLANTACAO.md#9-backups).

### Voltar atrás

O `data/db.json` não é alterado pela migração. Para voltar, pare o servidor e suba de novo sem `PEP_BANCO` (ou com `PEP_BANCO=json`). O que foi gravado no MongoDB depois da migração não volta sozinho para o JSON; se for preciso, restaure no JSON um backup gerado pelo servidor já no MongoDB (`npm run data:restaurar` com `PEP_BANCO=json`). Os arquivos anexados enviados depois da migração ficam só na coleção `arquivos`: não há script para trazê-los de volta a `data/arquivos/`.

## Próximos passos (ainda não existem)

1. **Leitura por consulta.** Hoje o servidor lê o conjunto inteiro a cada requisição, nos dois bancos. O passo seguinte é trocar `GET /api/data` por rotas por recurso (ex.: prontuário de um paciente, agenda de uma semana) que leiam só o necessário, usando os índices já criados, e paginar no servidor. A conferência de gravação de `shared/politica.js` precisará receber só os registros envolvidos.
2. **Mais de uma instância do servidor.** Exige sessões fora da memória e controle de concorrência no banco em vez da fila local.
3. **Migração da produção**, junto com a publicação para uso real.
