/* ==========================================================
 * Project: MOYAMOVA
 * File: ui.setup.modal.js
 * Purpose: Initial setup wizard (logic)
 * Version: 1.2
 * Last modified: 2025-11-17
 * ========================================================== */

(function (root) {
  'use strict';

  var LS_KEY_DONE = 'mm.setupDone';
  var LS_UI_LANG = 'mm.uiLang';
  var LS_STUDY_LANG = 'mm.studyLang';
  var LS_LEVEL = 'mm.level';

  var doc = root.document;

  // ---------------------------------------
  // LocalStorage helpers
  // ---------------------------------------

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

  // ---------------------------------------
  // State
  // ---------------------------------------

  var state = {
    uiLang: 'ru',
    studyLang: 'de',
    level: 'normal'
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
  }

  // ---------------------------------------
  // Texts
  // ---------------------------------------

  function t() {
    var ru = state.uiLang !== 'uk';

    if (ru) {
      return {
        title: 'Начальная настройка MOYAMOVA',
        uiLabel: 'Язык интерфейса',
        studyLabel: 'Язык, который вы хотите изучать',
        levelLabel: 'Режим сложности',
        normalTitle: 'Обычный режим',
        hardTitle: 'Сложный режим',
        note: 'Все эти настройки можно изменить позже в меню.',
        start: 'Старт',
        langRu: 'Русский',
        langUk: 'Украинский'
      };
    }

    return {
      title: 'Початкова настройка MOYAMOVA',
      uiLabel: 'Мова інтерфейсу',
      studyLabel: 'Мова, яку ви хочете вивчати',
      levelLabel: 'Режим складності',
      normalTitle: 'Звичайний режим',
      hardTitle: 'Складний режим',
      note: 'Усі ці налаштування можна змінити пізніше в меню.',
      start: 'Старт',
      langRu: 'Російська',
      langUk: 'Українська'
    };
  }

  var STUDY_LANGS = [
    { code: 'de', flag: '🇩🇪', label: 'Deutsch' },
    { code: 'en', flag: '🇬🇧', label: 'English' },
    { code: 'fr', flag: '🇫🇷', label: 'Français' },
    { code: 'sr', flag: '🇷🇸', label: 'Srpski' }, // правильный флаг
    { code: 'es', flag: '🇪🇸', label: 'Español' }
  ];

  // ---------------------------------------
  // DOM helpers
  // ---------------------------------------

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

  // UI language — segmented control с флагом и названием языка
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
        renderAll(); // обновим тексты и сами кнопки
      });

      rootEl.appendChild(btn);
    });
  }

  // Study language — только флаги
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

  // Difficulty toggle — утка / молоток+ключ
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

  function renderAll() {
    var overlay = createOverlayIfNeeded();
    var msgs = t();

    overlay.querySelector('[data-setup-title]').textContent = msgs.title;
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
  }

  // ---------------------------------------
  // Show / hide & apply
  // ---------------------------------------

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
    lsSet(LS_KEY_DONE, '1');
    lsSet(LS_UI_LANG, state.uiLang);
    lsSet(LS_STUDY_LANG, state.studyLang);
    lsSet(LS_LEVEL, state.level);

    applyToAppSettings();
    closeModal();

    try {
      doc.dispatchEvent(
        new CustomEvent('lexitron:setup:done', {
          detail: {
            uiLang: state.uiLang,
            studyLang: state.studyLang,
            level: state.level
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

  // ---------------------------------------
  // Public API
  // ---------------------------------------

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
      Setup.ensure();
    }
  };

  root.Setup = Setup;

  // Авто-старт на первой загрузке
  doc.addEventListener('DOMContentLoaded', function () {
    if (!isSetupDone()) {
      Setup.ensure();
    }
  });
})(window);
