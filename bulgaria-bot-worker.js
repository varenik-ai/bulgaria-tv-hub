// bulgaria-bot-worker.js — Cloudflare Worker, обрабатывает Telegram webhook вместо nohup node bot.js.
// Работает 24/7 на инфраструктуре Cloudflare, полностью независимо от локального компьютера.
// Токен бота — секрет воркера: npx wrangler secret put TOKEN (в коде не хранить!)
// Также секреты: ADMIN_ID (Telegram user id админа), SETUP_KEY (для /set-webhook?key=...)
// Деплой: cd ~/bulgaria-bot-worker && cp ~/bulgaria-tv-hub/bulgaria-bot-worker.js src/index.js && npx wrangler deploy
// После деплоя один раз зарегистрировать webhook: открыть https://bulgaria-bot-worker.dyaltd.workers.dev/set-webhook

const CHANNEL = '@BulgariaTV_Live';
const APP_URL = 'https://t.me/BulgariaTV_Live_bot/bulgariatv_live_bot';
const WEB_URL = 'https://varenik-ai.github.io/bulgaria-tv-hub/?v=13';

const greetings = {
  bg: (name) => `🇧🇬 Здравейте, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 български канала на живо в Telegram*

Гледайте българска телевизия онлайн — безплатно, без регистрация, 24/7.

📡 *Новини:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Филми и сериали:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Детски:* Cartoon Network, Disney, Nickelodeon
🎵 *Музика:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 езика`,

  ru: (name) => `🇧🇬 Привет, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 болгарских каналов в прямом эфире в Telegram*

Смотри болгарское телевидение онлайн — бесплатно, без регистрации, 24/7.

📡 *Новости:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Кино и сериалы:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Детские:* Cartoon Network, Disney, Nickelodeon
🎵 *Музыка:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 языков`,

  en: (name) => `🇧🇬 Hello, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 Bulgarian TV channels live on Telegram*

Watch Bulgarian television online — free, no registration, 24/7.

📡 *News:* bTV, Nova TV, BNT 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Sport:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Movies & series:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Kids:* Cartoon Network, Disney, Nickelodeon
🎵 *Music:* Planeta, Planeta Folk, The Voice, Folklor TV

✅ HD · iOS · Android · Desktop · 8 languages`,

  uk: (name) => `🇧🇬 Привіт, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 болгарських каналів наживо в Telegram*

Дивись болгарське телебачення онлайн — безкоштовно, без реєстрації, 24/7.

📡 *Новини:* bTV, Nova TV, БНТ 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Спорт:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Кіно та серіали:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Дитячі:* Cartoon Network, Disney, Nickelodeon
🎵 *Музика:* Планета, Планета Фолк, The Voice, Фолклор ТВ

✅ HD · iOS · Android · Desktop · 8 мов`,

  de: (name) => `🇧🇬 Hallo, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 bulgarische Sender live auf Telegram*

Bulgarisches Fernsehen online schauen — kostenlos, ohne Anmeldung, 24/7.

📡 *Nachrichten:* bTV, Nova TV, BNT 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Sport:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Filme & Serien:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Kinder:* Cartoon Network, Disney, Nickelodeon
🎵 *Musik:* Planeta, Planeta Folk, The Voice, Folklor TV

✅ HD · iOS · Android · Desktop · 8 Sprachen`,

  fr: (name) => `🇧🇬 Bonjour, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 chaînes bulgares en direct sur Telegram*

Regardez la télévision bulgare en ligne — gratuit, sans inscription, 24/7.

📡 *Actualités:* bTV, Nova TV, BNT 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Sport:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Films et séries:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Enfants:* Cartoon Network, Disney, Nickelodeon
🎵 *Musique:* Planeta, Planeta Folk, The Voice, Folklor TV

✅ HD · iOS · Android · Desktop · 8 langues`,

  es: (name) => `🇧🇬 ¡Hola, ${name}!

📺 *БЪЛГАРИЯ·ТВ — 38 canales búlgaros en vivo en Telegram*

Mira la televisión búlgara en línea — gratis, sin registro, 24/7.

📡 *Noticias:* bTV, Nova TV, BNT 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Deporte:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Cine y series:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Infantil:* Cartoon Network, Disney, Nickelodeon
🎵 *Música:* Planeta, Planeta Folk, The Voice, Folklor TV

✅ HD · iOS · Android · Desktop · 8 idiomas`,

  tr: (name) => `🇧🇬 Merhaba, ${name}!

📺 *БЪЛГАРИЯ·ТВ — Telegram'da 38 Bulgar kanalı canlı yayın*

Bulgar televizyonunu çevrimiçi izleyin — ücretsiz, kayıt gerekmez, 7/24.

📡 *Haber:* bTV, Nova TV, BNT 1/2/3/4, Bulgaria On Air, Euronews
⚽ *Spor:* Nova Sport, Diema Sport, Max Sport, Eurosport
🎬 *Film ve dizi:* Kino Nova, Diema, bTV Cinema/Action/Comedy, AXN
👶 *Çocuk:* Cartoon Network, Disney, Nickelodeon
🎵 *Müzik:* Planeta, Planeta Folk, The Voice, Folklor TV

✅ HD · iOS · Android · Desktop · 8 dil`,

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

const thanks = {
  bg: 'Благодарим ви за подкрепата! ⭐ Приятно гледане.',
  ru: 'Спасибо за поддержку! ⭐ Приятного просмотра.',
  en: 'Thank you for your support! ⭐ Enjoy watching.',
  uk: 'Дякуємо за підтримку! ⭐ Приємного перегляду.',
  de: 'Danke für deine Unterstützung! ⭐ Viel Spaß beim Schauen.',
  fr: 'Merci pour votre soutien ! ⭐ Bon visionnage.',
  es: '¡Gracias por tu apoyo! ⭐ Disfruta viendo.',
  tr: 'Desteğiniz için teşekkürler! ⭐ İyi seyirler.',
};

const DONATE_AMOUNTS = [25, 50, 100, 250];

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

  // /invoice?amount=50 — ссылка на оплату Telegram Stars (⭐) для мини-аппа: tg.openInvoice(url)
  if (url.pathname === '/invoice') {
    const cors = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
    const amount = parseInt(url.searchParams.get('amount'), 10);
    if (!DONATE_AMOUNTS.includes(amount)) {
      return new Response(JSON.stringify({ error: 'bad amount' }), { status: 400, headers: cors });
    }
    const r = await tg(env, 'createInvoiceLink', {
      title: 'Bulgaria TV ⭐',
      description: 'Благодарность за Bulgaria TV Live',
      payload: 'donate_' + amount,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: 'Bulgaria TV', amount }],
    });
    return new Response(JSON.stringify(r.ok ? { url: r.result } : { error: r.description }), {
      status: r.ok ? 200 : 502, headers: cors,
    });
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

  // Stars: обязательно подтвердить pre_checkout за 10 секунд
  if (update.pre_checkout_query) {
    await tg(env, 'answerPreCheckoutQuery', { pre_checkout_query_id: update.pre_checkout_query.id, ok: true });
    return new Response('ok');
  }

  const msg = update.message;
  if (msg && msg.successful_payment) {
    const lang = (msg.from.language_code || 'bg').split('-')[0];
    await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: thanks[lang] || thanks.bg });
    return new Response('ok');
  }
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
          [{ text: btnChannel[lang] || btnChannel.bg, url: 'https://t.me/BulgariaTV_Live' }],
        ],
      },
    });
  } else if ((text === '/post' || text === '/post_ru' || text === '/fixpost') && String(msg.from.id) !== String(env.ADMIN_ID)) {
    // постить в канал может только админ (secret ADMIN_ID)
    return new Response('ok');
  } else if (text === '/fixpost') {
    // Правит кнопки закреплённого поста канала на месте (editMessageReplyMarkup): новое сообщение не уходит, подписчики уведомление не получают
    const chat = await tg(env, 'getChat', { chat_id: CHANNEL });
    const pin = chat.ok && chat.result.pinned_message;
    if (!pin) {
      await tg(env, 'sendMessage', { chat_id: msg.chat.id, text: '❌ Закреплённый пост не найден: ' + (chat.description || 'нет закреплённого сообщения') });
    } else {
      const old = JSON.stringify(pin.reply_markup ? pin.reply_markup.inline_keyboard.map(r => r.map(b => b.text + ' → ' + (b.url || ''))) : null);
      const ru = /^🇧🇬 \*?60\+ БОЛГАРСКИХ/.test(pin.text || '');
      const r = await tg(env, 'editMessageReplyMarkup', {
        chat_id: CHANNEL, message_id: pin.message_id,
        reply_markup: { inline_keyboard: [
          [{ text: ru ? '📺 Открыть Bulgaria TV Live' : '📺 Отвори Bulgaria TV Live', url: APP_URL }],
          [{ text: ru ? '⭐ Поблагодарить' : '⭐ Благодаря', url: APP_URL + '?startapp=donate' }],
        ] },
      });
      await tg(env, 'sendMessage', { chat_id: msg.chat.id,
        text: r.ok ? '✅ Кнопки закреплённого поста (id ' + pin.message_id + ') обновлены, подписчикам ничего не отправлено.\nБыло: ' + old
                    : '❌ Не удалось: ' + (r.description || 'unknown') + '\nКнопки сейчас: ' + old });
    }
  } else if (text === '/post') {
    try {
      const post = await tg(env, 'sendMessage', {
        chat_id: CHANNEL,
        text: POST_TEXT,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: '📺 Отвори Bulgaria TV Live', url: APP_URL }], [{ text: '⭐ Благодаря', url: APP_URL + '?startapp=donate' }]] },
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
        reply_markup: { inline_keyboard: [[{ text: '📺 Открыть Bulgaria TV Live', url: APP_URL }], [{ text: '⭐ Поблагодарить', url: APP_URL + '?startapp=donate' }]] },
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
