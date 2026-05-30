export function toIsoFromEpoch(value) {
  if (!value || Number.isNaN(Number(value))) {
    return null;
  }

  return new Date(Number(value)).toISOString();
}

export function formatRelativeTime(isoString) {
  if (!isoString) {
    return "Unknown";
  }

  const diff = Date.now() - new Date(isoString).getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return "Just now";
  }
  if (diff < hour) {
    return `${Math.floor(diff / minute)}m ago`;
  }
  if (diff < day) {
    return `${Math.floor(diff / hour)}h ago`;
  }
  return `${Math.floor(diff / day)}d ago`;
}
