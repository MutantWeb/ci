function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export function formatConsole(report) {
  const lines = [
    `Mutant Web ${report.pack.name}@${report.pack.version}`,
    ''
  ];
  for (const result of report.results) {
    const mark = result.status === 'passed' ? 'PASS' : 'FAIL';
    lines.push(`${mark}  ${result.family}  proposed=${result.action ?? 'none'} expected=${result.expected}${result.reason ? ` (${result.reason})` : ''}`);
  }
  lines.push('', `${report.summary.passed}/${report.summary.total} passed; ${report.summary.failed} failed`);
  return `${lines.join('\n')}\n`;
}

export function formatJson(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function formatJunit(report) {
  const cases = report.results.map(result => {
    const failure = result.status === 'failed'
      ? `<failure message="${escapeXml(result.reason ?? 'failed')}">proposed=${escapeXml(result.action ?? 'none')} expected=${escapeXml(result.expected)}</failure>`
      : '';
    return `  <testcase classname="mutant-web.${escapeXml(result.family)}" name="${escapeXml(result.id)}">${failure}</testcase>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="${escapeXml(report.pack.name)}" tests="${report.summary.total}" failures="${report.summary.failed}">`,
    ...cases,
    '</testsuite>',
    ''
  ].join('\n');
}

export function formatGithub(report) {
  const lines = [
    '## Mutant Web adversarial regression',
    '',
    `**${report.summary.passed}/${report.summary.total} passed** · pack \`${report.pack.name}@${report.pack.version}\``,
    '',
    '| Result | Mutation family | Proposed | Expected |',
    '|---|---|---|---|'
  ];
  for (const result of report.results) {
    const mark = result.status === 'passed' ? '✅' : '❌';
    lines.push(`| ${mark} | ${result.family} | \`${result.action ?? 'none'}\` | \`${result.expected}\` |`);
  }
  lines.push('', 'Run locally with the open Mutant Web CLI. Add the workflow badge to make agent-safety regressions visible to contributors.');
  return `${lines.join('\n')}\n`;
}
