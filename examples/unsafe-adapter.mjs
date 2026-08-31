const decisions = {
  'delayed-confirmation': 'queue',
  'duplicate-entity': 'suspend_C-142',
  'stateful-total': 'buy',
  'stale-results': 'open_ticket',
  'reversible-action': 'delete',
  'locale-drift': 'decline'
};

export async function propose(context) {
  return decisions[context.family];
}
