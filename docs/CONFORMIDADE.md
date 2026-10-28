# Conformidade do PEP: normas do prontuário psicológico eletrônico

Este documento cruza as regras brasileiras aplicáveis a um prontuário eletrônico de **Serviço-Escola de Psicologia** com o que o sistema faz, indicando a fonte e onde cada requisito está implementado. Ele resume uma pesquisa feita em outubro de 2026 nas fontes primárias (CFP, Planalto, ANPD, SBIS) e em manuais de serviços-escola.

> **Aviso.** Este material é um levantamento técnico para orientar o desenvolvimento. Não é parecer jurídico. Antes de usar o sistema com dados reais, a instituição deve validar a interpretação com o jurídico, com o encarregado de dados e com o CRP-SP.

Legenda de status: **✅ implementado** · **🟡 parcial** · **⛔ fora do escopo do software** (cabe à instituição ou à implantação).

---

## 1. Normas consideradas

| Norma | Por que se aplica |
|---|---|
| **Res. CFP nº 001/2009**, alterada pela 005/2010 | Registro documental obrigatório do psicólogo: conteúdo, guarda, acesso e serviço-escola (art. 3º). |
| **Res. CFP nº 05/2025** (estágios e serviços-escola) | Seções do prontuário (art. 12), registro documental separado (art. 17 §2º), material de testes fora do prontuário (art. 14), assinatura conjunta (art. 19), informações ao usuário (art. 10). Vigente desde 01/02/2026. Uma liminar do STF (ADI 7911) suspendeu três dispositivos; as notícias indicam que são regras de supervisão e carga horária, não os artigos de prontuário, mas **isso precisa ser conferido na decisão**. |
| **Res. CFP nº 13/2022** (psicoterapia) | Informar que é atividade educativa supervisionada (art. 8º IV), autorização de responsável (art. 12), gravação (art. 11). |
| **Res. CFP nº 06/2019** (documentos escritos) | Declaração, atestado, relatório, laudo e parecer: estrutura, validade, protocolo, devolutiva e guarda. |
| **Código de Ética (Res. CFP nº 010/2005)** | Sigilo (arts. 9º–12), menores (arts. 8º e 13), meios de registro (art. 14), transferência (art. 15), ensino e pesquisa (art. 16), supervisão (art. 17). |
| **Res. CFP nº 09/2024** (TDIC) | Revogou a Res. 11/2018. Só se aplica se houver teleatendimento; o sistema não oferece. |
| **Lei nº 13.787/2018** | Prontuário eletrônico: integridade, autenticidade, confidencialidade (arts. 2º e 4º) e eliminação só após 20 anos do último registro (art. 6º). |
| **LGPD (Lei nº 13.709/2018)** e resoluções da ANPD (2/2022, 15/2024, 18/2024) | Dado de saúde é sensível; bases legais, aviso, encarregado, direitos do titular, segurança e incidentes. |
| **Lei nº 14.063/2020** | Assinaturas eletrônicas: documentos de profissionais de saúde (exceto receita controlada e atestado médico) exigem no mínimo assinatura **avançada** (art. 14). |
| **SBIS — Requisitos de certificação S-RES v5.2, NGS1** | Certificação voluntária. Usada como referência técnica de segurança: senha, sessão, auditoria, integridade e backup. |

**Divergência relevante: prazo de guarda.** O CFP exige no mínimo 5 anos (Res. 001/2009, art. 4º). A Lei 13.787/2018 fala em 20 anos do último registro para "prontuário do paciente", e o Manual Orientativo do CFP (2025) indica 20 anos em estabelecimentos de saúde. **O sistema adota 20 anos** (configurável em `server/config.mjs`). Para menores de idade, a contagem começa aos 18 anos, como orienta o Manual.

---

## 2. Conteúdo e organização do prontuário

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Identificação do usuário (nome civil e social, nascimento, CPF, contato, emergência, responsável) | Res. 001/2009 art. 2º I; Res. 05/2025 art. 12 I; Manual CFP 2025 | ✅ | Aba Resumo; cadastro em `modals.js` (`openModalNovoPaciente`) |
| Avaliação de demanda | art. 2º II; art. 12 II | ✅ | Aba "Avaliação de demanda" (`renderTabAnamnese`) |
| Definição de objetivos do trabalho | art. 2º II; art. 12 III | ✅ | Campo `objetivos`, obrigatório para finalizar a avaliação |
| Evolução com procedimentos técnico-científicos | art. 2º III; art. 12 IV | ✅ | Aba Evoluções |
| Registro de encaminhamento ou encerramento (inclui abandono, desistência e interrupção) | art. 2º IV; art. 12 V; Manual 2025 | ✅ | "Encerrar" no prontuário (`openModalEncerramento`); também gerado na troca de paciente por faltas |
| Cópias dos documentos emitidos, com data de emissão, finalidade e destinatário | art. 2º V; art. 12 VI | ✅ | Aba Documentos, grupo "Documentos emitidos" |
| Material de testes em pasta de acesso exclusivo, fora do prontuário | art. 2º VI (red. 2010); Res. 05/2025 art. 14 | ✅ | Categoria "Material de teste" (`compartimento: "restrito"`), exibida só na aba Registro documental |
| Supervisão, orientações e registros administrativos no **registro documental**, fora do prontuário | Res. 05/2025 art. 17 §2º | ✅ | Coleção `REGISTRO_DOCUMENTAL`; o servidor nunca a entrega ao paciente |
| Registro mantido atualizado e organizado | Res. 001/2009 art. 1º §2º | ✅ | Ordem cronológica, numeração sequencial, pendências de validação no dashboard |
| Documentação individual em atendimento de grupo | Res. 001/2009 art. 5º III | ⛔ | O serviço só faz atendimento individual. Se houver grupos, registrar no prontuário de cada participante. |
| Prontuário único em serviço multiprofissional | Res. 001/2009 art. 6º | ⛔ | Não se aplica (serviço só de Psicologia) |

## 3. Serviço-escola: estagiário, supervisor e responsável técnico

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Registro identificado e assinado pelo estagiário **e** pelo supervisor | Res. 001/2009 art. 3º; Res. 05/2025 art. 19; Manual 2025 p. 46 | ✅ | Evolução, avaliação e documento de estudante nascem "Aguardando validação"; só o supervisor do caso ou o técnico co-assina (`server/policy.mjs`). |
| Supervisor exige registro de todas as atividades | Res. 001/2009 art. 3º, parágrafo único | ✅ | Pendências no dashboard; aviso de evolução não registrada após a sessão |
| Responsável técnico identificado (psicólogo com CRP) | Res. 05/2025 art. 10; CNE/CES 01/2023 art. 18 | ✅ | Técnico com CRP, exibido no aviso, no portal e nas impressões |
| Termo de responsabilidade e sigilo do estagiário | Res. 05/2025 art. 10 III; Código de Ética arts. 9º e 17 | ✅ | Aceite obrigatório no primeiro acesso, por versão (`pages/privacidade.js`), auditado |
| Usuário informado de que é atividade educativa supervisionada | Res. 13/2022 art. 8º IV | ✅ | Texto do TCLE registrado no cadastro; aviso de privacidade; portal |
| Registro de notificações compulsórias | Res. 05/2025 art. 7º III; Res. 13/2022 art. 13 | ✅ | "Comunicações e compartilhamentos": tipo "Notificação compulsória", com fundamento obrigatório |

## 4. Acesso, sigilo e consentimento

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Acesso integral do usuário ou representante ao prontuário | Res. 001/2009 art. 5º II; Res. 05/2025 art. 13 | ✅ | Portal "Meu prontuário" mostra identificação, avaliação, evoluções validadas, documentos, encerramento, termos e compartilhamentos; impressão em PDF |
| Informar direitos, responsável técnico, horários e Código de Ética | Res. 05/2025 art. 10 I e IV | ✅ | Aviso de privacidade e página "Privacidade e direitos" |
| Acesso por papel e só aos casos atribuídos | LGPD arts. 46–49; Código de Ética art. 9º | ✅ | Escopo **no servidor** (`escopo()` em `server/policy.mjs`): o navegador só recebe o permitido |
| Autorização do responsável para menores | Código de Ética art. 8º; Res. 13/2022 art. 12; LGPD art. 14 | ✅ | O cadastro de menor exige responsável com CPF válido e a autorização; há alerta na aba Termos se faltar |
| Comunicar aos responsáveis só o essencial | Código de Ética art. 13 | 🟡 | Tipo "Comunicação aos responsáveis" com registro do conteúdo. O limite depende do julgamento profissional. |
| Quebra de sigilo mínima e fundamentada | Código de Ética art. 10 | ✅ | Tipo "Quebra de sigilo" exige fundamento (o servidor recusa sem ele) |
| Resposta a requisição judicial por documento, não por cópia do prontuário | Res. 13/2022 art. 10 IV | ✅ | Orientação no modal de comunicação; emissão de documento conforme a 06/2019 |
| Consentimento para gravação, pesquisa e ensino identificável, revogável | Res. 13/2022 art. 11; Código de Ética arts. 14 e 16; LGPD art. 8º §5º | ✅ | Consentimentos versionados por paciente; revogação com motivo, sem apagar o registro |
| Registro de compartilhamentos (data, finalidade, destinatário) | Res. 001/2009 art. 2º V; LGPD art. 18 VII | ✅ | `COMPARTILHAMENTOS`, visíveis ao titular, exceto quando a equipe marca o contrário (ex.: notificação de violência) |
| Pesquisa com aprovação em CEP e anonimato | Código de Ética art. 16 | ⛔ | Processo institucional; o sistema só registra o consentimento |

## 5. Documentos psicológicos (Res. CFP 06/2019)

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Modalidades: declaração, atestado, relatório, laudo, parecer | art. 8º | ✅ | `openModalEmitirDocumento` (`modals/registros.js`). Relatório multiprofissional não se aplica. |
| Estrutura de cada modalidade (identificação, demanda, procedimento, análise, conclusão, referências) | arts. 9º–14 | ✅ | Campos obrigatórios por modalidade |
| Declaração sem sintomas nem diagnóstico | art. 9º | ✅ | O sistema recusa texto com termos clínicos (verificação por palavras-chave; a responsabilidade final é de quem assina) |
| Prazo de validade no último parágrafo | art. 17 | ✅ | Obrigatório para atestado, relatório, laudo e parecer |
| Local, data, nome, CRP e assinatura; laudas numeradas e rubricadas | art. 5º §8º; art. 9º §2º | ✅ | Impressão com "Página X de Y", campo de rubrica e assinaturas com CRP ou matrícula |
| Protocolo de entrega | art. 16 §1º | ✅ | Última página da impressão + registro da entrega |
| Devolutiva obrigatória para relatório e laudo, ou motivo | art. 18 | ✅ | "Registrar devolutiva"; o card mostra "Devolutiva pendente" |
| Guarda mínima de 5 anos | art. 15 | ✅ | Coberta pela guarda de 20 anos |

## 6. Integridade, autenticidade e assinatura

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Registros não podem ser apagados | Lei 13.787 arts. 4º e 6º; SBIS NGS1.12.03 | ✅ | O servidor ignora ausências e recusa alterações: não existe exclusão |
| Correção só pelo autor, com nova versão, justificativa e versão anterior visível | SBIS NGS1.12.01; LGPD art. 18 III | ✅ | "Retificar" na evolução; `versoes[]` mostradas no prontuário |
| Avaliação finalizada imutável | Res. CFP 001/2009 (registro); SBIS NGS1.12 | ✅ | O servidor recusa alteração após a finalização (exceto a co-assinatura) |
| Autoria, data e hora carimbadas pelo servidor | Lei 13.787 art. 2º; SBIS NGS1.09 | ✅ | `autorId`, `registradoEm` e `assinatura` gerados em `server/policy.mjs` |
| Assinatura eletrônica avançada (vínculo ao signatário e detecção de alteração) | Lei 14.063/2020 arts. 4º II e 14 | 🟡 | Login individual + hash SHA-256 do conteúdo selado no registro. É assinatura eletrônica com vínculo e detecção de alteração, mas **não usa certificado digital**. Para valor probatório pleno, adotar ICP-Brasil (ver seção 10). |
| Assinatura qualificada ICP-Brasil / SBIS NGS2 | MP 2.200-2/2001; SBIS NGS2 | ⛔ | Exige certificado digital dos profissionais e integração com assinador |

## 7. Segurança (LGPD art. 46; SBIS NGS1; Guia de Segurança da ANPD)

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Autenticação e validação no servidor | NGS1.02.01, NGS1.05.02 | ✅ | `server/index.mjs`, `server/policy.mjs` |
| Senha com hash ≥160 bits e salt único | NGS1.02.02/19 | ✅ | scrypt, salt de 128 bits, chave de 512 bits (`server/security.mjs`); nenhuma senha em texto no banco |
| Política de senha (≥8, letra e número, sem nome ou login; diferente da atual e da anterior) | NGS1.02.03/04/11 | ✅ | `validarPoliticaSenha` |
| Troca obrigatória após senha definida pelo administrador | NGS1.02.06 | ✅ | Usuário novo é obrigado a trocar no primeiro acesso |
| Bloqueio após N tentativas (N ≤ 10) | NGS1.02.13 | ✅ | 5 tentativas → 15 min, ou desbloqueio pelo técnico |
| Mensagem de erro genérica | NGS1.02.16 | ✅ | "Usuário ou senha incorretos." |
| Exibir último acesso e tentativas sem sucesso | NGS1.02.15 | ✅ | Aviso após o login |
| Sem preenchimento automático de credenciais | NGS1.02.17 | 🟡 | `autocomplete="off"` (alguns navegadores ignoram) |
| Reautenticação para gerir usuários | NGS1.02.14 | ✅ | Senha do técnico exigida para criar, inativar e reativar |
| Encerramento por inatividade, configurável, com aviso | NGS1.02.20/22 | ✅ | 15 min com aviso de 60 s, no servidor e na tela |
| Proteção contra roubo de sessão | NGS1.02.23 | ✅ | Cookie HttpOnly e SameSite=Strict, vinculado a IP e navegador; cabeçalho anti-CSRF |
| Usuário não é excluído, só inativado; ≥1 administrador ativo | NGS1.03.09/10 | ✅ | `POST /api/usuarios/:id/ativo` |
| Cabeçalhos de segurança | Boa prática | ✅ | CSP, X-Frame-Options, nosniff, Referrer-Policy |
| Dados fora do alcance do servidor de arquivos | NGS1.06.01 | ✅ | A pasta `data/` não é servida; acesso só pela API autenticada |
| Minimização em listas (CPF mascarado) | LGPD art. 6º III | ✅ | CPF completo só para o técnico |
| HTTPS | NGS1.05.01; Guia ANPD | ⛔ | O servidor local usa HTTP em 127.0.0.1. Em produção, publicar atrás de um proxy com TLS; o cookie passa a ser Secure. |
| MFA | NGS1.02.18; Guia ANPD item 41 ("preferencialmente") | ⛔ | Recomendado para a implantação |
| Criptografia em repouso do banco | Guia ANPD item 46 (boa prática) | ⛔ | `db.json` não é cifrado; usar disco cifrado (BitLocker/LUKS) na implantação. Os backups são cifrados. |

## 8. Auditoria (SBIS NGS1.07; LGPD art. 6º X e art. 37)

| Requisito | Status | Onde |
|---|---|---|
| Contínua, gravada só pelo servidor, impossível de desligar ou apagar | ✅ | `server/audit.mjs`; a rota de dados ignora `AUDITORIA` vinda do navegador |
| Protegida contra alteração | ✅ | Encadeamento SHA-256; a tela mostra "Trilha íntegra" ou o ponto da falha |
| Eventos: login com e sem sucesso, bloqueio, logout, expiração, senha, aceite de termo, gestão de usuários, **consulta** de prontuário, documento e registro documental, impressão, exportação, criação, validação e retificação de registros, consentimentos, compartilhamentos, solicitações do titular, backup e restauração | ✅ | Lista em `EVENTOS` (`server/audit.mjs`) |
| Campos: ID, data e hora com fuso, evento, IP, usuário, paciente e registro por ID | ✅ | |
| Sem dado clínico ou nome do paciente no log | ✅ | Só IDs; a tela resolve os nomes para o técnico |
| Consulta com filtros (data, evento, usuário, paciente) e acesso só do auditor | ✅ | Página Auditoria (técnico); a própria consulta é auditada |
| Exportação em CSV com identificação do software e da instituição | ✅ | `GET /api/audit/csv` |

## 9. LGPD: direitos do titular, transparência e guarda

| Requisito | Fonte | Status | Onde |
|---|---|---|---|
| Aviso de privacidade (finalidade, bases legais, compartilhamento, retenção, direitos, segurança) | LGPD arts. 6º VI e 9º | ✅ | `htmlAvisoPrivacidade` (login, aceite e página Privacidade) |
| Identidade e contato do encarregado em destaque | LGPD art. 41 §1º; Res. ANPD 18/2024 | 🟡 | Exibido no aviso, mas os dados estão marcados **[definir]** em `server/config.mjs` |
| Bases legais corretas (tutela da saúde e obrigação regulatória; consentimento só para usos opcionais) | LGPD art. 11 II "a" e "f"; art. 11 I | ✅ | Texto do aviso; consentimentos opcionais separados |
| Aceite registrado por versão | SBIS NGS1.11.01 | ✅ | `termos[versão]` + evento `termo_aceito` |
| Solicitações do titular com protocolo e prazo de 15 dias | LGPD arts. 18 e 19 II | ✅ | Portal → "Fazer uma solicitação"; técnico → "Solicitações dos titulares", com prazo e alerta de vencimento |
| Contestação ou correção registrada | SBIS NGS1.11.08; LGPD art. 18 III | ✅ | Tipo "Correção de dados" + resposta registrada |
| Eliminação bloqueada durante a guarda; recusa justificada | LGPD art. 16 I; Lei 13.787 art. 6º | ✅ | Não há exclusão; o prontuário mostra "Guarda mínima até" |
| Descarte ao fim do prazo, com registro | Lei 13.787 art. 6º §4º | ⛔ | Nenhum prontuário atinge o prazo antes de 2046. Implementar o fluxo de descarte antes disso. |
| Backup cifrado em local distinto, com restauração verificada | SBIS NGS1.04; Guia ANPD item 49 | 🟡 | Backup automático cifrado (AES-256-GCM) a cada 24 h e `npm run data:restaurar` com verificação. **Copiar para outro local físico** e guardar a chave fora da máquina é tarefa da implantação. |
| Comunicação de incidente à ANPD e aos titulares em 3 dias úteis; registro por 5 anos | Res. ANPD 15/2024 | ⛔ | Processo organizacional (ver seção 11). A trilha de auditoria apoia a investigação. |

## 10. Fora do escopo do software (e por quê)

- **Certificado ICP-Brasil e SBIS NGS2.** Dependem de certificados digitais dos profissionais e de um assinador. É o próximo passo se a instituição quiser dispensar o papel com valor probatório máximo.
- **Teleatendimento (Res. CFP 09/2024).** O sistema não oferece sessões online. Se passar a oferecer, será preciso registrar o consentimento específico, os recursos tecnológicos usados e as notificações da sessão.
- **Interoperabilidade (RNDS/FHIR).** Nenhuma norma encontrada obriga um ambulatório privado de Psicologia a enviar dados à RNDS. Fica como evolução futura.
- **Atendimento em grupo.** Não existe no serviço hoje.

## 11. Checklist da instituição (fora do software)

- [ ] Nomear o **encarregado** por ato formal e preencher os campos **[definir]** em `server/config.mjs` (Res. ANPD 18/2024).
- [ ] Elaborar o **Registro das Operações de Tratamento** (prontuário, agenda, ensino e pesquisa) e o **RIPD**, pois envolve dados sensíveis e de menores (LGPD arts. 37 e 38).
- [ ] Ter **plano de resposta a incidentes**: comunicar ANPD e titulares em 3 dias úteis, complementar em 20 dias úteis e manter registro de todo incidente por 5 anos (Res. ANPD 15/2024).
- [ ] Publicar com **HTTPS**, em servidor no Brasil, com disco cifrado e contrato com o provedor contendo cláusulas de segurança (LGPD arts. 33, 39 e 46).
- [ ] Definir **PEP_BACKUP_KEY** fora do servidor e copiar `data/backups/` diariamente para outro local físico.
- [ ] **Trocar as senhas de demonstração** (`1234`) e remover os logins de teste da tela de login antes de qualquer uso real.
- [ ] Treinar estagiários e supervisores em sigilo e uso do sistema (Guia ANPD itens 27–30; Código de Ética art. 17).
- [ ] Submeter pesquisas com dados do serviço ao **CEP** e usar dados anonimizados (Código de Ética art. 16).
- [ ] Confirmar, na decisão da ADI 7911, quais dispositivos da Res. CFP 05/2025 estão suspensos.
- [ ] Definir com o CRP-SP o destino dos prontuários se o serviço for encerrado (Código de Ética art. 15).

## 12. Fontes principais

- Res. CFP 001/2009: https://www.crpsp.org/uploads/legislacao/1514/x2FGTbFDQCxbeCfLswwYF9gL224qLaq_.pdf · Res. CFP 005/2010: https://site.cfp.org.br/wp-content/uploads/2010/03/resolucao2010_005.pdf
- Res. CFP 05/2025: https://abmes.org.br/arquivos/legislacoes/Resolucao-cfp-005-2025-02-03.pdf · STF, ADI 7911: https://noticias.stf.jus.br/postsnoticias/stf-mantem-suspensao-de-regras-sobre-supervisao-de-estagios-em-psicologia/
- Res. CFP 13/2022: https://abmes.org.br/public/arquivos/legislacoes/Resolucao-CFP-013-2022-06-15.pdf
- Res. CFP 06/2019: https://www.sepsi.ufscar.br/arquivos/regulamentacao/resolucaocfp-06-2019.pdf
- Código de Ética: https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf
- Manual Orientativo de Registro e Elaboração de Documentos (CFP, nov/2025): https://site.cfp.org.br/wp-content/uploads/2025/11/Manual_Orientativo.pdf
- Res. CFP 09/2024: https://www.normasbrasil.com.br/norma/resolucao-9-2024_462577.html
- Lei 13.787/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13787.htm
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- Lei 14.063/2020: https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2020/lei/l14063.htm
- Res. CD/ANPD 15/2024 (incidentes): https://www.abrapp.org.br/legislacao/resolucao-cd-anpd-no-15-de-24-de-abril-de-2024/ · Res. CD/ANPD 18/2024 (encarregado): https://www.tjba.jus.br/extrajudicial/wp-content/uploads/2024/08/RESOLUCAO-ANPD-No-18-Encarregado-de-Dados.pdf
- Guia de Segurança da ANPD: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-vf.pdf
- SBIS, Requisitos de Segurança S-RES v5.2: https://sbis.org.br/certificacao/v5.2/Requisitos_Certificacao_SBIS_Seguranca_V5.2.pdf
- Carta de Serviços sobre Estágios e Serviços-Escola (CFP/CRP-SP/ABEP, 2013): https://www.sepsi.ufscar.br/arquivos/regulamentacao/carta-de-servicos-sobre-estagios-e-servicos-escola.pdf
