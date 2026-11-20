const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

/** Parses "15m", "12h", "7d", "30s" (or plain seconds) into milliseconds. */
export const parseDurationMs = (value: string): number => {
  const match = /^(\d+)\s*([smhd])?$/i.exec(value.trim());
  if (!match) throw new Error(`Invalid duration: "${value}"`);
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  return amount * (UNIT_MS[unit] as number);
};
