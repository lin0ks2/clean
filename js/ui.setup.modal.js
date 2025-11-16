/* ==========================================================
 * ui.setup.modal.js — Мастер начальной настройки MOYAMOVA
 *
 * Что делает:
 *  - При первом запуске показывает модалку-оверлей поверх приложения
 *  - Даёт выбрать:
 *      • язык интерфейса (ru / uk)
 *      • язык, который вы хотите изучать (по флагам, из window.decks)
 *      • режим сложности (обычный / сложный)
 *  - Сохраняет выбор в App.settings и localStorage
 *  - Ставит флаг "setupDone", чтобы больше не показываться
 *  - После нажатия "Старт" закрывает модалку.
 *
 * НИЧЕГО не трогает в Trainer / Favorites / Router.
 * ========================================================== */
(function () {
  'use strict';

  const A = (window.App = window.App || {});
  const LS_KEY_DONE       = 'mm.setupDone';
  const LS_KEY_UI_LANG    = 'mm.uiLang';
  const LS_KEY_STUDY_LANG = 'mm.studyLang';
  const LS_KEY_DECK_KEY   = 'mm.deckKey';
  const LS_KEY_LEVEL      = 'mm.level';

  let overlayRoot = null;
  let state = {
    uiLang: 'ru',
    studyLang: null,
    deckKey: null,
    level: 'normal'
  };

  /* ----------------------- helpers: localStorage ----------------------- */
  function lsGet(key, defVal) {
    try {
      const v = window.localStorage.getItem(key);
      return v == null ? defVal : v;
    } catch (_) {
      return defVal;
    }
  }

  function lsSet(key, val) {
    try {
      if (val == null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, String(val));
      }
    } catch (_) {}
  }

  function isSetupDone() {
    return lsGet(LS_KEY_DONE, '') === '1';
  }

  /* ----------------------- helpers: язык интерфейса ----------------------- */
  function detectInitialUiLang() {
    try {
      if (A.settings && (A.settings.uiLang || A.settings.lang)) {
        const v = String(A.settings.uiLang || A.settings.lang).toLowerCase();
        return v === 'uk' ? 'uk' : 'ru';
      }
      const fromLS = lsGet(LS_KEY_UI_LANG, null);
      if (fromLS) {
        const v = String(fromLS).toLowerCase();
        return v === 'uk' ? 'uk' : 'ru';
      }
      const attr = (document.documentElement.getAttribute('lang') || '').toLowerCase();
      if (attr === 'uk' || attr === 'ua') return 'uk';
    } catch (_) {}
    return 'ru';
  }

  function applyUiLang(lang) {
    const code = lang === 'uk' ? 'uk' : 'ru';
    state.uiLang = code;

    // в App.settings
    A.settings = A.settings || {};
    A.settings.lang = code;
    A.settings.uiLang = code;
    try { A.saveSettings && A.saveSettings(A.settings); } catch (_) {}

    // в DOM
    try {
      document.documentElement.dataset.lang = code;
      document.documentElement.setAttribute('lang', code);
    } catch (_) {}

    // в localStorage
    lsSet(LS_KEY_UI_LANG, code);

    // событие для существующих подписчиков
    try {
      const ev = new Event('lexitron:i18n-changed');
      document.dispatchEvent(ev);
      window.dispatchEvent(ev);
    } catch (_) {}
  }

  /* ----------------------- helpers: режим сложности ----------------------- */
  function detectInitialLevel() {
    try {
      if (A.settings && (A.settings.level || A.settings.mode)) {
        const v = String(A.settings.level || A.settings.mode).toLowerCase();
        return v === 'hard' ? 'hard' : 'normal';
      }
      const fromLS = lsGet(LS_KEY_LEVEL, null);
      if (fromLS) {
        const v = String(fromLS).toLowerCase();
        return v === 'hard' ? 'hard' : 'normal';
      }
      const dl = (document.documentElement.dataset.level || '').toLowerCase();
      if (dl === 'hard') return 'hard';
    } catch (_) {}
    return 'normal';
  }

  function applyLevel(level) {
    const val = level === 'hard' ? 'hard' : 'normal';
    state.level = val;

    A.settings = A.settings || {};
    A.settings.level = val;
    try { A.saveSettings && A.saveSettings(A.settings); } catch (_) {}

    try {
      document.documentElement.dataset.level = val;
    } catch (_) {}

    lsSet(LS_KEY_LEVEL, val);
  }

  /* ----------------------- helpers: список языков/словари ----------------------- */

  const FLAG_BY_LANG = {
    de: '🇩🇪',
    en: '🇬🇧',
    ru: '🇷🇺',
    uk: '🇺🇦',
    es: '🇪🇸',
    fr: '🇫🇷',
    it: '🇮🇹',
    pl: '🇵🇱'
  };

  function getDecksRaw() {
    try {
      if (A.Decks && typeof A.Decks.allKeys === 'function') {
        const keys = A.Decks.allKeys();
        const map = {};
        keys.forEach(k => { map[k] = true; });
        return map;
      }
      const decks = (window.decks && typeof window.decks === 'object') ? window.decks : {};
      return decks;
    } catch (_) {
      return {};
    }
  }

  function isVirtualKey(key) {
    if (!key) return false;
    const k = String(key);
    return /^favorites:/i.test(k) || /^mistakes:/i.test(k) || k === 'fav' || k === 'favorites' || k === 'mistakes';
  }

  function extractStudyLangFromKey(key) {
    if (!key) return null;
    const k = String(key);
    if (isVirtualKey(k)) return null;
    const idx = k.indexOf('_');
    if (idx === -1) return null;
    return k.slice(0, idx).toLowerCase();
  }

  function listStudyLangs() {
    const decks = getDecksRaw();
    const langsSet = new Set();
    Object.keys(decks).forEach(k => {
      const lang = extractStudyLangFromKey(k);
      if (!lang) return;
      langsSet.add(lang);
    });
    return Array.from(langsSet);
  }

  function pickDeckForLang(lang) {
    if (!lang) return null;
    const decks = getDecksRaw();
    const keys = Object.keys(decks).filter(k => extractStudyLangFromKey(k) === lang && !isVirtualKey(k));
    if (!keys.length) return null;

    // приоритет verbs
    const exact = keys.find(k => /_verbs$/i.test(k));
    return exact || keys[0];
  }

  function detectInitialStudyLangAndDeck() {
    let studyLang = null;
    let deckKey = null;

    try {
      const storedLang = lsGet(LS_KEY_STUDY_LANG, null);
      const storedDeck = lsGet(LS_KEY_DECK_KEY, null);
      if (storedLang && storedDeck) {
        studyLang = storedLang.toLowerCase();
        deckKey = storedDeck;
        return { studyLang, deckKey };
      }
    } catch (_) {}

    try {
      if (A.settings && A.settings.lastDeckKey) {
        const k = String(A.settings.lastDeckKey);
        const lang = extractStudyLangFromKey(k);
        if (lang) {
          studyLang = lang;
          deckKey = k;
          return { studyLang, deckKey };
        }
      }
    } catch (_) {}

    const langs = listStudyLangs();
    if (!langs.length) {
      return { studyLang: null, deckKey: null };
    }

    studyLang = langs[0];
    deckKey = pickDeckForLang(studyLang);

    return { studyLang, deckKey };
  }

  function applyStudyLangAndDeck(lang, deckKey) {
    state.studyLang = lang || null;
    state.deckKey = deckKey || null;

    lsSet(LS_KEY_STUDY_LANG, state.studyLang);
    lsSet(LS_KEY_DECK_KEY, state.deckKey);

    A.settings = A.settings || {};
    if (state.deckKey) {
      A.settings.lastDeckKey = state.deckKey;
    }
    try { A.saveSettings && A.saveSettings(A.settings); } catch (_) {}
  }

  /* ----------------------- helpers: локализация текста мастера ----------------------- */

  function t() {
    const lang = state.uiLang === 'uk' ? 'uk' : 'ru';

    if (lang === 'uk') {
      return {
        title: 'Початкова настройка MOYAMOVA',
        uiLanguage: 'Мова інтерфейсу',
        studyLanguage: 'Мова, яку ви хочете вивчати',
        modeTitle: 'Режим складності',
        modeNormal: 'Звичайний режим 🐣',
        modeHard: 'Складний режим 🦅',
        start: 'Старт',
        langRu: 'Російська',
        langUk: 'Українська',
        noLangs: 'Не знайдено словників для старту. Перевірте, що словники підключені.',
        hintCanChangeLater: 'Усі ці налаштування можна змінити пізніше в меню.'
      };
    }

    return {
      title: 'Начальная настройка MOYAMOVA',
      uiLanguage: 'Язык интерфейса',
      studyLanguage: 'Язык, который вы хотите изучать',
      modeTitle: 'Режим сложности',
      modeNormal: 'Обычный режим 🐣',
      modeHard: 'Сложный режим 🦅',
      start: 'Старт',
      langRu: 'Русский',
      langUk: 'Украинский',
      noLangs: 'Не найдено словарей для старта. Проверьте, что словари подключены.',
      hintCanChangeLater: 'Все эти настройки можно изменить позже в меню.'
    };
  }

  /* ----------------------- helpers: ожидание словарей ----------------------- */

  function waitForDecksReady(maxWaitMs) {
    maxWaitMs = maxWaitMs || 2000;
    return new Promise(resolve => {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();

      (function tick() {
        try {
          const decks = getDecksRaw();
          const hasAny = Object.keys(decks).some(k => !isVirtualKey(k));
          if (hasAny) {
            return resolve(true);
          }
        } catch (_) {}
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (now - t0 > maxWaitMs) {
          return resolve(false);
        }
        (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : setTimeout)(tick, 32);
      })();
    });
  }

  /* ----------------------- DOM: построение модалки ----------------------- */

  function buildModalRoot() {
    if (overlayRoot) return overlayRoot;

    overlayRoot = document.createElement('div');
    overlayRoot.className = 'setup-overlay setup-overlay--hidden';
    overlayRoot.innerHTML = [
      '<div class="setup-backdrop"></div>',
      '<div class="setup-modal" role="dialog" aria-modal="true" aria-labelledby="setupTitle">',
        '<div class="setup-modal__inner">',
          '<h2 class="setup-title" id="setupTitle"></h2>',

          '<section class="setup-section">',
            '<h3 class="setup-section__title setup-section__title--compact" data-setup-ui-label></h3>',
            '<div class="setup-flags-row" data-setup-ui-flags></div>',
          '</section>',

          '<section class="setup-section">',
            '<h3 class="setup-section__title setup-section__title--compact" data-setup-study-label></h3>',
            '<div class="setup-flags-row" data-setup-study-flags></div>',
            '<p class="setup-note setup-note--warning" data-setup-no-langs></p>',
          '</section>',

          '<section class="setup-section">',
            '<h3 class="setup-section__title setup-section__title--compact" data-setup-mode-label></h3>',
            '<div class="setup-mode-toggle" data-setup-mode-group>',
              '<button type="button" class="setup-mode-btn" data-level="normal"></button>',
              '<button type="button" class="setup-mode-btn" data-level="hard"></button>',
            '</div>',
          '</section>',

          '<p class="setup-note" data-setup-hint></p>',

          '<div class="setup-footer">',
            '<button type="button" class="setup-start-btn" data-setup-start></button>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlayRoot);
    return overlayRoot;
  }

  function renderUiLangFlags(rootEl) {
    if (!rootEl) return;
    rootEl.innerHTML = '';

    const ui = state.uiLang === 'uk' ? 'uk' : 'ru';
    const msgs = t();

    const langs = [
      { code: 'ru', label: msgs.langRu, flag: '🇷🇺' },
      { code: 'uk', label: msgs.langUk, flag: '🇺🇦' }
    ];

    langs.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'setup-flag-btn' + (item.code === ui ? ' is-active' : '');
      btn.setAttribute('data-lang', item.code);
      btn.setAttribute('aria-pressed', item.code === ui ? 'true' : 'false');
      btn.innerHTML = '<span class="setup-flag-btn__flag" aria-hidden="true">' +
        item.flag +
        '</span><span class="setup-flag-btn__label">' +
        item.label +
        '</span>';

      btn.addEventListener('click', function () {
        if (state.uiLang === item.code) return;
        applyUiLang(item.code);
        // перерендерить тексты и флаги, т.к. язык интерфейса поменялся
        renderAll();
      });

      rootEl.appendChild(btn);
    });
  }

  function renderStudyLangFlags(rootEl) {
    if (!rootEl) return;

    const langs = listStudyLangs();
    const msgs = t();
    const noteEl = overlayRoot.querySelector('[data-setup-no-langs]');

    rootEl.innerHTML = '';

    if (!langs.length) {
      if (noteEl) {
        noteEl.textContent = msgs.noLangs;
        noteEl.style.display = 'block';
      }
      return;
    }
    if (noteEl) {
      noteEl.textContent = '';
      noteEl.style.display = 'none';
    }

    // удостоверимся, что текущий выбор валиден
    if (!state.studyLang || !langs.includes(state.studyLang)) {
      const detected = detectInitialStudyLangAndDeck();
      state.studyLang = detected.studyLang;
      state.deckKey = detected.deckKey;
    }

    langs.forEach(code => {
      const flag = FLAG_BY_LANG[code] || '🌐';
      const isActive = code === state.studyLang;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'setup-flag-btn' + (isActive ? ' is-active' : '');
      btn.setAttribute('data-lang', code);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.innerHTML = '<span class="setup-flag-btn__flag" aria-hidden="true">' +
        flag +
        '</span><span class="setup-flag-btn__label">' +
        code.toUpperCase() +
        '</span>';

      btn.addEventListener('click', function () {
        if (state.studyLang === code) return;
        const deckKey = pickDeckForLang(code);
        state.studyLang = code;
        state.deckKey = deckKey;
        applyStudyLangAndDeck(state.studyLang, state.deckKey);
        renderStudyLangFlags(rootEl); // чтобы подсветка обновилась
      });

      rootEl.appendChild(btn);
    });
  }

  function renderModeToggle(rootEl) {
    if (!rootEl) return;
    const msgs = t();
    const buttons = rootEl.querySelectorAll('.setup-mode-btn');
    buttons.forEach(btn => {
      const level = btn.getAttribute('data-level') === 'hard' ? 'hard' : 'normal';
      const isActive = level === state.level;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.textContent = (level === 'hard') ? msgs.modeHard : msgs.modeNormal;

      btn.onclick = function () {
        if (state.level === level) return;
        applyLevel(level);
        renderModeToggle(rootEl);
      };
    });
  }

  function renderTexts() {
    if (!overlayRoot) return;
    const msgs = t();

    const title = overlayRoot.querySelector('.setup-title');
    const uiLabel = overlayRoot.querySelector('[data-setup-ui-label]');
    const studyLabel = overlayRoot.querySelector('[data-setup-study-label]');
    const modeLabel = overlayRoot.querySelector('[data-setup-mode-label]');
    const hint = overlayRoot.querySelector('[data-setup-hint]');
    const startBtn = overlayRoot.querySelector('[data-setup-start]');

    if (title) title.textContent = msgs.title;
    if (uiLabel) uiLabel.textContent = msgs.uiLanguage;
    if (studyLabel) studyLabel.textContent = msgs.studyLanguage;
    if (modeLabel) modeLabel.textContent = msgs.modeTitle;
    if (hint) hint.textContent = msgs.hintCanChangeLater;
    if (startBtn) startBtn.textContent = msgs.start;
  }

  function renderAll() {
    if (!overlayRoot) return;
    renderTexts();
    renderUiLangFlags(overlayRoot.querySelector('[data-setup-ui-flags]'));
    renderStudyLangFlags(overlayRoot.querySelector('[data-setup-study-flags]'));
    renderModeToggle(overlayRoot.querySelector('[data-setup-mode-group]'));
  }

  function openModal() {
    const root = buildModalRoot();

    // инициализируем state от текущих настроек
    state.uiLang = detectInitialUiLang();
    const detected = detectInitialStudyLangAndDeck();
    state.studyLang = detected.studyLang;
    state.deckKey = detected.deckKey;
    state.level = detectInitialLevel();

    // сразу применим (чтобы настройки не расходились с UI)
    applyUiLang(state.uiLang);
    applyLevel(state.level);
    applyStudyLangAndDeck(state.studyLang, state.deckKey);

    renderAll();

    // старт
    root.classList.remove('setup-overlay--hidden');
    document.body.classList.add('setup-open');

    const startBtn = root.querySelector('[data-setup-start]');
    if (startBtn) {
      startBtn.onclick = function () {
        // финал: зафиксируем ещё раз в settings и LS
        applyUiLang(state.uiLang);
        applyLevel(state.level);
        applyStudyLangAndDeck(state.studyLang, state.deckKey);

        lsSet(LS_KEY_DONE, '1');

        closeModal();

        // Можно мягко обновить home, если роутер есть
        try {
          if (A.Router && typeof A.Router.routeTo === 'function') {
            A.Router.routeTo('home');
          }
        } catch (_) {}
      };
    }
  }

  function closeModal() {
    if (!overlayRoot) return;
    overlayRoot.classList.add('setup-overlay--hidden');
    document.body.classList.remove('setup-open');
  }

  /* ----------------------- публичный API ----------------------- */

  const Setup = {
    open: openModal,
    close: closeModal,
    isDone: isSetupDone,
    ensure: async function () {
      if (isSetupDone()) return;
      await waitForDecksReady(2000);
      openModal();
    }
  };

  A.Setup = Setup;
  window.Setup = Setup;

  /* ----------------------- авто-запуск на первом старте ----------------------- */

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  onReady(function () {
    // если уже кто-то явно управляет Setup.ensure — не мешаем
    // но по умолчанию покажем мастер, если ещё не был пройден
    Setup.ensure();
  });
})();
