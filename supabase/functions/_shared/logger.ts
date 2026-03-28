type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  function_name: string;
  message: string;
  trace_id?: string;
  user_id?: string;
  metadata?: Record<string, unknown>;
}

const write = (
  level: LogLevel,
  fnName: string,
  message: string,
  meta?: Record<string, unknown>,
) => {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    function_name: fnName,
    message,
    ...meta,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

export const createLogger = (functionName: string) => ({
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', functionName, msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', functionName, msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', functionName, msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', functionName, msg, meta),
});
