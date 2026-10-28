# DTOs da API — PEP (FCMSCSP)

Contratos de dados para a futura API Java, referenciados por [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md). Os nomes de campo aqui usam `camelCase` (convenção JSON), diferente das entidades internas em português usadas no frontend mock — o mapeamento entre um e outro é responsabilidade da camada `infrastructure/api/` quando ela existir (ver [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)).

**Princípio geral: nunca expor a entidade interna diretamente.** Cada DTO expõe só o que aquele endpoint precisa — evita vazar campos sensíveis (ex.: hash de senha) e evita acoplar o formato da API ao esquema interno do banco.

## Paginação

Todas as listas seguem o mesmo envelope:

```json
{
  "items": [ /* T[] */ ],
  "page": 1,
  "pageSize": 20,
  "total": 137
}
```

`page` é 1-indexado. Se um endpoint precisar de scroll infinito em vez de páginas numeradas (ex.: auditoria com volume muito alto), usar cursor-based (`?cursor=...`) documentado caso a caso — não introduzir os dois estilos sem necessidade.

## Formato de erro

```json
{
  "code": "PATIENT_NOT_FOUND",
  "message": "Paciente não encontrado",
  "details": {}
}
```

`code` é uma constante estável (para o frontend decidir programaticamente o que fazer); `message` é texto amigável (pt-BR, pode ser mostrado ao usuário); `details` carrega informação estruturada extra quando fizer sentido (ex.: lista de campos inválidos em erro de validação).

## Auth

```ts
// Response de POST /auth/login
UserResponseDTO {
  id: string
  nome: string
  login: string
  papel: "tecnico" | "supervisor" | "estudante" | "paciente"
  avatar: string
  color: string
}
```
Nunca inclui senha ou hash.

## Patient

```ts
CreatePatientDTO {
  nome: string
  cpf: string               // formato livre na entrada; backend normaliza
  nascimento?: string        // ISO date
  telefone?: string
  email?: string
  estudantesIds?: string[]   // 0 a 3
  supervisorId: string
}

UpdatePatientDTO = Partial<CreatePatientDTO> & { status?: "ativo" | "inativo" }

PatientListItemDTO {
  id: string
  nome: string
  cpf: string
  status: "ativo" | "inativo"
  supervisorNome: string      // já resolvido, evita N+1 no frontend
  estudantesNomes: string[]   // idem
  cor: string
  iniciais: string
}

PatientDetailDTO extends PatientListItemDTO {
  nascimento?: string
  telefone?: string
  email?: string
  estudantesIds: string[]
  supervisorId: string
  createdAt: string
  updatedAt: string
}
```

## Anamnesis

```ts
SaveAnamnesisDTO {
  queixa: string             // obrigatório
  historia?: string
  historicoMedico?: string
  medicamentos?: string
  contexto?: string
  hipoteses?: string
  status: "rascunho" | "finalizada"
}

AnamnesisDTO extends SaveAnamnesisDTO {
  patientId: string
  criadoPor: string
  criadoEm: string
  atualizadoEm: string
}
```

## Evolution

```ts
CreateEvolutionDTO {
  data: string                          // ISO datetime
  tipo: "atendimento" | "supervisao"
  conteudo: string                       // obrigatório
  tags?: string[]
}

EvolutionDTO extends CreateEvolutionDTO {
  id: string
  patientId: string
  num: number
  autor: string
  papel: string
  createdAt: string                       // imutável — sem updatedAt (nunca é editada)
}
```

## Appointment

```ts
CreateAppointmentDTO {
  patientId: string
  estudanteId?: string
  supervisorId?: string
  data: string            // ISO date
  hora: string            // "HH:mm"
  local: string
  modalidade: "presencial" | "online"
}

AppointmentDTO extends CreateAppointmentDTO {
  id: string
  status: "confirmado" | "pendente" | "cancelado" | "faltou"
  createdAt: string
  updatedAt: string
}

AbsenceDTO {
  id: string
  appointmentId: string
  patientId: string
  justificada: boolean
  registradoPor: string
  createdAt: string
}
```

## Document

```ts
DocumentDTO {
  id: string
  patientId: string
  nome: string
  tipo: "pdf" | "img" | "docx"
  tamanhoBytes: number        // tamanho real, não simulado, vindo do upload de verdade
  url: string                  // URL assinada/temporária para download, não caminho direto de storage
  autor: string
  createdAt: string
}
```

## AccessRequest

```ts
CreateAccessRequestDTO { patientId: string }

AccessRequestDTO {
  id: string
  patientId: string
  patientNome: string
  status: "pendente" | "liberado"
  protocolo: string
  solicitacao: string
  liberacao?: string
}
```

## AuditEntry

```ts
AuditEntryDTO {
  id: string
  actor: string
  actorId: string
  action: string          // ver docs/AUDIT_LOG_SPEC.md para o vocabulário fechado de ações
  resource?: string
  resourceId?: string
  timestamp: string
  metadata?: Record<string, unknown>
}
```

## Notification

```ts
NotificationDTO {
  id: string
  tipo: "evolucao_pendente" | "troca_solicitada" | "troca_realizada" | "falta_registrada"
  patientId?: string
  titulo: string
  desc: string
  tipoAcao?: "OPEN_PRONTUARIO" | "CONFIRMAR_TROCA"
  lida: boolean
  createdAt: string
}
```
