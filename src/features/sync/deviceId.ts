export const DEVICE_ID_STORAGE_KEY = 'nw-a1-dojo-device-id';

let inMemoryDeviceId: string | undefined;

export function getDeviceId(
  storage: Pick<Storage, 'getItem' | 'setItem'> | undefined = getBrowserStorage(),
  createId: () => string = () => crypto.randomUUID(),
): string {
  try {
    const stored = storage?.getItem(DEVICE_ID_STORAGE_KEY)?.trim();
    if (stored !== undefined && stored !== '') {
      return stored;
    }
  } catch {
    // Storage can be unavailable in private browsing or restricted webviews.
  }

  inMemoryDeviceId ??= createId();

  try {
    storage?.setItem(DEVICE_ID_STORAGE_KEY, inMemoryDeviceId);
  } catch {
    // The stable in-memory value still keeps this page session deterministic.
  }

  return inMemoryDeviceId;
}

function getBrowserStorage(): Storage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}
