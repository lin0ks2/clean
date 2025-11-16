/* ==========================================================
 * app.core.js
 * Базовая инициализация приложения MOYAMOVA
 * ========================================================== */

(function(){
  const App = window.App = (window.App||{});

  /**
   * Унифицированное уведомление пользователя.
   * Ставит брендированный тост, при его отсутствии — пытается использовать fallback,
   * в самом крайнем случае показывает alert.
   *
   * Использование:
   *   App.notify('Сообщение');
   *   App.notify({ type: 'error', message: 'Ошибка импорта' });
   */
  App.notify = function notify(options) {
    const root = (typeof window !== 'undefined' ? window : globalThis);
    const msg = (typeof options === 'string')
      ? options
      : options && options.message;

    const type = (options && options.type) || 'info';

    if (!msg) return;

    try {
      if (App.toast && typeof App.toast.show === 'function') {
        App.toast.show({ type, message: msg });
        return;
      }

      if (root.Toast && typeof root.Toast.show === 'function') {
        root.Toast.show({ type, message: msg });
        return;
      }

      try { alert(msg); } catch (_) {}
    } catch (_) {
      try { alert(msg); } catch (__) {}
    }
  };

  App.APP_VER = '1.1';

  const LS_SETTINGS = 'k_settings_v1_3_1';
  const LS_STATE    = 'k_state_v1_3_1';
  const LS_DICTS    = 'k_dicts_v1_3_1';

  const I18N_FALLBACK = window.I18N;

  App.settings = loadSettings();

try{
  var __lang = (App.settings && (App.settings.uiLang || App.settings.lang)) || 'ru';
  __lang = String(__lang).toLowerCase();
  if (__lang !== 'ru' && __lang !== 'uk'){ __lang = 'ru'; }
  document.documentElement.dataset.lang = __lang;
}catch(_){}
  
  App.state = loadState() || {
    index:0,lastIndex:-1,favorites:{},stars:{},successes:{},
    lastShownWordId:null, totals:{shown:0,errors:0}, lastSeen:{}
  };
App._deckKey = function(){ try{ return (App.dictRegistry && App.dictRegistry.activeKey) || ''; }catch(_){ return ''; } };
App.starKey = function(wid, dk){
  dk = dk || App._deckKey();
  return (dk ? (String(dk)+':') : '') + String(wid);
};

  App.dictRegistry = loadDictRegistrySafe();
  try{
    if (!App.dictRegistry || typeof App.dictRegistry !== 'object'){
      App.dictRegistry = {
        activeKey:'',
        items:{}
      };
    }
  }catch(_){
    App.dictRegistry = {activeKey:'',items:{}};
  }

  const KEY_LAST_UPDATE = 'k_last_update_info';
  try{
    var updRaw = localStorage.getItem(KEY_LAST_UPDATE);
    App.lastUpdateInfo = updRaw ? JSON.parse(updRaw) : null;
  }catch(_){
    App.lastUpdateInfo = null;
  }

  function loadSettings(){
    try{
      const raw = localStorage.getItem(LS_SETTINGS);
      if (!raw) return {
        lang: 'ru',
        uiLang: 'ru',
        theme: 'auto',
        difficulty: 'normal',
        consentGA: null
      };
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('settings not object');
      if (!data.lang) data.lang = 'ru';
      if (!data.uiLang) data.uiLang = data.lang || 'ru';
      if (!data.theme) data.theme = 'auto';
      if (!data.difficulty) data.difficulty = 'normal';
      return data;
    }catch(_){
      return {
        lang: 'ru',
        uiLang: 'ru',
        theme: 'auto',
        difficulty: 'normal',
        consentGA: null
      };
    }
  }

  function saveSettings(){
    try{
      localStorage.setItem(LS_SETTINGS, JSON.stringify(App.settings));
    }catch(_){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(LS_STATE);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('state not object');
      return data;
    }catch(_){
      return null;
    }
  }

  function saveState(){
    try{
      localStorage.setItem(LS_STATE, JSON.stringify(App.state));
    }catch(_){}
  }

  function loadDictRegistrySafe(){
    try{
      const raw = localStorage.getItem(LS_DICTS);
      if (!raw) return { activeKey:'', items:{} };
      const data = JSON.parse(raw);
      if (!data || typeof data !== 'object') throw new Error('dicts not object');
      if (!data.items || typeof data.items !== 'object'){
        data.items = {};
      }
      if (!data.activeKey) data.activeKey = '';
      return data;
    }catch(_){
      return { activeKey:'', items:{} };
    }
  }

  function saveDictRegistry(){
    try{
      localStorage.setItem(LS_DICTS, JSON.stringify(App.dictRegistry));
    }catch(_){}
  }

  App.saveSettings = saveSettings;
  App.saveState = saveState;
  App.saveDictRegistry = saveDictRegistry;

  App.setUILang = function(lang){
    try{
      App.settings.uiLang = lang;
      saveSettings();
    }catch(_){}
    try{
      document.documentElement.dataset.lang = lang;
    }catch(_){}
  };

  App.setTheme = function(theme){
    App.settings.theme = theme || 'auto';
    saveSettings();
    applyTheme();
  };

  function applyTheme(){
    try{
      const theme = App.settings.theme || 'auto';
      const rootEl = document.documentElement;
      rootEl.dataset.theme = theme;

      if (theme === 'auto'){
        rootEl.classList.remove('theme-light','theme-dark');
      } else if (theme === 'light'){
        rootEl.classList.add('theme-light');
        rootEl.classList.remove('theme-dark');
      } else if (theme === 'dark'){
        rootEl.classList.add('theme-dark');
        rootEl.classList.remove('theme-light');
      }
    }catch(_){}
  }

  App.setDifficulty = function(level){
    App.settings.difficulty = level || 'normal';
    saveSettings();
  };

  App.i18n = function(key, fallback){
    try{
      const lang = (App.settings && (App.settings.uiLang || App.settings.lang)) || 'ru';
      const dict = (window.I18N && window.I18N[lang]) || I18N_FALLBACK && I18N_FALLBACK[lang];
      if (dict && dict[key]) return dict[key];
    }catch(_){}
    return fallback || key;
  };

  applyTheme();

  window.addEventListener('beforeunload', function(){
    try{
      saveSettings();
      saveState();
      saveDictRegistry();
    }catch(_){}
  });

  App.markUpdateApplied = function(info){
    try{
      App.lastUpdateInfo = info || { at: Date.now() };
      localStorage.setItem(KEY_LAST_UPDATE, JSON.stringify(App.lastUpdateInfo));
    }catch(_){}
  };

  App.updateJustApplied = false;
  try{
    if (App.lastUpdateInfo && App.lastUpdateInfo.at){
      const diff = Date.now() - App.lastUpdateInfo.at;
      if (diff >= 0 && diff < 10*60*1000){
        App.updateJustApplied = true;
        App.lastUpdateInfo = null;
        localStorage.removeItem(KEY_LAST_UPDATE);
      }
    }
  }catch(_){}

  if (App.updateJustApplied){
    try{
      var __L=(window.App&&App.settings&&(App.settings.uiLang||App.settings.lang))||'ru';
      __L=String(__L).toLowerCase();
      var msg=(__L==='uk')
        ? 'MOYAMOVA щойно оновлена до нової версії.'
        : 'MOYAMOVA только что обновилась до новой версии.';
      if (App.toast && typeof App.toast.show === 'function'){
        App.toast.show({type:'info',message:msg});
      } else {
        try{ alert(msg); }catch(_){}
      }
    }catch(_){}
  }

  window.App = App;
})();
