// bulgaria-bot-worker.js — Cloudflare Worker, обрабатывает Telegram webhook вместо nohup node bot.js.
// Работает 24/7 на инфраструктуре Cloudflare, полностью независимо от локального компьютера.
// Токен бота — секрет воркера: npx wrangler secret put TOKEN (в коде не хранить!)
// Также секреты: ADMIN_ID (Telegram user id админа), SETUP_KEY (для /set-webhook?key=...)
// Деплой: cd ~/bulgaria-bot-worker && cp ~/bulgaria-tv-hub/bulgaria-bot-worker.js src/index.js && npx wrangler deploy
// После деплоя один раз зарегистрировать webhook: открыть https://bulgaria-bot-worker.dyaltd.workers.dev/set-webhook

const CHANNEL = '@BulgariaTV_Live';
const APP_URL = 'https://t.me/BulgariaTV_Live_bot/bulgariatv_live_bot';
const WEB_URL = 'https://varenik-ai.github.io/bulgaria-tv-hub/?v=7';

const greetings = {
  bg: (name) => `🇧🇬 Здравейте, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ български канала на живо в Telegram*

Гледайте българска телевизия онлайн — безплатно, без регистрация, 24/7.

📡 *Новини:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Филми:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo и още
👶 *Детски:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Музика:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 езика`,

  ru: (name) => `🇧🇬 Привет, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ болгарских каналов в прямом эфире в Telegram*

Смотри болгарское телевидение онлайн — бесплатно, без регистрации, 24/7.

📡 *Новости:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Кино:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo и другие
👶 *Детские:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Музыка:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 языков`,

  en: (name) => `🇧🇬 Hello, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ Bulgarian TV channels live in Telegram*

Watch Bulgarian television online — free, no registration, 24/7.

📡 *News:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Sport:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Movies:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo & more
👶 *Kids:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Music:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 languages`,

  uk: (name) => `🇧🇬 Привіт, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ болгарських каналів наживо в Telegram*

Дивись болгарське телебачення онлайн — безкоштовно, без реєстрації, 24/7.

📡 *Новини:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Кіно:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo та інші
👶 *Дитячі:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Музика:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 мов`,

  de: (name) => `🇧🇬 Hallo, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ bulgarische Sender live in Telegram*

Bulgarisches Fernsehen online — kostenlos, ohne Anmeldung, 24/7.

📡 *Nachrichten:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Sport:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Filme:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo & mehr
👶 *Kinder:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Musik:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 Sprachen`,

  fr: (name) => `🇧🇬 Bonjour, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ chaînes bulgares en direct sur Telegram*

Regardez la télévision bulgare en ligne — gratuit, sans inscription, 24/7.

📡 *Actualités:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Sport:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Films:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo et plus
👶 *Enfants:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Musique:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 langues`,

  es: (name) => `🇧🇬 ¡Hola, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ canales búlgaros en directo en Telegram*

Mira la televisión búlgara online — gratis, sin registro, 24/7.

📡 *Noticias:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Deporte:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Cine:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo y más
👶 *Infantil:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Música:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 idiomas`,

  tr: (name) => `🇧🇬 Merhaba, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 60+ Bulgar kanalı Telegram'da canlı*

Bulgar televizyonunu online izleyin — ücretsiz, kayıt gerekmez, 7/24.

📡 *Haber:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Nova News, Euronews
⚽ *Spor:* Nova Sport, Diema Sport 1/2/3, Max Sport 1–4, Eurosport 1/2
🎬 *Film:* Kino Nova, Diema, bTV Cinema/Action/Comedy/Story, AXN, Star Channel, Discovery, Nat Geo ve daha fazlası
👶 *Çocuk:* Cartoon Network, Disney Channel, Nickelodeon, Nick Jr
🎵 *Müzik:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 dil`,

};

const btnWatch = {
  bg: '📺 Отвори Bulgaria TV Live',
  ru: '📺 Открыть Bulgaria TV Live',
  en: '📺 Open Bulgaria TV Live',
  uk: '📺 Відкрити Bulgaria TV Live',
  de: '📺 Bulgaria TV Live öffnen',
  fr: '📺 Ouvrir Bulgaria TV Live',
  es: '📺 Abrir Bulgaria TV Live',
  tr: '📺 Bulgaria TV Live Aç',
};

const btnBrowser = {
  bg: '🌐 Отвори в браузър',
  ru: '🌐 Открыть в браузере',
  en: '🌐 Open in browser',
  uk: '🌐 Відкрити у браузері',
  de: '🌐 Im Browser öffnen',
  fr: '🌐 Ouvrir dans le navigateur',
  es: '🌐 Abrir en navegador',
  tr: '🌐 Tarayıcıda aç',
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
          [{ text: btnBrowser[lang] || btnBrowser.bg, url: WEB_URL }],
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
