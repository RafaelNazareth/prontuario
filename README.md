<div align="center">

# 🧠 PEP — Prontuário Eletrônico do Paciente

### Sistema de prontuário clínico para o Serviço-Escola de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge)
![Projeto Real](https://img.shields.io/badge/projeto-institucional%20real-success?style=for-the-badge)
![JS](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

</div>

---

## 📌 Contexto

O **PEP** é um sistema real, sendo desenvolvido para o **Serviço-Escola de Psicologia** da **Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP)** — a clínica onde alunos de graduação em Psicologia realizam atendimentos supervisionados. Este repositório é também meu **Trabalho Integrador de Competências** do curso de Análise e Desenvolvimento de Sistemas.

Os dados manipulados são clínicos e sensíveis (contexto de **LGPD**), e os usuários finais — técnicos, supervisores, estudantes e pacientes — não têm formação técnica. Isso influenciou decisões concretas de código, descritas abaixo.

---

## 🏗️ Como o projeto é estruturado hoje

Sem bundler, sem framework de UI. O front-end roda como **ES Modules nativos do navegador** (`<script type="module" src="./assets/js/main.js">`), com o grafo de dependências resolvido pelos próprios `import`/`export`.

```
assets/
├── css/
│   └── styles.css          (2.867 linhas)
└── js/
    ├── main.js              → ponto de entrada: importa todos os módulos
    │                           e expõe funções no window para os
    │                           onclick/oninput inline do HTML
    ├── core/
    │   ├── auth.js           → sessão, login/logout, roteamento (navigate),
    │   │                        montagem da sidebar por papel de usuário
    │   ├── store.js           → dados em memória, persistência em
    │   │                        localStorage e motor de permissões (RBAC)
    │   └── utils.js           → busca global, toast de notificação,
    │                            auto-logout por inatividade
    ├── pages/                → uma função render*() por tela
    │   ├── dashboard.js
    │   ├── pacientes.js
    │   ├── agenda.js
    │   ├── acesso.js
    │   └── notificacoes.js
    └── modals/
        └── modals.js          → abertura, validação e salvamento
                                  de todos os modais do sistema
index.html                     (311 linhas)
```

No total, cerca de **5.700 linhas de JavaScript** distribuídas nesses módulos, mais **2.867 linhas de CSS** e o `index.html`.

### Essa não é a primeira versão

O sistema começou como um único arquivo `app.js`, crescendo por funcionalidade (dashboard, agenda, notificações, controle de faltas) sem separação de responsabilidades. Em algum momento ficou difícil localizar onde cada regra vivia e o que dependia do quê — o motivo real de eu partir para a modularização.

A divisão atual em `core` / `pages` / `modals`, com `main.js` como ponto único de entrada, foi o resultado dessa reorganização: separar **dados e regras de acesso** (`store.js`), **sessão e navegação** (`auth.js`), **renderização por tela** (`pages/`) e **interações de formulário** (`modals/`), em vez de manter tudo misturado num arquivo só.

Um efeito colateral direto de migrar para ES Modules: como módulos não compartilham escopo global automaticamente, os `onclick`/`oninput` inline que já existiam no HTML pararam de enxergar as funções. A solução foi centralizar no `main.js` a exposição explícita dessas funções via `Object.assign(window, {...})` — uma ponte deliberada entre o mundo modular do JS e o HTML que ainda chama funções por atributo inline.

---

## 🔐 Decisões pensadas para dados clínicos reais

**Controle de acesso por papel (RBAC).** A função `getPacientesPermitidos()` em `store.js` é o motor central de quem vê o quê:

| Papel | O que enxerga |
|---|---|
| `tecnico` | Todos os pacientes da clínica |
| `supervisor` | Apenas pacientes onde é o supervisor responsável |
| `estudante` | Apenas os pacientes que atende |
| `paciente` | Apenas o próprio cadastro |

Essa função é chamada por toda tela que lista pacientes, então o filtro por papel acontece num único lugar — não replicado em cada `render*()`.

**Senha nunca fica em memória.** `sanitizarUsuario()` remove o campo `pass` do objeto de usuário antes de guardá-lo em `currentUser`, tanto no login quanto na restauração de sessão.

**Sessão expira sozinha.** Um timer de inatividade (`resetarTempoInatividade`, em `utils.js`) reinicia a cada movimento de mouse, tecla ou toque; passados 10 minutos sem atividade, o sistema desloga automaticamente.

**Escape de HTML.** Como as telas são montadas via `innerHTML` a partir de dados do usuário (nome do paciente, anotações, etc.), existe uma função `escapeHTML()` usada nesses pontos para reduzir risco de XSS.

**Honestidade sobre os limites da persistência atual.** Os dados hoje ficam em `localStorage`, ofuscados em Base64 — e isso está documentado no próprio código, sem maquiagem:

```js
// ATENÇÃO: btoa/atob é ofuscação Base64, NÃO criptografia real.
// Para produção, substituir por AES-GCM via SubtleCrypto ou mover para backend seguro.
```

Prefiro deixar essa limitação explícita no código a fingir que já está resolvida — é o próximo passo real do projeto, não um detalhe escondido.

**Trilha de auditoria.** Ações como login são registradas via `logAudit()` numa lista `AUDITORIA`, com uma tela dedicada (`Trilha de Auditoria`) para técnicos revisarem o histórico.

**Migração de dados versionada.** A chave de armazenamento (`pep_fcmscsp_data_v14`) carrega no próprio nome o número da versão do formato dos dados, com comentário explicando o que mudou na versão atual — uma forma simples de rastrear evolução do schema sem banco de dados.

---

## ✨ Funcionalidades implementadas

- Login com sessão persistida (`sessionStorage`) e 4 papéis de usuário distintos
- Dashboard com gráficos (Chart.js)
- Cadastro, edição e prontuário completo de pacientes (dados, anamnese, evoluções, documentos, agenda do paciente)
- Agenda com navegação por semana
- Controle de acesso e solicitações de acesso ao prontuário
- Registro e justificativa de faltas, troca de paciente entre estudantes
- Central de notificações com badge
- Busca global de pacientes
- Interface responsiva (mobile-first)

---

## 🚧 O que ainda não existe

- Backend e banco de dados — hoje é 100% front-end com `localStorage`
- Criptografia real dos dados sensíveis (só há ofuscação Base64, como documentado no código)
- Testes automatizados — ainda não escrevi nenhum

---

## 🗺️ Próximos passos

- [ ] Escrever a primeira suíte de testes automatizados, começando pelo motor de permissões (`getPacientesPermitidos`) por ser a regra mais crítica do sistema
- [ ] Construir backend com persistência em banco de dados real
- [ ] Substituir a ofuscação Base64 por criptografia real dos dados sensíveis
- [ ] Implantação para uso real pelo Serviço-Escola de Psicologia da FCMSCSP

---

## 👤 Autor

**Rafael Nazareth**
Estudante de Análise e Desenvolvimento de Sistemas — FCMSCSP (2026–2027)
Ex-supervisor de operações de telemarketing em transição para desenvolvimento full-stack

- GitHub: [@RafaelNazareth](https://github.com/RafaelNazareth)
- LinkedIn: [linkedin.com/in/rafaelnazarethdev](https://linkedin.com/in/rafaelnazarethdev)

---

> Este projeto é o Trabalho Integrador de Competências do curso de ADS da FCMSCSP, com objetivo real de implantação no Serviço-Escola de Psicologia da instituição.
