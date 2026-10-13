// Rules for one purchase order: the numbers that are always derived, and the price-history entry it makes.
const { classifyPriceChange } = require('./scoring');

const round2 = (n) => Number(Number(n).toFixed(2));

// Total amount and rejection rate are never trusted from the client.
function derivePurchase(tx) {
  const received = Number(tx.receivedQuantity) || 0;
  const rejected = Number(tx.rejectedQuantity) || 0;
  return {
    ...tx,
    totalAmount: round2(tx.quantity * tx.unitPrice),
    delayDays: tx.delayDays ?? 0,
    rejectionRate: received > 0 ? round2((rejected / received) * 100) : 0,
  };
}

// Price movement of a purchase against the previous price of the same material.
function priceMovement(unitPrice, previousPrice) {
  const diff = round2(unitPrice - previousPrice);
  const pct = previousPrice > 0 ? round2((diff / previousPrice) * 100) : 0;
  return { priceDiff: diff, priceChangePct: pct, classification: classifyPriceChange(pct) };
}

module.exports = { derivePurchase, priceMovement, round2 };
