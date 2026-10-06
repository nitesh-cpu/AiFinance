const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// offset: 0 = current month, -1 = previous month, etc.
export const getMonthRange = (offset = 0) => {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
  const label = `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  return { start, end, label };
};

export const formatMonthYear = (date = new Date()) => {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date);
};
