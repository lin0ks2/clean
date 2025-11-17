/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: app.backup.js
 * Назначение: Резервные/старые функции приложения (не используется в продакшене)
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */
'use strict';

(function(){
  // ====================== Вспомогательные ======================
  function downloadString(filename, text){
    try{
      const blob = new Blob([text], {type: 'application/json;charset=utf-8'});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      // iOS / PWA fallback — открываем JSON во вкладке, если download не сработает
      a.target = '_blank';
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      setTimeout(function(){
        URL.revokeObjectURL(url);
        a.remove();
      }, 1500);
      return true;
    }catch(e){
      console.error('Backup download failed:', e);
      try {
        // последняя надежда — открыть JSON во вкладке
        window.open('data:application/json;charset=utf-8,' + encodeURIComponent(text), '_blank');
      }catch(_){}
      return false;
    }
  }

  function readFileAsText(file, callback){
    try{
      const reader = new FileReader();
      reader.onload = function(ev){
        callback(null, (ev && ev.target && ev.target.result) || '');
      };
      reader.onerror = function(err){
        callback(err || new Error('FileReader error'));
      };
      reader.readAsText(file, 'utf-8');
    }catch(e){
      callback(e);
    }
  }

  function safeParse(json){
    try{ return JSON.parse(json); }catch(_){ return null; }
  }

  // --------- Локализация ошибок (RU / UK) ---------
  function resolveLangForErrors(){
    var l = 'ru';
    try{
      if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.lang){
        l = String(document.documentElement.dataset.lang || '').toLowerCase();
      } else if (window.App && App.settings && (App.settings.lang || App.settings.uiLang)){
        l = String(App.settings.lang || App.settings.uiLang).toLowerCase();
      }
    }catch(_){}
    if (l === 'ua') l = 'uk';
    if (l !== 'ru' && l !== 'uk') l = 'ru';
    return l;
  }

  function getErrorTexts(){
    var lang = resolveLangForErrors();
    var dict = {
      ru: {
        badFile: 'Файл повреждён или имеет неверный формат.',
        tooSmall: 'В этом резервном файле меньше выученных слов, чем у вас сейчас. Импорт отменён, чтобы не потерять прогресс.',
        error: 'Ошибка импорта данных'
      },
      uk: {
        badFile: 'Файл пошкоджено або він має некоректний формат.',
        tooSmall: 'У цій резервній копії менше вивчених слів, ніж у вас зараз. Імпорт скасовано, щоб не втратити прогрес.',
        error: 'Помилка імпорту даних'
      }
    };
    return dict[lang] || dict.ru;
  }

  function showBackupErrorToast(keyOrMessage){
    var dict = getErrorTexts();
    var msg = dict[keyOrMessage] || keyOrMessage;
    var shown = false;
    try{
      if (window.MoyaUpdates && typeof MoyaUpdates.setToast === 'function'){
        MoyaUpdates.setToast(msg, 3000);
        shown = true;
      } else if (window.App && App.UI && typeof App.UI.toast === 'function'){
        App.UI.toast(msg);
        shown = true;
      }
    }catch(_){}
    // Крайний фоллбек — системный alert, если тосты по какой-то причине недоступны
    if (!shown){
      try{ alert(msg); }catch(_){}
    }
  }

  // Подсчёт количества "выученных" слов по карте звёзд
  function countLearned(stars){
    if (!stars || typeof stars !== 'object') return 0;
    var total = 0;
    var maxStars = 5;
    try{
      Object.keys(stars).forEach(function(key){
        var v = stars[key];
        if (typeof v === 'number' && v >= maxStars){
          total++;
        }
      });
    }catch(_){}
    return total;
  }

  // ====================== Экспорт ======================
  function buildFilename(){
    var now = new Date();
    function pad(n){ return n < 10 ? '0'+n : ''+n; }
    var y = now.getFullYear();
    var m = pad(now.getMonth()+1);
    var d = pad(now.getDate());
    var hh = pad(now.getHours());
    var mm = pad(now.getMinutes());
    var ss = pad(now.getSeconds());
    return 'moyamova-backup-' + y + '-' + m + '-' + d + '-' + hh + '-' + mm + '-' + ss + '.json';
  }

  function buildPayload(){
    var App = window.App || {};
    var payload = {
      meta: {
        app: 'MOYAMOVA',
        version: App.version || App.APP_VER || '1.0',
        time: new Date().toISOString()
      },
      settings: App.settings || {},
      state: App.state || {},
      dicts: App.dictRegistry || {}
    };

    // --- дополнительно: виртуальные словари и статистика ---
    try{
      if (App.Favorites && typeof App.Favorites.export === 'function'){
        payload.favorites = App.Favorites.export();
      }
    }catch(_){}
    try{
      if (App.Mistakes && typeof App.Mistakes.export === 'function'){
        payload.mistakes = App.Mistakes.export();
      }
    }catch(_){}
    try{
      if (App.Stats && typeof App.Stats.export === 'function'){
        payload.stats = App.Stats.export();
      }
    }catch(_){}
    try{
      if (App.Sets && App.Sets.state){
        // сохраняем "сырое" состояние сетов
        payload.sets = JSON.parse(JSON.stringify(App.Sets.state));
      }
    }catch(_){}

    return payload;
  }

  // ====================== Публичный API ======================
  window.App = window.App || {};
  App.Backup = App.Backup || {};

  App.Backup.export = function(){
    try{
      var payload  = buildPayload();
      var json     = JSON.stringify(payload, null, 2);
      var filename = buildFilename();
      downloadString(filename, json);
    }catch(e){
      console.error('Backup export failed:', e);
    }
  };

  App.Backup.import = function(){
    try{
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json,.json';
      // iOS-safe скрытие
      input.style.position = 'fixed';
      input.style.left = '-9999px';
      input.style.top = '0';
      input.style.width = '1px';
      input.style.height = '1px';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      document.body.appendChild(input);

      input.addEventListener('change', function(ev){
        const f = ev && ev.target && ev.target.files && ev.target.files[0];
        if (f){
          readFileAsText(f, function(err, txt){
            if (err){
              console.error(err);
              showBackupErrorToast('error');
              return;
            }
            const raw = safeParse(txt);
            if (!raw || typeof raw !== 'object'){
              showBackupErrorToast('badFile');
              return;
            }

            // лёгкая валидация структуры бэкапа
            if (!raw.meta || raw.meta.app !== 'MOYAMOVA' ||
                !raw.state || typeof raw.state !== 'object'){
              showBackupErrorToast('badFile');
              return;
            }

            const data = raw;

            // =====================================================
            // === ROLLBACK-GUARD BLOCK — ЗАЩИТА ОТ ОТКАТА ПРОГРЕССА
            // === Тут можно менять поведение тостов/перезагрузки,
            // === не трогая остальной код импорта.
            // =====================================================
            (function rollbackGuard(){
              const currentStars  = (App.state && App.state.stars) || {};
              const incomingStars = (data.state && data.state.stars) || {};
              const curLearned = countLearned(currentStars);
              const newLearned = countLearned(incomingStars);

              if (newLearned < curLearned){
                // показываем сообщение о том, что в бэкапе меньше выученных слов
                showBackupErrorToast('tooSmall');

                // 3) Мягкая перезагрузка, как после успешного бэкапа/обновлений
                try { sessionStorage.setItem('moya_upgrading', '1'); } catch(_){}
                setTimeout(function(){
                  try { location.reload(); } catch(_){}
                }, 1200);

                // Обрезаем импорт — состояние не трогаем
                throw new Error('Backup blocked: fewer learned words than current state');
              }
            })();
            // ==================== END ROLLBACK-GUARD BLOCK ====================

            // === Восстановление в память (если защита не сработала) ===
            if (data.settings) window.App.settings = data.settings;
            if (data.state)    window.App.state    = data.state;
            if (data.dicts)    window.App.dictRegistry = data.dicts;

            // Виртуальные словари и статистика
            try{
              if (data.favorites && App.Favorites && typeof App.Favorites.import === 'function'){
                App.Favorites.import(data.favorites);
              }
            }catch(_){}
            try{
              if (data.mistakes && App.Mistakes && typeof App.Mistakes.import === 'function'){
                App.Mistakes.import(data.mistakes);
              }
            }catch(_){}
            try{
              if (data.stats && App.Stats && typeof App.Stats.import === 'function'){
                App.Stats.import(data.stats);
              }
            }catch(_){}
            try{
              if (data.sets && App.Sets && typeof App.Sets._restore === 'function'){
                App.Sets._restore(data.sets);
              } else if (data.sets && App.Sets && App.Sets.state){
                App.Sets.state = data.sets;
              }
            }catch(_){}

            // Сохраняем всё в localStorage
            try{
              if (App.saveSettings) App.saveSettings();
            }catch(_){}
            try{
              if (App.saveState) App.saveState();
            }catch(_){}
            try{
              if (App.saveDictRegistry) App.saveDictRegistry();
            }catch(_){}
            try{
              if (App.Sets && typeof App.Sets._save === 'function') App.Sets._save();
            }catch(_){}

            // Локализация текстов прогресса восстановления
            (function(){
              function resolveLang(){
                var l='ru';
                try{
                  if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.lang){
                    l = String(document.documentElement.dataset.lang || '').toLowerCase();
                  } else if (window.App && App.settings && (App.settings.lang || App.settings.uiLang)){
                    l = String(App.settings.lang || App.settings.uiLang).toLowerCase();
                  }
                  if (l==='ua') l='uk';
                  if (l!=='ru' && l!=='uk') l='ru';
                  return l;
                }catch(_){}
                return 'ru';
              }
              function T(lang){
                var D={
                  ru:{restoring:'Восстанавливаю данные…', done:'Готово', reloading:'Перезапускаю…',  error:'Ошибка импорта данных'},
                  uk:{restoring:'Відновлюю дані…',       done:'Готово', reloading:'Перезапускаю…',  error:'Помилка імпорту даних'}
                }; return D[lang]||D.ru;
              }
              var dict = T(resolveLang());
              try{
                if (window.MoyaUpdates && typeof MoyaUpdates.setToast==='function') {
                  MoyaUpdates.setToast(dict.restoring);
                  if (typeof MoyaUpdates.showOverlay==='function') MoyaUpdates.showOverlay(true);
                } else if (window.App && App.UI && typeof App.UI.toast==='function'){
                  App.UI.toast(dict.restoring);
                }
              }catch(_){}
              try{ sessionStorage.setItem('moya_upgrading','1'); }catch(_){}
              setTimeout(function(){
                try{
                  if (window.MoyaUpdates && typeof MoyaUpdates.setToast==='function') MoyaUpdates.setToast(dict.done);
                  else if (window.App && App.UI && typeof App.UI.toast==='function') App.UI.toast(dict.done);
                }catch(_){}
                setTimeout(function(){
                  try{
                    if (window.MoyaUpdates && typeof MoyaUpdates.setToast==='function') MoyaUpdates.setToast(dict.reloading);
                    else if (window.App && App.UI && typeof App.UI.toast==='function') App.UI.toast(dict.reloading);
                  }catch(_){}
                  setTimeout(function(){
                    try{ location.reload(); }catch(_){}
                  }, 600);
                }, 60);
              }, 600);
            })();

          });
        }
        setTimeout(function(){ input.remove(); }, 0);
      });

      input.click();
    }catch(e){
      console.error('Backup import failed:', e);
      showBackupErrorToast('error');
    }
  };

  // ====================== Автопривязка кнопок ======================
  (function bindBackupButtons(){
    function bind(){
      const exp = document.querySelector('.backup-btn[data-action="export"]');
      const imp = document.querySelector('.backup-btn[data-action="import"]');
      if (exp) exp.addEventListener('click', ()=> App.Backup.export && App.Backup.export());
      if (imp) imp.addEventListener('click', ()=> App.Backup.import && App.Backup.import());
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
  })();

})()
/* ========================= Конец файла: app.backup.js ========================= */
