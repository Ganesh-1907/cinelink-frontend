export function isOnline(): Promise<boolean> {
  return fetch('http://localhost:3001/api/health', {method: 'HEAD'})
    .then(() => true).catch(() => false);
}
