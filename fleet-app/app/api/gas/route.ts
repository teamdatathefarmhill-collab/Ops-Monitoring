const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL ?? '';

export async function GET(request: Request) {
  if (!GAS_URL) return Response.json({ success: false, error: 'GAS_URL belum diset' }, { status: 500 });
  const { searchParams } = new URL(request.url);
  const gasUrl = new URL(GAS_URL);
  searchParams.forEach((v, k) => gasUrl.searchParams.set(k, v));
  const res = await fetch(gasUrl.toString(), { cache: 'no-store' });
  const data = await res.json();
  return Response.json(data);
}

export async function POST(request: Request) {
  if (!GAS_URL) return Response.json({ success: false, error: 'GAS_URL belum diset' }, { status: 500 });
  const body = await request.json();
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return Response.json(data);
}
