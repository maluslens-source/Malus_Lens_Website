// GET /api/slots?day=YYYY-MM-DD → { slots: ["10:00", ...] } free 30-minute slots (IST)
const g = require('./_google');

module.exports = async (req, res) => {
  if (!g.configured()) return g.send(res, 503, { error: 'not_configured' });
  const day = String((req.query && req.query.day) || '');
  if (!g.dayAllowed(day)) return g.send(res, 200, { slots: [] });
  try {
    const access = await g.token();
    g.send(res, 200, { slots: await g.freeSlots(access, day) });
  } catch (e) {
    g.send(res, 502, { error: 'calendar_unavailable' });
  }
};
