// ============================================================
// shared/configuracao.js
// ------------------------------------------------------------
// Parâmetros de segurança e conformidade do PEP (servidor Node e
// modo demonstração no navegador usam os mesmos valores).
// Os valores ficam aqui (e não espalhados no código) porque as
// normas pedem que sejam configuráveis pela instituição:
//
//   - SBIS v5.2, NGS1.02.13: bloqueio após N tentativas (N ≤ 10)
//   - SBIS v5.2, NGS1.02.20: inatividade configurável
//   - SBIS v5.2, NGS1.02.03/05: política de senha configurável
//   - SBIS v5.2, NGS1.11.01: termo de uso por versão
//   - Lei 13.787/2018, art. 6º: guarda mínima de 20 anos
//   - Res. CFP 001/2009, art. 4º: guarda mínima de 5 anos
// ============================================================

export const SOFTWARE = {
  nome: "PEP Serviço-Escola de Psicologia",
  instituicao: "FCMSCSP",
  versao: "1.2.0",
};

// Dados exibidos no aviso de privacidade e nas impressões.
// ATENÇÃO: os valores marcados com [definir] são de demonstração. Na
// implantação, a instituição informa os dados reais no arquivo
// data/instituicao.json (modelo em data/instituicao.exemplo.json), lido
// pelo servidor ao iniciar, sem mexer no código (LGPD art. 41 §1º:
// identidade e contato do encarregado em destaque).
export const INSTITUICAO = {
  controlador: "Faculdade de Ciências Médicas da Santa Casa de São Paulo (FCMSCSP)",
  servico: "Serviço-Escola de Psicologia",
  endereco: "Rua Dr. Cesário Mota Júnior, 61, Vila Buarque, São Paulo/SP [definir]",
  horario: "Segunda a sexta, das 8h às 17h",
  contato: "servico-escola.psicologia@fcmsantacasasp.edu.br [definir]",
  encarregado: {
    nome: "Encarregado de Proteção de Dados [definir nome completo]",
    email: "encarregado@fcmsantacasasp.edu.br [definir]",
  },
  // O responsável técnico é lido do usuário técnico com CRP (Res. CFP 05/2025, art. 10).
};

const CAMPOS_INSTITUICAO = ["controlador", "servico", "endereco", "horario", "contato"];

/**
 * Substitui os dados institucionais pelos informados na implantação.
 * Só aceita os campos conhecidos (texto); o resto é ignorado.
 */
export function aplicarDadosInstitucionais(dados = {}) {
  const texto = (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : null);
  for (const k of CAMPOS_INSTITUICAO) if (texto(dados[k])) INSTITUICAO[k] = texto(dados[k]);
  for (const k of ["nome", "email", "telefone"])
    if (texto(dados.encarregado?.[k])) INSTITUICAO.encarregado[k] = texto(dados.encarregado[k]);
  const dias = Number(dados.acessoPortal?.validadeDias);
  if (Number.isInteger(dias) && dias >= 1 && dias <= 365) {
    ACESSO_PORTAL.validadeDias = dias;
    ACESSO_PORTAL.definido = true;
  }
}

/** Campos que ainda estão com o valor de demonstração "[definir]". */
export function pendenciasInstitucionais() {
  const pend = CAMPOS_INSTITUICAO.filter((k) => String(INSTITUICAO[k] || "").includes("[definir"));
  for (const k of ["nome", "email"]) if (String(INSTITUICAO.encarregado?.[k] || "").includes("[definir")) pend.push(`encarregado.${k}`);
  if (!ACESSO_PORTAL.definido) pend.push("acessoPortal.validadeDias");
  return pend;
}

// Acesso temporário do paciente ao próprio prontuário. O paciente pede o
// prontuário presencialmente, por telefone ou e-mail; o técnico gera um
// login e uma senha temporários (ou só imprime o prontuário). O prazo
// ainda será definido pela instituição: informe na implantação, em
// data/instituicao.json, "acessoPortal": { "validadeDias": N }.
// Enquanto não for informado, vale o prazo provisório abaixo.
export const ACESSO_PORTAL = {
  validadeDias: 7,
  definido: false,
};

export const SEGURANCA = {
  // Tentativas consecutivas de login inválidas antes do bloqueio (máx. 10, SBIS)
  maxTentativasLogin: 5,
  // Bloqueio temporário; o técnico (administrador) também pode desbloquear antes
  bloqueioMinutos: 15,
  // Sessão encerrada após este tempo sem atividade
  inatividadeMinutos: 15,
  // Aviso exibido antes do encerramento por inatividade
  avisoInatividadeSegundos: 60,
  // Duração máxima de uma sessão, mesmo com atividade
  sessaoMaximaHoras: 12,
  // Política de senha para senhas novas (cadastro e troca)
  senha: { minimo: 8, exigeLetra: true, exigeNumero: true, exigeEspecial: false },
  // Senha inicial ou provisória definida pelo técnico: livre, só não pode
  // ser curta demais. A pessoa troca no primeiro acesso, pela política acima.
  senhaProvisoriaMinimo: 4,
};

export const PRIVACIDADE = {
  // Ao mudar o aviso de privacidade/termo de uso, troque a versão:
  // todos os usuários precisam aceitar de novo no próximo acesso.
  versaoTermo: "2026-10",
  // Prazo legal para atender pedido de acesso do titular (LGPD, art. 19, II)
  prazoRespostaTitularDias: 15,
};

export const GUARDA = {
  // Adotado o prazo maior entre CFP (5 anos) e Lei 13.787/2018 (20 anos),
  // contado do último registro do prontuário.
  anosAposUltimoRegistro: 20,
};

export const BACKUP = {
  // Backups automáticos cifrados (AES-256-GCM) em data/backups/
  intervaloHoras: 24,
  manterUltimos: 30,
};
