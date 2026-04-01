import { describe, it, expect } from 'vitest';
import { parseMessage } from '../../src/parser/message';

describe('parseMessage', () => {
  it('parses a single block with tasks', () => {
    const result = parseMessage('[mimir] [8h]\n1. Did stuff\n2. More stuff');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      project: 'mimir',
      durationMinutes: 480,
      tasks: ['Did stuff', 'More stuff'],
    });
  });

  it('parses multiple blocks', () => {
    const result = parseMessage('[mimir] [6h]\n1. Task\n\n[mimir-maintenance] [2h]\n1. Fix');
    expect(result).toHaveLength(2);
    expect(result[0]!.project).toBe('mimir');
    expect(result[0]!.durationMinutes).toBe(360);
    expect(result[1]!.project).toBe('mimir-maintenance');
    expect(result[1]!.durationMinutes).toBe(120);
  });

  it('parses a block with no tasks', () => {
    const result = parseMessage('[mimir] [8h]');
    expect(result).toHaveLength(1);
    expect(result[0]!.tasks).toHaveLength(0);
  });

  it('strips numbering from tasks', () => {
    const result = parseMessage('[mimir] [1h]\n1. First\n2) Second');
    expect(result[0]!.tasks).toEqual(['First', 'Second']);
  });

  it('returns empty array for unrelated text', () => {
    expect(parseMessage('hey team, standup at 10')).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    expect(parseMessage('')).toHaveLength(0);
  });

  it('skips blocks with invalid duration', () => {
    const result = parseMessage('[mimir] [abc]\n1. Task');
    expect(result).toHaveLength(0);
  });

  it('decodes slack html entities in project name', () => {
    const result = parseMessage('[mimir &amp; co] [1h]\n1. Task');
    expect(result[0]!.project).toBe('mimir & co');
  });
});
