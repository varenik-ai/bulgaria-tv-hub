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

## Что добавлено по эталону v1.3 (Bulgaria v9)
- Сетка в 2 колонки, синяя кнопка «Каналы» первой в панели, кнопка 📲 AirPlay (только iOS, если WebView отдаёт AirPlay API), выбор качества ⚙ (hls.js, `localStorage rtv_quality`).
- Повторные подключения только через `_scheduleInit` (backoff до 30 с, после 6 неудач «Канал временно недоступен»); после 2 неудач `init()` просит у воркера запасной путь `&proxy=1`.
- Режим CORS-only: `/stream` отдаёт прямую ссылку на CDN glebul.com (все 38 каналов отдают `Access-Control-Allow-Origin: *`), `/proxy` оставлен как запасной и пускает только разрешённые хосты.
- Android: `audio-bg` играет `SILENT_WAV`, второй hls.js не поднимается. Авторефреш токена удалён.
- **Сторож зависания** (`setInterval` 5 с): реконнект, если нет прогресса кадров 9 с, нет буфера 12 с, либо `currentTime` стоит 18 с (30 с до первого кадра, `START_GRACE_MS`); сначала дешёвый перескок разрыва `_tryNudgeGap()`. Реконнект только через `_watchdogReconnect`.
- **Звук после реконнекта:** `_soundWanted` ставится кнопкой «Включить звук», `_restoreSound()` вызывается после `play()`; если браузер не дал звук без жеста — через 1,5 с возврат в режим без звука. Смена канала сбрасывает флаг.
- Пока не перенесено: нативное качество iOS (`/stream-q`), профилактический реконнект (нужен только каналам cinerama.uz, у Bulgaria таких нет).
