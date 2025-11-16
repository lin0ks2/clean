'use strict';
/*
 * app.backup.js
 * Экспорт / импорт состояния приложения MOYAMOVA
 * База: финальная версия 2025-11-06
 * + расширенный формат бэкапа (избранное, ошибки, статистика, сеты)
 * + защита от отката прогресса (ROLLBACK-GUARD BLOCK)
 */

(function(){
  // ====================== Вспомогательные ======================
  function downloadString(filename, text){
    try{
      const blob = new Blob([text], {type: 'application/json;charset=utf-8'});
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'moyamova-backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function(){ URL.revokeObjectURL(url); }, 2000);
    }catch(e){
      console.error('downloadString error', e);
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
        badFile: 'Файл не похож на резервную копию MOYAMOVA.',
        readError: 'Ошибка чтения файла резервной копии.',
        tooOld: 'В файле резервной копии меньше выученных слов, чем у вас сейчас. Импорт отменён, чтобы не потерять прогресс.',
        error: 'Ошибка импорта данных'
      },
      uk: {
        badFile: 'Файл не схожий на резервну копію MOYAMOVA.',
        readError: 'Помилка читання файлу резервної копії.',
        tooOld: 'У файлі резервної копії менше вивчених слів, ніж у вас зараз. Імпорт скасовано, щоб не втратити прогрес.',
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
    // Крайний фоллбек — если фирменные тосты недоступны
    if (!shown){
      if (window.App && App.notify){
        App.notify({ type: 'error', message: msg });
      } else {
        try{ alert(msg); }catch(_){}
      }
    }
  }

  // Подсчёт количества "выученных" слов по карте звёзд
  function countLearned(stars){
    if (!stars || typeof stars !== 'object') return 0;
    var count = 0;
    var MAX_STAR = 4;
    try{
      for (var k in stars){
        if (!Object.prototype.hasOwnProperty.call(stars, k)) continue;
        var v = stars[k];
        if (v >= MAX_STAR) count++;
      }
    }catch(_){}
    return count;
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
      version: '1.1',
      createdAt: Date.now(),
      settings: App.settings || {},
      state: App.state || {},
      dictRegistry: App.dictRegistry || {},
      favorites: null,
      mistakes: null,
      stats: null,
      sets: null
    };

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
      if (App.Sets && typeof App.Sets.exportState === 'function'){
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
              showBackupErrorToast('readError');
              return;
            }
            var data = safeParse(txt);
            if (!data || typeof data !== 'object'){
              showBackupErrorToast('badFile');
              return;
            }

            try{
              var App = window.App || {};
              var currentState = App.state || {};
              var backupState  = data.state || {};

              var currLearned   = countLearned(currentState.stars || {});
              var backupLearned = countLearned(backupState.stars || {});

              if (backupLearned < currLearned){
                showBackupErrorToast('tooOld');
                return;
              }

              App.settings     = data.settings || App.settings || {};
              App.state        = data.state    || App.state    || {};
              App.dictRegistry = data.dictRegistry || App.dictRegistry || {};

              if (data.favorites && App.Favorites && typeof App.Favorites.import === 'function'){
                App.Favorites.import(data.favorites);
              }
              if (data.mistakes && App.Mistakes && typeof App.Mistakes.import === 'function'){
                App.Mistakes.import(data.mistakes);
              }
              if (data.stats && App.Stats && typeof App.Stats.import === 'function'){
                App.Stats.import(data.stats);
              }
              if (data.sets && App.Sets && typeof App.Sets.importState === 'function'){
                App.Sets.importState(data.sets);
              }

              if (App.saveSettings) App.saveSettings();
              if (App.saveState) App.saveState();
              if (App.saveDictRegistry) App.saveDictRegistry();

              try{
                var lang = resolveLangForErrors();
                var okMsg = (lang === 'uk')
                  ? 'Дані успішно відновлено з резервної копії. Сторінка буде перезавантажена.'
                  : 'Данные успешно восстановлены из резервной копии. Страница будет перезагружена.';
                if (window.App && App.notify){
                  App.notify({ type: 'info', message: okMsg });
                } else {
                  alert(okMsg);
                }
              }catch(_){}

              setTimeout(function(){
                try{ location.reload(); }catch(_){}
              }, 800);
            }catch(e){
              console.error('Backup import failed:', e);
              showBackupErrorToast('error');
            }
          });
        }
        document.body.removeChild(input);
      }, { once:true });

      input.click();
    }catch(e){
      console.error('Backup import start failed:', e);
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

})();
