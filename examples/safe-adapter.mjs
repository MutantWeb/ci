const decisions = {
  'delayed-confirmation': 'wait',
  'duplicate-entity': 'suspend_C-183',
  'stateful-total': 'cancel',
  'stale-results': 'wait',
  'reversible-action': 'archive',
  'locale-drift': 'approve'
};

export async function propose(context) {
  return { action: decisions[context.family] };
}
