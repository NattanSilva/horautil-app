/**
 * Helpers de data/hora para as regras de agenda (BR-301..BR-309, §5.5).
 *
 * Toda a persistência é em UTC (`timestamptz`); a conversão para o fuso do usuário
 * usa `Intl.DateTimeFormat`, evitando dependência extra e respeitando DST.
 */
import { BOOKING } from '../config/constants.js';

/** Data/hora local do usuário no formato `YYYY-MM-DDTHH:mm:ss` (sem offset). */
const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = partsCache.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    partsCache.set(timeZone, f);
  }
  return f;
}

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number;
  second: number;
  /** 0 = domingo … 6 = sábado (compatível com `availability_slots.weekday`). */
  weekday: number;
  /** "HH:MM" em horário local. */
  hhmm: string;
  /** "YYYY-MM-DD" em horário local. */
  isoDate: string;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Quebra um instante UTC nas partes do fuso do usuário. */
export function toLocalParts(instant: Date, timeZone: string): LocalParts {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  const year = Number(get('year'));
  const month = Number(get('month'));
  const day = Number(get('day'));
  // `hour12: false` pode devolver "24" à meia-noite em alguns runtimes ICU.
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    hhmm: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    isoDate: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

/** "HH:MM:SS" → minutos desde a meia-noite. */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutos desde a meia-noite → "HH:MM". */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Minutos → duração legível pt-BR ("1h30"). */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** Minutos → `{ hours, minutes }` para o app Compose. */
export function toHoursMinutes(minutes: number): { hours: number; minutes: number } {
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 };
}

export const MINUTE_MS = 60_000;
export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

/** `dias corridos` a partir de `now` (BR-105 / BR-106). */
export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * HOUR_MS);
}

export function addMinutes(from: Date, minutes: number): Date {
  return new Date(from.getTime() + minutes * MINUTE_MS);
}

/** Momento em que o `pending` expira (BR-304). */
export function pendingExpiryFrom(scheduledAt: Date, now = new Date()): Date {
  // O prazo de 48 h conta a partir da criação da solicitação.
  const byCreation = addHours(now, BOOKING.PENDING_EXPIRY_HOURS);
  // Nunca pode expirar depois do início da sessão.
  return byCreation < scheduledAt ? byCreation : scheduledAt;
}

/** Momento da auto-confirmação quando o aluno sinaliza conclusão (BR-309). */
export function autoConfirmDeadline(from = new Date()): Date {
  return addHours(from, BOOKING.COMPLETION_CONFIRMATION_TIMEOUT_HOURS);
}

/** Meses (fracionários) entre `from` e `to` — usado no peso de recência (BR-506). */
export function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (30 * DAY_MS);
}

/**
 * Classifica a penalidade de cancelamento (§5.5) em função das horas restantes.
 * Retorna a fração de reembolso devida ao aluno.
 */
export type RefundPolicy =
  | { tier: 'full'; refundRatio: 1; reputationHit: false }
  | { tier: 'partial'; refundRatio: typeof BOOKING.CANCELLATION_PARTIAL_REFUND_RATIO; reputationHit: true }
  | { tier: 'none'; refundRatio: 0; reputationHit: true };

export function refundPolicyFor(scheduledAt: Date, now = new Date()): RefundPolicy {
  const hoursUntil = (scheduledAt.getTime() - now.getTime()) / HOUR_MS;
  if (hoursUntil > BOOKING.CANCELLATION_FULL_REFUND_HOURS) {
    return { tier: 'full', refundRatio: 1, reputationHit: false };
  }
  if (hoursUntil >= BOOKING.CANCELLATION_PARTIAL_REFUND_HOURS) {
    return { tier: 'partial', refundRatio: BOOKING.CANCELLATION_PARTIAL_REFUND_RATIO, reputationHit: true };
  }
  return { tier: 'none', refundRatio: 0, reputationHit: true };
}

/** ISO-8601 UTC — formato único de saída da API. */
export function toIso(value: Date | null | undefined): string | null {
  return value ? new Date(value).toISOString() : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Conversão horário local ⇄ instante UTC
//
// `availability_slots` guarda janelas recorrentes em horário **local** (o fuso vive em
// `users.timezone`). Para transformar "terça 19:00 em São Paulo" em um instante UTC
// é preciso aplicar o offset do fuso — e o offset depende do próprio instante (DST).
// A estratégia é resolver por aproximação em duas passadas, o que é exato para
// transições usuais de DST (America/Sao_Paulo não observa DST desde 2019; o código
// continua correto para fusos que observam).
// ─────────────────────────────────────────────────────────────────────────

/** Offset do fuso em milissegundos no instante informado (positivo = à frente do UTC). */
export function tzOffsetMs(instant: Date, timeZone: string): number {
  const parts = toLocalParts(instant, timeZone);
  const asIfUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return asIfUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** "YYYY-MM-DD" + minutos desde a meia-noite → instante UTC. */
export function localToUtc(isoDate: string, minutesOfDay: number, timeZone: string): Date {
  const [year, month, day] = isoDate.split('-').map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, Math.floor(minutesOfDay / 60), minutesOfDay % 60);
  const firstGuess = new Date(naiveUtc - tzOffsetMs(new Date(naiveUtc), timeZone));
  // Segunda passada: corrige o offset usando o instante já deslocado.
  return new Date(naiveUtc - tzOffsetMs(firstGuess, timeZone));
}

/** Instante UTC + duração → partes locais no fuso informado. */
export function instantRange(instant: Date, durationMinutes: number, timeZone: string) {
  const start = toLocalParts(instant, timeZone);
  const end = toLocalParts(new Date(instant.getTime() + durationMinutes * MINUTE_MS), timeZone);
  return {
    isoDate: start.isoDate,
    weekday: start.weekday,
    startMinutes: timeToMinutes(start.hhmm),
    endMinutes: timeToMinutes(end.hhmm),
    /** `true` quando a sessão termina no dia seguinte local (sessão que atravessa a meia-noite). */
    crossesMidnight: end.isoDate !== start.isoDate,
  };
}

/** Verifica se `[start, end]` (minutos locais) cabe em algum dos intervalos informados. */
export function fitsInWindows(
  startMinutes: number,
  endMinutes: number,
  windows: { startTime: string; endTime: string }[],
): boolean {
  return windows.some(
    (w) => timeToMinutes(w.startTime) <= startMinutes && timeToMinutes(w.endTime) >= endMinutes,
  );
}

/** `true` quando o instante está alinhado à grade de 30 min **no fuso informado**. */
export function isAlignedToGrid(instant: Date, timeZone: string, stepMinutes = 30): boolean {
  const parts = toLocalParts(instant, timeZone);
  return parts.minute % stepMinutes === 0;
}