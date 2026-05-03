import { describe, it, expect } from 'vitest';
import { parseMessage } from '../../src/parser/message';

describe('parseMessage', () => {
  it('parses a single block with tasks', () => {
    const { date, entries } = parseMessage('[mimir] [8h]\n1. Did stuff\n2. More stuff');
    expect(date).toBeUndefined();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual({
      project: 'mimir',
      durationMinutes: 480,
      tasks: ['Did stuff', 'More stuff'],
    });
  });

  it('parses multiple blocks', () => {
    const { entries } = parseMessage('[mimir] [6h]\n1. Task\n\n[mimir-maintenance] [2h]\n1. Fix');
    expect(entries).toHaveLength(2);
    expect(entries[0]!.project).toBe('mimir');
    expect(entries[0]!.durationMinutes).toBe(360);
    expect(entries[1]!.project).toBe('mimir-maintenance');
    expect(entries[1]!.durationMinutes).toBe(120);
  });

  it('parses a block with no tasks', () => {
    const { entries } = parseMessage('[mimir] [8h]');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.tasks).toHaveLength(0);
  });

  it('strips numbering from tasks', () => {
    const { entries } = parseMessage('[mimir] [1h]\n1. First\n2) Second');
    expect(entries[0]!.tasks).toEqual(['First', 'Second']);
  });

  it('returns empty array for unrelated text', () => {
    const { entries } = parseMessage('hey team, standup at 10');
    expect(entries).toHaveLength(0);
  });

  it('returns empty array for empty string', () => {
    const { entries } = parseMessage('');
    expect(entries).toHaveLength(0);
  });

  it('skips blocks with invalid duration', () => {
    const { entries } = parseMessage('[mimir] [abc]\n1. Task');
    expect(entries).toHaveLength(0);
  });

  it('decodes slack html entities in project name', () => {
    const { entries } = parseMessage('[mimir &amp; co] [1h]\n1. Task');
    expect(entries[0]!.project).toBe('mimir & co');
  });

  it('parses global date header', () => {
    const { date, entries } = parseMessage('[yesterday]\n\n[mimir] [1h]\n1. Task');
    expect(date).toBe('yesterday');
    expect(entries).toHaveLength(1);
    expect(entries[0]!.project).toBe('mimir');
  });

  it('parses specific date header', () => {
    const { date, entries } = parseMessage('[15-04-2024]\n[mimir] [1h]');
    expect(date).toBe('15-04-2024');
    expect(entries).toHaveLength(1);
  });

  it('does not treat project block as date header', () => {
    const { date, entries } = parseMessage('[mimir] [1h]\n1. Task');
    expect(date).toBeUndefined();
    expect(entries).toHaveLength(1);
  });
});
