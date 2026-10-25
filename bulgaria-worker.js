const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
};

// Хосты, которые разрешено проксировать (иначе /proxy — открытый прокси)
const ALLOWED_HOSTS = ['glebul.com', 'kupuvamsamo.online'];
function isAllowedHost(u) {
  try {
    const h = new URL(u).hostname;
    return ALLOWED_HOSTS.some(d => h === d || h.endsWith('.' + d));
  } catch (e) { return false; }
}

const WORKER_BASE = 'https://bulgaria-worker.dyaltd.workers.dev';

// seirsanduk.online channel slugs → glebul.com HLS path
const CHANNELS = {
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

async function getStreamUrl(slug) {
  const pageUrl = `https://www.seirsanduk.online/?player=11&id=${slug}&pass=`;
  const r = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.seirsanduk.online/',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    },
    cf: { cacheEverything: false },
    redirect: 'follow',
  });
  const html = await r.text();
  // Найти любой m3u8 URL с токеном (e= параметр) — охватывает glebul.com, kupuvamsamo.online и др.
  // Предпочитаем URL с e= (токен), иначе берём любой m3u8
  const withToken = html.match(/https?:\/\/[^"'\s\\]+\.m3u8\?[^"'\s\\]*e=[^"'\s\\]*/);
  const anyM3u8 = html.match(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/);
  const m = withToken || anyM3u8;
  if (!m) return null;
  let streamUrl = m[0];
  // ro.glebul.com заблокирован для Cloudflare IP — конвертируем в mx86.glebul.com
  // Токены совместимы между CDN: e= и hash= работают на mx86
  // ro.glebul.com/hls/{slug}/index.m3u8?params → mx86.glebul.com/hlsfhd/{slug}.m3u8?params
  if (streamUrl.includes('ro.glebul.com')) {
    const roMatch = streamUrl.match(/ro\.glebul\.com\/hls\/([^/]+)\/index\.m3u8(.*)/);
    if (roMatch) {
      streamUrl = `https://mx86.glebul.com/hlsfhd/${roMatch[1]}.m3u8${roMatch[2]}`;
    }
  }
  return streamUrl;
}

// Проксирует плейлист/сегмент источника; в m3u8 переписывает адреса на воркер (нужно ТВ по AirPlay: телевизор сам ходит за потоком)
async function proxyFetch(targetUrl, opts) {
  opts = opts || {};
  const referer = 'https://www.seirsanduk.online/';
  try {
    const r = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer':    referer,
        'Origin':     new URL(referer).origin,
      },
      cf: { cacheEverything: false },
    });
    const hdrs = new Headers(CORS);
    hdrs.set('Cache-Control', 'no-store');
    const ct = r.headers.get('content-type') || '';
    const isM3u8 = targetUrl.includes('.m3u8') || ct.includes('mpegurl');
    if (isM3u8 && r.ok) {
      const m3u8 = await r.text();
      const baseDir = targetUrl.substring(0, targetUrl.lastIndexOf('/') + 1);
      const rewritten = m3u8.split('\n').map(line => {
        const t = line.trim();
        if (!t || t.startsWith('#')) return line;
        const abs = t.startsWith('http') ? t : baseDir + t;
        // opts.segDirect: плейлисты идут через воркер, сегменты — прямыми ссылками на источник (как в эталоне)
        if (opts.segDirect && !/\.m3u8(\?|$)/.test(abs)) return abs;
        return WORKER_BASE + '/proxy?url=' + encodeURIComponent(abs) + (opts.segDirect ? '&seg=direct' : '');
      }).join('\n');
      hdrs.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, { status: r.status, headers: hdrs });
    }
    const body = await r.arrayBuffer();
    hdrs.set('Content-Type', ct || 'video/mp2t');
    return new Response(body, { status: r.status, headers: hdrs });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // /stream?channel=X — get signed glebul.com URL, return it directly to browser
    if (url.pathname === '/stream') {
      const ch = url.searchParams.get('channel');
      const slug = CHANNELS[ch];
      if (!slug) return new Response(JSON.stringify({ error: 'unknown channel' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
      try {
        const streamUrl = await getStreamUrl(slug);
        if (!streamUrl)
          return new Response(JSON.stringify({ error: 'no_url' }), {
            status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
          });
        // ?native=1 — для нативного плеера iOS и AirPlay: воркер сам отдаёт m3u8 (и сегменты через /proxy), телевизору нужен только адрес воркера
        if (url.searchParams.get('native') === '1') return proxyFetch(streamUrl);
        // CDN источника отдаёт CORS (Access-Control-Allow-Origin: *) — отдаём прямую ссылку, плеер грузит сегменты сам.
        // ?proxy=1 — запасной путь через воркер (если прямой не открылся).
        const out = url.searchParams.get('proxy') === '1'
          ? WORKER_BASE + '/proxy?url=' + encodeURIComponent(streamUrl)
          : streamUrl;
        return new Response(JSON.stringify({ url: out }), {
          headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // /proxy?url=X — proxy m3u8/ts with CORS headers, rewrite segment URLs
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      const referer = 'https://www.seirsanduk.online/';
      if (!targetUrl) return new Response('No URL', { status: 400, headers: CORS });
      if (!isAllowedHost(targetUrl)) return new Response('Forbidden host', { status: 403, headers: CORS });
      return proxyFetch(targetUrl, { segDirect: url.searchParams.get('seg') === 'direct' });
    }

    // /airtest?channel=X&mode=... — диагностика AirPlay на ТВ: разные варианты одного потока (см. airtest.html)
    if (url.pathname === '/airtest') {
      const slug = CHANNELS[url.searchParams.get('channel')];
      const mode = url.searchParams.get('mode') || 'proxy';
      if (!slug) return new Response('unknown channel', { status: 404, headers: CORS });
      const streamUrl = await getStreamUrl(slug);
      if (!streamUrl) return new Response('no_url', { status: 502, headers: CORS });
      if (mode === 'proxy') return proxyFetch(streamUrl);
      if (mode === 'segdirect') return proxyFetch(streamUrl, { segDirect: true });
      const H = { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.seirsanduk.online/' };
      const master = await (await fetch(streamUrl, { headers: H })).text();
      const base = streamUrl.substring(0, streamUrl.lastIndexOf('/') + 1);
      const abs = u => (u.startsWith('http') ? u : base + u);
      const INFO = { mid: ['avc1.64001f,mp4a.40.2', '960x540'], hd720: ['avc1.64001f,mp4a.40.2', '1280x720'], hd1080: ['avc1.640028,mp4a.40.2', '1920x1080'] };
      if (mode === 'codecs') {
        const out = master.split('\n').map(line => {
          const t = line.trim();
          if (t.startsWith('#EXT-X-STREAM-INF')) {
            const bw = (t.match(/BANDWIDTH=(\d+)/) || [])[1];
            const key = bw === '1024000' ? 'mid' : bw === '2048000' ? 'hd720' : 'hd1080';
            return t + ',CODECS="' + INFO[key][0] + '",RESOLUTION=' + INFO[key][1];
          }
          if (!t || t.startsWith('#')) return line;
          return WORKER_BASE + '/proxy?url=' + encodeURIComponent(abs(t)) + '&seg=direct';
        }).join('\n');
        return new Response(out, { headers: { ...CORS, 'Content-Type': 'application/vnd.apple.mpegurl', 'Cache-Control': 'no-store' } });
      }
      if (mode === 'single720' || mode === 'single720proxy') {
        const sub = master.split('\n').map(l => l.trim()).find(l => l && !l.startsWith('#') && l.indexOf('hd720') >= 0);
        if (!sub) return new Response('no 720 variant', { status: 404, headers: CORS });
        return proxyFetch(abs(sub), { segDirect: mode === 'single720' });
      }
      return new Response('bad mode', { status: 400, headers: CORS });
    }

    if (url.pathname === '/version') {
      return new Response(JSON.stringify({ version: 'glebul-v9-airtest', channels: Object.keys(CHANNELS) }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  }
};
