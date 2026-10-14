/*
 * POST /api/book  { day, time, name, email, company?, note?, kind? }
 * Creates a Google Calendar event with an auto-generated Google Meet link and
 * emails the invitation to the visitor (and the Malus Lens calendar owner).
 * Nothing is stored by this function — the event lives only in the Malus Lens Google Calendar.
 */
const g = require('./_google');

const clean = (v, n) => String(v || '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const emailOk = (e) => /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]{2,}$/.test(e);

module.exports = async (req, res) => {
  if (req.method !== 'POST') return g.send(res, 405, { error: 'method' });
  if (!g.configured()) return g.send(res, 503, { error: 'not_configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website) return g.send(res, 200, { ok: true }); // honeypot: bots fill hidden fields

  const day = clean(b.day, 10), time = clean(b.time, 5);
  const name = clean(b.name, 80), email = clean(b.email, 120).toLowerCase();
  const company = clean(b.company, 120), note = clean(b.note, 600);
  const kind = b.kind === 'demo' ? 'Demo' : 'Meeting';
  if (!name || !emailOk(email)) return g.send(res, 400, { error: 'details' });
  if (!g.dayAllowed(day) || !g.slotsForDay().includes(time)) return g.send(res, 400, { error: 'slot' });

  try {
    const access = await g.token();
    // re-check the slot is still free right before booking
    const free = await g.freeSlots(access, day);
    if (!free.includes(time)) return g.send(res, 409, { error: 'taken' });

    const start = g.istDate(day, time), end = new Date(start.getTime() + g.SLOT_MIN * 60e3);
    const event = {
      summary: `Malus Lens ${kind} — ${name}${company ? ` (${company})` : ''}`,
      description: [
        `${kind} booked from maluslens website.`,
        company && `Organisation: ${company}`,
        note && `Notes: ${note}`,
      ].filter(Boolean).join('\n'),
      start: { dateTime: start.toISOString(), timeZone: g.TZ },
      end: { dateTime: end.toISOString(), timeZone: g.TZ },
      attendees: [{ email, displayName: name }],
      conferenceData: { createRequest: { requestId: `ml-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      reminders: { useDefault: true },
    };
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${g.calId()}/events?conferenceDataVersion=1&sendUpdates=all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    const j = await r.json();
    if (!r.ok) return g.send(res, 502, { error: 'calendar_unavailable' });
    const meet = (j.conferenceData && (j.conferenceData.entryPoints || []).find((p) => p.entryPointType === 'video')) || {};
    g.send(res, 200, { ok: true, meet: meet.uri || j.hangoutLink || '', start: start.toISOString() });
  } catch (e) {
    g.send(res, 502, { error: 'calendar_unavailable' });
  }
};
