// bulgaria-bot-worker.js — Cloudflare Worker, обрабатывает Telegram webhook вместо nohup node bot.js.
// Работает 24/7 на инфраструктуре Cloudflare, полностью независимо от локального компьютера.
// Токен бота — секрет воркера: npx wrangler secret put TOKEN (в коде не хранить!)
// Также секреты: ADMIN_ID (Telegram user id админа), SETUP_KEY (для /set-webhook?key=...)
// Деплой: cd ~/bulgaria-bot-worker && cp ~/bulgaria-tv-hub/bulgaria-bot-worker.js src/index.js && npx wrangler deploy
// После деплоя один раз зарегистрировать webhook: открыть https://bulgaria-bot-worker.dyaltd.workers.dev/set-webhook

const CHANNEL = '@BulgariaTV_Live';
const APP_URL = 'https://t.me/BulgariaTV_Live_bot/bulgariatv_live_bot';
const WEB_URL = 'https://varenik-ai.github.io/bulgaria-tv-hub/?v=8';

const greetings = {
  bg: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Здравей, ${name}! 👋
*Цялата българска телевизия — с един тап.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ канала на живо
🆓 Безплатно, без регистрация
🎧 Звук на заден план, PiP, цял екран

👇 _Натисни бутона и си в ефир_`,

  ru: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Привет, ${name}! 👋
*Всё болгарское ТВ — в один тап.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ каналов в прямом эфире
🆓 Бесплатно, без регистрации
🎧 Звук в фоне, PiP, полный экран

👇 _Жми кнопку — и ты в эфире_`,

  en: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Hey, ${name}! 👋
*All Bulgarian TV — one tap away.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ live channels
🆓 Free, no sign-up
🎧 Background audio, PiP, fullscreen

👇 _Hit the button and you're on air_`,

  uk: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Привіт, ${name}! 👋
*Все болгарське ТБ — в один дотик.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ каналів наживо
🆓 Безкоштовно, без реєстрації
🎧 Звук у фоні, PiP, повний екран

👇 _Тисни кнопку — і ти в ефірі_`,

  de: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Hey, ${name}! 👋
*Das ganze bulgarische TV — ein Tipp entfernt.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ Sender live
🆓 Kostenlos, ohne Anmeldung
🎧 Hintergrundton, PiP, Vollbild

👇 _Button drücken und los geht's_`,

  fr: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Salut, ${name}! 👋
*Toute la télé bulgare — en un tap.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ chaînes en direct
🆓 Gratuit, sans inscription
🎧 Audio en arrière-plan, PiP, plein écran

👇 _Appuie sur le bouton, c'est parti_`,

  es: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

¡Hola, ${name}! 👋
*Toda la tele búlgara — a un toque.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ canales en directo
🆓 Gratis y sin registro
🎧 Audio en segundo plano, PiP, pantalla completa

👇 _Pulsa el botón y ya estás en vivo_`,

  tr: (name) => `🇧🇬 *БЪЛГАРИЯ·ТВ*

Selam, ${name}! 👋
*Tüm Bulgar TV — tek dokunuşla.*

bTV · Nova · БНТ · Diema · Eurosport · Disney · Discovery…

⚡ 60+ canlı kanal
🆓 Ücretsiz, kayıt yok
🎧 Arka planda ses, PiP, tam ekran

👇 _Butona dokun, yayındasın_`,

};

const btnWatch = {
  bg: '▶️ Гледай на живо',
  ru: '▶️ Смотреть эфир',
  en: '▶️ Watch live',
  uk: '▶️ Дивитись наживо',
  de: '▶️ Live ansehen',
  fr: '▶️ Regarder en direct',
  es: '▶️ Ver en directo',
  tr: '▶️ Canlı izle',
};

const btnBrowser = {
  bg: '🌐 В браузър',
  ru: '🌐 В браузере',
  en: '🌐 In browser',
  uk: '🌐 У браузері',
  de: '🌐 Im Browser',
  fr: '🌐 Navigateur',
  es: '🌐 En el navegador',
  tr: '🌐 Tarayıcıda',
};

const btnChannel = {
  bg: '📣 Канал',
  ru: '📣 Канал',
  en: '📣 Channel',
  uk: '📣 Канал',
  de: '📣 Kanal',
  fr: '📣 Chaîne',
  es: '📣 Canal',
  tr: '📣 Kanal',
};

const POST_TEXT = `🇧🇬 *BULGARIAN TV LIVE — 60+ КАНАЛА НА ЖИВО* 🔴

Гледайте всички водещи *български телевизионни канали* директно в Telegram — *безплатно, без регистрация, 24/7.*

━━━━━━━━━━━━━━━━━━━━
📡 *НОВИНИ И ОБЩИ*
▪️ bTV · Nova TV · БНТ 1 · БНТ 2 · БНТ 3 · БНТ 4
▪️ Bulgaria On Air · Nova News · Канал 3
▪️ Euronews · Bloomberg TV · СКАТ · Евроком

⚽ *СПОРТ*
▪️ Nova Sport · Diema Sport 1/2/3
▪️ Max Sport 1/2/3/4 · Eurosport 1/2

🎬 *ФИЛМИ И РАЗВЛЕЧЕНИЯ*
▪️ Kino Nova · Diema · Diema Family · Ring BG
▪️ bTV Cinema · bTV Action · bTV Comedy · bTV Story
▪️ AXN · Star Channel · Epic Drama · TLC
▪️ Discovery · Nat Geo · Viasat Explore

👶 *ДЕТСКИ*
▪️ Cartoon Network · Disney Channel
▪️ Nickelodeon · Nick Jr · E Kids

🎵 *МУЗИКА*
▪️ Планета HD · Планета Фолк · The Voice · Folklor TV
━━━━━━━━━━━━━━━━━━━━

✅ HD качество
✅ iOS · Android · Desktop

👇 *Натиснете бутона, изберете канал и гледайте:*`;

export default {
  fetch(request, env) { return handleRequest(request, env); },
};

async function tg(env, method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${env.TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function handleRequest(request, env) {
  const url = new URL(request.url);

  // Служебные маршруты — только с ключом: ?key=<SETUP_KEY> (wrangler secret put SETUP_KEY)
  const isSetup = url.pathname === '/set-webhook' || url.pathname === '/webhook-info';
  if (isSetup && (!env.SETUP_KEY || url.searchParams.get('key') !== env.SETUP_KEY)) {
    return new Response('forbidden', { status: 403 });
  }
  if (url.pathname === '/set-webhook') {
    const r = await tg(env, 'setWebhook', { url: url.origin });
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
  }
  if (url.pathname === '/webhook-info') {
    const r = await tg(env, 'getWebhookInfo', {});
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method !== 'POST') {
    return new Response('Bulgaria TV Bot Worker OK');
  }

  let update;
  try {
    update = await request.json();
  } catch (e) {
    return new Response('bad request', { status: 400 });
  }

  const msg = update.message;
  if (!msg || !msg.text) return new Response('ok');
  const text = msg.text.trim();

  if (text.startsWith('/start')) {
    const name = msg.from.first_name || '';
    const lang = (msg.from.language_code || 'bg').split('-')[0];
    const greet = greetings[lang] || greetings.bg;
    await tg(env, 'sendMessage', {
      chat_id: msg.chat.id,
      text: greet(name),
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: btnWatch[lang] || btnWatch.bg, web_app: { url: WEB_URL } }],
          [
            { text: btnBrowser[lang] || btnBrowser.bg, url: WEB_URL },
            { text: btnChannel[lang] || btnChannel.bg, url: 'https://t.me/BulgariaTV_Live' },
          ],
        ],
      },
    });
  } else if ((text === '/post' || text === '/post_ru') && String(msg.from.id) !== String(env.ADMIN_ID)) {
    // постить в канал может только админ (secret ADMIN_ID)
    return new Response('ok');
  } else if (text === '/post') {
    try {
      const post = await tg(env, 'sendMessage', {
        chat_id: CHANNEL,
        text: POST_TEXT,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📺 Отвори Bulgaria TV Live', url: APP_URL }]] },
      });
      if (post.ok) {
        await tg(env, 'pinChatMessage', { chat_id: CHANNEL, message_id: post.result.message_id });
        await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '✅ Пост изпратен и закачен!' });
      } else {
        await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '❌ Грешка: ' + (post.description || 'unknown') });
      }
    } catch (e) {
      await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '❌ Грешка: ' + e.message });
    }
  } else if (text === '/post_ru') {
    try {
      const postRu = `🇧🇬 *60+ БОЛГАРСКИХ КАНАЛОВ ПРЯМО В TELEGRAM* 🔴

Смотрите *все ведущие болгарские телеканалы* бесплатно, без регистрации, 24/7.

━━━━━━━━━━━━━━━━━━━━
📡 *НОВОСТИ И ОБЩИЕ*
▪️ bTV · Nova TV · БНТ 1 · БНТ 2 · БНТ 3 · БНТ 4
▪️ Bulgaria On Air · Nova News · Канал 3
▪️ Euronews · Bloomberg TV

⚽ *СПОРТ*
▪️ Nova Sport · Diema Sport 1/2/3
▪️ Max Sport 1/2/3/4 · Eurosport 1/2

🎬 *ФИЛЬМЫ И РАЗВЛЕЧЕНИЯ*
▪️ Kino Nova · Diema · bTV Cinema · bTV Action
▪️ bTV Comedy · bTV Story · AXN · Star Channel
▪️ Discovery · Nat Geo · TLC · Travel Channel

👶 *ДЕТСКИЕ*
▪️ Cartoon Network · Disney · Nickelodeon · Nick Jr

🎵 *МУЗЫКА*
▪️ Планета · Планета Фолк · The Voice · Folklor TV
━━━━━━━━━━━━━━━━━━━━

✅ HD качество 24/7
✅ iOS, Android, Desktop

👇 *Нажмите кнопку и выберите канал:*`;
      const post = await tg(env, 'sendMessage', {
        chat_id: CHANNEL,
        text: postRu,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📺 Открыть Bulgaria TV Live', url: APP_URL }]] },
      });
      if (post.ok) {
        await tg(env, 'pinChatMessage', { chat_id: CHANNEL, message_id: post.result.message_id });
        await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '✅ Пост отправлен и закреплён!' });
      } else {
        await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '❌ Ошибка: ' + (post.description || 'unknown') });
      }
    } catch (e) {
      await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '❌ Ошибка: ' + e.message });
    }
  }

  return new Response('ok');
}
