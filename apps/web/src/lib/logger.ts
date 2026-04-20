// Structured JSON logger. Keep it dependency-free; if the team later picks
// a platform (Sentry, Axiom, etc.) this wrapper is the single place to wire it.

type Level = "debug" | "info" | "warn" | "error";

interface LogRecord {
  t: string;
  lvl: Level;
  msg: string;
  [k: string]: unknown;
}

function write(level: Level, msg: string, meta: Record<string, unknown> = {}): void {
  const rec: LogRecord = { t: new Date().toISOString(), lvl: level, msg, ...meta };
  const line = JSON.stringify(rec);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  debug: (msg: string, meta?: Record<string, unknown>) => write("debug", msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write("info", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write("warn", msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write("error", msg, meta),
};
