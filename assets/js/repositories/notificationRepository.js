// ============================================================
// repositories/notificationRepository.js
// ------------------------------------------------------------
// Persistência das notificações do sininho. A LÓGICA de quais
// notificações calcular em tempo real (evolução pendente, faltas,
// trocas) continua em pages/notificacoes.js::getNotificacoesAtivas(),
// pois mistura regra de negócio com leitura de várias coleções —
// este repositório cuida apenas de ler/gravar a coleção persistida.
// ============================================================

import { NOTIFICACOES, saveData } from "../core/store.js";
import { generateId } from "../core/idService.js";

/** @returns {import("../domain/models.js").Notification[]} */
export function list() {
  return NOTIFICACOES;
}

/** @param {string} id */
export function findById(id) {
  return NOTIFICACOES.find((n) => n.id === id);
}

/** @param {Omit<import("../domain/models.js").Notification, "id"|"lida">} data */
export function push(data) {
  const notification = { ...data, id: data.id || generateId(), lida: false };
  NOTIFICACOES.push(notification);
  saveData();
  return notification;
}

/** @param {string} id */
export function markRead(id) {
  const notification = findById(id);
  if (notification) {
    notification.lida = true;
  } else {
    // Notificação calculada dinamicamente (não persistida antes) — grava
    // um marcador "lida" para que getNotificacoesAtivas() não repita.
    NOTIFICACOES.push({ id, tipo: "lida", lida: true });
  }
  saveData();
}

export const notificationRepository = { list, findById, push, markRead };
