/*
 * Google Calendar helpers for the booking flow (no SDK, plain fetch).
 * Needs these Vercel environment variables (never commit them):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN  — OAuth for the info@maluslens.com account
 *   GOOGLE_CALENDAR_ID (optional, default "primary")
 */
const TZ = 'Asia/Kolkata';
const OFFSET = '+05:30';
const SLOT_MIN = 30;
const DAY_START = 10, DAY_END = 18;          // 10:00–18:00 IST
const WORK_DAYS = [1, 2, 3, 4, 5, 6];        // Mon–Sat
const MAX_DAYS_AHEAD = 30;

const configured = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN);
const calId = () => encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary');

async function token() {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('auth');
  return j.access_token;
}

// "2026-10-14" + "10:30" → Date for that IST wall-clock time
const istDate = (day, hm) => new Date(`${day}T${hm}:00${OFFSET}`);
const pad = (n) => String(n).padStart(2, '0');
const slotsForDay = () => {
  const out = [];
  for (let m = DAY_START * 60; m + SLOT_MIN <= DAY_END * 60; m += SLOT_MIN) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
};
const isoDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const weekdayIST = (day) => new Date(`${day}T12:00:00${OFFSET}`).getUTCDay();
const dayAllowed = (day) => {
  if (!isoDay(day) || !WORK_DAYS.includes(weekdayIST(day))) return false;
  const start = istDate(day, '00:00').getTime(), now = Date.now();
  return start > now - 864e5 && start < now + MAX_DAYS_AHEAD * 864e5;
};

async function busy(access, from, to) {
  const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ, items: [{ id: decodeURIComponent(calId()) }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('freebusy');
  const cal = Object.values(j.calendars || {})[0] || { busy: [] };
  return (cal.busy || []).map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
}

async function freeSlots(access, day) {
  const all = slotsForDay();
  const b = await busy(access, istDate(day, '00:00'), istDate(day, '23:59'));
  const soon = Date.now() + 2 * 3600e3; // at least 2 hours' notice
  return all.filter((hm) => {
    const s = istDate(day, hm).getTime(), e = s + SLOT_MIN * 60e3;
    return s > soon && !b.some(([bs, be]) => s < be && e > bs);
  });
}

function send(res, code, body) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = { TZ, SLOT_MIN, configured, calId, token, istDate, slotsForDay, dayAllowed, freeSlots, send };
