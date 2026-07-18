export function formatRate(value: number | undefined): string {
  return value === undefined ? '未学習' : `${value}%`;
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split('-');
  return `${year}/${month}/${day}`;
}

export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '日時を確認できません';
  }
  return new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatElapsed(seconds: number): string {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  const remaining = Math.max(0, seconds) % 60;
  return `${minutes}分${String(remaining).padStart(2, '0')}秒`;
}
