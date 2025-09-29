/*!
 * app.trainer.js — Lexitron
 * Version: 1.5.0
 * Date: 2025-09-21
 *
 * Purpose:
 *  - Part of the Lexitron web app
 */

(function(){
  const App = window.App;

  // ───────── базовая логика ─────────
  function starsMax(){ return 5; }
  function unlockThreshold(){ return (App && App.Config && App.Config.reverseThreshold) || 2.5; }

  function weightForWord(w){
    const sMax = starsMax();
    const stars = App.clamp(App.state.stars[w.id]||0, 0, sMax);
    const deficit = (sMax - stars);
    const last = App.state.lastSeen[w.id] || 0;
    const elapsedMin = Math.max(0, (Date.now() - last)/60000);
    const recency = Math.min(elapsedMin/3, 5);
    return Math.max(0.1, 1 + 2*deficit + recency);
  }

  function sampleNextIndexWeighted(deck){
    if (!deck || !deck.length) return 0;
    const forbidden = App.state.lastIndex;
    let total = 0;
    const weights = deck.map((w,idx)=>{
      const base = weightForWord(w);
      const penalty = (idx===forbidden) ? 0.0001 : 1;
      const wgt = base * penalty;
      total += wgt; 
      return wgt;
    });
    let r = Math.random()*total;
    for (let i=0;i<deck.length;i++){ r -= weights[i]; if (r<=0) return i; }
    return Math.floor(Math.random()*deck.length);
  }

  // ───────── поддержка наборов ─────────
  function getSetSize(deckKey){ try{ return (App && App.Config && App.Config.setSizeDefault) || 4; }catch(e){ return 4; } } catch(e){}
    return (Number.isFinite(raw) && raw >= 2) ? raw : 4;
  }
  function activeKey(){
    return (App && App.dictRegistry && App.dictRegistry.activeKey) || null;
  }
  function resolveDeckByKey(key){
    try{
      return (App && App.Decks && App.Decks.resolveDeckByKey)
        ? (App.Decks.resolveDeckByKey(key) || [])
        : [];
    }catch(e){ return []; }
  }

  function getBatchIndex(deckKey, totalOpt){
    const key = deckKey || activeKey();
    const setSize = getSetSize();

    let total = totalOpt;
    if (!Number.isFinite(total)) {
      const deck = resolveDeckByKey(key);
      total = Math.max(1, Math.ceil(deck.length / setSize));
    }

    App.state = App.state || {};
    App.state.setByDeck = App.state.setByDeck || {};
    let idx = App.state.setByDeck[key] | 0;

    if (idx < 0) idx = 0;
    if (total > 0 && idx >= total) idx = total - 1;
    return idx;
  }

  function setBatchIndex(i, deckKey){
    const key = deckKey || activeKey();
    const setSize = getSetSize();
    const deck = resolveDeckByKey(key);
    const total = Math.max(1, Math.ceil(deck.length / setSize));

    let idx = (i|0);
    if (idx < 0) idx = 0;
    if (idx >= total) idx = total - 1;

    App.state = App.state || {};
    App.state.setByDeck = App.state.setByDeck || {};
    App.state.setByDeck[key] = idx;
    if (typeof App.saveState === 'function') App.saveState();
    return idx;
  }

  function getBatchesMeta(deckKey){
    const key = deckKey || activeKey();
    const deck = resolveDeckByKey(key);
    const setSize = getSetSize();

    const total = Math.max(1, Math.ceil(deck.length / setSize));
    const active = getBatchIndex(key, total);

    const completed = new Array(total).fill(false);
    const stars = (App && App.state && App.state.stars) || {};
    const repeats = starsMax();

    for (let i=0;i<total;i++){
      const start = i * setSize;
      const end = Math.min(deck.length, start + setSize);
      let done = (end > start);
      for (let j=start; j<end; j++){
        const w = deck[j];
        if (!w) { done = false; break; }
        const s = stars[w.id] || 0;
        if (s < repeats) { done = false; break; }
      }
      completed[i] = done;
    }
    return { total, active, completed };
  }

  function getDeckSlice(deckKey){
    const key = deckKey || activeKey();
    const deck = resolveDeckByKey(key);
    const setSize = getSetSize();
    const total = Math.max(1, Math.ceil(deck.length / setSize));
    const idx = getBatchIndex(key, total);
    const start = idx * setSize;
    const end = Math.min(deck.length, start + setSize);
    const slice = deck.slice(start, end);
    return slice.length ? slice : deck;
  }

  
  // ───────── экспорт API тренера ─────────
  App.Trainer = Object.assign({}, App.Trainer || {}, {
    starsMax,
    unlockThreshold,
    sampleNextIndexWeighted,
    // наборы:
    getSetSize,
    getBatchIndex,
    setBatchIndex,
    getBatchesMeta,
    getDeckSlice,
    safeGetDeckSlice: function(deckKey){ try{ return getDeckSlice(deckKey); } catch(e){ return resolveDeckByKey(deckKey||activeKey()); } }
  });

  if (!App.Trainer.sampleNextIndexWeighted && App.Trainer.pickNextIndexWeighted) {
    App.Trainer.sampleNextIndexWeighted = App.Trainer.pickNextIndexWeighted;
  }
})();
/* -------------------------------  К О Н Е Ц  ------------------------------- */

/* ---- MERGED FROM: trainer.medium.patch.js, stars.rules.patch.js, app.addon.penalties.js ---- */
/*!
 * trainer.medium.patch.js
 * Version: 1.6.1
 *  - Reverse unlock threshold = 2.5 stars
 *  - Anti-repeat buffer for 5 последних слов
 *  Подключать после app.trainer.js и app.ui.view.js
 */
(function(){
  'use strict';
  if (!window.App) window.App = {};
  if (!App.Trainer) App.Trainer = {};

  // порог реверса
  try { App.Trainer.unlockThreshold = function(){ return 2.5; }; } catch(_){}

  // анти-повтор
  var recent = []; var K = 5;
  function remember(id){
    if (id==null) return;
    id = String(id);
    var i = recent.indexOf(id);
    if (i>=0) recent.splice(i,1);
    recent.push(id);
    while(recent.length>K) recent.shift();
  }
  App.Trainer.rememberShown = remember;
  App.Trainer._recentShown = recent;

  function wrapPicker(obj,name){
    try{
      var orig = obj && obj[name];
      if (typeof orig!=='function') return false;
      obj[name] = function(){
        var res = orig.apply(this, arguments);
        try{
          if (Array.isArray(res)){
            var pool = res.filter(w=>{
              var wid = w && w.id!=null ? String(w.id) : null;
              return !wid || recent.indexOf(wid)===-1;
            });
            return pool.length ? pool : res;
          }else if(res && typeof res==='object'){
            if (Array.isArray(res.candidates)){
              var pool = res.candidates.filter(w=>{
                var wid = w && w.id!=null ? String(w.id) : null;
                return !wid || recent.indexOf(wid)===-1;
              });
              if (pool.length) res.candidates = pool;
            }
            return res;
          }
          return res;
        }catch(e){ return res; }
      };
      return true;
    }catch(_){ return false; }
  }
  wrapPicker(App.Trainer,'pickNext') || wrapPicker(App.Trainer,'nextCandidates') || wrapPicker(App.Trainer,'next');

  // слушатель события
  document.addEventListener('lexitron:word-shown',e=>{
    var w=e&&e.detail&&e.detail.word;
    if(w&&w.id!=null) remember(w.id);
  });
})();


/*!
 * stars.rules.patch.js
 * Version: 1.6.1
 *  - +0.5 звезды за правильный ответ
 *  - –0.5 за «Не знаю» (не ниже 0)
 *  Подключать после app.ui.view.js
 */
(function(){
  'use strict';
  function max(){ try{ return (App && App.Trainer && App.Trainer.starsMax())||5; }catch(_){return 5;} }
  function clamp(x){ return Math.max(0, Math.min(max(), x)); }

  function get(id){ try{ return (App.state?.stars?.[id])||0; }catch(_){return 0;} }
  function set(id,v){
    try{
      if(!App.state) App.state={};
      if(!App.state.stars) App.state.stars={};
      App.state.stars[id]=v;
      App.saveState && App.saveState();
    }catch(_){}
  }

  function onCorrect(id){ if(id==null)return; set(id,clamp(get(id)+0.5)); }
  function onIdk(id){ if(id==null)return; set(id,clamp(get(id)-0.5)); }

  window.StarsRules={onCorrect,onIdk};

  document.addEventListener('lexitron:answer-correct',e=>{ var w=e?.detail?.word; if(w)onCorrect(w.id); });
  document.addEventListener('lexitron:idk',e=>{ var w=e?.detail?.word; if(w)onIdk(w.id); });
})();


/*!
 * app.addon.penalties.js — Lexitron
 * Version: 1.5.0
 * Date: 2025-09-21
 *
 * Purpose:
 *  - Part of the Lexitron web app
 */

(function(){
  const App = window.App || (window.App = {});
  const P = App.Penalties = App.Penalties || {};
  const LS = 'penalties.v1';
  const now = ()=>Date.now();

  const defaultState = ()=>({ failures:{}, idk:{}, lastWrong:{} });
  P.state = defaultState();

  function load(){
    try{
      const raw = localStorage.getItem(LS);
      if (raw){
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') P.state = Object.assign(defaultState(), parsed);
      }
    }catch(e){}
  }
  function save(){
    try{ localStorage.setItem(LS, JSON.stringify(P.state)); }catch(e){}
  }

  P.onWrong = function(id){
    id = String(id);
    P.state.failures[id] = (P.state.failures[id]||0)+1;
    P.state.lastWrong[id] = now();
    save();
  };
  P.onIDK = function(id){
    id = String(id);
    P.state.idk[id] = (P.state.idk[id]||0)+1;
    P.state.lastWrong[id] = now();
    save();
  };

  function decay(ts){
    if (!ts) return 1.0;
    const days = (now()-ts)/(1000*60*60*24);
    const tau = 3.0; // 3 дня — полураспад влияния
    const factor = Math.exp(-days/tau);
    return Math.max(0.3, factor); // не опускаем влияние ниже 0.3
  }

  // Вес для сэмплера
  P.weightFor = function(id){
    id = String(id);
    const f = P.state.failures[id]||0;
    const k = P.state.idk[id]||0;
    const d = decay(P.state.lastWrong[id]);
    // базовая формула: 1 + 0.6*f + 0.4*k, с затуханием
    const w = (1 + 0.6*f + 0.4*k) * d;
    return Math.max(1, w);
  };

  // Вероятность реверса (добавка к базовой логике)
  P.reverseProbFor = function(id){
    id = String(id);
    const f = P.state.failures[id]||0;
    const d = decay(P.state.lastWrong[id]);
    const p = 0.05 + 0.03*f; // 5% базово, +3% за каждую ошибку
    return Math.max(0, Math.min(0.35, p * d));
  };

  load();
})();
/* -------------------------------  К О Н Е Ц  ------------------------------- */

