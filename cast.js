// Google Cast (Chromium) для Bulgaria TV. Только вне Telegram: WebView Telegram не умеет Cast (см. ETALON.md).
// Default Media Receiver, ТВ сам качает поток по прямой ссылке (CORS есть у плейлиста и сегментов источника).
(function () {
  var B = window.__btv;
  if (!B || B.inTG || !window.chrome) return;
  var btn = document.getElementById('cast-btn');
  if (!btn) return;
  var debug = /[?&]castdebug=1/.test(location.search), dbg = null, ctx = null;

  function log(msg) {
    if (!debug) return;
    if (!dbg) {
      dbg = document.createElement('div');
      dbg.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:99999;background:#000c;color:#0f0;font:11px monospace;padding:6px 8px;border-radius:6px;max-width:90vw;white-space:pre-wrap';
      document.body.appendChild(dbg);
    }
    dbg.textContent = msg + '\nRemotePlayback: ' + (('remote' in HTMLMediaElement.prototype) ? 'yes' : 'no');
  }

  window.__onGCastApiAvailable = function (ok) { if (ok) init(); else log('cast sdk unavailable'); };
  function loadSdk() {
    var s = document.createElement('script');
    s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    document.head.appendChild(s);
  }
  if (document.readyState === 'complete') loadSdk(); else window.addEventListener('load', loadSdk);

  function init() {
    ctx = cast.framework.CastContext.getInstance();
    ctx.setOptions({
      receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
      autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });
    ctx.addEventListener(cast.framework.CastContextEventType.CAST_STATE_CHANGED, onState);
    ctx.addEventListener(cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSession);
    btn.onclick = function () { ctx.requestSession().catch(function () {}); };
    onState();
  }

  function onState() {
    var st = ctx.getCastState();
    btn.style.display = st === cast.framework.CastState.NO_DEVICES_AVAILABLE ? 'none' : '';
    btn.textContent = st === cast.framework.CastState.CONNECTED ? '📡 ✓' : '📡 Cast';
    log('castState: ' + st);
  }

  function onSession(e) {
    var S = cast.framework.SessionState;
    if (e.sessionState === S.SESSION_STARTED || e.sessionState === S.SESSION_RESUMED) start();
    else if (e.sessionState === S.SESSION_ENDED) stop();
  }

  function sendMedia() {
    var session = ctx && ctx.getCurrentSession(), ch = B.getCh(), url = B.getUrl();
    if (!session || !ch || !url) return;
    var mi = new chrome.cast.media.MediaInfo(url, 'application/x-mpegURL');
    mi.streamType = chrome.cast.media.StreamType.LIVE;
    var md = new chrome.cast.media.GenericMediaMetadata();
    md.title = ch.name;
    if (ch.logo) md.images = [new chrome.cast.Image(new URL(ch.logo, location.href).href)];
    mi.metadata = md;
    var req = new chrome.cast.media.LoadRequest(mi);
    req.autoplay = true;
    session.loadMedia(req).then(function () { log('loadMedia ok: ' + ch.id); }, function (err) { log('loadMedia error: ' + err); });
  }

  // Пока идёт трансляция, локальное видео стоит: play() подменён заглушкой (сторож и плеер сами его запускают)
  function start() {
    window.__castActive = true;
    B.stop();
    B.video.play = function () { return Promise.resolve(); };
    sendMedia();
  }
  function stop() {
    window.__castActive = false;
    delete B.video.play;
    B.restart();
  }

  // Смена канала во время трансляции: index.html вызывает это из loadStream
  window.__castOnStream = function () { if (window.__castActive) sendMedia(); };
})();
