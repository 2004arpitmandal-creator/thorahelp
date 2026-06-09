// Tiny logging wrapper — keeps console output in dev only.
// Replace with Sentry / LogRocket when you wire production observability.
const IS_DEV = process.env.NODE_ENV !== "production";

export const log = {
  warn: (...args) => { if (IS_DEV) console.warn(...args); },
  error: (...args) => { if (IS_DEV) console.error(...args); },
  info: (...args) => { if (IS_DEV) console.info(...args); },
};

export default log;
