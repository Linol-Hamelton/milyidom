import { describe, expect, it } from 'vitest';
import {
  isWebsocketProbeError,
  parseSocketTransports,
  parseUpgradeBackoffMinutes,
} from './useSocket';

describe('useSocket helpers', () => {
  it('parses transports with polling fallback', () => {
    expect(parseSocketTransports(undefined)).toEqual(['polling']);
    expect(parseSocketTransports('')).toEqual(['polling']);
    expect(parseSocketTransports('foo,bar')).toEqual(['polling']);
    expect(parseSocketTransports('websocket')).toEqual(['websocket']);
    expect(parseSocketTransports('polling, websocket')).toEqual(['polling', 'websocket']);
  });

  it('parses upgrade backoff minutes safely', () => {
    expect(parseUpgradeBackoffMinutes(undefined)).toBe(30);
    expect(parseUpgradeBackoffMinutes('')).toBe(30);
    expect(parseUpgradeBackoffMinutes('0')).toBe(30);
    expect(parseUpgradeBackoffMinutes('-5')).toBe(30);
    expect(parseUpgradeBackoffMinutes('15')).toBe(15);
  });

  it('detects websocket probe failures', () => {
    expect(isWebsocketProbeError('websocket error')).toBe(true);
    expect(isWebsocketProbeError('probe error: Error: websocket error')).toBe(true);
    expect(isWebsocketProbeError('xhr poll error')).toBe(false);
  });
});
