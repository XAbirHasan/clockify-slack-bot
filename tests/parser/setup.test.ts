import { describe, it, expect } from 'vitest';
import { parseSetup } from '../../src/parser/setup';

const validSetup = `setup
api_key: abc123
workspace_id: ws456
projects: mimir=pid1, mimir-maintenance=pid2
start_hour: 9`;

describe('parseSetup', () => {
  it('parses a valid setup message', () => {
    const result = parseSetup(validSetup);
    expect(typeof result).toBe('object');
    if (typeof result === 'string') throw new Error(result);
    expect(result.clockifyApiKey).toBe('abc123');
    expect(result.workspaceId).toBe('ws456');
    expect(result.projectMap).toEqual({ 'mimir': 'pid1', 'mimir-maintenance': 'pid2' });
    expect(result.workStartHour).toBe(9);
  });

  it('defaults start_hour to 9 when omitted', () => {
    const result = parseSetup('setup\napi_key: k\nworkspace_id: w\nprojects: p=id1');
    if (typeof result === 'string') throw new Error(result);
    expect(result.workStartHour).toBe(9);
  });

  it('returns sentinel for non-setup messages', () => {
    expect(parseSetup('hey there')).toBe('not a setup message');
    expect(parseSetup('[mimir] [8h]\n1. task')).toBe('not a setup message');
  });

  it('returns error for missing api_key', () => {
    const result = parseSetup('setup\nworkspace_id: w\nprojects: p=id1');
    expect(result).toContain('api_key');
  });

  it('returns error for missing workspace_id', () => {
    const result = parseSetup('setup\napi_key: k\nprojects: p=id1');
    expect(result).toContain('workspace_id');
  });

  it('returns error for missing projects', () => {
    const result = parseSetup('setup\napi_key: k\nworkspace_id: w');
    expect(result).toContain('projects');
  });

  it('returns error for start_hour out of range', () => {
    const result = parseSetup('setup\napi_key: k\nworkspace_id: w\nprojects: p=id1\nstart_hour: 25');
    expect(result).toContain('start_hour');
  });

  it('returns error for start_hour not a number', () => {
    const result = parseSetup('setup\napi_key: k\nworkspace_id: w\nprojects: p=id1\nstart_hour: abc');
    expect(result).toContain('start_hour');
  });

  it('normalises project names to lowercase', () => {
    const result = parseSetup('setup\napi_key: k\nworkspace_id: w\nprojects: Mimir=pid1');
    if (typeof result === 'string') throw new Error(result);
    expect(result.projectMap['mimir']).toBe('pid1');
  });

  it('is case-insensitive for the setup keyword', () => {
    const result = parseSetup('SETUP\napi_key: k\nworkspace_id: w\nprojects: p=id1');
    expect(typeof result).toBe('object');
  });

  it('decodes slack html entities in values', () => {
    const result = parseSetup('setup\napi_key: k&amp;key\nworkspace_id: w\nprojects: p=id1');
    if (typeof result === 'string') throw new Error(result);
    expect(result.clockifyApiKey).toBe('k&key');
  });
});
