/* ==========================================================
 * Project: MOYAMOVA
 * File: ga.consent.js
 * Purpose: GA consent logic without UI (used by setup wizard)
 * Version: 1.0
 * ========================================================== */

(function (root) {
  'use strict';

  var doc = root.document;

  // TODO: подставь сюда свой реальный контейнер/ID из старой версии
  var GTM_ID = 'GTM-XXXXXXX'; // например: 'GTM-ABCD123'
  // Если используешь не GTM, а gtag с measurement-id:
  // var GA_MEASUREMENT_ID = 'G-XXXXXXX';

  var LS_GA_CHOICE = 'mm.gaChoice'; // 'granted' / 'denied'

  var hasLoadedScript = false;

  /* ---------------------------------------
   * LocalStorage
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
   * gtag bootstrap (без UI)
   * ------------------------------------ */

  function ensureDataLayer() {
    root.dataLayer = root.dataLayer || [];
    function gtag() {
      root.dataLayer.push(arguments);
    }
    if (!root.gtag) {
      root.gtag = gtag;
    }
  }

  function setDefaultConsent() {
    ensureDataLayer();
    try {
      root.gtag('consent', 'default', {
        analytics_storage: 'denied'
      });
    } catch (e) {
      // ignore
    }
  }

  function loadGtmOnce() {
    if (hasLoadedScript || !GTM_ID) return;
    hasLoadedScript = true;

    ensureDataLayer();
    root.dataLayer.push({
      'gtm.start': new Date().getTime(),
      event: 'gtm.js'
    });

    var script = doc.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(GTM_ID);
    doc.head.appendChild(script);
  }

  function updateConsent(granted) {
    ensureDataLayer();

    try {
      root.gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied'
      });
    } catch (e) {
      // ignore
    }

    if (granted) {
      loadGtmOnce();
    }
  }

  /* ---------------------------------------
   * Public API for setup wizard
   * ------------------------------------ */

  var GAConsent = {
    /**
     * applyChoice(true)  -> user granted analytics
     * applyChoice(false) -> user denied analytics
     */
    applyChoice: function (granted) {
      granted = !!granted;
      lsSet(LS_GA_CHOICE, granted ? 'granted' : 'denied');
      updateConsent(granted);

      // на всякий случай кидаем событие для других частей кода
      try {
        doc.dispatchEvent(
          new CustomEvent('mm:ga-consent', {
            detail: { granted: granted }
          })
        );
      } catch (e) {
        // ignore
      }
    },

    /**
     * Применить сохранённый выбор (из localStorage)
     */
    applyFromStorage: function () {
      var stored = lsGet(LS_GA_CHOICE, '');
      if (stored === 'granted') {
        updateConsent(true);
      } else if (stored === 'denied') {
        updateConsent(false);
      }
      // если stored пустой — оставляем default = denied
    }
  };

  root.GAConsent = GAConsent;

  /* ---------------------------------------
   * Init: default denied + apply saved choice
   * ------------------------------------ */

  setDefaultConsent();
  GAConsent.applyFromStorage();

  // ВНИМАНИЕ:
  // Раньше здесь, скорее всего, создавался UI-баннер с кнопками.
  // Теперь мы этого НЕ делаем: весь UI перемещён в мастер (ui.setup.modal).

})(window);
