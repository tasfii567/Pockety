import { sql, init, authed } from '../../../lib/db';

export const dynamic = 'force-dynamic';
const deny = () => Response.json({ error: 'bad key' }, { status: 401 });
const KINDS = ['spent', 'earned', 'saved'];

export async function GET(req) {
  if (!authed(req)) return deny();
  await init();
  const rows = await sql`SELECT id, kind, amount::float8 AS amount, category, note, day::text AS day
    FROM tx ORDER BY day DESC, id DESC LIMIT 1000`;
  const g = await sql`SELECT v FROM settings WHERE k = 'goal'`;
  return Response.json({ rows, goal: Number(g[0]?.v || 0) });
}

export async function POST(req) {
  if (!authed(req)) return deny();
  await init();
  const b = await req.json();
  if (b.goal !== undefined) {
    await sql`INSERT INTO settings (k, v) VALUES ('goal', ${String(Number(b.goal) || 0)})
      ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v`;
    return Response.json({ ok: true });
  }
  const amount = Number(b.amount);
  if (!KINDS.includes(b.kind) || !(amount > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(b.day))
    return Response.json({ error: 'invalid' }, { status: 400 });
  await sql`INSERT INTO tx (kind, amount, category, note, day)
    VALUES (${b.kind}, ${amount}, ${String(b.category || '').slice(0, 40)}, ${String(b.note || '').slice(0, 140)}, ${b.day})`;
  return Response.json({ ok: true });
}

export async function DELETE(req) {
  if (!authed(req)) return deny();
  await init();
  const id = Number(new URL(req.url).searchParams.get('id'));
  await sql`DELETE FROM tx WHERE id = ${id}`;
  return Response.json({ ok: true });
}
