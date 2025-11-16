/* ==========================================================
 * Project: MOYAMOVA
 * File: ui.lifecycle.js
 * Purpose: Жизненный цикл приложения, стартовая инициализация
 * Version: 1.1
 * Last modified: 2025-11-02
 * Notes:
 *  - Дефолт UI-языка = 'ru' (синхронно с app.core.js)
 *  - Без «склейки»: чистые функции, строгий режим, явные шаги
 *  - Без лишних логов и "void 0"
 * ========================================================== */

(function () {
  'use strict';

  /* ========================= Helpers ========================= */

  function safe(fn) {
    try {
      fn && fn();
    } catch (e) {
      console.error('[ui.lifecycle] safe error:', e);
    }
  }

  function onReady(cb) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        safe(cb);
      });
    } else {
      safe(cb);
    }
  }

  function getUILang() {
    try {
      if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.lang) {
        return String(document.documentElement.dataset.lang || 'ru').toLowerCase();
      }
    } catch (_) { }
    try {
      if (window.App && App.settings && (App.settings.uiLang || App.settings.lang)) {
        return String(App.settings.uiLang || App.settings.lang || 'ru').toLowerCase();
      }
    } catch (_) { }
    return 'ru';
  }

  function isUkrainian() {
    var l = getUILang();
    if (l === 'ua') l = 'uk';
    return l === 'uk';
  }

  /* ===================== Initial screen select ===================== */

  function resolveInitialScreen() {
    var hash = '';
    try {
      hash = (window.location && window.location.hash) || '';
    } catch (_) { }
    if (hash === '#stats') return 'stats';
    if (hash === '#favorites') return 'favorites';
    if (hash === '#mistakes') return 'mistakes';
    if (hash === '#donate') return 'donate';
    if (hash === '#guide') return 'guide';
    if (hash === '#legal') return 'legal';
    return 'home';
  }

  function ensureBodyClass(cls) {
    try {
      document.body.classList.add(cls);
    } catch (_) { }
  }

  function removeBodyClass(cls) {
    try {
      document.body.classList.remove(cls);
    } catch (_) { }
  }

  function setInitialRoute(screen) {
    safe(function () {
      if (!window.Router || typeof Router.routeTo !== 'function') return;
      Router.routeTo(screen || 'home');
    });
  }

  function initThemeSync() {
    safe(function () {
      if (!window.App || !App.settings) return;
      var theme = App.settings.theme || 'auto';
      document.documentElement.dataset.theme = theme;
    });
  }

  /* ===================== Training bootstrap ===================== */

  function resolveStartupDeck() {
    var out = {
      deckKey: '',
      studyLang: null
    };

    try {
      if (!window.App) return out;
      var dictReg = App.dictRegistry || {};
      var activeKey = dictReg.activeKey || '';
      if (!activeKey && dictReg.items) {
        for (var k in dictReg.items) {
          if (!Object.prototype.hasOwnProperty.call(dictReg.items, k)) continue;
          activeKey = k;
          break;
        }
      }
      out.deckKey = activeKey || '';

      if (App.settings && App.settings.dictsLangFilter) {
        out.studyLang = App.settings.dictsLangFilter;
      } else if (App.settings && App.settings.lang) {
        out.studyLang = App.settings.lang;
      } else {
        out.studyLang = null;
      }
    } catch (e) {
      console.error('[ui.lifecycle] resolveStartupDeck error:', e);
    }

    return out;
  }

  function applyFilters(state) {
    safe(function () { if (window.App && App.settings) App.settings.dictsLangFilter = state.studyLang || null; });
    safe(function () { if (window.App && App.dictRegistry) App.dictRegistry.activeKey = state.deckKey; });
  }

  function boot(state) {
    if (!state.deckKey) {
      // Нет доступных словарей для старта — показываем аккуратное уведомление
      var msg;
      try {
        var lang = 'ru';
        if (document.documentElement &&
            document.documentElement.dataset &&
            document.documentElement.dataset.lang) {
          lang = String(document.documentElement.dataset.lang || '').toLowerCase();
        } else if (window.App && App.settings && (App.settings.lang || App.settings.uiLang)) {
          lang = String(App.settings.lang || App.settings.uiLang).toLowerCase();
        }
        if (lang === 'ua') lang = 'uk';
        if (lang === 'uk') {
          msg = 'Немає доступних словників для старту.';
        } else {
          msg = 'Нет доступных словарей для старта.';
        }
      } catch (_) {
        msg = 'Нет доступных словарей для старту.';
      }

      if (window.App && App.notify) {
        App.notify({ type: 'error', message: msg });
      } else {
        try { alert(msg); } catch (_) {}
      }
      return;
    }

    safe(function () {
      if (window.App && typeof App.bootstrap === 'function') {
        App.bootstrap();
      }
    });
  }

  /* ===================== Splash / first screen ===================== */

  function hideSplash() {
    safe(function () {
      var el = document.querySelector('.app-splash');
      if (!el) return;
      el.classList.add('app-splash--hidden');
      setTimeout(function () {
        try {
          if (el && el.parentNode) el.parentNode.removeChild(el);
        } catch (_) { }
      }, 400);
    });
  }

  function showAppRoot() {
    safe(function () {
      var root = document.querySelector('.app-root');
      if (!root) return;
      root.classList.add('app-root--visible');
    });
  }

  function initTopbarLangSwitch() {
    safe(function () {
      var btnRu = document.querySelector('[data-lang-switch="ru"]');
      var btnUk = document.querySelector('[data-lang-switch="uk"]');

      function setCurrent(active) {
        if (btnRu) btnRu.classList.toggle('is-active', active === 'ru');
        if (btnUk) btnUk.classList.toggle('is-active', active === 'uk');
      }

      var current = getUILang();
      setCurrent(current === 'uk' ? 'uk' : 'ru');

      function changeLang(target) {
        safe(function () {
          if (!window.App) return;
          if (!App.settings) App.settings = {};
          App.settings.uiLang = target;
          if (!App.settings.lang) App.settings.lang = target;
          if (App.saveSettings) App.saveSettings();
          document.documentElement.dataset.lang = target;
          try {
            document.dispatchEvent(new CustomEvent('lexitron:ui-lang-changed', { detail: { lang: target } }));
          } catch (_) { }
          setCurrent(target);
        });
      }

      if (btnRu) {
        btnRu.addEventListener('click', function () { changeLang('ru'); });
      }
      if (btnUk) {
        btnUk.addEventListener('click', function () { changeLang('uk'); });
      }
    });
  }

  function initTopbarThemeSwitch() {
    safe(function () {
      if (!window.App || !App.settings) return;
      var btn = document.querySelector('[data-action="toggle-theme"]');
      if (!btn) return;

      function applyState() {
        var theme = App.settings.theme || 'auto';
        btn.setAttribute('data-theme', theme);
      }

      btn.addEventListener('click', function () {
        var t = App.settings.theme || 'auto';
        var next = (t === 'auto') ? 'light' : (t === 'light' ? 'dark' : 'auto');
        App.setTheme(next);
        applyState();
      });

      applyState();
    });
  }

  /* ===================== Startup Manager integration ===================== */

  function registerStartupHooks() {
    safe(function () {
      if (!window.StartupManager) return;
      if (typeof StartupManager.registerStep !== 'function') return;

      StartupManager.registerStep('resolve-deck', function (next) {
        var st = resolveStartupDeck();
        applyFilters(st);
        safe(function () {
          if (!window.App) window.App = {};
          App._startupState = st;
        });
        next && next();
      });

      StartupManager.registerStep('boot-core', function (next) {
        safe(function () {
          var st = (window.App && App._startupState) || resolveStartupDeck();
          boot(st);
        });
        next && next();
      });

      StartupManager.registerStep('route-initial', function (next) {
        safe(function () {
          var screen = resolveInitialScreen();
          setInitialRoute(screen);
        });
        next && next();
      });

      StartupManager.registerStep('ui-ready', function (next) {
        hideSplash();
        showAppRoot();
        initTopbarLangSwitch();
        initTopbarThemeSwitch();
        next && next();
      });
    });
  }

  /* =================== External hooks (after training) =================== */

  function onAfterFirstTrainingSession(cb) {
    if (!cb) return;
    try {
      document.addEventListener('moyamova:session-finished', function (e) {
        safe(function () { cb(e && e.detail || {}); });
      });
    } catch (_) { }
  }

  function onAfterAnyAnswer(cb) {
    if (!cb) return;
    try {
      document.addEventListener('moyamova:answer', function (e) {
        safe(function () { cb(e && e.detail || {}); });
      });
    } catch (_) { }
  }

  function onAfterSetChange(cb) {
    if (!cb) return;
    try {
      document.addEventListener('moyamova:set-changed', function (e) {
        safe(function () { cb(e && e.detail || {}); });
      });
    } catch (_) { }
  }

  window.UILifecycle = {
    resolveInitialScreen: resolveInitialScreen,
    resolveStartupDeck: resolveStartupDeck,
    applyFilters: applyFilters,
    boot: boot,
    onAfterFirstTrainingSession: onAfterFirstTrainingSession,
    onAfterAnyAnswer: onAfterAnyAnswer,
    onAfterSetChange: onAfterSetChange
  };

  registerStartupHooks();

  (function registerAnswerHook() {
    function afterAnswer() {
      safe(function () {
        if (window.updateSpoilerHeader && typeof window.updateSpoilerHeader === 'function') window.updateSpoilerHeader();
      });
    }

    try {
      document.addEventListener('moyamova:answer', afterAnswer);
    } catch (_) { }

    try {
      document.addEventListener('moyamova:set-changed', afterAnswer);
    } catch (_) { }
  })();

  /* =================== DOMContentLoaded bootstrap =================== */

  onReady(function () {
    safe(function () {
      if (window.StartupManager && typeof StartupManager.gate === 'function') {
        StartupManager.gate();
      }
    });
  });

  /* ====================== End of file ======================= */
})();
