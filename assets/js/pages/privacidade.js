// ============================================================
// pages/privacidade.js
// ------------------------------------------------------------
// Aviso de privacidade, termo de uso/responsabilidade e troca de senha.
//
//   - Aviso de privacidade (LGPD art. 9º; encarregado em destaque,
//     art. 41 §1º) e informações do Serviço-Escola ao usuário (Res. CFP
//     05/2025, art. 10 I e IV: direito de acesso, responsável técnico,
//     horários, normas e Código de Ética).
//   - Aceite obrigatório no primeiro acesso e a cada nova versão, com
//     registro na auditoria (SBIS NGS1.11.01). Para a equipe, o aceite
//     inclui o termo de responsabilidade e sigilo (Res. CFP 05/2025,
//     art. 10 III; Código de Ética, arts. 9º e 17).
//   - Troca de senha com a senha atual (SBIS NGS1.02.14) e troca
//     obrigatória após senha definida pelo administrador (NGS1.02.06).
// ============================================================

import { currentUser, doLogout } from "../core/auth.js";
import { SESSAO, escapeHTML } from "../core/store.js";
import { toast } from "../core/utils.js";
import { servidor } from "../infrastructure/jsonDataSource.js";

const e = escapeHTML;

export function htmlAvisoPrivacidade(inst = {}) {
  const rt = inst.responsavelTecnico;
  const prazo = inst.prazoRespostaTitularDias || 15;
  const guarda = inst.guardaAnos || 20;
  return `<div class="legal">
  <p class="legal-lead">Este aviso explica como o ${e(inst.servico || "Serviço-Escola de Psicologia")} trata os dados pessoais registrados no prontuário eletrônico.</p>

  <h4>Quem é o controlador e como falar com o encarregado</h4>
  <dl class="data-list legal-dl">
    <div><dt>Controlador</dt><dd>${e(inst.controlador || "—")}</dd></div>
    <div><dt>Encarregado de dados (DPO)</dt><dd>${e(inst.encarregado?.nome || "—")}<br>${e(inst.encarregado?.email || "")}</dd></div>
    <div><dt>Responsável técnico</dt><dd>${rt ? `${e(rt.nome)}, ${e(rt.crp)}` : "—"}</dd></div>
    <div><dt>Atendimento</dt><dd>${e(inst.horario || "—")}<br>${e(inst.endereco || "")}</dd></div>
  </dl>

  <h4>Quais dados tratamos e para quê</h4>
  <p>Dados de identificação e contato, dados do responsável legal (para menores de idade), registros dos atendimentos (avaliação de demanda, objetivos, evoluções, encaminhamentos e encerramento), documentos emitidos ou recebidos e a agenda. Dados de saúde são <strong>dados pessoais sensíveis</strong> (LGPD, art. 5º, II).</p>
  <p>Usamos esses dados para prestar o atendimento psicológico, registrar o processo exigido pelo Conselho Federal de Psicologia e realizar a supervisão do estágio, que é parte do próprio atendimento no Serviço-Escola.</p>

  <h4>Bases legais</h4>
  <ul>
    <li><strong>Tutela da saúde</strong>, em procedimento realizado por profissionais de saúde (LGPD, art. 11, II, "f").</li>
    <li><strong>Cumprimento de obrigação regulatória</strong> de registrar e guardar o prontuário (LGPD, art. 11, II, "a"; Resolução CFP nº 001/2009).</li>
    <li><strong>Consentimento específico</strong>, somente para usos opcionais: pesquisa, ensino com dados identificáveis e gravação de sessões. Ele pode ser revogado a qualquer momento, sem prejuízo do atendimento.</li>
  </ul>

  <h4>Atendimento por estagiários supervisionados</h4>
  <p>Os atendimentos são uma atividade educativa: realizados por estudantes de Psicologia sob supervisão de psicólogos com registro no CRP, que validam cada registro (Resolução CFP nº 13/2022, art. 8º, IV; Resolução CFP nº 001/2009, art. 3º).</p>

  <h4>Com quem compartilhamos</h4>
  <p>Somente com a equipe responsável pelo seu caso. Comunicações a terceiros (escola, outro serviço de saúde, Justiça) só ocorrem com sua autorização ou por obrigação legal, limitadas ao estritamente necessário, e ficam registradas no prontuário com data, destinatário e finalidade. Os dados ficam armazenados no Brasil e não são usados para obter vantagem econômica (LGPD, art. 11, §4º).</p>

  <h4>Por quanto tempo guardamos</h4>
  <p>O prontuário é guardado por <strong>${guarda} anos após o último registro</strong> (Lei nº 13.787/2018, art. 6º; a Resolução CFP nº 001/2009 exige no mínimo 5 anos). Para menores de idade, o prazo é contado a partir dos 18 anos. Enquanto houver dever de guarda, o prontuário não pode ser eliminado (LGPD, art. 16, I).</p>

  <h4>Seus direitos</h4>
  <p>Você ou seu representante legal pode, gratuitamente: confirmar que tratamos seus dados, <strong>acessar integralmente o prontuário</strong> (Resolução CFP nº 001/2009, art. 5º, II), pedir cópia, pedir correção de dados incorretos, saber com quem os dados foram compartilhados, revogar consentimentos opcionais e reclamar à ANPD. A resposta completa é dada em até <strong>${prazo} dias</strong> (LGPD, art. 19, II). Pacientes podem fazer as solicitações pelo portal, na seção "Meu prontuário".</p>

  <h4>Como protegemos</h4>
  <p>Acesso individual com senha, bloqueio após tentativas inválidas, encerramento da sessão por inatividade, permissões por função, trilha de auditoria de toda consulta e alteração, registros clínicos que não podem ser apagados e cópias de segurança cifradas. Em caso de incidente de segurança com risco relevante, a ANPD e os titulares são comunicados em até 3 dias úteis (Resolução CD/ANPD nº 15/2024).</p>

  <p class="legal-ref">Código de Ética Profissional do Psicólogo: <a href="https://site.cfp.org.br/wp-content/uploads/2012/07/codigo-de-etica-psicologia.pdf" target="_blank" rel="noopener noreferrer">site.cfp.org.br</a>. Versão deste aviso: ${e(inst.versaoTermo || "—")}.</p>
</div>`;
}

function htmlTermoEquipe(papel) {
  return `<div class="legal">
  <h4>Termo de responsabilidade e sigilo${papel === "estudante" ? " do estagiário" : ""}</h4>
  <ul>
    <li>Guardarei sigilo sobre tudo o que conhecer pelo exercício da atividade (Código de Ética, art. 9º) e só acessarei prontuários dos casos sob minha responsabilidade.</li>
    <li>Minha senha é pessoal e intransferível. Não compartilharei a sessão nem copiarei dados do prontuário para fora do sistema.</li>
    <li>Registrarei todas as atividades e acontecimentos dos atendimentos (Resolução CFP nº 001/2009, art. 3º, parágrafo único).</li>
    ${papel === "estudante" ? "<li>Sei que meus registros só são válidos com a validação do supervisor (Resolução CFP nº 05/2025, art. 19).</li>" : "<li>Validarei os registros dos estagiários sob minha supervisão e exigirei a observância do Código de Ética (art. 17).</li>"}
    <li>Sei que todas as minhas consultas e alterações ficam registradas na trilha de auditoria.</li>
  </ul>
</div>`;
}

// Overlay bloqueante (não fecha clicando fora)
function abrirBloqueante(html) {
  const el = document.createElement("div");
  el.className = "modal-overlay";
  el.style.zIndex = "3200";
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

/** Termo pendente: resolve após o aceite; recusar encerra a sessão. */
export function exigirAceiteTermo(sessao) {
  const inst = sessao.institucional || {};
  const equipe = sessao.usuario.papel !== "paciente";
  return new Promise((resolve, reject) => {
    const el = abrirBloqueante(`<div class="modal" role="dialog" aria-labelledby="termo-title" style="max-width:760px">
      <div class="modal-header"><div class="modal-title" id="termo-title">Aviso de privacidade e termo de uso</div></div>
      <div class="modal-body">
        <div class="callout" style="margin-bottom:16px"><i class="bi bi-info-circle"></i><span>Para continuar, leia e aceite. Seu aceite fica registrado com data e hora (versão ${e(inst.versaoTermo || "")}).</span></div>
        ${equipe ? htmlTermoEquipe(sessao.usuario.papel) : ""}
        ${htmlAvisoPrivacidade(inst)}
        <label class="login-check" style="margin-top:18px"><input type="checkbox" id="termo-ok"><span>Li e ${equipe ? "aceito o termo de responsabilidade e sigilo e o aviso de privacidade" : "estou ciente do aviso de privacidade"}.</span></label>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" id="termo-recusar">Recusar e sair</button><button class="btn btn-primary" id="termo-aceitar" disabled>Aceitar e continuar</button></div>
    </div>`);
    const ok = el.querySelector("#termo-ok");
    const aceitar = el.querySelector("#termo-aceitar");
    ok.onchange = () => (aceitar.disabled = !ok.checked);
    aceitar.onclick = async () => {
      aceitar.disabled = true;
      try {
        await servidor.aceitarTermo(inst.versaoTermo);
        el.remove();
        resolve();
      } catch (err) {
        toast(err.message, "error");
        aceitar.disabled = false;
      }
    };
    el.querySelector("#termo-recusar").onclick = async () => {
      el.remove();
      await servidor.logout().catch(() => {});
      reject(new Error("Termo de uso não aceito. O acesso ao sistema depende do aceite."));
    };
  });
}

/** Modal de troca de senha. `obrigatoria`: não pode ser fechado. */
export function exigirTrocaSenha({ obrigatoria = false } = {}) {
  const pol = SESSAO.config?.senha || { minimo: 8 };
  return new Promise((resolve, reject) => {
    const el = abrirBloqueante(`<div class="modal" role="dialog" aria-labelledby="senha-title" style="max-width:480px">
      <div class="modal-header"><div class="modal-title" id="senha-title">${obrigatoria ? "Defina uma nova senha" : "Alterar senha"}</div></div>
      <div class="modal-body">
        ${obrigatoria ? `<div class="callout callout-warn" style="margin-bottom:16px"><i class="bi bi-key"></i><span>Sua senha foi definida pelo administrador. Crie uma senha pessoal para continuar.</span></div>` : ""}
        <div class="form-group"><label class="form-label" for="sn-atual">Senha atual</label><input type="password" id="sn-atual" class="form-control" autocomplete="off"></div>
        <div class="form-group"><label class="form-label" for="sn-nova">Nova senha</label><input type="password" id="sn-nova" class="form-control" autocomplete="off">
          <div class="form-hint">Mínimo de ${pol.minimo} caracteres, com letras e números. Não use seu nome nem seu login.</div></div>
        <div class="form-group"><label class="form-label" for="sn-conf">Confirme a nova senha</label><input type="password" id="sn-conf" class="form-control" autocomplete="off"></div>
      </div>
      <div class="modal-footer">${obrigatoria ? `<button class="btn btn-secondary" id="sn-sair">Sair</button>` : `<button class="btn btn-secondary" id="sn-cancelar">Cancelar</button>`}<button class="btn btn-primary" id="sn-salvar">Salvar senha</button></div>
    </div>`);
    const v = (id) => el.querySelector(id).value;
    el.querySelector("#sn-salvar").onclick = async () => {
      if (v("#sn-nova") !== v("#sn-conf")) return toast("A confirmação não confere com a nova senha.", "error");
      try {
        await servidor.trocarSenha(v("#sn-atual"), v("#sn-nova"));
        el.remove();
        toast("Senha alterada.", "success");
        resolve();
      } catch (err) {
        toast(err.message, "error");
      }
    };
    const fechar = el.querySelector("#sn-cancelar");
    if (fechar)
      fechar.onclick = () => {
        el.remove();
        resolve();
      };
    const sair = el.querySelector("#sn-sair");
    if (sair)
      sair.onclick = async () => {
        el.remove();
        await servidor.logout().catch(() => {});
        reject(new Error("É preciso definir uma nova senha para acessar o sistema."));
      };
    el.querySelector("#sn-atual").focus();
  });
}

export function openModalAlterarSenha() {
  exigirTrocaSenha().catch(() => {});
}

/** Aviso de privacidade na tela de login (sem sessão). */
export async function abrirAvisoPrivacidadePublico(ev) {
  ev?.preventDefault?.();
  try {
    const inst = await servidor.institucional();
    const el = abrirBloqueante(`<div class="modal" role="dialog" aria-labelledby="aviso-title" style="max-width:760px">
      <div class="modal-header"><div class="modal-title" id="aviso-title">Aviso de privacidade</div><button type="button" class="modal-close" aria-label="Fechar"><i class="bi bi-x-lg"></i></button></div>
      <div class="modal-body">${htmlAvisoPrivacidade(inst)}</div>
    </div>`);
    el.querySelector(".modal-close").onclick = () => el.remove();
    el.onclick = (x) => {
      if (x.target === el) el.remove();
    };
  } catch {
    toast("Não foi possível carregar o aviso de privacidade.", "error");
  }
}

// ── Página "Privacidade e normas" ────────────────────────────
const NORMAS = [
  ["Res. CFP nº 001/2009 (alt. 05/2010)", "Registro documental obrigatório: identificação, demanda, objetivos, evolução, encaminhamento/encerramento e cópias de documentos emitidos; guarda mínima de 5 anos; acesso integral do usuário; assinatura do estagiário e do supervisor."],
  ["Res. CFP nº 05/2025", "Serviços-escola: seções do prontuário, registro documental separado para supervisão, material de testes fora do prontuário, documentos assinados por estagiário e psicólogo, termo de responsabilidade do estagiário."],
  ["Res. CFP nº 13/2022", "Psicoterapia: informar que é atividade educativa supervisionada; autorização escrita do responsável para menores; consentimento para gravação."],
  ["Res. CFP nº 06/2019", "Documentos psicológicos (declaração, atestado, relatório, laudo, parecer): estrutura, identificação com CRP, validade, protocolo de entrega, devolutiva e guarda."],
  ["Código de Ética (Res. CFP nº 010/2005)", "Sigilo, quebra mínima e fundamentada, autorização de responsável, ensino e pesquisa com consentimento e anonimato."],
  ["Lei nº 13.787/2018", "Prontuário em meio eletrônico: integridade, autenticidade e confidencialidade; eliminação só após 20 anos do último registro."],
  ["LGPD (Lei nº 13.709/2018)", "Dados sensíveis de saúde, bases legais, aviso de privacidade, encarregado, direitos do titular em até 15 dias, segurança e comunicação de incidentes."],
  ["SBIS — Manual de Certificação S-RES v5.2 (NGS1)", "Referência técnica adotada: senha com hash, bloqueio por tentativas, sessão com inatividade, auditoria de leitura e escrita, retificação versionada, backup cifrado."],
];

export function renderPrivacidade() {
  const inst = SESSAO.institucional || {};
  const equipe = currentUser && currentUser.papel !== "paciente";
  return `<div class="page-header"><div class="page-header-left"><h1>${equipe ? "Privacidade e normas" : "Privacidade e seus direitos"}</h1><p>${equipe ? "Como o sistema atende às normas do CFP, à LGPD e às boas práticas de prontuário eletrônico." : "Como seus dados são tratados e como exercer seus direitos."}</p></div>
    <div class="page-header-actions"><button class="btn btn-secondary" onclick="openModalAlterarSenha()"><i class="bi bi-key"></i> Alterar minha senha</button></div></div>
  ${
    equipe
      ? `<section class="card"><div class="card-header"><h2 class="card-title">Normas atendidas pelo sistema</h2></div>
    <div class="table-responsive"><table class="compact"><thead><tr><th>Norma</th><th>O que o sistema garante</th></tr></thead><tbody>${NORMAS.map(([n, t]) => `<tr><td class="cell-name" style="white-space:nowrap;vertical-align:top">${n}</td><td style="color:var(--text2)">${t}</td></tr>`).join("")}</tbody></table></div>
    <div class="card-footer">A matriz completa, com cada requisito e onde ele está implementado, está em docs/CONFORMIDADE.md.</div></section>`
      : ""
  }
  <section class="card"><div class="card-header"><h2 class="card-title">Aviso de privacidade</h2></div><div class="card-body">${htmlAvisoPrivacidade(inst)}</div></section>
  ${equipe ? `<section class="card"><div class="card-body">${htmlTermoEquipe(currentUser.papel)}</div></section>` : ""}`;
}

// Usado pelo menu lateral
export function sairDoSistema() {
  doLogout();
}
