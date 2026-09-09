// bulgaria-bot-worker.js — Cloudflare Worker, обрабатывает Telegram webhook вместо nohup node bot.js.
// Работает 24/7 на инфраструктуре Cloudflare, полностью независимо от локального компьютера.
// Деплой: cd ~/bulgaria-bot-worker && cp ~/bulgaria-tv-hub/bulgaria-bot-worker.js src/index.js && npx wrangler deploy
// После деплоя один раз зарегистрировать webhook: открыть https://bulgaria-bot-worker.dyaltd.workers.dev/set-webhook

const TOKEN   = '8906641741:AAFz2gkHwGaltD1XRVppAdhc1yZpkSkVifo';
const CHANNEL = '@BulgariaTV_Live';
const APP_URL = 'https://t.me/BulgariaTV_Live_bot/bulgariatv_live_bot';
const WEB_URL = 'https://varenik-ai.github.io/bulgaria-tv-hub/?v=5';
const API = `https://api.telegram.org/bot${TOKEN}`;

const greetings = {
  bg: (name) => `🇧🇬 Здравейте, ${name}! Добре дошли в *Bulgaria TV Live*

📺 *60+ български канала директно в Telegram* — безплатно, без регистрация, 24/7.

🔴 *Най-популярните канали:*
▪️ bTV, Nova TV, БНТ 1/2/3/4
▪️ Nova Sport, Diema Sport 1/2/3, Eurosport 1/2, Max Sport 1/2/3/4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, bTV Story, Ring BG
▪️ Bulgaria On Air, Nova News, Euronews, Bloomberg
▪️ Cartoon Network, Disney Channel, Nickelodeon
▪️ Планета, Планета Фолк, The Voice, Folklor TV
▪️ Discovery, Nat Geo, TLC, Travel Channel и още

✅ HD качество · iOS, Android, Desktop · 8 езика`,

  ru: (name) => `🇧🇬 Привет, ${name}! Добро пожаловать в *Bulgaria TV Live*

📺 *60+ болгарских каналов прямо в Telegram* — бесплатно, без регистрации, 24/7.

🔴 *Самые популярные:*
▪️ bTV, Nova TV, БНТ 1/2/3/4
▪️ Nova Sport, Diema Sport 1/2/3, Eurosport 1/2, Max Sport 1/2/3/4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, bTV Story, Ring BG
▪️ Bulgaria On Air, Nova News, Euronews, Bloomberg
▪️ Cartoon Network, Disney Channel, Nickelodeon
▪️ Планета, Планета Фолк, The Voice, Folklor TV
▪️ Discovery, Nat Geo, TLC, Travel Channel и другие

✅ HD качество · iOS, Android, Desktop · 8 языков`,

  en: (name) => `🇧🇬 Hello, ${name}! Welcome to *Bulgaria TV Live*

📺 *60+ Bulgarian TV channels right in Telegram* — free, no registration, 24/7.

🔴 *Most popular channels:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport 1/2/3, Eurosport 1/2, Max Sport 1/2/3/4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, bTV Story, Ring BG
▪️ Bulgaria On Air, Nova News, Euronews, Bloomberg
▪️ Cartoon Network, Disney Channel, Nickelodeon
▪️ Planeta, Planeta Folk, The Voice, Folklor TV
▪️ Discovery, Nat Geo, TLC, Travel Channel & more

✅ HD quality · iOS, Android, Desktop · 8 languages`,

  uk: (name) => `🇧🇬 Привіт, ${name}! Ласкаво просимо до *Bulgaria TV Live*

📺 *60+ болгарських каналів прямо в Telegram* — безкоштовно, без реєстрації, 24/7.

🔴 *Найпопулярніші канали:*
▪️ bTV, Nova TV, БНТ 1/2/3/4
▪️ Nova Sport, Diema Sport 1/2/3, Eurosport 1/2, Max Sport 1/2/3/4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, bTV Story, Ring BG
▪️ Bulgaria On Air, Nova News, Euronews, Bloomberg
▪️ Cartoon Network, Disney Channel, Nickelodeon
▪️ Планета, The Voice, Discovery, Nat Geo та інші

✅ HD якість · iOS, Android, Desktop · 8 мов`,

  de: (name) => `🇧🇬 Hallo, ${name}! Willkommen bei *Bulgaria TV Live*

📺 *60+ bulgarische Sender direkt in Telegram* — kostenlos, ohne Anmeldung, 24/7.

🔴 *Beliebteste Sender:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, Bulgaria On Air, Nova News
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ HD-Qualität · iOS, Android, Desktop · 8 Sprachen`,

  fr: (name) => `🇧🇬 Bonjour, ${name}! Bienvenue sur *Bulgaria TV Live*

📺 *60+ chaînes bulgares directement dans Telegram* — gratuit, sans inscription, 24/7.

🔴 *Chaînes les plus populaires:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, Bulgaria On Air, Nova News, Euronews
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ Qualité HD · iOS, Android, Desktop · 8 langues`,

  es: (name) => `🇧🇬 ¡Hola, ${name}! Bienvenido a *Bulgaria TV Live*

📺 *60+ canales búlgaros directamente en Telegram* — gratis, sin registro, 24/7.

🔴 *Canales más populares:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, Bulgaria On Air, Nova News, Euronews
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ Calidad HD · iOS, Android, Desktop · 8 idiomas`,

  tr: (name) => `🇧🇬 Merhaba, ${name}! *Bulgaria TV Live*'a hoş geldiniz

📺 *Telegram'da 60+ Bulgar kanalı* — ücretsiz, kayıt gerekmez, 7/24.

🔴 *En popüler kanallar:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ HD kalite · iOS, Android, Desktop · 8 dil`,
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

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function tg(method, payload) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

async function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/set-webhook') {
    const r = await tg('setWebhook', { url: url.origin });
    return new Response(JSON.stringify(r), { headers: { 'Content-Type': 'application/json' } });
  }
  if (url.pathname === '/webhook-info') {
    const r = await tg('getWebhookInfo', {});
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
    await tg('sendMessage', {
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
  } else if (text === '/post') {
    try {
      const post = await tg('sendMessage', {
        chat_id: CHANNEL,
        text: POST_TEXT,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📺 Отвори Bulgaria TV Live', url: APP_URL }]] },
      });
      if (post.ok) {
        await tg('pinChatMessage', { chat_id: CHANNEL, message_id: post.result.message_id });
        await tg('sendMessage', { chat_id: msg.chat.id, text: '✅ Пост изпратен и закачен!' });
      } else {
        await tg('sendMessage', { chat_id: msg.chat.id, text: '❌ Грешка: ' + (post.description || 'unknown') });
      }
    } catch (e) {
      await tg('sendMessage', { chat_id: msg.chat.id, text: '❌ Грешка: ' + e.message });
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
      const post = await tg('sendMessage', {
        chat_id: CHANNEL,
        text: postRu,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📺 Открыть Bulgaria TV Live', url: APP_URL }]] },
      });
      if (post.ok) {
        await tg('pinChatMessage', { chat_id: CHANNEL, message_id: post.result.message_id });
        await tg('sendMessage', { chat_id: msg.chat.id, text: '✅ Пост отправлен и закреплён!' });
      } else {
        await tg('sendMessage', { chat_id: msg.chat.id, text: '❌ Ошибка: ' + (post.description || 'unknown') });
      }
    } catch (e) {
      await tg('sendMessage', { chat_id: msg.chat.id, text: '❌ Ошибка: ' + e.message });
    }
  }

  return new Response('ok');
}
