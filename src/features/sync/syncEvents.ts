export const CLOUD_SYNC_NEEDED_EVENT = 'sc-dojo:cloud-sync-needed';

export interface CloudSyncNeededOptions {
  debounceMs?: number;
}

export function notifyCloudSyncNeeded(options: CloudSyncNeededOptions = {}): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CLOUD_SYNC_NEEDED_EVENT, { detail: options }));
  }
}

export function subscribeToCloudSyncNeeded(
  listener: (options: CloudSyncNeededOptions) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }
  const handleEvent = (event: Event) => {
    const options = event instanceof CustomEvent ? (event.detail as CloudSyncNeededOptions) : {};
    listener(options);
  };
  window.addEventListener(CLOUD_SYNC_NEEDED_EVENT, handleEvent);
  return () => window.removeEventListener(CLOUD_SYNC_NEEDED_EVENT, handleEvent);
}
