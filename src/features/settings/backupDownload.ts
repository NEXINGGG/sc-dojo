import { createBackupFileName, serializeBackup, type BackupDocument } from '../../domain/backup';

export function downloadBackup(document: BackupDocument, now: Date = new Date()): void {
  const blob = new Blob([serializeBackup(document)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = documentCreateAnchor(url, createBackupFileName(now));
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function documentCreateAnchor(url: string, fileName: string): HTMLAnchorElement {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.hidden = true;
  document.body.append(anchor);
  return anchor;
}
