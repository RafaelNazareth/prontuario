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
  versao: "1.1.0",
};

// Dados exibidos no aviso de privacidade e nas impressões.
// ATENÇÃO: os valores marcados com [definir] são de demonstração e
// precisam ser substituídos pela instituição antes do uso real
// (LGPD art. 41 §1º: identidade e contato do encarregado em destaque).
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
