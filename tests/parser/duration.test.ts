import { describe, it, expect } from 'vitest';
import { parseDuration } from '../../src/parser/duration';

describe('parseDuration', () => {
  it('parses hours only', () => {
    expect(parseDuration('8h')).toBe(480);
  });

  it('parses minutes only', () => {
    expect(parseDuration('30m')).toBe(30);
  });

  it('parses hours and minutes together', () => {
    expect(parseDuration('8h30m')).toBe(510);
  });

  it('parses hours and minutes with space', () => {
    expect(parseDuration('8h 30m')).toBe(510);
  });

  it('parses colon format', () => {
    expect(parseDuration('8:30')).toBe(510);
  });

  it('parses decimal format', () => {
    expect(parseDuration('8.5')).toBe(510);
  });

  it('is case-insensitive', () => {
    expect(parseDuration('8H')).toBe(480);
    expect(parseDuration('30M')).toBe(30);
  });

  it('returns null for empty string', () => {
    expect(parseDuration('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseDuration('0h')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(parseDuration('abc')).toBeNull();
  });
});
