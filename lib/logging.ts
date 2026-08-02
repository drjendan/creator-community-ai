type LogValue = string | number | boolean | null | undefined;
type LogContext = Record<string, LogValue>;

const sensitiveKey = /secret|token|password|authorization|cookie|api.?key/i;

function safeContext(context: LogContext = {}) {
  return Object.fromEntries(
    Object.entries(context).map(([key, value]) => [
      key,
      sensitiveKey.test(key) ? "[REDACTED]" : value
    ])
  );
}

function write(level: "info" | "warn" | "error", event: string, context: LogContext = {}) {
  const record = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    environment: process.env.APP_ENV || process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
    ...safeContext(context)
  });
  if (level === "error") console.error(record);
  else if (level === "warn") console.warn(record);
  else console.info(record);
}

export function logInfo(event: string, context?: LogContext) {
  write("info", event, context);
}

export function logWarning(event: string, context?: LogContext) {
  write("warn", event, context);
}

export function logError(event: string, error: unknown, context: LogContext = {}) {
  write("error", event, {
    ...context,
    errorName: error instanceof Error ? error.name : "UnknownError",
    errorMessage: error instanceof Error ? error.message : "Unexpected error"
  });
}
