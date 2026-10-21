'use client';
import { useEffect, useMemo, useState } from 'react';

const DEFAULT_CUR = process.env.NEXT_PUBLIC_CURRENCY || '$';
const CURRENCIES = [['$', '$ Dollar'], ['৳', '৳ Taka']];
const CATS = {
  spent: ['🍔 Food', '🚌 Travel', '🛍️ Shopping', '🏠 Bills', '🎬 Fun', '💊 Health', '✨ Other'],
  earned: ['💼 Salary', '💸 Side gig', '🎁 Gift', '✨ Other'],
  saved: ['Piggy bank', '🚨 Emergency', '🎯 Goal']
};
const KINDS = [['spent', '💸 Spent'], ['earned', '💰 Earned'], ['saved', 'Saved']];
const COLOR = { spent: 'var(--coral)', earned: 'var(--mint)', saved: 'var(--grape)' };
const today = () => new Date().toLocaleDateString('en-CA');

export default function Home() {
  const [ready, setReady] = useState(false);
  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [goal, setGoal] = useState(0);
  const [err, setErr] = useState('');
  const [f, setF] = useState({ kind: 'spent', amount: '', category: CATS.spent[0], note: '', day: today() });
  const [rem, setRem] = useState({ on: false, time: '20:00' });
  const [now, setNow] = useState(new Date());
  const [cur, setCur] = useState(DEFAULT_CUR);
  const money = (n) => cur + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  function chooseCur(c) { setCur(c); localStorage.setItem('pp-cur', c); }

  useEffect(() => {
    try { setRows(JSON.parse(localStorage.getItem('pp-rows')) || []); setGoal(Number(localStorage.getItem('pp-goal')) || 0); } catch {}
    setCur(localStorage.getItem('pp-cur') || DEFAULT_CUR);
    setLoaded(true);
    try { setRem(JSON.parse(localStorage.getItem('pp-rem')) || { on: false, time: '20:00' }); } catch {}
    setReady(true);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (loaded) localStorage.setItem('pp-rows', JSON.stringify(rows)); }, [rows, loaded]);
  useEffect(() => { if (loaded) localStorage.setItem('pp-goal', String(goal)); }, [goal, loaded]);

  function add(e) {
    e.preventDefault();
    const amount = parseFloat(f.amount);
    if (!(amount > 0)) return setErr('Enter an amount above 0.');
    setErr('');
    const row = { id: Date.now(), kind: f.kind, amount, category: f.category, note: f.note, day: f.day };
    setRows([row, ...rows].sort((x, y) => (y.day === x.day ? y.id - x.id : y.day.localeCompare(x.day))));
    setF({ ...f, amount: '', note: '' });
  }
  function del(id) { setRows(rows.filter((r) => r.id !== id)); }
  function editGoal() {
    const v = parseFloat(prompt(`Monthly savings goal (${cur})`, goal || ''));
    if (v >= 0) setGoal(v);
  }
  function saveRem(r) { setRem(r); localStorage.setItem('pp-rem', JSON.stringify(r)); }
  async function toggleRem() {
    if (!rem.on && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
    saveRem({ ...rem, on: !rem.on });
  }

  const s = useMemo(() => {
    const m = today().slice(0, 7);
    const sum = (k, list) => list.filter((r) => r.kind === k).reduce((a, r) => a + r.amount, 0);
    const mo = rows.filter((r) => r.day.startsWith(m));
    const earned = sum('earned', mo), spent = sum('spent', mo), saved = sum('saved', mo);
    const by = {};
    mo.filter((r) => r.kind === 'spent').forEach((r) => (by[r.category] = (by[r.category] || 0) + r.amount));
    const days = new Set(rows.map((r) => r.day));
    let streak = 0; const d = new Date();
    if (!days.has(today())) d.setDate(d.getDate() - 1);
    while (days.has(d.toLocaleDateString('en-CA'))) { streak++; d.setDate(d.getDate() - 1); }
    const t = new Date(), left = earned - spent - saved;
    const daysLeft = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() - t.getDate() + 1;
    return {
      earned, spent, saved, left, streak, cats: Object.entries(by).sort((a, b) => b[1] - a[1]),
      loggedToday: days.has(today()), todaySpent: sum('spent', rows.filter((r) => r.day === today())),
      rate: earned ? Math.round((saved / earned) * 100) : 0, perDay: left > 0 ? left / daysLeft : 0
    };
  }, [rows]);

  const [hh, mm] = rem.time.split(':').map(Number);
  const due = loaded && rem.on && !s.loggedToday && now.getHours() * 60 + now.getMinutes() >= hh * 60 + mm;

  useEffect(() => {
    if (!due || localStorage.getItem('pp-notified') === today()) return;
    localStorage.setItem('pp-notified', today());
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    const o = { body: 'Take 10 seconds to log today’s money.', icon: '/icon.svg' };
    navigator.serviceWorker?.ready.then((r) => r.showNotification('Pocket Pop', o)).catch(() => new Notification('Pocket Pop', o));
  }, [due]);

  if (!ready) return null;
  const pct = goal ? Math.min(100, (s.saved / goal) * 100) : 0;
  return (
    <main>
      <section className="hero">
        <div className="row between"><h1>Pocket Pop</h1><span className="pill">🔥 {s.streak}-day streak</span></div>
        <p style={{ marginTop: 18 }}><small>Left to spend this month</small></p>
        <div className="big">{money(s.left)}</div>
        <p style={{ marginTop: 8 }}><small>{s.perDay ? `≈ ${money(s.perDay)} a day for the rest of the month` : 'Add your income to see a daily allowance'}</small></p>
      </section>

      {due && <div className="banner" role="alert">⏰ You haven’t logged anything today. Add it below before you forget!</div>}
      {err && <p className="err" role="alert">{err}</p>}

      <section className="tiles">
        <div className="tile mint">Earned<b>{money(s.earned)}</b></div>
        <div className="tile coral">Spent<b>{money(s.spent)}</b></div>
        <div className="tile sky">Saved<b>{money(s.saved)}</b>{s.rate}% of income</div>
      </section>

      <form className="card" onSubmit={add} style={{ display: 'grid', gap: 14 }}>
        <h2>Log a transaction</h2>
        <div className="seg">
          {KINDS.map(([k, label]) => (
            <button type="button" key={k} className={k} aria-pressed={f.kind === k}
              onClick={() => setF({ ...f, kind: k, category: CATS[k][0] })}>{label}</button>
          ))}
        </div>
        <input className="amount" inputMode="decimal" placeholder={`${cur}0.00`} value={f.amount}
          onChange={(e) => setF({ ...f, amount: e.target.value })} aria-label="Amount" />
        <div className="chips">
          {CATS[f.kind].map((c) => (
            <button type="button" key={c} className="chip" aria-pressed={f.category === c} onClick={() => setF({ ...f, category: c })}>{c}</button>
          ))}
        </div>
        <div className="row">
          <input style={{ flex: 2, minWidth: 140 }} placeholder="Note (optional)" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} aria-label="Note" />
          <input style={{ flex: 1, minWidth: 140 }} type="date" value={f.day} onChange={(e) => setF({ ...f, day: e.target.value })} aria-label="Date" />
        </div>
        <button className="go">{'Add transaction'}</button>
      </form>

      <section className="card">
        <div className="row between">
          <h2>Savings goal</h2>
          <button className="link" onClick={editGoal}>{goal ? 'Change goal' : 'Set a goal'}</button>
        </div>
        {goal ? (<>
          <div className="bar" style={{ margin: '14px 0 8px' }} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin="0" aria-valuemax="100"><i style={{ width: pct + '%' }} /></div>
          <p><b>{money(s.saved)}</b> of {money(goal)} saved this month {pct >= 100 ? '🎉 Goal reached!' : `· ${money(goal - s.saved)} to go`}</p>
        </>) : <p className="muted" style={{ marginTop: 8 }}>Pick a monthly amount to save and watch the bar fill up.</p>}
      </section>

      <section className="card">
        <h2>Where your money went</h2>
        {s.cats.length ? s.cats.map(([c, v]) => (
          <div className="cat" key={c}><span>{c}</span><div className="bar"><i style={{ width: (v / s.spent) * 100 + '%' }} /></div><span>{money(v)}</span></div>
        )) : <p className="muted" style={{ marginTop: 8 }}>No spending logged this month yet.</p>}
        <p className="muted" style={{ marginTop: 14 }}>Spent today: <b style={{ color: 'var(--ink)' }}>{money(s.todaySpent)}</b></p>
      </section>

      <section className="card">
        <h2>Currency</h2>
        <div className="chips" style={{ marginTop: 12 }}>
          {CURRENCIES.map(([c, label]) => (
            <button key={c} className="chip" aria-pressed={cur === c} onClick={() => chooseCur(c)}>{label}</button>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="row between">
          <h2>Daily reminder</h2>
          <button className="chip" aria-pressed={rem.on} onClick={toggleRem}>{rem.on ? 'On' : 'Off'}</button>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label htmlFor="rt" className="muted">Remind me at</label>
          <input id="rt" type="time" style={{ width: 140 }} value={rem.time} onChange={(e) => saveRem({ ...rem, time: e.target.value })} />
        </div>
        <p className="muted" style={{ marginTop: 10, fontSize: '.9rem' }}>If you haven’t logged anything by then, you’ll get a notification and a banner. Install the app to your home screen for the best results.</p>
      </section>

      <section className="card">
        <h2>Recent</h2>
        {rows.length ? rows.slice(0, 30).map((r) => (
          <div className="tx" key={r.id}>
            <span className="dot" style={{ background: COLOR[r.kind] }} />
            <div className="grow"><b>{r.category}</b> <small>{r.note}</small><br /><small>{r.day}</small></div>
            <b>{r.kind === 'earned' ? '+' : r.kind === 'spent' ? '−' : '→'}{money(r.amount)}</b>
            <button className="x" onClick={() => del(r.id)} aria-label="Delete transaction">✕</button>
          </div>
        )) : <p className="muted" style={{ marginTop: 8 }}>Nothing yet. Log your first transaction above.</p>}
      </section>
    </main>
  );
}
