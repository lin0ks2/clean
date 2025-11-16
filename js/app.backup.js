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

  function safeParseJSON(text){
    try{
      return JSON.parse(text);
    }catch(_){
      return null;
    }
  }

  function nowTs(){
    return Date.now ? Date.now() : (+new Date());
  }

  function getApp(){
    return (window.App || {});
  }

  // Простейший escape для HTML-инъекций (если понадобится)
  function escapeHtml(str){
    if (str == null) return '';
    return String(str).replace(/[&<>\"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }

  // ====================== Формат бэкапа ======================
  /*
    Формат JSON:
    {
      "version": "1.1",
      "createdAt": 1730900000000,
      "app": {
        "settings": {...},
        "state": {...},
        "dictRegistry": {...}
      },
      "meta": {
        "learnedCount": 123,
        "totalShown": 456,
        "totalErrors": 78
      }
    }
  */

  function buildBackupObject(){
    const A = getApp();
    const settings = A.settings || {};
    const state    = A.state    || {};
    const dictReg  = A.dictRegistry || {};

    // Страховка от чего-то совсем ломаного
    const backup = {
      version: '1.1',
      createdAt: nowTs(),
      app: {
        settings: settings,
        state: state,
        dictRegistry: dictReg
      },
      meta: {}
    };

    try{
      backup.meta.learnedCount = countLearned(state.stars || {});
      backup.meta.totalShown   = (state.totals && state.totals.shown)  || 0;
      backup.meta.totalErrors  = (state.totals && state.totals.errors) || 0;
    }catch(_){}

    return backup;
  }

  // Защита от отката прогресса — сравниваем "ценность" бэкапа и текущих данных
  function compareProgress(currentState, backupState){
    try{
      const currStars   = (currentState && currentState.stars) || {};
      const backupStars = (backupState && backupState.stars)  || {};

      const currLearned   = countLearned(currStars);
      const backupLearned = countLearned(backupStars);

      const currShown   = (currentState.totals && currentState.totals.shown)  || 0;
      const backupShown = (backupState.totals && backupState.totals.shown)   || 0;

      const currErrors   = (currentState.totals && currentState.totals.errors) || 0;
      const backupErrors = (backupState.totals && backupState.totals.errors)   || 0;

      const currScore   = currLearned * 10 + currShown - currErrors;
      const backupScore = backupLearned * 10 + backupShown - backupErrors;

      return {
        current: { learned: currLearned, shown: currShown, errors: currErrors, score: currScore },
        backup:  { learned: backupLearned, shown: backupShown, errors: backupErrors, score: backupScore }
      };
    }catch(_){
      return null;
    }
  }

  // Показ аккуратного тоста вместо alert
  function showBackupToast(msg){
    let shown = false;
    try{
      if (window.MoyaUpdates && typeof MoyaUpdates.setToast === 'function'){
        MoyaUpdates.setToast(msg, 3000);
        shown = true;
      } else if (window.App && App.UI && typeof App.UI.toast === 'function'){
        App.UI.toast(msg);
        shown = true;
      }
    }catch(_){}
    // Крайний фоллбек — используем App.notify, а затем уже alert, если тосты недоступны
    if (!shown){
      if (window.App && App.notify){
        App.notify({ type: 'info', message: msg });
      } else {
        try{ alert(msg); }catch(_){}
      }
    }
  }

  // Подсчёт количества "выученных" слов по карте звёзд
  function countLearned(stars){
    if (!stars || typeof stars !== 'object') return 0;
    let count = 0;
    const MAX_STAR = 4;
    try{
      for (const k in stars){
        if (!Object.prototype.hasOwnProperty.call(stars, k)) continue;
        const v = stars[k];
        if (v >= MAX_STAR) count++;
      }
    }catch(_){}
    return count;
  }

  // ====================== Экспорт ======================
  function exportBackup(){
    const backup = buildBackupObject();
    const json   = JSON.stringify(backup, null, 2);
    const filename = 'moyamova-backup-' + (new Date().toISOString().slice(0,10)) + '.json';

    downloadString(filename, json);

    try{
      const A = getApp();
      const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
      const isUk = String(lang).toLowerCase() === 'uk';
      const msg = isUk
        ? 'Резервну копію збережено як файл ' + filename
        : 'Резервная копия сохранена как файл ' + filename;
      showBackupToast(msg);
    }catch(_){}
  }

  // ====================== Импорт ======================
  function importBackupFile(file){
    if (!file) return;

    readFileAsText(file, function(err, text){
      if (err){
        console.error('readFileAsText error', err);
        try{
          const A = getApp();
          const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
          const isUk = String(lang).toLowerCase() === 'uk';
          const msg = isUk
            ? 'Помилка читання файлу резервної копії.'
            : 'Ошибка чтения файла резервной копии.';
          showBackupToast(msg);
        }catch(_){}
        return;
      }

      const data = safeParseJSON(text);
      if (!data || typeof data !== 'object' || !data.app){
        try{
          const A = getApp();
          const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
          const isUk = String(lang).toLowerCase() === 'uk';
          const msg = isUk
            ? 'Файл не схожий на резервну копію MOYAMOVA.'
            : 'Файл не похож на резервную копию MOYAMOVA.';
          showBackupToast(msg);
        }catch(_){}
        return;
      }

      const A = getApp();
      const currentState = A.state || {};
      const backupState  = (data.app && data.app.state) || {};

      // Сравним прогресс, чтобы не откатиться назад
      const cmp = compareProgress(currentState, backupState);
      if (cmp && cmp.current && cmp.backup){
        if (cmp.backup.score < cmp.current.score){
          try{
            const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
            const isUk = String(lang).toLowerCase() === 'uk';
            const msg = isUk
              ? 'У файлі резервної копії менше даних, ніж у поточному прогресі. Імпорт скасовано, щоб не втратити вивчені слова.'
              : 'В файле резервной копии меньше данных, чем в текущем прогрессе. Импорт отменён, чтобы вы не потеряли выученные слова.';
            showBackupToast(msg);
          }catch(_){}
          return;
        }
      }

      try{
        A.settings      = data.app.settings || A.settings || {};
        A.state         = data.app.state    || A.state    || {};
        A.dictRegistry  = data.app.dictRegistry || A.dictRegistry || {};

        if (A.saveSettings)     A.saveSettings();
        if (A.saveState)        A.saveState();
        if (A.saveDictRegistry) A.saveDictRegistry();

        const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
        const isUk = String(lang).toLowerCase() === 'uk';
        const msg = isUk
          ? 'Дані успішно відновлено з резервної копії.'
          : 'Данные успешно восстановлены из резервной копии.';
        showBackupToast(msg);

        setTimeout(function(){
          try{ location.reload(); }catch(_){}
        }, 800);
      }catch(e){
        console.error('backup import apply error', e);
        try{
          const lang = (A.settings && (A.settings.uiLang || A.settings.lang)) || 'ru';
          const isUk = String(lang).toLowerCase() === 'uk';
          const msg = isUk
            ? 'Під час імпорту сталася помилка. Дані не змінені.'
            : 'Во время импорта произошла ошибка. Данные не были изменены.';
          showBackupToast(msg);
        }catch(_){}
      }
    });
  }

  window.AppBackup = {
    export: exportBackup,
    importFile: importBackupFile
  };
})();
