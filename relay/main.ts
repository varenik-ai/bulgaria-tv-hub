// Ретранслятор HLS для трансляции на ТВ (AirPlay / Google Cast).
// Зачем: телевизор сам скачивает поток, а из российской сети большие файлы с OVH/Scaleway (glebul.com) и с доменов Cloudflare
// зависают после ~16 КБ. Этот сервис нужно развернуть там, откуда файлы доходят (Deno Deploy, AWS, Azure и т.п.).
// Маршруты: /hls/<канал>.m3u8 (свежий токен при каждом запросе), /pl/<b64> (вложенные плейлисты), /seg/<b64>.ts (сегменты, Range).
// Запуск локально: deno run -A main.ts   Деплой: deno deploy (см. README.md)

const CHANNELS: Record<string, string> = {
  // General / News
  btv:           'hd-btv-hd',
  novatv:        'hd-nova-tv-hd',
  bnt1:          'hd-bnt-1-hd',
  bnt2:          'bnt-2',
  bnt3:          'hd-bnt-3-hd',
  bnt4:          'bnt-4',
  bulgariaonair: 'bulgaria-on-air',
  kanal3:        'kanal-3',
  novanews:      'hd-nova-news-hd',
  euronews:      'hd-euronews-bulgaria-hd',
  bloomberg:     'bloomberg-tv',
  dstv:          'dstv',
  evrokom:       'evrokom',
  skat:          'skat',
  tv78:          'hd-78-tv-hd',
  // Sport
  novasport:     'hd-nova-sport-hd',
  diemasport:    'hd-diema-sport-hd',
  diemasport2:   'hd-diema-sport-2-hd',
  diemasport3:   'hd-diema-sport-3-hd',
  maxsport1:     'hd-max-sport-1-hd',
  maxsport2:     'hd-max-sport-2-hd',
  maxsport3:     'hd-max-sport-3-hd',
  maxsport4:     'hd-max-sport-4-hd',
  eurosport1:    'hd-eurosport-1-hd',
  eurosport2:    'hd-eurosport-2-hd',
  // Movies / Entertainment
  kinonova:      'hd-kino-nova-hd',
  diema:         'hd-diema-hd',
  diemafamily:   'hd-diema-family-hd',
  ringbg:        'hd-ring-bg-hd',
  btvaction:     'hd-btv-action-hd',
  btvcinema:     'btv-cinema',
  btvcomedy:     'hd-btv-comedy-hd',
  btvstory:      'btv-story',
  axn:           'axn',
  axnblack:      'axn-black',
  axnwhite:      'axn-white',
  epicdrama:     'hd-epic-drama-hd',
  starcrime:     'hd-star-crime-hd',
  starchannel:   'hd-star-channel-hd',
  starlife:      'hd-star-life-hd',
  idxtra:        'hd-id-xtra-hd',
  tlc:           'tlc',
  travelchannel: 'hd-travel-channel-hd',
  discovery:     'hd-discovery-channel-hd',
  natgeo:        'hd-nat-geo-hd',
  natgeowild:    'hd-nat-geo-wild-hd',
  viasatexplore: 'hd-viasat-explore-hd',
  foodnetwork:   'hd-food-network-hd',
  kitchen24:     'hd-24-kitchen-hd',
  // Kids
  cartoon:       'cartoon-network',
  disney:        'disney-channel',
  nickjr:        'nick-jr',
  nickelodeon:   'nickelodeon',
  nicktoons:     'nicktoons',
  ekids:         'e-kids',
  // Music / Folk
  planeta:       'hd-planeta-hd',
  planetafolk:   'planeta-folk',
  thevoice:      'the-voice',
  folklortv:     'folklor-tv',
  // Regional / Other
  citytv:        'city-tv',
  fashiontv:     'hd-code-fashion-tv-hd',
  rodinatv:      'rodina-tv',
  tiankov:       'tiankov-tv',
  traveltv:      'travel-tv',
  vtk:           'vtk',
};

const ALLOWED_HOSTS = ['glebul.com', 'kupuvamsamo.online'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const REFERER = 'https://www.seirsanduk.online/';
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Range', 'Access-Control-Expose-Headers': 'Content-Length, Content-Range' };

const enc = (s: string) => btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = (s: string) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); return atob(s + '==='.slice((s.length + 3) % 4)); };
const allowed = (u: string) => { try { const h = new URL(u).hostname; return ALLOWED_HOSTS.some((d) => h === d || h.endsWith('.' + d)); } catch { return false; } };

async function getStreamUrl(slug: string): Promise<string | null> {
  const r = await fetch(`https://www.seirsanduk.online/?player=11&id=${slug}&pass=`, { headers: { 'User-Agent': UA, 'Referer': REFERER, 'Accept': 'text/html,*/*' } });
  const html = await r.text();
  const m = html.match(/https?:\/\/[^"'\s\\]+\.m3u8\?[^"'\s\\]*e=[^"'\s\\]*/) || html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  if (!m) return null;
  let u = m[0];
  // ro.glebul.com заблокирован для датацентров: токены совместимы с mx86
  const ro = u.match(/ro\.glebul\.com\/hls\/([^/]+)\/index\.m3u8(.*)/);
  if (ro) u = `https://mx86.glebul.com/hlsfhd/${ro[1]}.m3u8${ro[2]}`;
  return u;
}

async function playlist(target: string, origin: string): Promise<Response> {
  const r = await fetch(target, { headers: { 'User-Agent': UA, 'Referer': REFERER } });
  if (!r.ok) return new Response('upstream ' + r.status, { status: 502, headers: CORS });
  const base = target.substring(0, target.lastIndexOf('/') + 1);
  const body = (await r.text()).split('\n').map((line) => {
    const t = line.trim();
    if (!t || t.startsWith('#')) return line;
    const abs = t.startsWith('http') ? t : base + t;
    return /\.m3u8(\?|$)/.test(abs) ? `${origin}/pl/${enc(abs)}` : `${origin}/seg/${enc(abs)}.ts`;
  }).join('\n');
  return new Response(body, { headers: { ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' } });
}

async function segment(target: string, req: Request): Promise<Response> {
  const h: Record<string, string> = { 'User-Agent': UA, 'Referer': REFERER };
  const range = req.headers.get('range');
  if (range) h['Range'] = range;
  const r = await fetch(target, { headers: h });
  const out = new Headers(CORS);
  out.set('Content-Type', r.headers.get('content-type') || 'video/mp2t');
  out.set('Accept-Ranges', 'bytes');
  for (const k of ['content-length', 'content-range', 'etag', 'last-modified']) { const v = r.headers.get(k); if (v) out.set(k, v); }
  out.set('Cache-Control', 'public, max-age=300');
  return new Response(r.body, { status: r.status, headers: out });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const origin = url.origin;
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  try {
    if (url.pathname.startsWith('/hls/')) {
      const slug = CHANNELS[url.pathname.slice(5).replace(/\.m3u8$/, '')];
      if (!slug) return new Response('unknown channel', { status: 404, headers: CORS });
      const s = await getStreamUrl(slug);
      return s ? await playlist(s, origin) : new Response('no_url', { status: 502, headers: CORS });
    }
    if (url.pathname.startsWith('/pl/') || url.pathname.startsWith('/seg/')) {
      const isSeg = url.pathname.startsWith('/seg/');
      const target = dec(url.pathname.slice(isSeg ? 5 : 4).replace(/\.ts$/, ''));
      if (!allowed(target)) return new Response('forbidden host', { status: 403, headers: CORS });
      return isSeg ? await segment(target, req) : await playlist(target, origin);
    }
    if (url.pathname === '/version') return new Response(JSON.stringify({ relay: 'bulgaria-hls-v1', channels: Object.keys(CHANNELS).length }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    return new Response('Bulgaria TV relay', { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), { status: 502, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
});
