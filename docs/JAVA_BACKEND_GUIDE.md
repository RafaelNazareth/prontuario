# Guia de Arquitetura do Backend Java — PEP (FCMSCSP)

Sugestão de organização para quando o backend Java começar a ser implementado. **Não implementado agora** — este documento é um ponto de partida, não uma decisão travada; o time de backend deve ajustar conforme necessário.

## Camadas sugeridas

```
Controller
 ↓
Application / Service
 ↓
Domain
 ↓
Repository
 ↓
MongoDB
```

- **Controller:** só tradução HTTP ↔ DTO. Não deve conter regra de negócio (ex.: a checagem "anamnese finalizada é imutável" não deve estar no controller).
- **Application/Service:** orquestra casos de uso (ex.: `RegisterAbsenceService` — registra a falta, checa se chegou a 2 injustificadas, dispara a notificação; várias operações em sequência que precisam acontecer juntas).
- **Domain:** entidades e regras invariantes (ex.: `Anamnesis.finalize()` que lança exceção se já estiver finalizada — a regra vive no objeto de domínio, não espalhada em services).
- **Repository:** interface de acesso a dados (ex.: `PatientRepository extends MongoRepository<Patient, String>`), espelhando o mesmo vocabulário que o frontend já usa em `repositories/*.js` (`findById`, `save`, não expor detalhes de query do Mongo para cima).

Este espelhamento de vocabulário entre `repositories/*.js` (frontend) e as interfaces de repositório do backend é intencional — facilita a comunicação entre os times ao discutir contratos.

## Sugestão de pacotes

```
com.fcmscsp.pep
├── auth/              # login, JWT, refresh token
├── users/             # CRUD de usuários, papéis
├── patients/          # pacientes, RBAC de escopo
├── clinical/          # anamnese, evolução (agrupados por serem o "prontuário" propriamente dito)
├── appointments/       # agendamentos, faltas
├── documents/           # metadado de documentos + integração com storage de binários
├── access/               # solicitações de acesso do paciente
├── notifications/         # notificações
├── audit/                  # trilha de auditoria (ver docs/AUDIT_LOG_SPEC.md)
└── shared/                  # DTOs comuns, tratamento de erro padronizado, config
```

`clinical` agrupa anamnese e evolução propositalmente — no domínio elas são sempre discutidas juntas ("o prontuário do paciente") e compartilham a mesma regra de RBAC de escopo; separar em dois pacotes traria pouco ganho.

## Tratamento de erros

Um `@ControllerAdvice` (ou equivalente) central deve traduzir exceções de domínio (ex.: `AnamnesisAlreadyFinalizedException`) para o formato de erro padronizado em [API_DTOS.md](./API_DTOS.md#formato-de-erro), mapeando para o código HTTP correto (409, 422, 403, 404...). Evita que cada controller reimplemente esse mapeamento.

## Versionamento de API

Todas as rotas sob `/api/v1/...` desde o início (o frontend já está preparado para isso — ver `core/config.js`). Não assumir que a API nunca terá uma v2; começar versionado custa pouco e evita uma migração dolorosa depois.

## Testes

- Testes de unidade para as regras de domínio (imutabilidade de anamnese/evolução, conflito de agendamento, limite de 2 faltas).
- Testes de integração para os endpoints de autorização — especialmente os casos negativos (estudante tentando ler paciente de outro grupo, paciente tentando ler prontuário de outro paciente) — espelhando os testes de segurança já escritos no frontend (`tests/permissions.test.js`, ver [REFACTORING_REPORT.md](./REFACTORING_REPORT.md)).

## O que este guia deliberadamente não decide

- Framework específico (Spring Boot é o mais comum no ecossistema Java + MongoDB, mas a escolha cabe ao time que for implementar).
- Estratégia de deploy/infraestrutura.
- Se a comunicação entre serviços (se houver mais de um) é síncrona ou por mensageria — este projeto, pelo escopo descrito, parece caber em um monólito modular (os pacotes acima), sem necessidade de microsserviços.
