# Especificação de Auditoria (Backend) — PEP (FCMSCSP)

Define o que o backend Java deve auditar. **Não implementado agora** — o frontend hoje registra um subconjunto simplificado disso via `logAudit()` (`core/store.js`) e `repositories/auditRepository.js`, gravado em `localStorage`. Quando o backend existir, a auditoria real e confiável só pode viver lá (o frontend nunca deve ser a fonte de verdade de um log de auditoria, já que o próprio usuário controla o navegador).

## Estrutura de uma entrada

```ts
AuditEntry {
  actor: string        // nome de exibição, desnormalizado para consulta rápida
  actorId: string       // ID do usuário autenticado no momento da ação
  action: string          // vocabulário fechado, ver abaixo
  resource?: string        // tipo do recurso afetado, ex.: "patient"
  resourceId?: string       // ID do recurso afetado
  timestamp: string          // ISO 8601 UTC
  metadata?: object            // dados adicionais específicos da ação
  ip?: string                   // IP de origem da requisição
  userAgent?: string             // user agent do cliente
}
```

`ip` e `userAgent` só podem ser capturados no backend (o frontend não tem acesso confiável a essa informação sobre si mesmo) — motivo adicional para a auditoria real viver no servidor.

## Vocabulário de ações a auditar

Superset do que o frontend já registra hoje (`tipo` em `logAudit`), organizado por domínio:

**Sessão**
- `auth.login.success`
- `auth.login.failure` (⚠️ o frontend mock **não** audita tentativas falhas hoje — deve ser adicionado no backend, é sinal importante de força bruta)
- `auth.logout`
- `auth.token.refresh`

**Paciente**
- `patient.view` (leitura de um prontuário específico — hoje não auditado no frontend; é o evento mais sensível do sistema do ponto de vista de LGPD, deveria ser o primeiro a ganhar auditoria real)
- `patient.create`
- `patient.update`
- `patient.status_change` (troca de paciente)

**Anamnese**
- `anamnesis.create`
- `anamnesis.update`
- `anamnesis.finalize`
- `anamnesis.finalize.rejected` (tentativa de alterar anamnese já finalizada — sinal de possível uso indevido ou bug de cliente)

**Evolução**
- `evolution.create`
- `evolution.view` (⚠️ recomendado auditar leitura, não só escrita — evolução é dado clínico sensível)

**Agendamento**
- `appointment.create`
- `appointment.update`
- `appointment.cancel`
- `appointment.absence.register`
- `appointment.absence.justify`

**Documento**
- `document.upload`
- `document.view`
- `document.download`

**Acesso e usuários**
- `user.create`
- `access_request.create`
- `access_request.approve`

**Autorização**
- `authorization.denied` (⚠️ toda vez que o backend recusar uma ação por falta de permissão — essencial para detectar tentativas de acesso indevido; o frontend hoje só mostra um toast, não persiste isso)

## Requisitos não funcionais

- **Imutabilidade:** nenhuma entrada de auditoria pode ser editada ou apagada por meio da API normal da aplicação — no máximo um processo de arquivamento controlado (fora do escopo desta especificação).
- **Assíncrono, mas garantido:** gravar auditoria não deve bloquear a resposta da ação principal ao usuário, mas também não pode ser "melhor esforço" a ponto de se perder silenciosamente — usar uma fila confiável (ex.: outbox pattern) se a gravação for assíncrona.
- **Nunca confiar em dado enviado pelo cliente para `actor`/`actorId`** — sempre resolver a partir do token autenticado no servidor.

## Retenção

A ser definida com jurídico/compliance (ver [SECURITY_BACKEND_REQUIREMENTS.md](./SECURITY_BACKEND_REQUIREMENTS.md)) — prontuário psicológico tende a ter exigência de retenção longa. Não implementar expiração automática (TTL) sem essa definição.
