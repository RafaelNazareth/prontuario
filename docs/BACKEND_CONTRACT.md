# Contrato do Backend — API REST Java (v1)

Documentação dos endpoints que o backend Java deverá implementar para que o frontend possa trocar `repositories/*.js` (implementação mock) por uma implementação de API sem alterar nenhuma tela. **Nada aqui está implementado — é especificação para a próxima etapa do projeto.**

Convenções gerais:
- Base: `/api/v1`
- Autenticação: `Authorization: Bearer <token>` em todas as rotas exceto `POST /auth/login`.
- Formato de erro padrão: ver [API_DTOS.md](./API_DTOS.md#formato-de-erro).
- Paginação padrão: ver [API_DTOS.md](./API_DTOS.md#paginação) — parâmetros `page`, `pageSize`; resposta em envelope `{items, page, pageSize, total}`.
- Datas: o backend deve receber e retornar datas em UTC ISO 8601 (`AAAA-MM-DDTHH:mm:ssZ`); a conversão para o fuso de exibição (`America/Sao_Paulo`) é responsabilidade do frontend (`core/dateService.js`).

---

## Autenticação

### `POST /auth/login`
- **Objetivo:** autenticar usuário e emitir token.
- **Autenticação:** nenhuma.
- **Request:** `{ "login": string, "senha": string }`
- **Response 200:** `{ "token": string, "refreshToken": string, "expiresIn": number, "user": UserResponseDTO }`
- **Erros:** `401 INVALID_CREDENTIALS`, `429 TOO_MANY_ATTEMPTS` (rate limiting, ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md))
- **Validações:** login e senha obrigatórios; sem distinção de mensagem entre "login não existe" e "senha errada" (evitar enumeração de usuários).

### `POST /auth/refresh`
- **Objetivo:** renovar token expirado usando refresh token.
- **Request:** `{ "refreshToken": string }`
- **Response 200:** `{ "token": string, "expiresIn": number }`
- **Erros:** `401 INVALID_REFRESH_TOKEN`

### `POST /auth/logout`
- **Objetivo:** revogar o refresh token atual.
- **Response 204.**

---

## Pacientes

### `GET /patients`
- **Permissões:** técnico (todos); supervisor (só onde é supervisor); estudante (só onde é estudante) — filtro aplicado **no servidor**, nunca confiando em parâmetro enviado pelo cliente.
- **Query params:** `page`, `pageSize`, `status` (`ativo`\|`inativo`), `search` (nome/CPF), `sort` (`nome`\|`-nome`\|`createdAt`)
- **Response 200:** `PagedResponse<PatientListItemDTO>`

### `GET /patients/{id}`
- **Permissões:** mesmas regras de escopo de `GET /patients`, aplicadas ao registro específico. Paciente só acessa o próprio (`id` deve bater com o paciente vinculado ao token) **e** só se `AccessRequest.status === "liberado"`.
- **Response 200:** `PatientDetailDTO`
- **Erros:** `403 FORBIDDEN` (fora de escopo), `404 PATIENT_NOT_FOUND`

### `POST /patients`
- **Permissões:** técnico.
- **Request:** `CreatePatientDTO`
- **Validações:** CPF válido (dígito verificador) e único; `supervisorId` deve existir e ter papel `supervisor`; `estudantesIds` (0 a 3) devem existir e ter papel `estudante`.
- **Response 201:** `PatientDetailDTO`
- **Erros:** `409 CPF_ALREADY_EXISTS`, `422 VALIDATION_ERROR`

### `PATCH /patients/{id}`
- **Permissões:** técnico.
- **Request:** `UpdatePatientDTO` (parcial)
- **Response 200:** `PatientDetailDTO`
- **Erros:** `404 PATIENT_NOT_FOUND`, `422 VALIDATION_ERROR`

---

## Anamnese

### `GET /patients/{patientId}/anamnesis`
- **Permissões:** escopo do paciente (ver acima).
- **Response 200:** `AnamnesisDTO` ou `204` se não existir.

### `PUT /patients/{patientId}/anamnesis`
- **Objetivo:** cria ou atualiza (é natural em PUT — upsert de um recurso singular por paciente).
- **Permissões:** técnico, supervisor, estudante (do caso).
- **Regra crítica:** o servidor **deve** rejeitar com `409 ANAMNESIS_ALREADY_FINALIZED` qualquer tentativa de gravar sobre uma anamnese com `status: "finalizada"`, independente do que o cliente envie — essa regra não pode depender só do frontend.
- **Request:** `SaveAnamnesisDTO`
- **Response 200:** `AnamnesisDTO`

---

## Evoluções

### `GET /patients/{patientId}/evolutions`
- **Permissões:** escopo do paciente.
- **Query params:** `page`, `pageSize` (evoluções podem crescer sem limite ao longo dos anos — paginação é obrigatória, não opcional, aqui).
- **Response 200:** `PagedResponse<EvolutionDTO>`

### `POST /patients/{patientId}/evolutions`
- **Permissões:** técnico, supervisor, estudante (do caso). **Nunca** paciente.
- **Regra crítica:** não deve existir `PATCH`/`DELETE` para evolução — é append-only por definição do domínio (exigência do CRP).
- **Request:** `CreateEvolutionDTO`
- **Response 201:** `EvolutionDTO`

---

## Agendamentos

### `GET /appointments`
- **Permissões:** escopo por paciente/estudante, como em pacientes.
- **Query params:** `page`, `pageSize`, `patientId`, `from`, `to`, `status`
- **Response 200:** `PagedResponse<AppointmentDTO>`

### `POST /appointments`
- **Permissões:** técnico, supervisor, estudante (do caso).
- **Validações:** conflito de horário — mesmo `patientId` + `estudanteId` + `data`+`hora` com status ≠ `cancelado` → `409 APPOINTMENT_CONFLICT`.
- **Request:** `CreateAppointmentDTO`
- **Response 201:** `AppointmentDTO`

### `PATCH /appointments/{id}`
- **Permissões:** técnico, supervisor, estudante (do caso).
- **Response 200:** `AppointmentDTO`

### `POST /appointments/{id}/cancel`
- **Objetivo:** ação de domínio explícita (mais claro que um PATCH genérico de status para uma transição irreversível).
- **Response 200:** `AppointmentDTO` (status `cancelado`)

### `POST /appointments/{id}/absence`
- **Objetivo:** registra falta do paciente. Efeitos colaterais no backend: cria `Absence`, e se for a 2ª falta injustificada do paciente, cria notificação `troca_solicitada` para o técnico.
- **Response 201:** `AbsenceDTO`

### `POST /absences/{id}/justify`
- **Response 200:** `AbsenceDTO` (`justificada: true`)

---

## Documentos

### `GET /patients/{patientId}/documents`
- **Response 200:** `PagedResponse<DocumentDTO>`

### `POST /patients/{patientId}/documents`
- **Objetivo:** este é o único endpoint onde o corpo da requisição **não** é JSON — é `multipart/form-data` com o arquivo real (diferente do mock atual, que só simula metadado). Ver [DATABASE_MONGODB.md](./DATABASE_MONGODB.md) sobre onde armazenar o binário.
- **Validações:** tipo de arquivo permitido (lista branca), tamanho máximo, verificação antivírus (ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md)).
- **Response 201:** `DocumentDTO`

---

## Usuários

### `GET /users` — técnico. Paginado, filtro por `papel`.
### `POST /users` — técnico. Valida login único; senha nunca retornada na resposta.
### `GET /users/me` — qualquer papel autenticado; retorna o próprio perfil.

---

## Acesso do Paciente

### `GET /access-requests` — técnico. Paginado, filtro por `status`.
### `POST /access-requests` — técnico. `{ patientId }`.
### `POST /access-requests/{id}/approve` — técnico. Efeito: `status → liberado`, `liberacao = now()`.

---

## Auditoria

### `GET /audit` — técnico. Somente leitura, paginado, filtros `from`, `to`, `tipo`, `ator`. Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md) para o que deve ser auditado no servidor (mais do que o frontend audita hoje).

---

## Notificações

### `GET /notifications` — qualquer papel autenticado; retorna só as suas.
### `POST /notifications/{id}/read` — marca como lida.

Nota: parte da lógica de "quais notificações mostrar" hoje é **calculada em tempo real no frontend** (ex.: evolução pendente 1h após a consulta). No backend, essa lógica deveria migrar para um job assíncrono ou ser calculada sob demanda no próprio `GET /notifications` — decisão de implementação do time backend, não fixada aqui.
