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
    ru: `🇧🇬 Привет, ${name}!\n\nВсе болгарские каналы в одном месте — бесплатно, без регистрации.`,
    bg: `🇧 Здравейте, ${name}!\n\nВсички български канали на едно място — безплатно, без регистрация.`,
    en: `🇧🇬 Hello, ${name}!\n\nAll Bulgarian TV channels in one place — free, no registration.`,
    de: `🇧🇬 Hallo, ${name}!\n\nAlle bulgarischen TV-Sender an einem Ort — kostenlos.`,
    fr: `🇧🇬 Bonjour, ${name}!\n\nToutes les chaînes bulgares au même endroit — gratuit.`,
    uk: `🇧🇬 Привіт, ${name}!\n\nУсі болгарські канали в одному місці — безкоштовно.`,
  };

  const btnWatch = {
    ru: '📺 Все болгарские каналы',
    bg: '📺 Всички български канали',
    en: '📺 All Bulgarian channels',
    de: '📺 Alle bulgarischen Sender',
    fr: '📺 Toutes les chaînes bulgares',
    uk: '📺 Всі болгарські канали',
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
    reply_markup: {
      inline_keyboard: [
        [{ text: btnWatch[lang]   || btnWatch.en,   web_app: { url: WEB_URL } }],
        [{ text: btnBrowser[lang] || btnBrowser.en, url: WEB_URL }],
      ]
    }
  });
});

bot.onText(/\/post/, async (msg) => {
  try {
    const post = await bot.sendMessage(CHANNEL,
`🇧🇬 БЪЛГАРСКА ТЕЛЕВИЗИЯ — НА ЖИВО 🔴

Гледайте всички водещи български канали директно в Telegram — безплатно и без регистрация.

📺 Nova TV — развлечения и новини
🎬 Kino Nova — филми и сериали 24/7
📡 bTV — новини и забавления

✅ HD качество 24/7
✅ Без абонамент
✅ iOS, Android и Desktop
✅ На 8 езика

👇 Натиснете бутона и изберете канал:`,
      {
        reply_markup: {
          inline_keyboard: [[
            { text: '📺 Bulgarian TV Live', url: APP_URL }
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
