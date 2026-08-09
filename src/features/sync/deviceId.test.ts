import { describe, expect, it, vi } from 'vitest';
import { DEVICE_ID_STORAGE_KEY, getDeviceId } from './deviceId';

describe('同期device_id', () => {
  it('初回だけ生成してlocalStorageの値を再利用する', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const createId = vi.fn(() => 'device-generated');

    expect(getDeviceId(storage, createId)).toBe('device-generated');
    expect(getDeviceId(storage, createId)).toBe('device-generated');
    expect(values.get(DEVICE_ID_STORAGE_KEY)).toBe('device-generated');
    expect(createId).toHaveBeenCalledTimes(1);
  });
});
