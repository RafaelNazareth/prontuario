// ============================================================
// shared/usuarios.js
// ------------------------------------------------------------
// Gestão de usuários pelo técnico responsável, com as MESMAS regras
// no servidor (server/index.mjs) e no modo demonstração:
//
//   - cadastrar equipe (técnico, supervisor, estudante) com qualquer
//     senha inicial: no primeiro acesso a troca é obrigatória;
//   - gerar (ou renovar) o acesso TEMPORÁRIO de um paciente ao próprio
//     prontuário: o sistema cria login e senha e o acesso expira;
//   - editar nome, login, papel, CRP e matrícula;
//   - redefinir a senha (senha provisória, troca obrigatória no
//     próximo acesso, conta desbloqueada);
//   - nunca excluir: inativar/reativar fica em outra rota.
//
// Guardas: login único; CRP obrigatório para técnico e supervisor;
// matrícula para estudante; o sistema nunca fica sem técnico ativo;
// quem supervisiona ou atende casos só muda de papel depois que os
// casos forem transferidos (senão o paciente ficaria sem supervisor).
// O hash da senha é feito por quem chama (scrypt no servidor).
// ============================================================

import { ACESSO_PORTAL, SEGURANCA } from "./configuracao.js";

export const PAPEIS_EQUIPE_GERENCIAVEIS = ["tecnico", "supervisor", "estudante"];
const RE_LOGIN = /^[a-z0-9._-]{3,40}$/i;
const RE_CRP = /^CRP \d{2}\/\d{4,6}$/;

export class ErroUsuario extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}
const falhar = (status, msg) => {
  throw new ErroUsuario(status, msg);
};

export function iniciais(nome) {
  return String(nome || "")
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function conferirLogin(usuarios, login, ignorarId) {
  if (!RE_LOGIN.test(login)) falhar(400, "Login: 3 a 40 letras, números, ponto, hífen ou sublinhado.");
  if (usuarios.some((u) => u.id !== ignorarId && String(u.login).toLowerCase() === login.toLowerCase()))
    falhar(409, "Já existe usuário com este login.");
}

function conferirRegistro(papel, crp, matricula) {
  if (papel !== "estudante" && !RE_CRP.test(String(crp || "").trim())) falhar(400, "Informe o CRP no formato CRP 06/123456.");
  if (papel === "estudante" && !String(matricula || "").trim()) falhar(400, "Informe a matrícula do estudante.");
}

function tecnicosAtivos(usuarios) {
  return usuarios.filter((u) => u.papel === "tecnico" && u.ativo !== false);
}

/** Casos em que o usuário aparece como supervisor ou estagiário. */
export function casosVinculados(dados, userId) {
  return dados.PACIENTES.filter((p) => p.supervisorId === userId || (p.estudantesIds || []).includes(userId));
}

/** Senha inicial ou provisória definida pelo técnico: qualquer senha com o mínimo de caracteres. */
export function conferirSenhaProvisoria(senha) {
  const s = String(senha || "");
  const min = SEGURANCA.senhaProvisoriaMinimo || 4;
  if (s.length < min) falhar(400, `A senha provisória precisa ter pelo menos ${min} caracteres.`);
  if (s.length > 128) falhar(400, "Senha longa demais.");
}

/**
 * Monta um novo usuário da equipe (técnico, supervisor ou estudante).
 * A senha inicial é livre; no primeiro acesso a pessoa é obrigada a
 * trocá-la por uma senha própria. O acesso do paciente não é criado
 * aqui: ele é temporário e gerado pelo sistema (gerarAcessoTemporario).
 * @param {object} dados dataset completo
 * @param {object} b corpo da requisição
 * @param {{adminId:number, senha:(s:string)=>object}} opts `senha` devolve os campos de senha a gravar
 */
export function montarNovoUsuario(dados, b, { adminId, senha }) {
  const login = String(b.login || "").trim();
  if (b.papel === "paciente")
    falhar(400, "O acesso do paciente é temporário e gerado pelo sistema. Use \"Gerar acesso temporário\" na lista de pacientes.");
  const nome = String(b.nome || "").trim();
  if (!nome || !login) falhar(400, "Informe nome e login.");
  if (!PAPEIS_EQUIPE_GERENCIAVEIS.includes(b.papel)) falhar(400, "Papel inválido.");
  conferirLogin(dados.USERS, login);
  conferirRegistro(b.papel, b.crp, b.matricula);
  conferirSenhaProvisoria(b.senhaInicial);
  // Ids de equipe ficam abaixo de 200 (pacientes usam o id do prontuário).
  const idsEquipe = dados.USERS.filter((u) => u.papel !== "paciente").map((u) => u.id);
  let id = Math.max(0, ...idsEquipe) + 1;
  while (dados.USERS.some((u) => u.id === id) || dados.PACIENTES.some((p) => p.id === id)) id++;
  return {
    id,
    login,
    nome,
    papel: b.papel,
    avatar: iniciais(nome),
    color: "#1a6b2e",
    crp: b.papel !== "estudante" ? String(b.crp).trim() : null,
    matricula: b.papel === "estudante" ? String(b.matricula).trim() : null,
    ativo: true,
    ...senha(b.senhaInicial),
    seguranca: { trocaObrigatoria: true },
    criadoEm: new Date().toISOString(),
    criadoPorId: adminId,
  };
}

/**
 * Aplica a edição de cadastro ao usuário `alvo` (mutado).
 * @returns {{campos:string[], papelMudou:boolean}} o que mudou
 */
export function aplicarEdicaoUsuario(dados, alvo, b) {
  const mudou = [];
  const novoLogin = b.login !== undefined ? String(b.login).trim() : alvo.login;
  if (novoLogin !== alvo.login) {
    conferirLogin(dados.USERS, novoLogin, alvo.id);
    mudou.push("login");
  }

  if (alvo.papel === "paciente") {
    // Nome e dados do paciente são editados no cadastro do prontuário.
    const extras = ["nome", "papel", "crp", "matricula"].filter((k) => b[k] !== undefined && b[k] !== alvo[k] && !(b[k] === "" && alvo[k] == null));
    if (extras.length) falhar(400, "No acesso do paciente só o login pode ser alterado aqui. Os demais dados ficam no cadastro do paciente.");
    alvo.login = novoLogin;
    return { campos: mudou, papelMudou: false };
  }

  const nome = b.nome !== undefined ? String(b.nome).trim() : alvo.nome;
  if (!nome) falhar(400, "Informe o nome.");
  const papel = b.papel !== undefined ? b.papel : alvo.papel;
  if (!PAPEIS_EQUIPE_GERENCIAVEIS.includes(papel)) falhar(400, "Papel inválido.");
  const crp = papel !== "estudante" ? String(b.crp !== undefined ? b.crp : alvo.crp || "").trim() : null;
  const matricula = papel === "estudante" ? String(b.matricula !== undefined ? b.matricula : alvo.matricula || "").trim() : null;
  conferirRegistro(papel, crp, matricula);

  if (papel !== alvo.papel) {
    if (alvo.papel === "tecnico" && alvo.ativo !== false && tecnicosAtivos(dados.USERS).length <= 1)
      falhar(409, "O sistema precisa ter ao menos um técnico (administrador) ativo.");
    const casos = casosVinculados(dados, alvo.id);
    if (casos.length)
      falhar(
        409,
        `Este usuário está vinculado a ${casos.length} ${casos.length === 1 ? "caso" : "casos"}. Transfira a supervisão ou o grupo desses casos antes de mudar o papel.`,
      );
    mudou.push("papel");
  }
  if (nome !== alvo.nome) mudou.push("nome");
  if ((crp || null) !== (alvo.crp || null)) mudou.push("crp");
  if ((matricula || null) !== (alvo.matricula || null)) mudou.push("matricula");

  Object.assign(alvo, {
    login: novoLogin,
    nome,
    papel,
    avatar: iniciais(nome),
    crp: crp || null,
    matricula: matricula || null,
    atualizadoEm: new Date().toISOString(),
  });
  return { campos: mudou, papelMudou: mudou.includes("papel") };
}

/**
 * Redefine a senha do `alvo` (mutado) com uma senha provisória.
 * @param {(s:string)=>object} senha devolve os campos de senha a gravar
 */
export function aplicarRedefinicaoSenha(alvo, senhaProvisoria, senha) {
  if (alvo.papel === "paciente") falhar(400, "Para o paciente, renove o acesso temporário: o sistema gera uma nova senha.");
  conferirSenhaProvisoria(senhaProvisoria);
  Object.assign(alvo, senha(senhaProvisoria));
  alvo.seguranca ||= {};
  alvo.seguranca.trocaObrigatoria = true;
  alvo.seguranca.tentativasFalhas = 0;
  delete alvo.seguranca.bloqueadoAte;
  alvo.seguranca.senhaRedefinidaEm = new Date().toISOString();
}

// ── Acesso temporário do paciente ────────────────────────────
const ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function aleatorioAte(n) {
  // Amostragem por rejeição: distribuição uniforme sem viés de módulo.
  const limite = Math.floor(256 / n) * n;
  const buf = new Uint8Array(1);
  for (;;) {
    globalThis.crypto.getRandomValues(buf);
    if (buf[0] < limite) return buf[0] % n;
  }
}

/** Senha aleatória de 10 caracteres, com letras e números, sem caracteres ambíguos (0/O, 1/l/I). */
export function gerarSenhaTemporaria(tamanho = 10) {
  for (;;) {
    let s = "";
    for (let i = 0; i < tamanho; i++) s += ALFABETO_SENHA[aleatorioAte(ALFABETO_SENHA.length)];
    if (/[A-Za-z]/.test(s) && /\d/.test(s)) return s;
  }
}

/** O acesso do paciente venceu? (sem data de validade também conta como vencido) */
export function acessoExpirado(u, agora = Date.now()) {
  if (u?.papel !== "paciente") return false;
  const t = Date.parse(u.acessoExpiraEm || "");
  return !Number.isFinite(t) || t <= agora;
}

/**
 * Gera ou renova o acesso temporário do paciente `pacienteId` ao próprio
 * prontuário. O sistema cria o login (pac<caso>) e uma senha aleatória,
 * mostrados uma única vez ao técnico para entregar ao paciente.
 * @param {{adminId:number, senha:(s:string)=>object, agora?:Date}} opts
 * @returns {{usuario:object, novo:boolean, senhaGerada:string}}
 */
export function gerarAcessoTemporario(dados, pacienteId, { adminId, senha, agora = new Date() }) {
  const pac = dados.PACIENTES.find((p) => p.id === Number(pacienteId));
  if (!pac) falhar(404, "Paciente não encontrado.");
  const outro = dados.USERS.find((u) => u.id === pac.id && u.papel !== "paciente");
  if (outro) falhar(409, "O número deste caso coincide com um usuário da equipe. Procure o suporte.");
  const senhaGerada = gerarSenhaTemporaria();
  const expiraEm = new Date(agora.getTime() + ACESSO_PORTAL.validadeDias * 86400000).toISOString();
  let usuario = dados.USERS.find((u) => u.id === pac.id && u.papel === "paciente");
  const novo = !usuario;
  if (novo) {
    let login = `pac${pac.id}`;
    for (let n = 2; dados.USERS.some((u) => String(u.login).toLowerCase() === login); n++) login = `pac${pac.id}-${n}`;
    usuario = {
      id: pac.id,
      login,
      nome: pac.nomeSocial || pac.nome,
      papel: "paciente",
      avatar: pac.ini || iniciais(pac.nome),
      color: pac.cor || "#1a6b2e",
      crp: null,
      matricula: null,
      criadoEm: agora.toISOString(),
      criadoPorId: adminId,
    };
    dados.USERS.push(usuario);
  }
  Object.assign(usuario, senha(senhaGerada), {
    ativo: true,
    acessoTemporario: true,
    acessoExpiraEm: expiraEm,
    acessoGeradoEm: agora.toISOString(),
    acessoGeradoPorId: adminId,
  });
  // Acesso só de consulta e com prazo: a senha gerada vale até o vencimento.
  usuario.seguranca = { ...(usuario.seguranca || {}), trocaObrigatoria: false, tentativasFalhas: 0 };
  delete usuario.seguranca.bloqueadoAte;
  return { usuario, novo, senhaGerada };
}
