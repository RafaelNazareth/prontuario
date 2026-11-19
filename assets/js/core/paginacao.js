// ============================================================
// core/paginacao.js
// ------------------------------------------------------------
// Paginação das listas da interface (pacientes, equipe, acessos ao
// portal, auditoria). A lista é cortada em páginas e um controle
// "Anterior / Próxima" chama a função global indicada em `acao`
// com o número da página.
// ============================================================

import { escapeHTML } from "./store.js";

/**
 * @template T
 * @param {T[]} lista
 * @param {number} pagina começa em 1
 * @param {number} porPagina
 * @returns {{itens:T[], pagina:number, paginas:number, total:number, inicio:number, fim:number}}
 */
export function paginar(lista, pagina = 1, porPagina = 20) {
  const total = lista.length;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const atual = Math.min(Math.max(Number(pagina) || 1, 1), paginas);
  const inicio = (atual - 1) * porPagina;
  return { itens: lista.slice(inicio, inicio + porPagina), pagina: atual, paginas, total, inicio: total ? inicio + 1 : 0, fim: Math.min(inicio + porPagina, total) };
}

/**
 * Controle de páginas. Não aparece quando tudo cabe numa página.
 * @param {{pagina:number, paginas:number, total:number, inicio:number, fim:number}} p resultado de paginar()
 * @param {string} acao nome da função global chamada com a página (ex.: "irParaPaginaPacientes")
 * @param {string} [rotulo] "pacientes", "usuários"...
 */
export function htmlPaginacao(p, acao, rotulo = "itens") {
  if (p.paginas <= 1) return "";
  const botao = (alvo, texto, desabilitado, aria) =>
    `<button type="button" class="btn btn-secondary btn-sm" ${desabilitado ? "disabled" : ""} onclick="${acao}(${alvo})" aria-label="${aria}">${texto}</button>`;
  return `<nav class="paginacao" aria-label="Paginação de ${escapeHTML(rotulo)}">
    <span class="paginacao-info">${p.inicio}–${p.fim} de ${p.total} ${escapeHTML(rotulo)}</span>
    <div class="btn-group">
      ${botao(p.pagina - 1, '<i class="bi bi-chevron-left"></i> Anterior', p.pagina <= 1, "Página anterior")}
      <span class="paginacao-atual">Página ${p.pagina} de ${p.paginas}</span>
      ${botao(p.pagina + 1, 'Próxima <i class="bi bi-chevron-right"></i>', p.pagina >= p.paginas, "Próxima página")}
    </div>
  </nav>`;
}
