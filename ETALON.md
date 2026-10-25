# Bulgaria TV Hub — Эталон v1.0

## Что работает
- Hub экран + Player экран
- Fullscreen: Android container.requestFullscreen(), iOS video.webkitEnterFullscreen()
- После выхода из fullscreen iOS: stopStream() + init()
- Фоновый звук Android: audio-bg (muted=true, играет для сессии)
- Фоновый звук iOS: Media Session API
- Auto-fullscreen при запуске: tg.requestFullscreen() только на мобильных
- Safe area: --tg-safe-top через Telegram.WebApp.safeAreaInsets
- Unmute toggle: userUnmuted флаг, enforceMute синхронно в play event
- PiP: только PC (requestPictureInPicture), скрыт на iOS/Android
- Кнопка Каналы: Telegram.WebApp.close()
- Адаптивный поток: index.m3u8 (576p-1080p)
- isIOS(): включает Telegram.WebApp.platform === "ios"

## Критичные правила
- video вне overlay (не гаснет при auto-hide)
- НЕ вызывать Telegram.WebApp.requestFullscreen() И container.requestFullscreen() одновременно
- .ts для iOS — напрямую (UA: applecoremedia/cfnetwork/darwin)
- .ts для Android — через Vercel (CORS блокирует прямой доступ)
- userUnmuted=false сбрасывается в начале loadStream
- video.muted=true перед play() в MANIFEST_PARSED

## Структура каналов
```js
{ id, name, desc, icon, iconBg, logo(опц), stream, proxy }
```

## Прокси
- bulgaria-worker.dyaltd.workers.dev (Cloudflare Worker, ~/bulgaria-worker)

## Секреты и деплой
- Токен бота НЕ хранится в репозитории: `wrangler secret put TOKEN` (+ `ADMIN_ID`, `SETUP_KEY`).
- Деплой: `cp bulgaria-worker.js ~/bulgaria-worker/src/index.js && npx wrangler deploy` (то же для bulgaria-bot-worker).
- Deep-link: `#btv` или `t.me/BulgariaTV_Live_bot/bulgariatv_live_bot?startapp=btv`.
