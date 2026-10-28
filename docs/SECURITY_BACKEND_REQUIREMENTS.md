# Requisitos de Segurança do Backend — PEP (FCMSCSP)

Requisitos que o backend Java deverá atender. **Nada aqui está implementado** — é especificação para a próxima etapa. O frontend atual, sendo um mock sem servidor, não pode implementar segurança real (ver aviso em [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)); este documento existe para que a ausência dessas proteções hoje não seja esquecida quando o backend for construído.

## Autenticação

- **Hashing de senha:** bcrypt ou Argon2 (nunca SHA simples, nunca texto puro — o mock atual guarda senha em texto puro **apenas porque é um mock de demonstração sem dado real**, isso não pode chegar ao backend).
- **Token:** JWT de curta duração (ex.: 15 min) + refresh token de vida mais longa, armazenado com possibilidade de revogação (o JWT por si só não é revogável antes de expirar — manter uma lista de revogação ou usar refresh token opaco validado contra o banco).
- **Expiração e revogação:** logout deve revogar o refresh token no servidor, não só apagar o token do lado do cliente.
- **MFA:** avaliar exigir para o papel `tecnico` (acesso administrativo mais amplo), mesmo que não seja obrigatório para `estudante`/`paciente` no lançamento inicial.

## Autorização

- Ver [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md) — toda regra ali precisa de equivalente server-side que não confie em nada vindo do cliente.
- Autorização deve ser verificada **por recurso**, não só por rota (ex.: "é técnico" não basta para `PATCH /patients/{id}` — ok nesse caso porque técnico vê todos; mas para `GET /patients/{id}` como supervisor, verificar que aquele paciente específico está sob aquele supervisor).

## Rate limiting e força bruta

- Limitar tentativas de `POST /auth/login` por IP e por login (ex.: backoff progressivo, bloqueio temporário após N tentativas).
- Aplicar rate limiting geral na API (por token/IP) para mitigar abuso, não só no login.

## CORS / CSRF / CSP

- **CORS:** lista branca explícita de origens permitidas (o domínio do frontend em produção); nunca `Access-Control-Allow-Origin: *` numa API que carrega dado de sessão/token.
- **CSRF:** se a autenticação usar cookies em algum momento (ex.: refresh token em cookie httpOnly), implementar proteção CSRF (SameSite=Strict/Lax + token CSRF em formulários mutantes). Se a autenticação for 100% via header `Authorization` (sem cookie), o risco de CSRF é bem menor, mas ainda vale revisar.
- **CSP:** o frontend hoje carrega Chart.js, Bootstrap Icons e Google Fonts via CDN — ao definir uma Content-Security-Policy, a lista de `script-src`/`style-src`/`font-src` precisa incluir exatamente esses domínios (`cdn.jsdelivr.net`, `fonts.googleapis.com`, `fonts.gstatic.com`) e nada além. Isso também é outro motivo para eventualmente remover os `onclick` inline (ver [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md), item 12) — uma CSP estrita com `script-src` sem `'unsafe-inline'` quebraria os handlers inline atuais.

## HTTPS

- Obrigatório em todos os ambientes que não sejam desenvolvimento local. HSTS habilitado em produção.

## Validação e injeção

- Toda validação feita hoje no frontend (CPF, e-mail, campos obrigatórios) **deve ser reimplementada no backend** — validação de cliente é conveniência de UX, nunca controle de segurança.
- Como o backend é Java + MongoDB (não SQL), o vetor clássico de SQL injection não se aplica diretamente, mas a validação de entrada continua necessária para evitar NoSQL injection (ex.: nunca desserializar um filtro de consulta MongoDB diretamente a partir de JSON não validado vindo do cliente).

## Upload de arquivos

- Lista branca de tipos de arquivo permitidos e extensão consistente com o `Content-Type` declarado (não confiar só na extensão do nome).
- Limite de tamanho por arquivo e por paciente/período (evitar exaustão de armazenamento).
- Verificação antivírus antes de disponibilizar o arquivo para download (mínimo: scan assíncrono; ideal: scan antes mesmo de confirmar o upload).
- Ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md) sobre não usar MongoDB como armazenamento primário do binário.

## Logs e auditoria

- Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md). Logs de aplicação (não auditoria de negócio) não devem conter dado clínico sensível em texto (ex.: não logar o conteúdo de uma evolução em log de erro/debug).

## Secrets e configuração

- Nenhuma credencial (string de conexão do MongoDB, chave de assinatura de JWT, credenciais de storage) em código-fonte — usar variáveis de ambiente ou um cofre de segredos (ex.: Vault, AWS Secrets Manager, conforme a infraestrutura escolhida).
- O frontend já centraliza a única configuração que tem (`core/config.js` — `API_BASE_URL`, `ENVIRONMENT`) para que, no futuro, valores como a URL da API não fiquem espalhados.

## Backup e disaster recovery

- Backup regular do MongoDB com teste periódico de restauração (backup não testado não é backup confiável).
- RPO/RTO a serem definidos com o responsável técnico do Serviço-Escola — dado clínico tem menor tolerância a perda do que os dados administrativos.

## LGPD e privacidade (⚠️ ver aviso legal)

> Este documento **não é aconselhamento jurídico**. Os pontos abaixo precisam ser validados com um profissional de compliance/jurídico antes de qualquer dado clínico real ser processado pelo sistema.

Pontos que a arquitetura já deixa preparados ou que precisam de atenção quando o backend existir:
- **Minimização de dados:** os DTOs (ver [API_DTOS.md](./API_DTOS.md)) já expõem só o necessário por endpoint, não a entidade inteira.
- **Controle de acesso e auditoria:** ver seções acima e [PERMISSIONS_MATRIX.md](./PERMISSIONS_MATRIX.md)/[AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md).
- **Retenção:** política de por quanto tempo manter prontuário, evolução e auditoria após o encerramento de um caso — **não definida neste projeto**, precisa vir de orientação jurídica específica para dado de saúde/psicológico.
- **Exclusão/arquivamento:** dado clínico frequentemente tem exigência de retenção mínima que **conflita** com um pedido de exclusão do titular — a forma de conciliar isso (ex.: anonimização em vez de exclusão) precisa de definição jurídica, não técnica.
- **Consentimento:** o fluxo de "Acesso do Paciente" (`AccessRequest`) já modela uma liberação explícita antes do paciente ver seu próprio prontuário; verificar se isso satisfaz os requisitos de consentimento aplicáveis ou se precisa de um registro de consentimento mais formal.
- **Exportação de dados do titular:** o sistema já tem `gerarPdfProntuario()`, que pode servir de base para um futuro fluxo de "exportar meus dados", mas isso precisa ser desenhado para atender ao direito de portabilidade, não só como conveniência administrativa.
- **Rastreabilidade:** coberta por auditoria (`patient.view`, `document.view` etc. — ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md)).

**Recomendação:** antes de armazenar qualquer dado clínico real (não mock) no backend, obter validação formal de um responsável jurídico/DPO sobre os pontos acima.
