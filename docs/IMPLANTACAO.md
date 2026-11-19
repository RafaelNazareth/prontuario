# Guia de implantação — PEP (FCMSCSP)

Como colocar o servidor do PEP em uma máquina da instituição. O servidor é **Node.js** (`server/index.mjs`); não há outro backend. O banco pode ser o arquivo JSON (padrão) ou o MongoDB.

> **Situação atual:** o sistema ainda não foi publicado para uso real. Este guia descreve o que a implantação precisa ter. Antes de usar com dados reais, cumpra também o checklist da instituição em [CONFORMIDADE.md](CONFORMIDADE.md#11-checklist-da-instituição-fora-do-software).

## 1. Requisitos

- **Node.js 20 ou superior** (`engines` do `package.json`). O GitHub Actions roda os testes com Node 22.
- Um **proxy reverso com HTTPS** na frente do Node (nginx, Caddy, IIS com ARR ou o balanceador do provedor). O Node não serve TLS.
- Disco **cifrado** (BitLocker, LUKS ou o equivalente do provedor), em servidor no Brasil.
- Para usar MongoDB: MongoDB 6 ou superior. Com replica set (padrão no MongoDB Atlas), cada requisição é gravada numa transação.

## 2. Instalação

```bash
git clone <repositório> pep && cd pep
npm ci                 # instala também o driver "mongodb" (optionalDependencies)
npm test               # confere a instalação
```

Quem vai usar só o banco JSON pode instalar sem o driver: `npm ci --omit=optional`. O driver só é carregado quando `PEP_BANCO=mongodb`.

## 3. Variáveis de ambiente

| Variável | Padrão | Para quê |
|---|---|---|
| `PORT` | `5500` | Porta do servidor (também aceita `node server/index.mjs <porta>`). |
| `PEP_HOST` | `127.0.0.1` | Endereço em que o servidor escuta. Deixe `127.0.0.1` quando o proxy estiver na mesma máquina; use o IP interno só se o proxy estiver em outra máquina da rede privada. |
| `PEP_DATA_DIR` | `data/` | Pasta dos dados, chaves e backups. |
| `PEP_BANCO` | `json` | `json` (arquivo `data/db.json` + `data/arquivos/`) ou `mongodb`. |
| `PEP_MONGODB_URI` | — | Obrigatória com `PEP_BANCO=mongodb`. Ex.: `mongodb://usuario:senha@host:27017/?authSource=admin`. |
| `PEP_MONGODB_BANCO` | `pep` | Nome do banco no MongoDB. |
| `PEP_MONGODB_TRANSACOES` | ligado | `0` desliga as transações (só para diagnóstico). Em servidor standalone, sem replica set, o PEP já grava sem transação. |
| `PEP_BACKUP_KEY` | `data/.backup-key` | Chave dos backups (64 caracteres hexadecimais). |
| `PEP_ARQUIVOS_KEY` | `data/.arquivos-key` | Chave dos arquivos anexados (64 caracteres hexadecimais). |
| `PEP_INSTITUICAO_ARQUIVO` | `data/instituicao.json` | Arquivo com os dados reais da instituição. |

Para gerar uma chave: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

## 4. Chaves de cifragem

O PEP usa duas chaves AES-256:

- **`PEP_BACKUP_KEY`** cifra os backups do banco (`data/backups/*.bkp`).
- **`PEP_ARQUIVOS_KEY`** cifra os arquivos anexados ao prontuário (laudos, termos assinados, material de teste). Os arquivos ficam cifrados no disco ou no MongoDB.

Sem a chave, o conteúdo **não pode ser lido**, nem pela própria instituição. Por isso:

1. Gere as duas chaves e defina-as como variáveis de ambiente do serviço (não deixe o servidor criar os arquivos `data/.backup-key` e `data/.arquivos-key` em produção).
2. Guarde uma **cópia de cada chave fora do servidor**, em pelo menos dois lugares (cofre de senhas da instituição e um envelope lacrado, por exemplo).
3. Nunca troque `PEP_ARQUIVOS_KEY` depois que houver arquivos anexados: os arquivos antigos deixam de abrir. Ao migrar para MongoDB ou trocar de máquina, leve a **mesma** chave.

## 5. Dados da instituição

Os textos do aviso de privacidade e das impressões vêm de `assets/js/shared/configuracao.js`, com valores de demonstração marcados `[definir]`. Na implantação, não mexa no código:

1. Copie `data/instituicao.exemplo.json` para `data/instituicao.json` (ou para o caminho de `PEP_INSTITUICAO_ARQUIVO`).
2. Preencha controlador, endereço, horário, contato e o **encarregado de proteção de dados** (nome, e-mail e, se houver, telefone).
3. Informe o **prazo de validade do acesso temporário do paciente**, ainda a ser definido pela instituição: `"acessoPortal": { "validadeDias": N }`, de 1 a 365 dias. É por quanto tempo valem o login e a senha que o técnico gera quando o paciente pede para consultar o prontuário. O modelo traz `null`: troque pelo número de dias decidido. Sem esse campo, o sistema usa 7 dias provisórios e o servidor lista `acessoPortal.validadeDias` nas pendências.
4. Reinicie o servidor. Ele lê o arquivo ao iniciar.

Enquanto algum campo continuar com `[definir]`, o servidor avisa no console ao iniciar. O arquivo `data/instituicao.json` fica fora do git.

## 6. Proxy reverso com HTTPS

O Node escuta em HTTP em `PEP_HOST:PORT`. O proxy recebe HTTPS e repassa para ele. Exemplo com nginx:

```nginx
server {
    listen 443 ssl http2;
    server_name pep.exemplo.edu.br;
    ssl_certificate     /caminho/fullchain.pem;
    ssl_certificate_key /caminho/privkey.pem;
    add_header Strict-Transport-Security "max-age=31536000" always;
    client_max_body_size 25m;          # o PEP aceita corpo de até 25 MB (envio de arquivos)

    location / {
        proxy_pass http://127.0.0.1:5500;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

- Com `X-Forwarded-Proto: https`, o cookie de sessão passa a ser `Secure`.
- Redirecione HTTP (porta 80) para HTTPS.
- **Limitação conhecida:** o IP gravado na trilha de auditoria é o da conexão que chega ao Node. Atrás de um proxy, ele será o IP do proxy. O servidor ainda não lê `X-Forwarded-For`; use os logs do proxy para o IP de origem.

## 7. Rodar como serviço

Use o gerenciador do sistema (systemd, NSSM no Windows, pm2) para iniciar `node server/index.mjs` com as variáveis acima e reiniciar em caso de falha. Exemplo de unidade systemd:

```ini
[Service]
WorkingDirectory=/opt/pep
ExecStart=/usr/bin/node server/index.mjs
Environment=PEP_BANCO=mongodb
EnvironmentFile=/etc/pep/ambiente      # PEP_MONGODB_URI, PEP_BACKUP_KEY, PEP_ARQUIVOS_KEY
User=pep
Restart=on-failure
```

**Rode uma única instância do servidor por banco.** O servidor atende as requisições da API uma de cada vez (fila) e guarda as sessões em memória. Duas instâncias no mesmo banco poderiam gravar por cima uma da outra, e cada uma teria as suas próprias sessões. Reiniciar o servidor encerra as sessões abertas (os usuários entram de novo).

## 8. Banco de dados

### JSON (padrão)

`data/db.json` é criado como cópia de `data/seed.json` na primeira execução. Os arquivos anexados ficam em `data/arquivos/*.bin`, já cifrados. Serve para a implantação inicial de um serviço pequeno.

### MongoDB

```bash
PEP_BANCO=mongodb PEP_MONGODB_URI="mongodb://..." npm start
```

- Banco vazio começa com os dados de demonstração (`data/seed.json`), como o JSON.
- Os índices são criados ao iniciar.
- Coleções e decisões de modelagem: [DATABASE_MONGODB.md](DATABASE_MONGODB.md).

### Migrar do JSON para o MongoDB

```bash
# com o servidor PARADO
PEP_MONGODB_URI="mongodb://..." npm run data:migrar-mongodb
```

O script copia os dados de `data/db.json` e os arquivos de `data/arquivos/`, confere as contagens e avisa se a trilha de auditoria de origem não estiver íntegra. Se o banco de destino já tiver dados, ele para; `npm run data:migrar-mongodb -- --substituir` sobrescreve. Depois, inicie o servidor com `PEP_BANCO=mongodb` e a **mesma** `PEP_ARQUIVOS_KEY`. Passo a passo em [MIGRATION_GUIDE.md](MIGRATION_GUIDE.md).

## 9. Backups

O servidor gera um backup cifrado ao iniciar e a cada 24 horas, e mantém os 30 mais recentes (`BACKUP` em `assets/js/shared/configuracao.js`).

| O quê | Onde | Observação |
|---|---|---|
| Banco (JSON ou MongoDB) | `data/backups/pep-<data>.bkp` | Cifrado com `PEP_BACKUP_KEY`, com SHA-256 do conteúdo. |
| Arquivos anexados (banco JSON) | `data/backups/arquivos/*.bin` | Cópia incremental; os arquivos já estão cifrados com `PEP_ARQUIVOS_KEY`. |
| Arquivos anexados (MongoDB) | coleção `arquivos` | Não são copiados para `data/backups/arquivos/`. Use `mongodump` (ou o backup do Atlas), que copia todas as coleções, inclusive `arquivos`. |

Tarefas da implantação:

- Copiar `data/backups/` **todos os dias para outro local físico** (outra máquina, outro prédio ou armazenamento externo).
- Com MongoDB: agendar `mongodump --uri "$PEP_MONGODB_URI" --db pep --archive=pep-$(date +%F).gz --gzip` e guardar fora do servidor, ou ligar o backup do provedor.
- **Testar a restauração** periodicamente, em uma máquina separada.

### Restaurar

```bash
# com o servidor PARADO
npm run data:restaurar                       # lista os backups
npm run data:restaurar -- pep-<data>.bkp     # restaura
```

Funciona com os dois bancos (usa o `PEP_BANCO` em uso). Antes de substituir, o script decifra o backup, confere o SHA-256 e a estrutura, guarda o estado atual em `data/db.antes-da-restauracao-<data>.json` e registra `backup_restaurado` na trilha. No banco JSON, os arquivos anexados que faltarem em `data/arquivos/` são trazidos de `data/backups/arquivos/`. No MongoDB, os arquivos anexados são restaurados pelo `mongodump`/`mongorestore`.

## 10. Antes de abrir para os usuários

- [ ] **Trocar as senhas de demonstração.** As contas do `seed.json` usam `1234`. Inative as contas de demonstração que não forem usadas e cadastre os usuários reais em "Usuários e permissões" (o técnico define uma senha provisória, de no mínimo 4 caracteres, e a pessoa é obrigada a criar a própria senha no primeiro acesso). Pacientes não são cadastrados como usuários: quando um paciente pede o prontuário, o técnico imprime ou gera um acesso temporário.
- [ ] Remover os logins de teste da tela de login (`index.html`).
- [ ] Preencher `data/instituicao.json` (inclusive `acessoPortal.validadeDias`) e conferir que o servidor não avisa mais pendências.
- [ ] Definir `PEP_BACKUP_KEY` e `PEP_ARQUIVOS_KEY` e guardar as cópias fora do servidor.
- [ ] Configurar o proxy com HTTPS e HSTS; conferir que o cookie `pep_sid` sai com `Secure`.
- [ ] Agendar a cópia diária dos backups para outro local e testar uma restauração.
- [ ] Confirmar que só existe uma instância do servidor apontando para o banco.

## 11. Fora deste guia (ainda não existe)

- Hospedagem definida e publicada para uso real.
- Verificação em duas etapas (MFA).
- Assinatura com certificado ICP-Brasil.
- Mais de uma instância do servidor em paralelo (exigiria sessões fora da memória e leitura por consulta no banco).
