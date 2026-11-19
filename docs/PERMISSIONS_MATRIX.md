# Matriz de Permissões — PEP (FCMSCSP)

As permissões existem em dois lugares, com as mesmas regras:

- **No servidor** (`assets/js/shared/politica.js` e `assets/js/shared/usuarios.js`, usados por `server/index.mjs`): é a autorização que protege os dados. O navegador só recebe o escopo do papel, e cada gravação é conferida item a item; o que vier fora da regra é recusado com `403` e nada é gravado.
- **Na tela** (`assets/js/core/permissions.js`, funções `can()` e `canAccessPage()`): só decide quais botões e páginas aparecem. Quem altera o JavaScript no navegador consegue ver um botão a mais, mas o servidor recusa a ação.

No modo demonstração (GitHub Pages) as regras do servidor rodam no próprio navegador (`servidorDemo.js`) e, por isso, não protegem nada; servem só para mostrar o comportamento com dados fictícios.

Legenda: `C` cria · `R` lê · `U` altera · `A` valida (co-assina) · `X` exporta · `—` sem acesso. "Do caso" quer dizer: o supervisor só nos casos que supervisiona, o estudante só nos casos do seu grupo.

| Recurso | Técnico | Supervisor | Estudante | Paciente |
|---|---|---|---|---|
| Paciente (lista e prontuário) | R (todos) | R (do caso) | R (do caso) | R (só o próprio, sem registro documental, sem material de teste e sem registros aguardando validação) |
| Paciente (cadastro, inclusive troca de supervisor e estagiários) | C, U | — | — | — |
| Encerramento do caso | C | C (do caso) | — | R |
| Consentimentos | C, revoga | C, revoga (do caso) | C, revoga (do caso) | R |
| Avaliação de demanda (anamnese) | C, U enquanto rascunho; A | C, U enquanto rascunho; A (do caso) | C, U enquanto rascunho (do caso) | R (só finalizada) |
| Evolução | C; A; retifica a própria | C; A; retifica a própria (do caso) | C; retifica a própria (do caso) | R (só validadas) |
| Documento anexado (arquivo) | C; baixa | C; baixa (do caso) | C; baixa (do caso) | R e baixa (os próprios, exceto material de teste) |
| Documento emitido (Res. CFP 06/2019) | C; A; registra devolutiva/entrega | C; A; registra devolutiva/entrega (do caso) | C; registra devolutiva/entrega (do caso) | R (validados) |
| Registro documental | C, R | C, R (do caso) | C, R (do caso) | — |
| Comunicações e compartilhamentos | C, R | C, R (do caso) | C, R (do caso) | R (os marcados como visíveis ao titular) |
| Agendamento | C, R, U (remarca), cancela | R; marca "faltou" (do caso) | R; marca "faltou" (do caso) | R (só os próprios) |
| Faltas | C; justifica | C; justifica (do caso) | C (do caso) | R (as próprias) |
| Pedido de agendamento, remarcação ou cancelamento | C (registra o pedido feito presencialmente, por telefone ou e-mail, com o canal); R; responde (atende ou recusa com motivo) | — | — | — |
| Solicitações do titular (LGPD) | C (registra o pedido feito presencialmente, por telefone ou e-mail, com o canal); R; responde | — | — | — |
| Usuários da equipe | C, R, U, redefine senha, desbloqueia, inativa/reativa | — | — | — |
| Acesso temporário do paciente ao prontuário | gera/renova (nova senha), U (login), encerra (inativa)/reativa | — | — | — |
| Auditoria | R, X | — | — | — |
| Notificações | R, U (todas) | R; marca como lida (do caso) | R; marca como lida (do caso e as dirigidas a ele) | — |

Regras que valem para todas as linhas:

- **Nada é excluído.** Registros ausentes numa gravação continuam no banco; usuários são inativados, nunca apagados.
- **Autoria e horário são carimbados pelo servidor**, nunca aceitos do navegador.
- **Registros de estudante nascem "Aguardando validação"** e só o supervisor do caso ou o técnico co-assina.
- **O paciente só consulta.** O acesso dele é temporário (login e senha gerados pelo sistema, com prazo de `acessoPortal.validadeDias`) e qualquer gravação de um usuário paciente é recusada. Ele não agenda nem faz pedidos pelo sistema: pede presencialmente, por telefone ou e-mail, e o técnico registra.
- **Gestão de usuários exige a senha do técnico** a cada operação (reautenticação), inclusive para gerar o acesso temporário do paciente. Mudar papel ou login encerra as sessões do usuário. A troca de papel é recusada enquanto o usuário estiver vinculado a casos, e o sistema nunca fica sem técnico ativo.
- **Agenda:** o servidor recusa horário já ocupado pelo mesmo paciente ou pelo mesmo estagiário, estagiário fora do grupo do caso e agendamento em caso encerrado. Supervisor e estudante só podem mudar a situação de "confirmado" para "faltou". Agendamento cancelado não muda mais.
- **Pedidos de agendamento:** só o técnico registra, informando o canal (`presencial`, `telefone` ou `email`). Um pedido de remarcação ou cancelamento precisa apontar para um atendimento confirmado do paciente; não se aceita pedido igual a outro ainda pendente. Recusar exige motivo. Supervisor e estudante não recebem os pedidos, porque não agendam.
- **Arquivos:** o download usa o mesmo escopo da leitura do prontuário. O vínculo entre um registro e um arquivo só é feito pela rota de envio; `PUT /api/data` descarta o campo `arquivo`.

## Ações da tela (`core/permissions.js`)

| Ação | Quem |
|---|---|
| `patient.create`, `patient.update`, `user.create`, `user.read`, `access.manage`, `audit.read` | técnico |
| `patient.read` | quem tem o paciente no escopo |
| `evolution.create`, `anamnese.update`, `document.create`, `document.emit`, `sharing.create`, `registroDocumental.read`, `registroDocumental.create`, `consent.manage` | equipe (técnico, supervisor, estudante) |
| `appointment.create`, `appointment.update`, `appointment.cancel`, `appointment.manage`, `appointment.respondRequest` | técnico |
| `appointment.registerAbsence` | equipe |
| `appointment.justifyAbsence` | técnico ou supervisor |
| `appointment.request` | ninguém (o paciente não pede pelo sistema) |
| `appointment.read` | qualquer usuário logado |
| `record.validate` | técnico; supervisor do caso |
| `case.close` | técnico ou supervisor |
| `titular.request` | técnico (o titular pede presencialmente, por telefone ou e-mail; o técnico registra) |
| `titular.respond` | técnico |

Páginas (`canAccessPage`): dashboard, pacientes e agenda para a equipe; acesso, acesso dos pacientes e auditoria só para o técnico; "Meu prontuário" só para o paciente; privacidade para todos.

O antigo achado do [FRONTEND_AUDIT.md](./FRONTEND_AUDIT.md) (item 7: `appointment.manage` incluía o paciente) foi resolvido em novembro de 2026.

Ver [AUDIT_LOG_SPEC.md](./AUDIT_LOG_SPEC.md) para o que é registrado na trilha a cada ação.
