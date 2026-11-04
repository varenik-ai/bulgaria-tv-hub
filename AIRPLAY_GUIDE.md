# Трансляция с iPhone на ТВ (AirPlay) для другого канала

Результат: зритель запускает эфир на телевизоре, выключает экран телефона, а видео продолжает идти. Без зеркалирования, без VPN на ТВ и без включённого компьютера.
Эталон реализации: репозиторий `bulgaria-tv-hub` (`index.html`, версия v21).

## Где кнопка работает
Кнопка действует по возможностям самого WebView, а не по «правилу Telegram»:

| Откуда нажали | Что происходит |
|---|---|
| iPhone, WebView отдаёт AirPlay API (`hasAir`) | трансляция в два нажатия прямо в мини-аппе |
| iPhone, API нет | кнопка открывает страницу канала в браузере: трансляцию запускай там |
| Android в Telegram | Cast из WebView недоступен: отдельная кнопка «📺 На ТВ» открывает страницу канала в Chrome |

Эталоны: Bulgaria TV (`index.html`, v21) и russia-tv-hub (v82.49). В обоих на iPhone кнопка запускает AirPlay внутри мини-аппа.
**Не копируй чужое утверждение «в Telegram видео по AirPlay не уходит»:** оно из `CAST_GUIDE.md` и у нас не подтвердилось. Раньше трансляция не шла из-за сети (шаг 1) и сторожа (шаг 5).

## Как работает трансляция
Телефон передаёт телевизору только адрес потока, дальше ТВ скачивает видео сам, по своей сети и без VPN телефона. Отсюда два требования:
1. Поток должен быть доступен **из сети телевизора**.
2. Видео должно играть в нативном плеере, а не через hls.js: из `blob:` на ТВ уходит только звук.

## Шаг 1. Найти узел, доступный из сети ТВ
В России часть серверов замедляется: мелкие ответы проходят, а большие зависают примерно на 16 КБ. Поэтому плейлист может открываться, а видео нет.

Проверка с компьютера в той же домашней сети, мимо VPN (`en0` на Mac, сам VPN не отключай). Подставь адрес **сегмента `.ts`**, а не только плейлиста:
```bash
curl --interface en0 -s -m 12 -o /dev/null -w 'http=%{http_code} bytes=%{size_download} speed=%{speed_download}\n' -A 'AppleCoreMedia/1.0.0' 'АДРЕС_СЕГМЕНТА'
```
- Скачан весь файл (обычно сотни КБ или мегабайты): узел подходит.
- `bytes` около 16000 и низкая скорость: узел замедляется, ТВ с него не покажет.

| Узел (замер у одного домашнего провайдера) | Результат |
|---|---|
| `ro.glebul.com` | проходит |
| `cdn3`, `cdn11`, `mx86.glebul.com` | зависают |
| `*.workers.dev` | небольшие плейлисты проходят, сегменты зависают |

Результат зависит от провайдера и со временем может измениться. У другого источника проверяй его собственные узлы. Убедись также, что адрес работает без `Referer`, cookie и прочих заголовков: телевизор их не передаёт.

## Шаг 2. Адрес потока для ТВ (только если шаг 1 нашёл проблему)
Если узел, который отдаёт приложению поток, из сети ТВ проходит, **ничего подменять не нужно**: так сделано в russia-tv-hub, адрес потока там не менялся.

Если не проходит, а соседний узел проходит, подмени адрес только в режиме AirPlay. Пример для glebul (Bulgaria TV): токены `e=` и `hash=` подходят на всех его узлах.
```js
function tvUrl(u) {
  const m = u.match(/^https:\/\/[^/]+\.glebul\.com\/(?:hlsfhd\/([^/?]+)\.m3u8|hls\/([^/?]+)\/index\.m3u8)(\?.*)?$/);
  return m ? 'https://ro.glebul.com/hls/' + (m[1] || m[2]) + '/index.m3u8' + (m[3] || '') : u;
}
```
В `init()` подменяй адрес только при `_forceNative && isIOS()`. Запасной путь через воркер в этом режиме отключи: сегменты через него до ТВ не дойдут.
```js
const _tv = _forceNative && isIOS();
const viaProxy = _failStreak >= 2 && !_tv ? '&proxy=1' : '';
const r = await fetch(currentCh.stream + '&t=' + Date.now() + viaProxy, { cache:'no-store' });
const d = await r.json();
if (d.url) loadStream(_tv ? tvUrl(d.url) : d.url);
```

## Шаг 3. Кнопка в два нажатия
**Если в проекте уже есть кнопка, которая открывает сайт, найди её обработчик и замени целиком:** иначе старый обработчик останется и кнопка по-прежнему будет вести на сайт. Так было в russia-tv-hub (v82.48): блок `if (isIOS() || Android…)` с `tg.openLink` пришлось заменить блоком ниже, а для Android оставить прежний обработчик в ветке `else if`.

Выбор ТВ требует нативного плеера и жеста пользователя, поэтому первое нажатие переключает плеер, а второе открывает выбор устройства.

Разметка: `<button id="airplay-btn" class="btn" style="display:none">📲 AirPlay</button>`

Подставь `SITE_URL` и проверь, что страница открывает канал по адресу `#id`.
```js
let _forceNative = false;
if (isIOS()) {
  const hasAir = !!window.WebKitPlaybackTargetAvailabilityEvent && typeof video.webkitShowPlaybackTargetPicker === 'function';
  const isBlob = () => !video.currentSrc || /^blob:/.test(video.currentSrc);
  const airVis = () => { airBtn.style.display = currentCh ? 'block' : 'none'; };
  if (hasAir) {
    try { video.setAttribute('x-webkit-airplay', 'allow'); video.disableRemotePlayback = false; } catch (e) {}
    video.addEventListener('webkitplaybacktargetavailabilitychanged', (e) => { if (e.availability !== 'available' && !isBlob()) airBtn.style.display = 'none'; else airVis(); });
  }
  ['loadstart', 'playing'].forEach(ev => video.addEventListener(ev, airVis));
  airBtn.onclick = () => {
    // Заглушённое видео iOS не передаёт на ТВ: включаем звук прямо в жесте нажатия
    try { video.muted = false; video.volume = 1; userUnmuted = true; _soundWanted = true; unmuteBtn.textContent = '🔇 ' + t.mute; } catch (e) {}
    if (!hasAir) {
      const url = SITE_URL + (currentCh ? '#' + currentCh.id : '');
      const w = window.open(url, '_blank');
      if (!w) { try { tg.openLink(url, { try_instant_view: false }); } catch (e) {} }
      return;
    }
    if (isBlob()) {
      if (_forceNative) return;   // нативный плеер ещё запускается
      _forceNative = true; airBtn.textContent = t.airAgain; airBtn.classList.add('air-next'); stopStream(); init(); return;
    }
    airBtn.textContent = '📲 AirPlay'; airBtn.classList.remove('air-next');
    try { video.webkitShowPlaybackTargetPicker(); } catch (e) {}
  };
}
```
Стиль второго шага:
```css
.btn.air-next { flex:1 0 100%; max-width:none; background:#D62612; font-weight:600; }
```
Подпись первого шага на iPhone: «📲 AirPlay». Если подпись кнопки задаётся при запуске (например `airBtn.textContent = t.castTv`), перезапиши её внутри блока iOS. Текст второго шага добавь в словарь `T` для **всех** языков, например: `airAgain:'📲 Нажмите ещё раз, чтобы выбрать ТВ'`. Символ «▶» вместо текста зрителю непонятен.

## Шаг 4. Нативный плеер в `loadStream`
Звук должен остаться включённым, а hls.js в этом режиме не используется:
```js
video.muted = !(_forceNative && _soundWanted);
const _native = _forceNative && isIOS() && !!video.canPlayType('application/vnd.apple.mpegurl');
if (Hls.isSupported() && !_native) {
  // обычный путь через hls.js
} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
  video.src = streamUrl;
  video.play();
}
```

## Шаг 5. Обязательно: отключить сторож на время AirPlay
Если в плеере есть сторож зависания по счётчику кадров, без этой правки на ТВ будет «10 секунд показа, 10 секунд загрузки». Кадры показывает телевизор, счётчик на телефоне стоит, и сторож перезапускает поток.
```js
const _onTv = () => !!video.webkitCurrentPlaybackTargetIsWireless;
video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', () => { _lastProgressTime = _lastFrameProgressTime = Date.now(); });
setInterval(() => {
  if (window.__castActive || _onTv()) return;
  // дальше проверки сторожа без изменений
}, 5000);
```
То же в обработчике `visibilitychange`: не перезапускай поток при включении экрана, пока видео на ТВ.
```js
} else if (!userPaused && video.readyState < 2 && !video.webkitCurrentPlaybackTargetIsWireless) {
  if (currentCh) { stopStream(); init(); }
}
```

## Как проверить
1. Открой страницу в **Safari** на iPhone. Телефон и ТВ должны быть в одном Wi-Fi.
2. Выбери канал и нажми «📲 AirPlay»: канал перезапустится, появится красная кнопка.
3. Дождись видео, нажми красную кнопку и выбери ТВ.
4. Когда картинка появится на ТВ, выключи экран телефона и посмотри 3–5 минут.
5. Включи экран и убедись, что трансляция не сбилась.

## Типичные ошибки
| Что видно | Причина | Что делать |
|---|---|---|
| Кнопка открывает сайт | остался старый обработчик, который открывает сайт, или у WebView нет AirPlay API | замени старый блок целиком (шаг 3); если API нет, трансляцию запускай на открывшейся странице |
| На открывшемся сайте трансляция не работает | на сайте нет кода из шагов 3–5 | добавь код на эту страницу, проверь номер версии |
| Страница открылась не в Safari | так настроено открытие ссылок | скопируй адрес и открой в Safari |
| На ТВ только звук | видео из `blob:` (hls.js), заглушено или ТВ не может скачать видео | шаги 1, 3 и 4 |
| ТВ долго загружает и отваливается | узел замедляется в сети ТВ | найди другой узел (шаги 1 и 2) |
| Видео остаётся на телефоне | видео заглушено (`muted`) | включай звук в обработчике нажатия (шаг 3) |
| 10 секунд показа, 10 секунд загрузки | сторож перезапускает поток | шаг 5 |
| Первое нажатие не открывает выбор ТВ | так задумано | нажми второй раз, когда запустится видео |
| Второе нажатие не срабатывает | нативный плеер ещё запускается | нажми ещё раз через секунду |
| В компьютерном Chrome после первого нажатия «ошибка» | Chrome не играет нативный HLS | проверяй на iPhone в Safari или в Telegram |
| SD-каналы не на весь экран | поток 720×576 с пометкой 16:9, ТВ показывает его не на весь экран | см. ниже |

## Известные ограничения
- **SD-каналы:** на Samsung не растягиваются на весь экран. Настройка на ТВ заблокирована на 16:9, подсказка `RESOLUTION` в плейлисте не помогает. Остаётся только перекодирование на своём сервере.
- **Другие сети:** доступность узлов замерена только у одного домашнего провайдера в Москве.
- **Зависимость от источника:** узел могут изменить или закрыть. Тогда снова понадобится шаг 1 или ретранслятор из папки `relay/`.

## Что проверено
| Сценарий | Статус |
|---|---|
| Bulgaria TV: видео на Samsung без пауз, экран телефона выключен | подтверждено пользователем на настоящем ТВ; из Safari или из мини-аппа он запускал, я не выяснял |
| Bulgaria TV: подпись второго шага | имитация iPhone в браузере |
| russia-tv-hub v82.49: два нажатия, нет API, Android, компьютер, сторож | имитация iPhone, Android и компьютера в браузере |
| russia-tv-hub v82.49 на настоящем iPhone и ТВ | не проверялось |
| Видео по AirPlay из WebView Telegram на iPhone | не проверялось отдельно: в Bulgaria TV кнопка работает внутри мини-аппа, но источник запуска не зафиксирован |
| Google Cast (Android, компьютер) | код подключён в Bulgaria TV, на устройстве не проверялся |
| Apple TV, LG, Sony | не проверялось |
