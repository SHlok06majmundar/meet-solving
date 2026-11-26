const strings = value => Array.isArray(value)
  ? value.filter(item => typeof item === 'string').slice(0, 50).map(item => item.slice(0, 2000)) : [];

function normalizeInsights(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const actionItems = Array.isArray(value.actionItems) ? value.actionItems
    .filter(item => item && typeof item.task === 'string').slice(0, 50)
    .map(item => ({
      task: item.task.slice(0, 2000),
      assignee: typeof item.assignee === 'string' ? item.assignee.slice(0, 100) : null,
      deadline: typeof item.deadline === 'string' ? item.deadline.slice(0, 100) : null,
      status: typeof item.status === 'string' ? item.status.slice(0, 40) : 'open',
    })) : [];
  return {
    summaryBullets: strings(value.summaryBullets), actionItems,
    decisions: strings(value.decisions), risks: strings(value.risks), questions: strings(value.questions),
    score: typeof value.score === 'number' && Number.isFinite(value.score) ? Math.max(0, Math.min(100, value.score)) : null,
  };
}
module.exports = { normalizeInsights, strings };
