/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: app.mistakes.js
 * Назначение: Работа с ошибочными ответами пользователя
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */

(function(){
  'use strict';
  const A = (window.App = window.App || {});

  // Язык тренировки (ru/uk)
  function getTrainLang(){
    try{
      const s = (A.settings && (A.settings.lang || A.settings.uiLang)) || 'ru';
      return (String(s).toLowerCase() === 'uk') ? 'uk' : 'ru';
    }catch(_){ return 'ru'; }
  }

  // Базовая структура: A.mistakes.buckets = { trainLang: { baseDeckKey: { ids:Set, meta:Map } } }
  function ensure(){
    A.mistakes = A.mistakes || {};
    A.mistakes.buckets = A.mistakes.buckets || {};
  }

  function isMistakesDeckKey(deckKey){
    return typeof deckKey === 'string' && deckKey.startsWith('mistakes:');
  }

  function makeKey(trainLang, baseDeckKey){
    return `mistakes:${trainLang}:${baseDeckKey}`;
  }

  function parseKey(key){
    if (!isMistakesDeckKey(key)) return null;
    const parts = String(key).split(':');
    if (parts.length < 3) return null;
    const trainLang = parts[1];
    const baseDeckKey = parts.slice(2).join(':');
    return { trainLang, baseDeckKey };
  }

  // Получить/создать бакет для trainLang + baseDeckKey
  function _bucket(trainLang, baseDeckKey){
    ensure();
    const lang = trainLang || getTrainLang();
    A.mistakes.buckets[lang] = A.mistakes.buckets[lang] || {};
    const byLang = A.mistakes.buckets[lang];
    byLang[baseDeckKey] = byLang[baseDeckKey] || { ids: new Set(), meta: new Map() };
    return byLang[baseDeckKey];
  }

  // Синхронизация с App.state.mistakes (как у избранного)
  function exportState(){
    try{
      ensure();
      var out = {};
      var buckets = A.mistakes && A.mistakes.buckets ? A.mistakes.buckets : {};

      Object.keys(buckets).forEach(function(lang){
        var byLang = buckets[lang] || {};
        var outByLang = {};
        Object.keys(byLang).forEach(function(baseKey){
          var b = byLang[baseKey];
          if (!b || !b.ids || !b.ids.size) return; // пустые не тащим
          var idsArr = Array.from(b.ids || []);
          var metaPlain = {};
          if (b.meta && typeof b.meta.forEach === 'function'){
            b.meta.forEach(function(meta, id){
              if (!meta) meta = {};
              metaPlain[String(id)] = {
                count: meta.count|0,
                last:  meta.last|0
              };
            });
          }
          outByLang[baseKey] = {
            ids: idsArr,
            meta: metaPlain
          };
        });
        if (Object.keys(outByLang).length){
          out[lang] = outByLang;
        }
      });

      return out;
    }catch(_){
      return {};
    }
  }

  function syncToState(){
    try{
      if (!window.App) return;
      var plain = exportState();
      window.App.state = window.App.state || {};
      if (plain && Object.keys(plain).length){
        window.App.state.mistakes = plain;
      } else {
        window.App.state.mistakes = null;
      }
      if (typeof window.App.saveState === 'function'){
        window.App.saveState();
      }
    }catch(_){}
  }

  // Добавить ошибку
  function push(baseDeckKey, wordId, opts){
    try{
      const trainLang = (opts && opts.trainLang) || getTrainLang();
      if (!baseDeckKey || wordId == null) return;

      // ❗ Не копим ошибки во время тренировки "словарей ошибок"
      if (isMistakesDeckKey(baseDeckKey)) return;

      const b = _bucket(trainLang, baseDeckKey);
      const id = String(wordId);
      b.ids.add(id);
      const cur = b.meta.get(id) || { count:0, last:0 };
      cur.count = (cur.count|0) + 1;
      cur.last  = Date.now();
      b.meta.set(id, cur);

      // сохраняем в App.state.mistakes + persist
      syncToState();
    }catch(_){}
  }

  // Удалить все ошибки для конкретного словаря
  function removeDeck(trainLang, baseDeckKey){
    try{
      ensure();
      const lang = trainLang || getTrainLang();
      if (A.mistakes.buckets[lang] && A.mistakes.buckets[lang][baseDeckKey]){
        delete A.mistakes.buckets[lang][baseDeckKey];
        syncToState();
      }
    }catch(_){}
  }

  // Сводка по всем «словарям ошибок»
  function listSummary(){
    ensure();
    const out = [];
    for (const lang of Object.keys(A.mistakes.buckets)){
      const byLang = A.mistakes.buckets[lang] || {};
      for (const baseKey of Object.keys(byLang)){
        const b = byLang[baseKey];
        out.push({
          trainLang: lang,
          baseKey,
          mistakesKey: makeKey(lang, baseKey),
          count: (b.ids ? b.ids.size : 0)
        });
      }
    }
    return out.sort((a,b)=> (a.trainLang.localeCompare(b.trainLang) || a.baseKey.localeCompare(b.baseKey)));
  }

  // Список id слов по языку и базовому ключу
  function getIds(trainLang, baseDeckKey){
    const b = _bucket(trainLang, baseDeckKey);
    return Array.from(b.ids || []);
  }

  // Собрать «словарь ошибок» по ключу mistakes:...
  function resolveDeckForMistakesKey(mKey){
    const parsed = parseKey(mKey);
    if (!parsed) return [];
    const { trainLang, baseDeckKey } = parsed;
    const full = (A.Decks && A.Decks.resolveDeckByKey) ? (A.Decks.resolveDeckByKey(baseDeckKey) || []) : [];
    if (!full.length) return [];
    const ids = new Set(getIds(trainLang, baseDeckKey).map(String));
    return full.filter(w => ids.has(String(w.id)));
  }

  // Импорт структуры «Мои ошибки» из бэкапа / App.state
  function importState(data){
    try{
      if (!data || typeof data !== 'object') return;

      ensure();
      A.mistakes.buckets = A.mistakes.buckets || {};
      var buckets = A.mistakes.buckets;

      Object.keys(data).forEach(function(lang){
        var byLangData = data[lang];
        if (!byLangData || typeof byLangData !== 'object') return;
        var byLang = buckets[lang] = buckets[lang] || {};

        Object.keys(byLangData).forEach(function(baseKey){
          var item = byLangData[baseKey];
          if (!item || !Array.isArray(item.ids)) return;

          var bucket = { ids: new Set(), meta: new Map() };

          item.ids.forEach(function(id){
            bucket.ids.add(String(id));
          });

          if (item.meta && typeof item.meta === 'object'){
            Object.keys(item.meta).forEach(function(id){
              var m = item.meta[id] || {};
              var count = m.count|0;
              var last  = m.last|0;
              bucket.meta.set(String(id), { count: count, last: last });
            });
          }

          byLang[baseKey] = bucket;
        });
      });

      // После импорта тоже синхронизируем в App.state
      syncToState();
    }catch(_){}
  }

  // Попытка восстановить ошибки из App.state при старте (как у избранного)
  try{
    if (A.state && A.state.mistakes){
      importState(A.state.mistakes);
    }
  }catch(_){}

  A.Mistakes = Object.assign({}, A.Mistakes || {}, {
    makeKey: makeKey,
    parseKey: parseKey,
    listSummary: listSummary,
    push: push,
    getIds: getIds,
    removeDeck: removeDeck,
    resolveDeckForMistakesKey: resolveDeckForMistakesKey,
    isMistakesDeckKey: isMistakesDeckKey,
    export: exportState,
    import: importState
  });
})();

/* ========================= Конец файла: app.mistakes.js ========================= */
