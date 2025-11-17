/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: ga.consent.js
 * Назначение: Логика согласия на сбор анонимной аналитики
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */

(function () {
  'use strict';

  // Твой реальный GA4 ID из старой версии
  var GA_ID = (window.GA_ID || 'G-DZL66KME4H');

  var __gaLoaded = false;
  var LS_KEY_OLD = 'ga_consent';   // yes / no
  var LS_KEY_NEW = 'mm.gaChoice';  // granted / denied

  // ----- gtag bootstrap (без загрузки сети) -----
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  // По умолчанию — полный отказ (EU/CH-friendly)
  gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    functionality_storage: 'denied',
    security_storage: 'granted',
    wait_for_update: 500
  });

  function loadGA() {
    if (__gaLoaded) return;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
    __gaLoaded = true;
  }

  // ----- helpers для localStorage -----
  function lsGet(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (_) {
      return null;
    }
  }

  function lsSet(key, val) {
    try {
      window.localStorage.setItem(key, val);
    } catch (_) {
      // ignore
    }
  }

  function lsRemove(key) {
    try {
      window.localStorage.removeItem(key);
    } catch (_) {
      // ignore
    }
  }

  // ----- применение consent -----

  function applyConsent(granted) {
    granted = !!granted;

    if (granted) {
      gtag('consent', 'update', {
        ad_storage: 'granted',
        analytics_storage: 'granted',
        functionality_storage: 'granted',
        ad_user_data: 'granted',
        ad_personalization: 'granted'
      });
      loadGA();
    } else {
      gtag('consent', 'update', {
        ad_storage: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied'
      });
      // GA не загружаем
    }
  }

  function saveChoice(granted) {
    granted = !!granted;
    // новый ключ — для мастера
    lsSet(LS_KEY_NEW, granted ? 'granted' : 'denied');
    // старый ключ — для совместимости с существующими данными
    lsSet(LS_KEY_OLD, granted ? 'yes' : 'no');
  }

  function readStoredChoice() {
    // приоритет: новый ключ мастера
    var vNew = lsGet(LS_KEY_NEW);
    if (vNew === 'granted') return true;
    if (vNew === 'denied') return false;

    // fallback: старый ключ баннера
    var vOld = lsGet(LS_KEY_OLD);
    if (vOld === 'yes') return true;
    if (vOld === 'no') return false;

    // ничего не выбрано
    return null;
  }

  // ----- публичный API -----

  var GAConsent = {
    /**
     * Универсальный метод для мастера:
     * applyChoice(true)  -> пользователь дал согласие
     * applyChoice(false) -> пользователь отказался
     */
    applyChoice: function (granted) {
      granted = !!granted;
      saveChoice(granted);
      applyConsent(granted);
    },

    // Совместимость со старым кодом (если где-то дергается)
    accept: function () {
      GAConsent.applyChoice(true);
    },

    decline: function () {
      GAConsent.applyChoice(false);
    },

    revoke: function () {
      // убрать выбор и вернуть всё к «denied»
      lsRemove(LS_KEY_NEW);
      lsRemove(LS_KEY_OLD);
      applyConsent(false);
    }
  };

  window.GAConsent = GAConsent;

  // ----- инициализация без UI -----

  function init() {
    // читаем, что уже есть в LS (новый или старый ключ)
    var choice = readStoredChoice();

    if (choice === true) {
      // уже есть согласие
      applyConsent(true);
    } else if (choice === false) {
      // уже есть отказ — просто применяем denied
      applyConsent(false);
    } else {
      // выбора ещё не было:
      // оставляем default=denied и ничего не показываем —
      // мастер сам спросит и вызовет GAConsent.applyChoice(...)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
/* ========================= Конец файла: ga.consent.js ========================= */
