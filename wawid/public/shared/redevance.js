// Redevance de sécurité : calculs partagés par l'espace DPAF (Finances) et la plateforme des compagnies.

export const REDEVANCE_DEFAULTS = { rateUSD: 12, operatorShare: 0.75, penaltyRate: 0.05, fx: {}, circuit: "OPERATEUR" };

/** Paiement pris en compte : confirmé (ou saisi avant la validation des déclarations). Un paiement déclaré attend le rapprochement. */
export const isConfirmed = (p) => !p.status || p.status === "CONFIRME";

/** État d'une facture : payé, reste dû, mois de retard et pénalité (5 % par mois de retard sur le reste dû). */
export function invoiceState(inv, r = REDEVANCE_DEFAULTS, now = new Date()) {
  const paid = inv.payments.filter(isConfirmed).reduce((s, p) => s + p.amount, 0);
  const pending = inv.payments.filter((p) => p.status === "DECLARE").reduce((s, p) => s + p.amount, 0);
  const due = Math.max(0, inv.amountXOF - paid);
  const late = due > 0 && now > new Date(inv.dueAt) ? Math.ceil((now - new Date(inv.dueAt)) / (30 * 86400000)) : 0;
  const penalty = Math.round(due * (r.penaltyRate ?? 0.05) * late);
  const status = due === 0 ? "PAYÉE" : late ? "EN RETARD" : paid ? "PARTIELLE" : "ÉMISE";
  return { paid, pending, due, late, penalty, status };
}

export const INVOICE_TONES = { "PAYÉE": "good", "PARTIELLE": "warning", "ÉMISE": "info", "EN RETARD": "critical" };
export const PAYMENT_STATUS = { DECLARE: ["warning", "À valider"], CONFIRME: ["good", "Validé"], REJETE: ["critical", "Rejeté"] };
