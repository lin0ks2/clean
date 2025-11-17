/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: ui.stats.core.js
 * Назначение: Базовая логика вычисления и отображения статистики
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */

(function(){
  'use strict';
  window.App = window.App || {};
  var App = window.App;

  // Базовый объект статистики
  App.Stats = App.Stats || {};
  var Stats = App.Stats;

  /* ====================== ВСПОМОГАТЕЛЬНЫЕ ====================== */

  function ensureStateStore() {
    App.state = App.state || {};
    if (!App.state.activity) {
      App.state.activity = {};
    }
    return App.state.activity;
  }

  function todayKey() {
    var d = new Date();
    var y  = d.getFullYear();
    var m  = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return y + '-' + m + '-' + dd;
  }

  function detectCurrentLang() {
    try {
      if (App.Trainer && typeof App.Trainer.getDeckKey === 'function' &&
          App.Decks  && typeof App.Decks.langOfKey === 'function') {
        var dk = App.Trainer.getDeckKey();
        if (dk) {
          return App.Decks.langOfKey(dk) || null;
        }
      }
    } catch(_) {}
    return null;
  }

  /* ====================== ПУБЛИЧНЫЙ API ======================== */

  /**
   * Инкремент дневной активности.
   * options:
   *   lang      — код языка (de/en/...), если не передан — определим по активной колоде
   *   learned   — сколько слов ДОУЧЕНО (дошли до max stars)
   *   reviewed  — сколько карточек просмотрено/отвечено
   *   seconds   — сколько секунд добавить к счётчику времени
   */
  Stats.bump = function(options) {
    options = options || {};
    var store = ensureStateStore();

    var lang = options.lang || detectCurrentLang();
    if (!lang) {
      lang = '_unknown';
    }

    var dateKey = todayKey();

    if (!store[lang]) store[lang] = {};
    var row = store[lang][dateKey];
    if (!row) {
      row = store[lang][dateKey] = { learned: 0, reviewed: 0, seconds: 0 };
    }

    var learned  = Number(options.learned  || 0);
    var reviewed = Number(options.reviewed || 0);
    var seconds  = Number(options.seconds  || 0);

    if (learned)  row.learned  += learned;
    if (reviewed) row.reviewed += reviewed;
    if (seconds)  row.seconds  += seconds;

    // При желании можно тут дернуть принудительное сохранение стейта
    try {
      if (typeof App._saveStateNow === 'function') App._saveStateNow();
      else if (typeof App.saveState === 'function') App.saveState();
    } catch(_) {}
  };

  /**
   * Получить массив активности по дням для конкретного языка.
   * Возвращает массив вида:
   *   [{ date: '2025-11-10', learned: N, reviewed: M, seconds: S }, ...]
   * options.days — ограничение по количеству последних дней (по умолчанию 30)
   */
  Stats.getDailyActivity = function(lang, options) {
    var store = (App.state && App.state.activity) || {};
    var days  = (options && options.days) || 30;

    if (!lang) {
      lang = detectCurrentLang();
    }
    if (!lang || !store[lang]) return [];

    var langMap = store[lang];
    var keys = Object.keys(langMap).sort(); // по возрастанию дат

    if (keys.length > days) {
      keys = keys.slice(-days); // только последние N
    }

    return keys.map(function(k){
      var row = langMap[k] || {};
      return {
        date: k,
        learned: Number(row.learned  || 0),
        reviewed: Number(row.reviewed || 0),
        seconds: Number(row.seconds  || 0)
      };
    });
  };

  /**
   * Унифицированный триггер пересчёта/перерисовки статистики.
   * Используется после импорта бэкапа и при жизненном цикле приложения.
   */
  Stats.recomputeAndRender = function(opts){
    try { if (typeof window.renderSetStats === 'function') window.renderSetStats(); } catch(e){}
    try { if (typeof window.updateStats === 'function') window.updateStats(); } catch(e){}
    // View.stats.mount() сам возьмёт актуальные данные при переключении на экран
  };

})();
  
/* ========================= Конец файла: ui.stats.core.js ========================= */
