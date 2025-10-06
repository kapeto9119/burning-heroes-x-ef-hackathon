/**
 * Get the next run time for a cron expression
 * Note: This is a simplified version for common cron patterns
 * For accurate calculation, use a backend service
 */
export function getNextRun(cronExpression: string): Date | null {
  try {
    // For now, return approximate next run (1 hour from now)
    // In production, you'd calculate this properly or fetch from backend
    const nextRun = new Date();
    nextRun.setHours(nextRun.getHours() + 1);
    return nextRun;
  } catch (error) {
    console.error('Invalid cron expression:', cronExpression, error);
    return null;
  }
}

/**
 * Get human-readable time until next run
 */
export function getTimeUntilNextRun(cronExpression: string): string {
  const nextRun = getNextRun(cronExpression);
  if (!nextRun) return 'Invalid schedule';

  const now = new Date();
  const diff = nextRun.getTime() - now.getTime();

  if (diff < 0) return 'Overdue';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `in ${minutes}m`;
  return `in ${seconds}s`;
}

/**
 * Convert cron expression to human-readable description
 */
export function cronToHuman(cronExpression: string): string {
  if (!cronExpression) return 'Not set';

  // Common patterns
  const patterns: Record<string, string> = {
    '0 9 * * 1-5': 'Every weekday at 9:00 AM',
    '0 9 * * *': 'Every day at 9:00 AM',
    '0 * * * *': 'Every hour',
    '*/15 * * * *': 'Every 15 minutes',
    '*/30 * * * *': 'Every 30 minutes',
    '0 0 * * *': 'Daily at midnight',
    '0 12 * * *': 'Daily at noon',
    '0 0 * * 0': 'Every Sunday at midnight',
    '0 0 1 * *': 'First day of every month',
  };

  if (patterns[cronExpression]) {
    return patterns[cronExpression];
  }

  // Parse cron parts
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return cronExpression;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Build description
  let description = '';

  // Frequency
  if (minute.startsWith('*/')) {
    const interval = minute.substring(2);
    description = `Every ${interval} minutes`;
  } else if (hour.startsWith('*/')) {
    const interval = hour.substring(2);
    description = `Every ${interval} hours`;
  } else if (dayOfWeek !== '*') {
    description = 'Weekly';
  } else if (dayOfMonth !== '*') {
    description = 'Monthly';
  } else {
    description = 'Daily';
  }

  // Time
  if (hour !== '*' && !hour.startsWith('*/')) {
    const hourNum = parseInt(hour);
    const minuteNum = parseInt(minute) || 0;
    const ampm = hourNum >= 12 ? 'PM' : 'AM';
    const hour12 = hourNum > 12 ? hourNum - 12 : hourNum === 0 ? 12 : hourNum;
    description += ` at ${hour12}:${minuteNum.toString().padStart(2, '0')} ${ampm}`;
  }

  return description || cronExpression;
}

/**
 * Format date to relative time (e.g., "2 hours ago", "in 5 minutes")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const absDiff = Math.abs(diff);
  const isPast = diff < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let timeStr = '';
  if (days > 0) timeStr = `${days} day${days > 1 ? 's' : ''}`;
  else if (hours > 0) timeStr = `${hours} hour${hours > 1 ? 's' : ''}`;
  else if (minutes > 0) timeStr = `${minutes} minute${minutes > 1 ? 's' : ''}`;
  else timeStr = `${seconds} second${seconds > 1 ? 's' : ''}`;

  return isPast ? `${timeStr} ago` : `in ${timeStr}`;
}
