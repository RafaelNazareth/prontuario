<div align="center">

# 🧠 PEP — Prontuário Eletrônico do Paciente

### Sistema de prontuário clínico para o Serviço-Escola de Psicologia da Faculdade de Ciências Médicas da Santa Casa de São Paulo

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow?style=for-the-badge)
![Testes](https://img.shields.io/badge/testes-75%20passando-success?style=for-the-badge)
![Projeto Real](https://img.shields.io/badge/projeto-institucional%20real-success?style=for-the-badge)
![JS](https://img.shields.io/badge/JavaScript-ES%20Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

### [🔗 **Acessar o projeto rodando**](https://rafaelnazareth.github.io/prontuario/)

</div>

---

## 📌 Contexto

O **PEP** é um sistema real, sendo desenvolvido para o **Serviço-Escola de Psicologia** da **Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP)** — a clínica onde alunos de graduação em Psicologia realizam atendimentos supervisionados. Este repositório é também meu **Trabalho Integrador de Competências** do curso de Análise e Desenvolvimento de Sistemas.

Os dados manipulados são clínicos e sensíveis (contexto de **LGPD**), e os usuários finais — técnicos, supervisores, estudantes e pacientes — não têm formação técnica. Isso influenciou decisões concretas de código, descritas abaixo.

---

## 🚀 Como acessar

**Demonstração online:** [rafaelnazareth.github.io/prontuario](https://rafaelnazareth.github.io/prontuario/). Use um dos logins de teste abaixo; a senha de todos é `1234`.

| Perfil | Login |
|---|---|
| Psicólogo técnico (responsável técnico) | `tecnico` |
| Supervisor | `supervisor` |
| Estudante | `estudante` |
| Paciente | `paciente` |

No GitHub Pages não há servidor, então o sistema entra sozinho em **modo demonstração**. A parte do servidor roda dentro do navegador, com as mesmas regras da versão completa. Os dados são fictícios e as alterações ficam salvas só no navegador de quem está testando; o selo "Demonstração" no topo permite restaurar os dados de exemplo.

**Versão completa (local):** com Node.js 18+, rode `npm run dev` e acesse `http://localhost:5500`. Nesse modo, login, permissões e auditoria rodam no servidor e os dados ficam em `data/db.json`.

---

## 🏗️ Como o projeto é estruturado hoje

Sem bundler e sem framework de UI. O front-end roda como **ES Modules nativos do navegador**, e o servidor é Node.js puro, sem dependências.

```
index.html
assets/
├── css/styles.css
└── js/
    ├── main.js              → ponto de entrada; expõe funções para os onclick do HTML
    ├── core/                → sessão e navegação, estado, permissões, datas, regras clínicas
    ├── pages/               → uma função render*() por tela
    ├── modals/              → formulários e ações de registro clínico
    ├── repositories/        → acesso aos dados por entidade
    ├── shared/              → regras usadas pelo servidor e pelo modo demonstração:
    │                          permissões, auditoria, política de senha, configuração
    └── infrastructure/      → comunicação com a API e servidor simulado (demonstração)
server/                      → servidor Node: autenticação, API, auditoria, backup cifrado
data/seed.json               → dados de demonstração (fictícios)
scripts/                     → geração de agenda e restauração de backup
tests/                       → 75 testes automatizados (node:test)
docs/                        → guia técnico, conformidade e documentação de arquitetura
```

O sistema começou como um único `app.js`, foi modularizado em ES Modules e depois ganhou um servidor próprio para tirar do navegador as decisões de segurança.

Detalhes de arquitetura, scripts e dados estão no [guia técnico](docs/GUIA_TECNICO.md).

---

## 🔐 Decisões pensadas para dados clínicos reais

O sistema foi revisado contra as normas do **Conselho Federal de Psicologia**, a **LGPD** e o manual de certificação de prontuários eletrônicos da **SBIS**. A matriz completa, com cada requisito, a fonte e onde está no código, está em [docs/CONFORMIDADE.md](docs/CONFORMIDADE.md).

**Segurança decidida no servidor.**
- Cada papel recebe só os pacientes que pode ver: o técnico vê todos; o supervisor, os que supervisiona; o estudante, os do seu grupo; o paciente, só o próprio prontuário.
- Toda gravação é conferida item a item antes de ir para o disco.

**Senhas e sessão.**
- Senhas guardadas com hash scrypt e salt.
- Bloqueio após 5 tentativas erradas e mensagem de erro genérica.
- Sessão em cookie HttpOnly, encerrada após 15 minutos sem atividade, com aviso antes.

**Prontuário conforme o CFP.**
- Seções obrigatórias: identificação, avaliação de demanda, objetivos, evoluções, encerramento e cópias dos documentos emitidos.
- Supervisões e material de testes ficam num registro documental separado, que o paciente não acessa.

**Assinatura do estagiário e do supervisor.** Evoluções, avaliações e documentos de estagiários só valem depois da co-assinatura do supervisor do caso.

**Nada é apagado.** Correções são retificações feitas pelo próprio autor, com justificativa, e a versão anterior continua visível.

**Trilha de auditoria.**
- Registra quem consultou, imprimiu ou alterou cada prontuário, com IP, sem dados clínicos no log.
- Cada registro está encadeado ao anterior por hash, então qualquer adulteração é detectada.

**Direitos do paciente.**
- Portal com acesso integral ao próprio prontuário.
- Solicitações pela LGPD com prazo de 15 dias.
- Consentimentos versionados e revogáveis, com autorização do responsável para menores.

---

## ✨ Funcionalidades implementadas

- **Login:** quatro papéis, aceite de aviso de privacidade e termo de sigilo, troca de senha e bloqueio por tentativas.
- **Dashboard:** indicadores, gráfico de atendimentos, agenda do dia e pendências, incluindo validações do supervisor.
- **Prontuário completo:**
  - avaliação de demanda e objetivos;
  - evoluções com validação e retificação;
  - documentos;
  - termos e comunicações;
  - registro documental;
  - agenda do paciente.
- **Documentos psicológicos conforme a Res. CFP 06/2019:**
  - declaração, atestado, relatório, laudo e parecer;
  - impressão com páginas numeradas, protocolo de entrega e devolutiva.
- **Agenda semanal** até dezembro de 2026, com registro de faltas e troca de paciente.
- **Encerramento de atendimento** com motivo e encaminhamento.
- **Gestão de usuários:** inativação em vez de exclusão, CRP e matrícula.
- **Auditoria:** filtros, exportação CSV e verificação de integridade.
- **Backup cifrado (AES-256-GCM)** com restauração verificada.
- **Interface responsiva.**

---

## 🚧 O que ainda não existe

- **Publicação para uso real:** precisa de hospedagem com Node.js, HTTPS e disco cifrado. O GitHub Pages serve apenas a demonstração.
- **Assinatura com certificado digital ICP-Brasil:** hoje a assinatura é eletrônica, por login individual mais o hash do conteúdo.
- **Verificação em duas etapas (MFA).**
- **Banco de dados:** os dados ficam em um arquivo JSON gravado pelo servidor; está planejada a migração para banco de dados.

---

## 🗺️ Próximos passos

- [ ] Publicar a versão completa em hospedagem com Node.js e HTTPS
- [ ] Cumprir o checklist institucional de [docs/CONFORMIDADE.md](docs/CONFORMIDADE.md): encarregado de dados, plano de incidentes e troca das senhas de demonstração
- [ ] Migrar a persistência para banco de dados
- [ ] Avaliar assinatura com certificado ICP-Brasil e MFA
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
