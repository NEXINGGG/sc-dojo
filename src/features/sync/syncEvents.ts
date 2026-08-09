export const CLOUD_SYNC_NEEDED_EVENT = 'nw-a1-dojo:cloud-sync-needed';

export function notifyCloudSyncNeeded(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CLOUD_SYNC_NEEDED_EVENT));
  }
}

export function subscribeToCloudSyncNeeded(listener: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  window.addEventListener(CLOUD_SYNC_NEEDED_EVENT, listener);
  return () => window.removeEventListener(CLOUD_SYNC_NEEDED_EVENT, listener);
}
