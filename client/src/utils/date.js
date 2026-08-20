import { format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

export const formatMessageTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  return format(date, 'h:mm a');
};

export const formatChatListTime = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);

  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE');
  }
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  return format(date, 'dd/MM/yyyy');
};

export const formatMessageDateHeader = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);

  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  if (isThisYear(date)) {
    return format(date, 'EEEE, MMMM d');
  }
  return format(date, 'EEEE, MMMM d, yyyy');
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatLastSeen = (dateInput) => {
  if (!dateInput) return '';
  const date = new Date(dateInput);
  
  if (isToday(date)) {
    return 'today at ' + format(date, 'h:mm a');
  }
  if (isYesterday(date)) {
    return 'yesterday at ' + format(date, 'h:mm a');
  }
  if (isThisWeek(date)) {
    return format(date, 'EEEE') + ' at ' + format(date, 'h:mm a');
  }
  return format(date, 'MMM d, yyyy');
};
