// Hyperliquid leaderboard, trimmed and cached. Source: stats-data.hyperliquid.xyz (public).
const SRC = 'https://stats-data.hyperliquid.xyz/Mainnet/leaderboard';
const W = ['day', 'week', 'month', 'allTime'];
let cache = { t: 0, rows: null, stats: null, sorted: {} };
let pending = null;

async function load() {
  if (cache.rows && Date.now() - cache.t < 180000) return cache;
  if (pending) return pending;
  pending = (async () => {
    const r = await fetch(SRC, { headers: { accept: 'application/json' } });
    if (!r.ok) throw new Error('leaderboard ' + r.status);
    const j = await r.json();
    const raw = j.leaderboardRows || j.rows || (Array.isArray(j) ? j : []);
    const rows = [];
    let av = 0, named = 0;
    for (const x of raw) {
      const a = String(x.ethAddress || x.address || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(a)) continue;
      const p = {};
      for (const wp of x.windowPerformances || []) {
        const k = wp[0], v = wp[1] || {};
        p[k] = [Number(v.pnl) || 0, Number(v.roi) || 0, Number(v.vlm) || 0];
      }
      const row = { a, n: x.displayName || null, av: Number(x.accountValue) || 0, p };
      if (row.n) named++;
      av += row.av;
      rows.push(row);
    }
    if (!rows.length) throw new Error('leaderboard empty');
    cache = { t: Date.now(), rows, stats: { n: rows.length, named, av }, sorted: {} };
    return cache;
  })();
  try { return await pending; } finally { pending = null; }
}

function send(res, code, obj, cacheable) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheable ? 'public, s-maxage=120, stale-while-revalidate=600' : 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x');
    const q = (u.searchParams.get('q') || '').trim().toLowerCase().slice(0, 64);
    const a = (u.searchParams.get('a') || '').trim().toLowerCase();
    const w = W.includes(u.searchParams.get('w')) ? u.searchParams.get('w') : 'month';
    const s = ['pnl', 'roi', 'vlm', 'av'].includes(u.searchParams.get('s')) ? u.searchParams.get('s') : 'pnl';
    const n = Math.min(100, Math.max(1, parseInt(u.searchParams.get('n'), 10) || 50));
    const o = Math.min(1000, Math.max(0, parseInt(u.searchParams.get('o'), 10) || 0));
    const c = await load();

    if (a) {
      if (!/^0x[0-9a-f]{40}$/.test(a)) return send(res, 400, { error: 'bad address' });
      return send(res, 200, { row: c.rows.find(r => r.a === a) || null }, true);
    }
    if (q) {
      const out = [];
      for (const r of c.rows) {
        if ((r.n && r.n.toLowerCase().includes(q)) || (q.startsWith('0x') && q.length >= 4 && r.a.startsWith(q))) out.push(r);
      }
      out.sort((x, y) => {
        const ex = (x.n || '').toLowerCase() === q ? 1 : 0, ey = (y.n || '').toLowerCase() === q ? 1 : 0;
        return ey - ex || y.av - x.av;
      });
      return send(res, 200, { rows: out.slice(0, 12) }, true);
    }
    const key = w + ':' + s;
    if (!c.sorted[key]) {
      const i = { pnl: 0, roi: 1, vlm: 2 }[s];
      let list = c.rows;
      if (s === 'roi') list = list.filter(r => r.av >= 10000);
      const val = s === 'av' ? r => r.av : r => (r.p[w] ? r.p[w][i] : 0);
      c.sorted[key] = list.slice().sort((x, y) => val(y) - val(x)).slice(0, 1000);
    }
    if (!c.sorted['month:pnl']) {
      c.sorted['month:pnl'] = c.rows.slice().sort((x, y) => (y.p.month ? y.p.month[0] : 0) - (x.p.month ? x.p.month[0] : 0)).slice(0, 1000);
    }
    const top = c.sorted['month:pnl'][0];
    const sorted = c.sorted[key];
    return send(res, 200, {
      stats: { ...c.stats, top: top && top.p.month ? { a: top.a, n: top.n, pnl: top.p.month[0] } : null },
      total: sorted.length,
      rows: sorted.slice(o, o + n),
    }, true);
  } catch (e) {
    return send(res, 502, { error: String((e && e.message) || e) });
  }
};
