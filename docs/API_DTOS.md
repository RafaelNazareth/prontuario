# Formato dos dados da API — PEP (FCMSCSP)

Corpos e respostas das rotas descritas em [BACKEND_CONTRACT.md](./BACKEND_CONTRACT.md). Os nomes de campo são os mesmos do banco (em português), porque a API devolve o próprio conjunto de dados filtrado pelo escopo. A proteção de campos sensíveis é feita no servidor: hash de senha, dados de bloqueio e login de outros usuários nunca saem para quem não é técnico (`usuarioPublico` em `shared/politica.js`).

Os campos de cada entidade estão em [DOMAIN_MODEL.md](./DOMAIN_MODEL.md). Abaixo, só o que é próprio da API.

## Erro

```json
{ "erro": "Somente o técnico responsável cria agendamentos." }
```

Em `401`, também `"motivo"`: `sem_sessao`, `sessao_invalida`, `inatividade`, `expirada`, `usuario_inativo` ou `acesso_expirado` (acesso temporário do paciente vencido; as sessões dele são encerradas).

Em `403`, `"motivo": "troca_senha"` quando a troca de senha está pendente: até a troca, só `GET /api/auth/me`, `POST /api/auth/termo`, `POST /api/auth/senha` e o logout respondem.

## Usuário público

```ts
UsuarioPublico {
  id: number
  nome: string
  papel: "tecnico" | "supervisor" | "estudante" | "paciente"
  avatar: string          // iniciais
  color: string
  crp: string | null      // "CRP 06/123456" (técnico e supervisor)
  matricula: string | null // estudante
  ativo: boolean
}

// Só para o técnico (usuarioPublico com completo: true):
UsuarioCompleto extends UsuarioPublico {
  login: string
  ultimoAcesso: string | null
  bloqueadoAte: string | null
  trocaObrigatoria: boolean
  acessoExpiraEm?: string | null // só no usuário paciente: fim do acesso temporário
}
```

Nunca inclui senha, hash ou senha anterior.

## Sessão

```ts
// POST /api/auth/login → corpo
{ login: string, senha: string }

// Resposta de login e de GET /api/auth/me
RespostaSessao {
  usuario: UsuarioPublico & { login: string, acessoExpiraEm?: string } // acessoExpiraEm só para o paciente
  termoPendente: boolean          // precisa aceitar a versão atual do aviso/termo
  trocaObrigatoria: boolean       // equipe com senha inicial ou provisória: precisa trocar antes de seguir (nunca no paciente)
  config: {
    inatividadeMinutos: number    // 15
    avisoInatividadeSegundos: number // 60
    senha: { minimo: number, exigeLetra: boolean, exigeNumero: boolean, exigeEspecial: boolean }
  }
  institucional: Institucional    // ver GET /api/institucional
  acesso?: { ultimoAcesso: string | null, falhasDesdeUltimoAcesso: number } // só no login
}

// POST /api/auth/termo
{ versao: string }                // ex.: "2026-10"

// POST /api/auth/senha
{ senhaAtual: string, novaSenha: string }
```

## Usuários (técnico)

```ts
// POST /api/usuarios: equipe
{ nome, login, papel: "tecnico" | "supervisor" | "estudante", crp?, matricula?, senhaInicial, senhaAdmin }

// POST /api/usuarios com papel "paciente" é recusado (400): use a rota abaixo.

// POST /api/pacientes/:pid/acesso-temporario: gera ou renova o acesso do paciente
{ senhaAdmin: string }
// Resposta 200 (a senha aparece só aqui, uma única vez)
{ usuario: UsuarioCompleto, login: string /* "pac<id do caso>" */, senha: string /* 10 caracteres, sem ambíguos */,
  expiraEm: string, validadeDias: number, validadeDefinida: boolean /* false = prazo provisório de 7 dias */ }

// PUT /api/usuarios/:id (campos ausentes ficam como estão; no paciente, só login)
{ nome?, login?, papel?, crp?, matricula?, senhaAdmin }

// POST /api/usuarios/:id/senha (equipe; para paciente responde 400: renove o acesso temporário)
{ senhaProvisoria: string, senhaAdmin: string }

// POST /api/usuarios/:id/ativo
{ ativo: boolean, senhaAdmin: string }

// Respostas
{ usuario: UsuarioCompleto }                          // cadastro, senha, desbloqueio, ativo
{ usuario: UsuarioCompleto, alterados: string[] }     // edição, ex.: ["nome", "papel"]
```

`login`: 3 a 40 letras, números, ponto, hífen ou sublinhado, único (sem diferenciar maiúsculas). `senhaInicial` e `senhaProvisoria`: qualquer senha com pelo menos `SEGURANCA.senhaProvisoriaMinimo` (4) caracteres, trocada no primeiro acesso. A senha que a pessoa cria em `POST /api/auth/senha` segue a política de `SEGURANCA.senha` (mínimo de 8, com letra e número, sem conter nome ou login, diferente da atual).

## Conjunto de dados

`GET /api/data` devolve, e `PUT /api/data` recebe:

```ts
Dataset {
  USERS: UsuarioPublico[]                       // UsuarioCompleto para o técnico
  PACIENTES: Paciente[]
  ANAMNESES: { [pacienteId]: Anamnese }
  EVOLUCOES: { [pacienteId]: Evolucao[] }
  DOCUMENTOS: { [pacienteId]: Documento[] }
  REGISTRO_DOCUMENTAL: { [pacienteId]: RegistroDocumental[] }
  COMPARTILHAMENTOS: { [pacienteId]: Compartilhamento[] }
  AGENDAMENTOS: Agendamento[]
  FALTAS: Falta[]
  SOLICITACOES_AGENDAMENTO: SolicitacaoAgendamento[] // técnico: todos; demais (inclusive paciente): []
  NOTIFICACOES: Notificacao[]
  ACESSO_PACIENTE: SolicitacaoTitular[]         // técnico: todas; demais (inclusive paciente): []
  AUDITORIA: []                                 // sempre vazia nesta rota
}

// PUT /api/data → resposta
{ ok: true, data: Dataset }
```

O usuário paciente não grava: qualquer `PUT /api/data` dele é recusado. O `PUT` pode mandar só as coleções alteradas. Itens iguais ao que está no banco são ignorados; itens ausentes não são apagados.

## Arquivos anexados

```ts
// POST /api/pacientes/:pid/documentos → corpo
{
  documento: {
    categoria: "outro" | "termo" | "diagnostico_externo" | "material_teste"
    titulo?: string
    origem?: { profissional: string, crp: string, instituicao?: string, emitidoEm?: string } // obrigatório em diagnostico_externo
    resumo?: string
  }
  arquivo: { nome: string, conteudoBase64: string }   // até 10 MB depois de decodificado
}

// Resposta 201
{ documento: Documento, data: Dataset }

// Metadado gravado pelo servidor em Documento.arquivo
ArquivoAnexado {
  id: string          // "a_<uuid>", chave no armazenamento cifrado
  nome: string        // nome limpo, com a extensão do tipo real
  mime: string        // application/pdf, image/png, image/jpeg ou o MIME do .docx
  tamanho: number     // bytes do original
  sha256: string      // do original, conferido a cada download
  enviadoEm: string
}
```

`GET /api/pacientes/:pid/documentos/:docId/arquivo` responde com o próprio arquivo (`Content-Type` = `arquivo.mime`, `Content-Disposition: attachment`), não JSON.

## Auditoria

```ts
// POST /api/audit/evento
{ tipo: "consulta_prontuario" | "consulta_documento" | "consulta_registro_documental" | "impressao" | "exportacao",
  pacienteId?: number, registroId?: string | number, complemento?: string }

// GET /api/audit?de=&ate=&tipo=&userId=&pacienteId=&pagina=&porPagina=
{
  total: number, pagina: number, paginas: number, porPagina: number,
  entradas: RegistroAuditoria[],                 // ver AUDIT_LOG_SPEC.md
  verificacao: { integra: boolean, total: number, falhaEm?: string },
  eventos: { [tipo]: string }                    // descrições para a tela
}
```

## Institucional

```ts
// GET /api/institucional
Institucional {
  controlador, servico, endereco, horario, contato: string
  encarregado: { nome: string, email: string, telefone?: string }
  responsavelTecnico: { nome: string, crp: string } | null
  software: { nome: string, instituicao: string, versao: string }   // versao "1.2.0"
  versaoTermo: string
  prazoRespostaTitularDias: number   // 15
  guardaAnos: number                 // 20
  pendencias: string[]               // campos ainda "[definir]", ex.: ["encarregado.nome", "acessoPortal.validadeDias"]
  acessoPortalDias: number           // validade do acesso temporário do paciente (7 enquanto não definida)
}
```
