import type { ParsedEntry } from './types';
import { parseDuration } from './duration';
import { decodeSlackText } from './util';

/**
 * Parse a Slack message into daily-update entries.
 *
 * Format:
 *   [project-name] [8h]
 *   1. Task one
 *       a. Subtask A
 *       b. Subtask B
 *   2. Task two
 *       a. Subtask A
 *       b. Subtask B
 *   [another-project] [30m]
 *   1. Task one
 *       a. Subtask A
 *       b. Subtask B
 *   2. Task two
 *       a. Subtask A
 *       b. Subtask B
 */
export function parseMessage(raw: string): ParsedEntry[] {
  const decoded = decodeSlackText(raw).replace(/^```\n?/, '').replace(/\n?```$/, '');
  const lines = decoded.split('\n');
  const headerRe = /^\[([^\]]+)\]\s*\[([^\]]+)\]$/;
  // Top-level: numbered "1." / "1)" or Slack bullet "•"
  const topTaskRe = /^(\d+[.)]\s*|•\s*)/;
  // Subtask: lettered "a." / "a)" or Slack sub-bullet "◦"
  const subtaskRe = /^([a-z][.)]\s*|◦\s*)/i;
  const entries: ParsedEntry[] = [];
  let current: ParsedEntry | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const headerMatch = headerRe.exec(trimmed);
    if (headerMatch) {
      if (current !== null) entries.push(current);
      const durationMinutes = parseDuration(headerMatch[2]!.trim());
      current = durationMinutes !== null && durationMinutes > 0
        ? { project: headerMatch[1]!.trim(), durationMinutes, tasks: [] }
        : null;
      continue;
    }

    if (current === null) continue;

    const isIndented = line.startsWith('  ') || line.startsWith('\t');
    const isSubBullet = trimmed.startsWith('◦');

    if (!isIndented && !isSubBullet && topTaskRe.test(trimmed)) {
      // Top-level task: numbered "1." or Slack bullet "•"
      const task = trimmed.replace(topTaskRe, '').trim();
      if (task) current.tasks.push(task);
    } else if ((isIndented || isSubBullet) && current.tasks.length > 0) {
      // Subtask: lettered "a." or Slack sub-bullet "◦" — append to last task
      const sub = trimmed.replace(subtaskRe, '').trim();
      if (sub) current.tasks[current.tasks.length - 1] += `\n   ${sub}`;
    }
  }

  if (current !== null) entries.push(current);
  return entries;
}
