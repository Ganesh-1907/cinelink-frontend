export const parseDeadline = (deadline: any): Date | null => {
  if (!deadline) return null;
  if (typeof deadline?.toDate === 'function') return deadline.toDate();
  if (typeof deadline !== 'string') return null;
  const s = deadline.trim();
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
  }
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), 23, 59, 59);
  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
};

export const getDaysLeft = (deadline: any): string => {
  const end = parseDeadline(deadline);
  if (!end) return 'Open';
  const diff = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return 'Contest Ended';
  if (diff === 0) return '🔥 Last Day!';
  return `${diff} days left`;
};
