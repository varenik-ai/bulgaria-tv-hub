# HLS-ретранслятор для трансляции на ТВ

Телевизор по AirPlay/Cast сам скачивает поток. Из российской домашней сети (замер с провайдера) большие файлы с OVH/Scaleway
(`glebul.com`) и с доменов Cloudflare (`*.workers.dev`, обычные сайты на Cloudflare) зависают после ~16 КБ, а с GitHub Pages (Fastly),
AWS CloudFront, Azure CDN, Deno Deploy, Heroku идут нормально. Ретранслятор нужно разместить на таком хостинге.

## Развёртывание на Deno Deploy (бесплатный тариф)
1. `cd relay && deno deploy` (откроется браузер для входа через GitHub, создайте проект, например `bulgaria-relay`).
2. После деплоя проверьте с домашней сети без VPN: `curl --interface <интерфейс> -r 0-2999999 -o /dev/null -w '%{size_download} %{time_total}\n' <адрес>/seg/...` (любой сегмент из `<адрес>/hls/btv.m3u8`).
3. Впишите адрес в `RELAY_URL` в `index.html`, поднимите версию.

## Маршруты
`/hls/<id канала>.m3u8`, `/pl/<b64>`, `/seg/<b64>.ts` (поддерживает Range), `/version`.
