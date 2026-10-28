# Modelagem MongoDB — PEP (FCMSCSP)

Especificação das coleções para o futuro backend Java + MongoDB. **Nada aqui está implementado.** Modelado a partir de [DOMAIN_MODEL.md](./DOMAIN_MODEL.md), pensando em MongoDB especificamente — não é uma cópia de um modelo relacional.

## Princípio de decisão: embedding vs. referencing

Regra usada em cada decisão abaixo:
- **Embeber** quando o sub-documento (a) só é lido sempre junto do documento pai, (b) tem um limite natural de tamanho, e (c) não precisa ser consultado/filtrado independentemente do pai.
- **Referenciar** quando a coleção (a) cresce sem limite (evoluções ao longo dos anos, documentos), (b) precisa ser paginada/filtrada independentemente do pai, ou (c) é compartilhada entre múltiplos "pais" (um `User` é referenciado por muitos `Patient`).

---

## Collection: `users`

**Objetivo:** contas de acesso (staff e pacientes).

| Campo | Tipo | Obrigatório | Nullable | Default |
|---|---|---|---|---|
| `_id` | ObjectId | sim | não | gerado |
| `login` | string | sim | não | — |
| `passwordHash` | string | sim | não | — (nunca texto puro — ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md)) |
| `nome` | string | sim | não | — |
| `papel` | string (enum) | sim | não | — |
| `avatar` | string | sim | não | derivado do nome |
| `color` | string | sim | não | — |
| `ativo` | bool | sim | não | `true` |
| `createdAt` / `updatedAt` | date | sim | não | — |

**Índices:** `{ login: 1 }` único. `{ papel: 1 }` (listagens filtradas por papel — ex.: "todos os estudantes" na tela de novo paciente).

**Crescimento:** baixo (dezenas a poucas centenas de documentos mesmo em escala grande — usuários são staff + pacientes, não eventos).

**Evolução de schema:** campo `schemaVersion` não necessário aqui — schema simples e estável.

---

## Collection: `patients`

**Objetivo:** cadastro do paciente/caso clínico.

| Campo | Tipo | Obrigatório | Nullable | Default |
|---|---|---|---|---|
| `_id` | ObjectId | sim | não | gerado |
| `nome` | string | sim | não | — |
| `cpf` | string | sim | não | — (normalizado, só dígitos) |
| `nascimento` | date | não | sim | `null` |
| `telefone` | string | não | sim | `null` |
| `email` | string | não | sim | `null` |
| `estudanteIds` | ObjectId[] (ref `users`) | não | — | `[]` (0 a 3) |
| `supervisorId` | ObjectId (ref `users`) | sim | não | — |
| `status` | string (enum: `ativo`\|`inativo`) | sim | não | `ativo` |
| `cor` | string | sim | não | `#1b5e20` |
| `createdAt` / `updatedAt` | date | sim | não | — |

**Referenciar** `estudanteIds`/`supervisorId` (não embeber os dados do usuário): um mesmo estudante/supervisor está ligado a múltiplos pacientes — embeber duplicaria nome/avatar em dezenas de documentos e exigiria atualização em massa se o nome de um usuário mudasse. O backend resolve os nomes com um `$lookup` (ou uma consulta separada) ao montar `PatientListItemDTO`.

**Índices:** `{ cpf: 1 }` único. `{ supervisorId: 1 }` (RBAC de supervisor). `{ estudanteIds: 1 }` (RBAC de estudante — índice multikey). `{ status: 1 }` (filtro de listagem).

**Crescimento:** moderado — na escala citada no plano (10.000+ pacientes), ainda é uma coleção pequena para MongoDB (documentos pequenos, sem sub-arrays ilimitados). Não há risco de documento gigante aqui.

---

## Collection: `anamneses`

**Objetivo:** anamnese — no máximo uma por paciente.

**Decisão: coleção própria, referenciando `patients`, e não embutida em `patients`.** Embeber pareceria natural (relação 1:1), mas:
1. Anamnese tem seu próprio ciclo de vida e regra de imutabilidade (`finalizada`) que é mais simples de proteger com uma operação atômica dedicada (`findOneAndUpdate` com filtro `status: { $ne: "finalizada" }`) do que manipulando um sub-documento dentro de `patients`.
2. Mantém `patients` enxuto para as consultas de listagem (que rodam com muito mais frequência que a leitura de anamnese).

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `queixa` | string | sim |
| `historia`, `historicoMedico`, `medicamentos`, `contexto`, `hipoteses` | string | não |
| `status` | string (enum: `rascunho`\|`finalizada`) | sim |
| `criadoPor` | ObjectId (ref `users`) | sim |
| `createdAt` / `updatedAt` | date | sim |

**Índices:** `{ patientId: 1 }` único (garante no máximo 1 por paciente a nível de banco, não só de aplicação).

**Crescimento:** 1 documento por paciente — trivial.

---

## Collection: `evolutions`

**Objetivo:** registros de sessão, append-only, por paciente.

**Decisão: coleção própria, referenciando `patients` — nunca embutida.** Cresce sem limite ao longo dos anos de acompanhamento (múltiplas sessões por semana, por vários anos, multiplicado por milhares de pacientes). Embeber um array ilimitado dentro de `patients` violaria o limite de 16MB por documento do MongoDB e degradaria toda leitura de `patients` (que precisaria carregar/ignorar um array potencialmente enorme).

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `num` | int | sim |
| `data` | date | sim |
| `autorId` | ObjectId (ref `users`) | sim |
| `papel` | string | sim |
| `tipo` | string (enum: `atendimento`\|`supervisao`) | sim |
| `conteudo` | string | sim |
| `tags` | string[] | não |
| `createdAt` | date | sim (não há `updatedAt` — imutável por regra de negócio) |

**Índices:** `{ patientId: 1, num: 1 }` composto (paginação ordenada por paciente — o padrão de acesso mais comum). `{ patientId: 1, data: -1 }` (para "últimas evoluções").

**Crescimento:** **a coleção de maior volume do sistema** (o plano cita 100.000+ evoluções). Projetada desde o início como coleção própria e paginada por esse motivo. Considerar *sharding* por `patientId` se o volume ultrapassar a capacidade de um único nó — decisão de infraestrutura para quando o volume real justificar, não implementar preventivamente.

---

## Collection: `appointments`

**Objetivo:** agendamentos.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `estudanteId` | ObjectId (ref `users`) | não |
| `supervisorId` | ObjectId (ref `users`) | não |
| `data` | date | sim |
| `hora` | string ("HH:mm") | sim |
| `local` | string | sim |
| `modalidade` | string (enum) | sim |
| `status` | string (enum) | sim |
| `createdAt` / `updatedAt` | date | sim |

**Referenciar**, não embeber em `patients` — mesma razão de `evolutions` (cresce sem limite; um paciente ativo por 2 anos, 1x/semana, já são ~100 agendamentos, multiplicado por milhares de pacientes).

**Índices:** `{ patientId: 1, data: 1 }` (agenda de um paciente). `{ estudanteId: 1, data: 1 }` (agenda de um estudante — usada na visão semanal). `{ data: 1, status: 1 }` (relatórios/dashboard por período).

---

## Collection: `absences`

**Objetivo:** faltas.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `appointmentId` | ObjectId (ref `appointments`) | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `justificada` | bool | sim |
| `registradoPorId` | ObjectId (ref `users`) | sim |
| `createdAt` | date | sim |

**Decisão: coleção própria** (não embutida em `appointments` nem em `patients`) porque a regra "contar faltas injustificadas do paciente" é uma consulta agregada (`count` filtrado) que é mais natural e performática como coleção própria com índice composto do que percorrendo sub-arrays.

**Índices:** `{ patientId: 1, justificada: 1 }` (a consulta de "faltas injustificadas do paciente", que dispara a notificação de troca).

---

## Collection: `documents`

**Objetivo:** metadado de documentos anexados. **O binário do arquivo em si não deve ir para esta coleção nem para o MongoDB de forma geral** — ver seção própria abaixo.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `nome` | string | sim |
| `tipo` | string (enum) | sim |
| `tamanhoBytes` | long | sim |
| `storageKey` | string | sim | referência opaca ao objeto no armazenamento de binários (ver abaixo) |
| `autorId` | ObjectId (ref `users`) | sim |
| `createdAt` | date | sim |

**Índices:** `{ patientId: 1, createdAt: -1 }`.

### Sobre armazenamento de binários — MongoDB não é assumido como solução ideal

O plano de refatoração pede explicitamente para não assumir MongoDB como padrão para todos os binários. Recomendação: usar um **object storage dedicado** (ex.: S3-compatível, ou Azure Blob, dependendo de onde o backend Java for hospedado) para o conteúdo real dos arquivos, guardando em `documents.storageKey` apenas a referência. Motivos:
- MongoDB tem limite de 16MB por documento; arquivos maiores exigiriam GridFS, que adiciona complexidade operacional sem necessidade se um object storage já resolve o problema de forma mais barata e com CDN/URLs assinadas nativas.
- Separar metadado (MongoDB, consultado com frequência) de binário (object storage, acessado sob demanda) é o padrão consolidado para esse tipo de carga.
- **Decisão de infraestrutura a ser tomada pelo time de backend**, não fixada aqui como definitiva — esta seção documenta a recomendação e o porquê, não uma escolha de produto específica.

---

## Collection: `access_requests`

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `patientId` | ObjectId (ref `patients`) | sim |
| `status` | string (enum: `pendente`\|`liberado`) | sim |
| `protocolo` | string | sim |
| `solicitacao` | date | sim |
| `liberacao` | date | não |

**Índices:** `{ patientId: 1 }`. `{ protocolo: 1 }` único.

---

## Collection: `audit_log`

**Objetivo:** trilha de auditoria imutável. Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md) para o vocabulário completo de ações.

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `actorId` | ObjectId (ref `users`) | sim |
| `action` | string | sim |
| `resource` | string | não |
| `resourceId` | ObjectId | não |
| `timestamp` | date | sim |
| `ip` | string | não |
| `userAgent` | string | não |
| `metadata` | object | não |

**Índices:** `{ timestamp: -1 }` (listagem cronológica). `{ actorId: 1, timestamp: -1 }`. `{ resource: 1, resourceId: 1 }` (histórico de um recurso específico, ex.: "tudo que aconteceu com o paciente X").

**Índice TTL:** **não recomendado por padrão** — auditoria de prontuário clínico tipicamente tem exigência de retenção longa (anos), não expiração automática. Se houver uma política de retenção definida com jurídico/compliance (ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md), seção LGPD), implementar como job de arquivamento explícito, não TTL automático — evita perda de dado por configuração incorreta.

**Crescimento:** cresce continuamente e nunca é apagado — candidato natural a coleção *capped* não é apropriado (capped descarta os mais antigos, o oposto do que se quer aqui). Monitorar tamanho e considerar arquivamento para *cold storage* após um período definido pela política de retenção, mantendo pesquisabilidade via um índice mínimo no arquivo frio.

---

## Collection: `notifications`

| Campo | Tipo | Obrigatório |
|---|---|---|
| `_id` | ObjectId | sim |
| `tipo` | string (enum) | sim |
| `patientId` | ObjectId | não |
| `destinatarioIds` | ObjectId[] | sim |
| `titulo` / `desc` | string | sim |
| `tipoAcao` | string | não |
| `lidaPor` | ObjectId[] | sim | `[]` — quem já leu, já que uma notificação pode ter múltiplos destinatários (ex.: troca de paciente notifica vários estudantes) |
| `createdAt` | date | sim |

**Índices:** `{ destinatarioIds: 1, createdAt: -1 }` (multikey — "minhas notificações recentes").

**Índice TTL sugerido:** `{ createdAt: 1 }` com `expireAfterSeconds` de alguns meses **é aceitável aqui** (diferente de `audit_log`) — notificação é um artefato de UX transitório, não um registro legal.

---

## Resumo de referencing vs. embedding

| Relação | Decisão | Motivo principal |
|---|---|---|
| Patient → Anamnesis | Referência (coleção própria) | Regra de imutabilidade isolada; leitura de `patients` fica leve |
| Patient → Evolutions | Referência | Cresce sem limite; maior volume do sistema |
| Patient → Appointments | Referência | Cresce sem limite |
| Appointment → Absence | Referência | Consulta agregada (contagem) independente |
| Patient → Documents | Referência (+ storage externo para o binário) | Cresce sem limite; binário não cabe/não deve ir no MongoDB |
| Patient → estudantes/supervisor | Referência a `users` | Usuário é compartilhado entre muitos pacientes |
| Notification → destinatários | Referência (array de IDs) | Array pequeno e limitado (poucos destinatários por notificação) — não justificaria coleção própria |

Nenhuma relação neste domínio foi modelada como embedding de um array potencialmente ilimitado — é exatamente o erro mais comum de "copiar modelagem SQL para o Mongo" que este documento evita deliberadamente.
