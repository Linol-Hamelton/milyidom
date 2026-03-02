export const EMAIL_QUEUE = 'email';
export const NOTIFICATION_QUEUE = 'notification';
export const PAYOUT_QUEUE = 'payout';

// Email job names
export const EMAIL_JOB = {
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password-reset',
  EMAIL_VERIFY: 'email-verify',
  BOOKING_CONFIRMATION: 'booking-confirmation',
  BOOKING_REQUEST: 'booking-request',
  BOOKING_CANCELLATION: 'booking-cancellation',
  PAYOUT_SENT: 'payout-sent',
  SUPERHOST_PROMO: 'superhost-promo',
  SAVED_SEARCH_ALERT: 'saved-search-alert',
} as const;

// Notification job names
export const NOTIFICATION_JOB = {
  BOOKING_REMINDER: 'booking-reminder',
  CLEANUP_OLD: 'cleanup-old',
} as const;

// Payout job names
export const PAYOUT_JOB = {
  PROCESS: 'process-payout',
} as const;
