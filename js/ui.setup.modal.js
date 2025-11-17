/* ==========================================================
 * Project: MOYAMOVA
 * File: ui.setup.modal.js
 * Purpose: Initial setup wizard (logic + TOS + GA consent)
 * Version: 1.4
 * ========================================================== */

(function (root) {
  'use strict';

  var LS_KEY_DONE = 'mm.setupDone';
  var LS_UI_LANG = 'mm.uiLang';
  var LS_STUDY_LANG = 'mm.studyLang';
  var LS_LEVEL = 'mm.level';
  var LS_TOS_ACCEPTED = 'mm.tosAccepted';
  var LS_GA_CHOICE = 'mm.gaChoice'; // 'granted' / 'denied'

  var doc = root.document;

  /* ---------------------------------------
   * LocalStorage helpers
   * ------------------------------------ */

  function lsGet(key, def) {
    try {
      var v = root.localStorage.getItem(key);
      return v === null ? def : v;
    } catch (e) {
      return def;
    }
  }

  function lsSet(key, val) {
    try {
      root.localStorage.setItem(key, val);
    } catch (e) {
      // ignore
    }
  }

  /* ---------------------------------------
   * State
   * ------------------------------------ */

  var state = {
    uiLang: 'ru',
    studyLang: 'de',
    level: 'normal',
    tosAccepted: false,
    gaAccepted: false
  };

  function initStateFromStorage() {
    var A = root.App || {};
    var s = A.settings || {};

    state.uiLang = lsGet(LS_UI_LANG, s.uiLang || 'ru');
    if (state.uiLang !== 'ru' && state.uiLang !== 'uk') {
      state.uiLang = 'ru';
    }

    var study = lsGet(LS_STUDY_LANG, s.studyLang || 'de');
    var allowedStudy = ['de', 'en', 'fr', 'sr', 'es'];
    state.studyLang = allowedStudy.indexOf(study) !== -1 ? study : 'de';

    var levelStored = lsGet(LS_LEVEL, s.level || 'normal');
    state.level = levelStored === 'hard' ? 'hard' : 'normal';

    state.tosAccepted = lsGet(LS_TOS_ACCEPTED, '') === '1';
    state.gaAccepted = lsGet(LS_GA_CHOICE, '') === 'granted';
  }

  /* ---------------------------------------
   * Texts
   * ------------------------------------ */

  function t() {
    var ru = state.uiLang !== 'uk';

    if (ru) {
      return {
        title: 'Начальная настройка',
        subtitle: 'Пара шагов — и можно учить слова.',
        intro:
          'MOYAMOVA — это офлайн-тренажёр слов на карточках: выбираете язык, тренируете слова, собираете статистику и возвращаетесь к ошибкам.',
        uiLabel: 'Язык интерфейса',
        studyLabel: 'Язык, который вы хотите изучать',
        levelLabel: 'Режим сложности',
        normalTitle: 'Обычный режим',
        hardTitle: 'Сложный режим',
        note: 'Все эти настройки можно изменить позже в меню.',
        start: 'Старт',
        langRu: 'Русский',
        langUk: 'Украинский',
        tosLabel: 'Я принимаю ',
        tosLink: 'условия использования',
        gaLabel:
          'Разрешаю анонимную статистику использования (Google Analytics).'
      };
    }

    return {
      title: 'Початкове налаштування',
      subtitle: 'Кілька кроків — і можна вчити слова.',
      intro:
        'MOYAMOVA — це офлайн-тренажер слів на картках: обираєте мову, тренуєте слова, збираєте статистику й повертаєтеся до помилок.',
      uiLabel: 'Мова інтерфейсу',
      studyLabel: 'Мова, яку ви хочете вивчати',
      levelLabel: 'Режим складності',
      normalTitle: 'Звичайний режим',
      hardTitle: 'Складний режим',
      note: 'Усі ці налаштування можна змінити пізніше в меню.',
      start: 'Старт',
      langRu: 'Російська',
      langUk: 'Українська',
      tosLabel: 'Я приймаю ',
      tosLink: 'умови використання',
      gaLabel:
        'Дозволяю анонімну статистику використання (Google Analytics).'
    };
  }

  var STUDY_LANGS = [
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'sr', flag: '🇷🇸', label: 'Srpski' },
    { code: 'es', flag: '🇪🇸', label: 'Español' }
  ];

  /* ---------------------------------------
   * DOM helpers
   * ------------------------------------ */

  function createOverlayIfNeeded() {
    var existing = doc.querySelector('[data-setup-overlay]');
    if (existing) return existing;

    var overlay = doc.createElement('div');
    overlay.className = 'setup-overlay';
    overlay.setAttribute('data-setup-overlay', '1');

    overlay.innerHTML = [
      '<div class="setup-backdrop"></div>',
      '<div class="setup-modal">',
      '  <div class="setup-modal__inner">',
      '    <div class="setup-header">',
      '      <h2 class="setup-title" data-setup-title></h2>',
      '      <p class="setup-subtitle" data-setup-subtitle></p>',
      '      <p class="setup-intro" data-setup-intro></p>',
      '    </div>',
      '    <div class="setup-section">',
      '      <div class="setup-section__label" data-setup-ui-label></div>',
      '      <div class="setup-mode-toggle setup-mode-toggle--lang" data-setup-ui-flags></div>',
      '    </div>',
      '    <div class="setup-section">',
      '      <div class="setup-section__label" data-setup-study-label></div>',
      '      <div class="setup-flags-row" data-setup-study-flags></div>',
      '    </div>',
      '    <div class="setup-section">',
      '      <div class="setup-section__label" data-setup-level-label></div>',
      '      <div class="setup-mode-toggle" data-setup-level-toggle></div>',
      '    </div>',
      '    <div class="setup-consent" data-setup-consent></div>',
      '    <p class="setup-note" data-setup-note></p>',
      '    <div class="setup-footer">',
      '      <button type="button" class="setup-start-btn" data-setup-start></button>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('');

    doc.body.appendChild(overlay);
    return overlay;
  }

  /* UI language — segmented control */

  function renderUiLangToggle(rootEl) {
    if (!rootEl) return;

    var msgs = t();
    var current = state.uiLang === 'uk' ? 'uk' : 'ru';

    rootEl.innerHTML = '';

    var langs = [
      { code: 'ru', flag: '🇷🇺', label: msgs.langRu },
      { code: 'uk', flag: '🇺🇦', label: msgs.langUk }
    ];

    langs.forEach(function (lang) {
      var isActive = lang.code === current;

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className =
        'setup-mode-btn setup-mode-btn--lang' +
        (isActive ? ' is-active' : '');
      btn.setAttribute('data-lang', lang.code);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.setAttribute('aria-label', lang.label);

      btn.innerHTML =
        '<span aria-hidden="true">' +
        lang.flag +
        '</span><span>' +
        lang.label +
        '</span>';

      btn.addEventListener('click', function () {
        if (state.uiLang === lang.code) return;
        state.uiLang = lang.code;
        lsSet(LS_UI_LANG, state.uiLang);
        renderAll();
      });

      rootEl.appendChild(btn);
    });
  }

  /* Study language — только флаги */

  function renderStudyLangFlags(rootEl) {
    if (!rootEl) return;

    rootEl.innerHTML = '';

    STUDY_LANGS.forEach(function (item) {
      var isActive = item.code === state.studyLang;

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className =
        'setup-flag-btn' + (isActive ? ' is-active' : '');
      btn.setAttribute('data-lang', item.code);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.setAttribute('aria-label', item.label);

      btn.innerHTML =
        '<span class="setup-flag-btn__flag" aria-hidden="true">' +
        item.flag +
        '</span>';

      btn.addEventListener('click', function () {
        if (state.studyLang === item.code) return;
        state.studyLang = item.code;
        lsSet(LS_STUDY_LANG, state.studyLang);
        renderStudyLangFlags(rootEl);
      });

      rootEl.appendChild(btn);
    });
  }

  /* Difficulty toggle — 🐣 / 🦅 */

  function renderLevelToggle(rootEl) {
    if (!rootEl) return;

    var msgs = t();
    rootEl.innerHTML = '';

    var configs = [
      {
        code: 'normal',
        label: msgs.normalTitle,
        icon: '🐣'
      },
      {
        code: 'hard',
        label: msgs.hardTitle,
        icon: '🦅'
      }
    ];

    configs.forEach(function (cfg) {
      var isActive = cfg.code === state.level;

      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className =
        'setup-mode-btn' + (isActive ? ' is-active' : '');
      btn.setAttribute('data-level', cfg.code);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');

      btn.innerHTML =
        '<span aria-hidden="true">' +
        cfg.icon +
        '</span><span>' +
        cfg.label +
        '</span>';

      btn.addEventListener('click', function () {
        if (state.level === cfg.code) return;
        state.level = cfg.code;
        lsSet(LS_LEVEL, state.level);
        renderLevelToggle(rootEl);
      });

      rootEl.appendChild(btn);
    });
  }

  /* Consents */

  function attachCheckboxHandlers(wrapper, input, onChange) {
    if (!wrapper || !input) return;

    wrapper.addEventListener('click', function (ev) {
      ev.preventDefault();
      var checked = !wrapper.classList.contains('setup-checkbox--checked');
      if (checked) {
        wrapper.classList.add('setup-checkbox--checked');
      } else {
        wrapper.classList.remove('setup-checkbox--checked');
      }
      input.checked = checked;
      if (onChange) onChange(checked);
    });
  }

  function openTerms() {
    // пытаемся использовать Legal, если он есть
    try {
      if (root.Legal && typeof root.Legal.legalUrl === 'function') {
        var url = root.Legal.legalUrl('terms');
        if (url) {
          root.location.href = url;
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // fallback
    root.location.href = './legal/terms.ru.html';
  }

  function renderConsents(rootEl) {
    if (!rootEl) return;
    var msgs = t();

    rootEl.innerHTML = [
      '<label class="setup-checkbox" data-setup-tos-wrapper>',
      '  <input type="checkbox" data-setup-tos>',
      '  <span class="setup-checkbox__box"></span>',
      '  <span class="setup-checkbox__label" data-setup-tos-label></span>',
      '</label>',
      '<label class="setup-checkbox" data-setup-ga-wrapper>',
      '  <input type="checkbox" data-setup-ga>',
      '  <span class="setup-checkbox__box"></span>',
      '  <span class="setup-checkbox__label" data-setup-ga-label></span>',
      '</label>'
    ].join('');

    var tosWrapper = rootEl.querySelector('[data-setup-tos-wrapper]');
    var tosInput = rootEl.querySelector('[data-setup-tos]');
    var tosLabel = rootEl.querySelector('[data-setup-tos-label]');
    var gaWrapper = rootEl.querySelector('[data-setup-ga-wrapper]');
    var gaInput = rootEl.querySelector('[data-setup-ga]');
    var gaLabel = rootEl.querySelector('[data-setup-ga-label]');

    // TOS label with link
    if (tosLabel) {
      tosLabel.innerHTML =
        msgs.tosLabel +
        '<button type="button" class="setup-link" data-setup-tos-link>' +
        msgs.tosLink +
        '</button>';
    }
    if (gaLabel) {
      gaLabel.textContent = msgs.gaLabel;
    }

    // initial states
    if (state.tosAccepted) {
      tosWrapper.classList.add('setup-checkbox--checked');
    }
    if (state.gaAccepted) {
      gaWrapper.classList.add('setup-checkbox--checked');
    }
    if (tosInput) tosInput.checked = state.tosAccepted;
    if (gaInput) gaInput.checked = state.gaAccepted;

    // handlers
    attachCheckboxHandlers(tosWrapper, tosInput, function (checked) {
      state.tosAccepted = checked;
      lsSet(LS_TOS_ACCEPTED, checked ? '1' : '');
      updateStartDisabled();
    });

    attachCheckboxHandlers(gaWrapper, gaInput, function (checked) {
      state.gaAccepted = checked;
      // не применяем сразу GA, только запоминаем;
      // applyGaChoice будет вызван при onStart
    });

    var tosLink = rootEl.querySelector('[data-setup-tos-link]');
    if (tosLink) {
      tosLink.addEventListener('click', function (ev) {
        ev.stopPropagation();
        openTerms();
      });
    }
  }

  /* ---------------------------------------
   * GA consent integration (мягко)
   * ------------------------------------ */

  function applyGaChoice(granted) {
    lsSet(LS_GA_CHOICE, granted ? 'granted' : 'denied');

    // если есть какой-то централизованный хелпер
    if (root.GAConsent && typeof root.GAConsent.applyChoice === 'function') {
      try {
        root.GAConsent.applyChoice(granted);
        return;
      } catch (e) {
        // ignore
      }
    }

    // прямой вызов gtag — безопасно, если он уже есть
    try {
      if (root.gtag && typeof root.gtag === 'function') {
        root.gtag('consent', 'update', {
          analytics_storage: granted ? 'granted' : 'denied'
        });
      }
    } catch (e) {
      // ignore
    }

    // кастомное событие — на будущее для ga.consent.js (шаг 2)
    try {
      doc.dispatchEvent(
        new CustomEvent('mm:ga-consent', {
          detail: { granted: granted }
        })
      );
    } catch (e) {
      // ignore
    }
  }

  /* ---------------------------------------
   * Render root
   * ------------------------------------ */

  function renderAll() {
    var overlay = createOverlayIfNeeded();
    var msgs = t();

    overlay.querySelector('[data-setup-title]').textContent = msgs.title;
    overlay.querySelector('[data-setup-subtitle]').textContent =
      msgs.subtitle;
    overlay.querySelector('[data-setup-intro]').textContent = msgs.intro;
    overlay.querySelector('[data-setup-ui-label]').textContent =
      msgs.uiLabel;
    overlay.querySelector('[data-setup-study-label]').textContent =
      msgs.studyLabel;
    overlay.querySelector('[data-setup-level-label]').textContent =
      msgs.levelLabel;
    overlay.querySelector('[data-setup-note]').textContent = msgs.note;

    var startBtn = overlay.querySelector('[data-setup-start]');
    startBtn.textContent = msgs.start;

    renderUiLangToggle(
      overlay.querySelector('[data-setup-ui-flags]')
    );
    renderStudyLangFlags(
      overlay.querySelector('[data-setup-study-flags]')
    );
    renderLevelToggle(
      overlay.querySelector('[data-setup-level-toggle]')
    );
    renderConsents(overlay.querySelector('[data-setup-consent]'));
    updateStartDisabled();
  }

  function updateStartDisabled() {
    var overlay = doc.querySelector('[data-setup-overlay]');
    if (!overlay) return;
    var btn = overlay.querySelector('[data-setup-start]');
    if (!btn) return;
    btn.disabled = !state.tosAccepted;
  }

  /* ---------------------------------------
   * Show / hide & apply
   * ------------------------------------ */

  function openModal() {
    initStateFromStorage();
    renderAll();

    var overlay = createOverlayIfNeeded();
    overlay.classList.add('is-open');

    try {
      doc.dispatchEvent(new CustomEvent('lexitron:setup'));
    } catch (e) {
      // ignore
    }

    var startBtn = overlay.querySelector('[data-setup-start]');
    if (!startBtn._setupBound) {
      startBtn._setupBound = true;
      startBtn.addEventListener('click', onStart);
    }
  }

  function closeModal() {
    var overlay = doc.querySelector('[data-setup-overlay]');
    if (overlay) {
      overlay.classList.remove('is-open');
    }
  }

  function applyToAppSettings() {
    var A = root.App;
    if (!A) return;

    if (!A.settings) {
      A.settings = {};
    }

    A.settings.uiLang = state.uiLang;
    A.settings.studyLang = state.studyLang;
    A.settings.level = state.level === 'hard' ? 'hard' : 'normal';

    if (typeof A.saveSettings === 'function') {
      A.saveSettings();
    }
  }

  function onStart() {
    if (!state.tosAccepted) {
      // защитный барьер, хотя кнопка disabled
      return;
    }

    lsSet(LS_KEY_DONE, '1');
    lsSet(LS_UI_LANG, state.uiLang);
    lsSet(LS_STUDY_LANG, state.studyLang);
    lsSet(LS_LEVEL, state.level);
    lsSet(LS_TOS_ACCEPTED, '1');
    applyGaChoice(state.gaAccepted);

    applyToAppSettings();
    closeModal();

    try {
      doc.dispatchEvent(
        new CustomEvent('lexitron:setup:done', {
          detail: {
            uiLang: state.uiLang,
            studyLang: state.studyLang,
            level: state.level,
            tosAccepted: state.tosAccepted,
            gaAccepted: state.gaAccepted
          }
        })
      );
    } catch (e) {
      // ignore
    }
  }

  function isSetupDone() {
    return lsGet(LS_KEY_DONE, '') === '1';
  }

  /* ---------------------------------------
   * Public API
   * ------------------------------------ */

  var Setup = {
    ensure: function () {
      if (isSetupDone()) return;

      if (!doc.body) {
        doc.addEventListener('DOMContentLoaded', function () {
          if (!isSetupDone()) openModal();
        });
        return;
      }

      openModal();
    },

    open: function () {
      openModal();
    },

    reset: function () {
      lsSet(LS_KEY_DONE, '');
      lsSet(LS_TOS_ACCEPTED, '');
      Setup.ensure();
    }
  };

  root.Setup = Setup;

  /* Авто-старт на первой загрузке */
  doc.addEventListener('DOMContentLoaded', function () {
    if (!isSetupDone()) {
      Setup.ensure();
    }
  });
})(window);
