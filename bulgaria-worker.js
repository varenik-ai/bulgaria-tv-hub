const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
};

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
        // Proxy through Worker so browser gets CORS headers
        const proxyUrl = WORKER_BASE + '/proxy?url=' + encodeURIComponent(streamUrl);
        return new Response(JSON.stringify({ url: proxyUrl }), {
          headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // /stream-host?channel=X — diagnostic: shows resolved host and CF fetch result
    if (url.pathname === '/stream-host') {
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
        const parsed = new URL(streamUrl);
        const testR = await fetch(streamUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.seirsanduk.online/' },
          cf: { cacheEverything: false },
        });
        const testBody = await testR.text();
        return new Response(JSON.stringify({
          host: parsed.hostname,
          path: parsed.pathname,
          cfStatus: testR.status,
          cfOk: testR.ok,
          bodyLines: testBody.split('\n').slice(0, 5),
        }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // /proxy?url=X — proxy m3u8/ts with CORS headers, rewrite segment URLs
    if (url.pathname === '/proxy') {
      const targetUrl = url.searchParams.get('url');
      const referer = url.searchParams.get('ref') || 'https://www.seirsanduk.online/';
      if (!targetUrl) return new Response('No URL', { status: 400, headers: CORS });
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
            return WORKER_BASE + '/proxy?url=' + encodeURIComponent(abs);
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

    // /debug?url=X — fetch any URL, return status + body preview
    if (url.pathname === '/debug') {
      const targetUrl = url.searchParams.get('url');
      const referer = url.searchParams.get('referer') || 'https://www.seirsanduk.online/';
      if (!targetUrl) return new Response('No URL', { status: 400, headers: CORS });
      try {
        const r = await fetch(targetUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': referer },
          cf: { cacheEverything: false },
        });
        const text = await r.text();
        return new Response(JSON.stringify({
          status: r.status,
          contentType: r.headers.get('content-type'),
          body: text.slice(0, 500),
        }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 502, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    // /search?channel=X — показывает что именно нашли в HTML seirsanduk.online
    if (url.pathname === '/search') {
      const ch = url.searchParams.get('channel');
      const slug = CHANNELS[ch];
      if (!slug) return new Response(JSON.stringify({ error: 'unknown channel' }), {
        status: 404, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
      const pageUrl = `https://www.seirsanduk.online/?player=11&id=${slug}&pass=`;
      try {
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
        const m = html.match(/https?:\/\/[^"'\s\\]*glebul\.com[^"'\s\\]*\.m3u8[^"'\s\\]*/);
        // Все m3u8 URL любого домена
        const allM3u8 = [...html.matchAll(/https?:\/\/[^"'\s\\]+\.m3u8[^"'\s\\]*/g)].map(x => x[0]).slice(0, 5);
        // iframe src
        const iframes = [...html.matchAll(/iframe[^>]*src=["']([^"']+)["']/gi)].map(x => x[1]).slice(0, 5);
        // script src содержащие 'stream' или 'player' или 'embed'
        const scripts = [...html.matchAll(/src=["']([^"']*(?:stream|player|embed|glebul)[^"']*)["']/gi)].map(x => x[1]).slice(0, 5);
        // Найдём фрагмент вокруг glebul если есть
        const idx = html.indexOf('glebul');
        const context = idx >= 0 ? html.slice(Math.max(0, idx - 50), idx + 200) : null;
        return new Response(JSON.stringify({
          httpStatus: r.status,
          finalUrl: r.url,
          htmlLength: html.length,
          glebulFound: !!m,
          glebulUrl: m ? m[0] : null,
          glebulContext: context,
          allM3u8,
          iframes,
          scripts,
        }), { headers: { ...CORS, 'Content-Type': 'application/json' } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), {
          status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
        });
      }
    }

    if (url.pathname === '/version') {
      return new Response(JSON.stringify({ version: 'glebul-v6-multicdn', channels: Object.keys(CHANNELS) }), {
        headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not found', { status: 404, headers: CORS });
  }
};
