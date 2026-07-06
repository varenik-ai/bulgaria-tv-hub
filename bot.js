const TelegramBot = require('node-telegram-bot-api');

const TOKEN   = '8906641741:AAFz2gkHwGaltD1XRVppAdhc1yZpkSkVifo';
const CHANNEL = '@BulgariaTV_Live';
const APP_URL = 'https://t.me/BulgariaTV_Live_bot/bulgariatv_live_bot';
const WEB_URL = 'https://varenik-ai.github.io/bulgaria-tv-hub/?v=4';

const bot = new TelegramBot(TOKEN, { polling: { interval: 2000, autoStart: true, params: { timeout: 10 } } });

bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || '';
  const lang = (msg.from.language_code || 'en').split('-')[0];

  const greetings = {
    ru: `🇧🇬 Привет, ${name}! Добро пожаловать в *Bulgaria TV Live*

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

    bg: `🇧🇬 Здравейте, ${name}! Добре дошли в *Bulgaria TV Live*

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

    en: `🇧🇬 Hello, ${name}! Welcome to *Bulgaria TV Live*

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

    de: `🇧🇬 Hallo, ${name}! Willkommen bei *Bulgaria TV Live*

📺 *60+ bulgarische Sender direkt in Telegram* — kostenlos, ohne Anmeldung, 24/7.

🔴 *Beliebteste Sender:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, bTV Action, Bulgaria On Air, Nova News
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ HD-Qualität · iOS, Android, Desktop · 8 Sprachen`,

    fr: `🇧🇬 Bonjour, ${name}! Bienvenue sur *Bulgaria TV Live*

📺 *60+ chaînes bulgares directement dans Telegram* — gratuit, sans inscription, 24/7.

🔴 *Chaînes les plus populaires:*
▪️ bTV, Nova TV, BNT 1/2/3/4
▪️ Nova Sport, Diema Sport, Eurosport 1/2, Max Sport 1–4
▪️ Kino Nova, Diema, bTV Cinema, AXN, Star Channel
▪️ bTV Comedy, Bulgaria On Air, Nova News, Euronews
▪️ Cartoon Network, Disney Channel, Discovery, Nat Geo

✅ Qualité HD · iOS, Android, Desktop · 8 langues`,

    uk: `🇧🇬 Привіт, ${name}! Ласкаво просимо до *Bulgaria TV Live*

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
  };

  const btnWatch = {
    ru: '📺 Открыть Bulgaria TV Live',
    bg: '📺 Отвори Bulgaria TV Live',
    en: '📺 Open Bulgaria TV Live',
    de: '📺 Bulgaria TV Live öffnen',
    fr: '📺 Ouvrir Bulgaria TV Live',
    uk: '📺 Відкрити Bulgaria TV Live',
  };

  const btnBrowser = {
    ru: '🌐 Открыть в браузере',
    bg: '🌐 Отвори в браузър',
    en: '🌐 Open in browser',
    de: '🌐 Im Browser öffnen',
    fr: '🌐 Ouvrir dans le navigateur',
    uk: '🌐 Відкрити у браузері',
  };

  bot.sendMessage(msg.chat.id, greetings[lang] || greetings.en, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: btnWatch[lang]   || btnWatch.en,   web_app: { url: WEB_URL } }],
        [{ text: btnBrowser[lang] || btnBrowser.en, url: WEB_URL }],
      ]
    }
  });
});

bot.onText(/^\/post$/, async (msg) => {
  try {
    const post = await bot.sendMessage(CHANNEL,
`🇧🇬 *BULGARIAN TV LIVE — 60+ КАНАЛА НА ЖИВО* 🔴

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

👇 *Натиснете бутона, изберете канал и гледайте:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📺 Отвори Bulgaria TV Live', url: APP_URL }
          ]]
        }
      }
    );
    await bot.pinChatMessage(CHANNEL, post.message_id);
    bot.sendMessage(msg.chat.id, '✅ Пост изпратен и закачен!');
  } catch(e) {
    bot.sendMessage(msg.chat.id, '❌ Грешка: ' + e.message);
  }
});

// /post_ru — русскоязычный пост для привлечения подписчиков
bot.onText(/\/post_ru/, async (msg) => {
  try {
    const post = await bot.sendMessage(CHANNEL,
`🇧🇬 *60+ БОЛГАРСКИХ КАНАЛОВ ПРЯМО В TELEGRAM* 🔴

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

👇 *Нажмите кнопку и выберите канал:*`,
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📺 Открыть Bulgaria TV Live', url: APP_URL }
          ]]
        }
      }
    );
    await bot.pinChatMessage(CHANNEL, post.message_id);
    bot.sendMessage(msg.chat.id, '✅ Пост отправлен и закреплён!');
  } catch(e) {
    bot.sendMessage(msg.chat.id, '❌ Ошибка: ' + e.message);
  }
});

console.log('✅ Bulgaria TV Hub бот запущен!');
