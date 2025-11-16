/* ==========================================================
 * home.js — Главная (глобальный режим + кастомный confirm + очистка ТЕКУЩЕГО СЕТА)
 *  - Режим сложности один на всё приложение (A.settings.level)
 *  - При переключении: кастомный диалог → при согласии очистка ТЕКУЩЕГО СЕТА → запись режима → мягкая перерисовка
 *  - Звёзды: двухфазный рендер (сначала целые, потом половинка наложением)
 *  - Безопасный выбор дефолтной деки + ожидание готовности словарей
 * ========================================================== */
(function () {
  'use strict';
  const A = (window.App = window.App || {});

  /* ----------------------------- Константы ----------------------------- */
  const ACTIVE_KEY_FALLBACK = 'de_verbs';
  const SET_SIZE = (A.Config && A.Config.setSizeDefault) || 40;

  /* ---------------------------- Вспомогательное ожидание ---------------------------- */
  function waitForDecksReady(maxWaitMs = 2000) {
    return new Promise(resolve => {
      const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
      (function tick(){
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (now - t0 > maxWaitMs) {
          return resolve(false);
        }
        try {
          if (A.dictRegistry && A.dictRegistry.items && Object.keys(A.dictRegistry.items).length > 0) {
            return resolve(true);
          }
        } catch (_){}
        setTimeout(tick, 50);
      })();
    });
  }

  /* ----------------------- Получение/сохранение настроек ----------------------- */

  function getUILang(){
    try{
      if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.lang){
        const v = String(document.documentElement.dataset.lang || 'ru').toLowerCase();
        return v === 'uk' ? 'uk' : 'ru';
      }
      if (A.settings && (A.settings.uiLang || A.settings.lang)){
        const v2 = String(A.settings.uiLang || A.settings.lang || 'ru').toLowerCase();
        return v2 === 'uk' ? 'uk' : 'ru';
      }
    }catch(_){}
    return 'ru';
  }

  function getDifficulty(){
    try{
      const lvl = (A.settings && A.settings.difficulty) || 'normal';
      return (lvl === 'hard') ? 'hard' : 'normal';
    }catch(_){}
    return 'normal';
  }

  function setDifficulty(level){
    try{
      if (!A.settings) A.settings = {};
      A.settings.difficulty = level;
      if (A.saveSettings) A.saveSettings();
    }catch(_){}
  }

  function getDeckRegistry(){
    try{
      return A.dictRegistry || { activeKey:'', items:{} };
    }catch(_){}
    return { activeKey:'', items:{} };
  }

  function getActiveDeckKey(){
    const reg = getDeckRegistry();
    if (reg.activeKey && reg.items && reg.items[reg.activeKey]) return reg.activeKey;
    try{
      const keys = Object.keys(reg.items || {});
      if (keys.length) return keys[0];
    }catch(_){}
    return ACTIVE_KEY_FALLBACK;
  }

  function setActiveDeckKey(key){
    try{
      if (!A.dictRegistry) A.dictRegistry = { activeKey:'', items:{} };
      A.dictRegistry.activeKey = key;
      if (A.saveDictRegistry) A.saveDictRegistry();
    }catch(_){}
  }

  /* ----------------------- DOM-элементы ----------------------- */

  const elPage            = document.querySelector('.page-home');
  const elDeckTitle       = elPage && elPage.querySelector('[data-home-deck-title]');
  const elDeckLangFlag    = elPage && elPage.querySelector('[data-home-deck-flag]');
  const elDifficultyToggle= elPage && elPage.querySelector('[data-home-difficulty-toggle]');
  const elDifficultyLabel = elPage && elPage.querySelector('[data-home-difficulty-label]');
  const elSetButtonsWrap  = elPage && elPage.querySelector('[data-home-sets]');
  const elSetStats        = elPage && elPage.querySelector('[data-home-set-stats]');
  const elTrainerCard     = elPage && elPage.querySelector('.trainer-card');
  const elTrainerFront    = elPage && elPage.querySelector('.trainer-card-front');
  const elTrainerBack     = elPage && elPage.querySelector('.trainer-card-back');
  const elTrainerStars    = elPage && elPage.querySelector('.trainer-stars');
  const elTrainerFavBtn   = elPage && elPage.querySelector('.trainer-fav-btn');
  const elTrainerMistBtn  = elPage && elPage.querySelector('.trainer-mist-btn');
  const elTrainerNextBtn  = elPage && elPage.querySelector('.trainer-next-btn');
  const elTrainerPrevBtn  = elPage && elPage.querySelector('.trainer-prev-btn');
  const elTrainerSetIndex = elPage && elPage.querySelector('[data-home-set-index]');
  const elTrainerDeckSize = elPage && elPage.querySelector('[data-home-deck-size]');

  if (!elPage) return;

  /* ----------------------- Состояние тренера для UI ----------------------- */

  let currentDeckKey  = getActiveDeckKey();
  let currentSetIndex = 0;
  let currentCard     = null;
  let currentStats    = null;
  let isFlipped       = false;
  let isBusy          = false;

  /* ---------------------- Рендер текста/лейблов ---------------------- */

  function textDifficultyLabel(level){
    const lang = getUILang();
    if (lang === 'uk'){
      return (level === 'hard')
        ? 'Складний режим 🦅'
        : 'Звичайний режим 🐣';
    }
    return (level === 'hard')
      ? 'Сложный режим 🦅'
      : 'Обычный режим 🐣';
  }

  function textDifficultyExplain(level){
    const lang = getUILang();
    if (lang === 'uk'){
      return (level === 'hard')
        ? 'Більш суворий облік помилок, повільніше зростання зірок.'
        : 'М\'якші штрафи за помилки, швидше зростання зірок.';
    }
    return (level === 'hard')
      ? 'Более строгий учёт ошибок, медленнее рост звёзд.'
      : 'Мягче штрафы за ошибки, быстрее рост звёзд.';
  }

  function textConfirmDifficultyChange(fromLevel, toLevel){
    const lang = getUILang();
    if (lang === 'uk'){
      return (toLevel === 'hard')
        ? 'Переключитися на складний режим? Поточний прогрес набору буде обнулено, щоб не перекручувати статистику.'
        : 'Переключитися на звичайний режим? Поточний прогрес набору буде обнулено, щоб не перекручувати статистику.';
    }
    return (toLevel === 'hard')
      ? 'Переключиться на сложный режим? Текущий прогресс набора будет обнулён, чтобы не искажать статистику.'
      : 'Переключиться на обычный режим? Текущий прогресс набора будет обнулён, чтобы не искажать статистику.';
  }

  /* ---------------------- Кастомный confirm ---------------------- */

  function showConfirm(message, okLabel, cancelLabel){
    return new Promise(resolve=>{
      try{
        if (window.AppConfirm && typeof AppConfirm.open === 'function'){
          AppConfirm.open({
            message,
            okLabel,
            cancelLabel,
            onResult: function(result){
              resolve(!!result);
            }
          });
          return;
        }
      }catch(_){}
      try{
        const r = window.confirm(message);
        resolve(!!r);
      }catch(_){
        resolve(false);
      }
    });
  }

  /* ---------------------- Работа со звёздами ---------------------- */

  function renderStars(starsCount){
    if (!elTrainerStars) return;
    const max = 4;
    const count = Math.max(0, Math.min(max, starsCount || 0));
    let full = '';
    let empty = '';
    for (let i=0;i<count;i++) full  += '★';
    for (let j=count;j<max;j++) empty += '☆';
    elTrainerStars.textContent = full + empty;
  }

  /* ---------------------- Определение деки / сетов ---------------------- */

  function getDeckInfo(deckKey){
    const reg = getDeckRegistry();
    const item = reg.items && reg.items[deckKey];
    if (!item) return null;
    return {
      key:   deckKey,
      title: item.title || '',
      flag:  item.flag  || '',
      langCode: item.langCode || '',
      totalWords: item.size || 0
    };
  }

  function getTotalSets(deckInfo){
    if (!deckInfo || !deckInfo.totalWords) return 0;
    return Math.ceil(deckInfo.totalWords / SET_SIZE);
  }

  function buildSetButtons(deckInfo){
    if (!elSetButtonsWrap) return;
    elSetButtonsWrap.innerHTML = '';

    const totalSets = getTotalSets(deckInfo);
    if (!totalSets){
      elSetButtonsWrap.classList.add('is-empty');
      return;
    }
    elSetButtonsWrap.classList.remove('is-empty');

    for (let i=0;i<totalSets;i++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'set-btn';
      btn.textContent = String(i+1);
      btn.dataset.index = String(i);
      if (i === currentSetIndex) btn.classList.add('is-active');
      elSetButtonsWrap.appendChild(btn);
    }
  }

  function highlightActiveSetButton(){
    if (!elSetButtonsWrap) return;
    const children = elSetButtonsWrap.querySelectorAll('.set-btn');
    children.forEach(btn=>{
      const idx = Number(btn.dataset.index || '0');
      btn.classList.toggle('is-active', idx === currentSetIndex);
    });
  }

  /* ------------------------- Обновление хедера деки ------------------------- */

  function renderDeckHeader(deckInfo){
    if (!deckInfo) return;
    if (elDeckTitle) elDeckTitle.textContent = deckInfo.title || '';
    if (elDeckLangFlag){
      elDeckLangFlag.textContent = deckInfo.flag || '';
      elDeckLangFlag.setAttribute('aria-label', deckInfo.langCode || '');
    }
    if (elTrainerDeckSize) elTrainerDeckSize.textContent = String(deckInfo.totalWords || 0);
  }

  /* ------------------------- Статистика сета ------------------------- */

  function renderSetStats(meta){
    currentStats = meta || null;
    if (!elSetStats) return;
    if (!meta){
      elSetStats.textContent = '';
      return;
    }
    const lang = getUILang();
    const total   = meta.total   || 0;
    const learned = meta.learned || 0;
    if (lang === 'uk'){
      elSetStats.textContent = 'Слів у наборі: ' + total + ' / Вивчено: ' + learned;
    } else {
      elSetStats.textContent = 'Слов в наборе: ' + total + ' / Выучено: ' + learned;
    }
  }

  /* ------------------------- Карта/карточка тренера ------------------------- */

  function renderCard(card){
    currentCard = card || null;
    if (!card){
      if (elTrainerFront) elTrainerFront.textContent = '';
      if (elTrainerBack)  elTrainerBack.textContent  = '';
      renderStars(0);
      return;
    }
    if (elTrainerFront) elTrainerFront.textContent = card.q || '';
    if (elTrainerBack)  elTrainerBack.textContent  = card.a || '';
    renderStars(card.stars || 0);
    if (elTrainerFavBtn){
      const isFav = !!(card.isFav);
      elTrainerFavBtn.classList.toggle('is-fav', isFav);
    }
  }

  function flipCard(force){
    if (!elTrainerCard) return;
    if (typeof force === 'boolean'){
      isFlipped = force;
    } else {
      isFlipped = !isFlipped;
    }
    elTrainerCard.classList.toggle('is-flipped', isFlipped);
  }

  /* ------------------------- Загрузка сета ------------------------- */

  function loadSet(index){
    if (!A.Trainer || typeof A.Trainer.loadSet !== 'function') return;
    isBusy = true;
    elPage.classList.add('is-busy');

    try{
      const payload = A.Trainer.loadSet(currentDeckKey, index, { difficulty: getDifficulty() });
      currentSetIndex = payload.index || index;
      if (elTrainerSetIndex) elTrainerSetIndex.textContent = String(currentSetIndex+1);
      renderSetStats(payload.meta || null);
      renderCard(payload.card || null);
      highlightActiveSetButton();
    }catch(e){
      console.error('[home] loadSet error', e);
    }finally{
      isBusy = false;
      elPage.classList.remove('is-busy');
    }
  }

  /* ------------------------- Ответы ------------------------- */

  function answer(isGood){
    if (!A.Trainer || typeof A.Trainer.answer !== 'function') return;
    if (isBusy) return;
    isBusy = true;
    elPage.classList.add('is-busy');
    try{
      const payload = A.Trainer.answer(!!isGood, { difficulty: getDifficulty() });
      if (payload){
        if (typeof payload.index === 'number'){
          currentSetIndex = payload.index;
          if (elTrainerSetIndex) elTrainerSetIndex.textContent = String(currentSetIndex+1);
          highlightActiveSetButton();
        }
        renderSetStats(payload.meta || null);
        renderCard(payload.card || null);
      }
    }catch(e){
      console.error('[home] answer error', e);
    }finally{
      isBusy = false;
      elPage.classList.remove('is-busy');
    }
  }

  /* ------------------------- Обработчики UI ------------------------- */

  function handleSetClick(e){
    const btn = e.target.closest('.set-btn');
    if (!btn) return;
    const idx = Number(btn.dataset.index || '0');
    if (Number.isNaN(idx)) return;
    if (idx === currentSetIndex) return;
    flipCard(false);
    loadSet(idx);
  }

  function handleCardClick(){
    flipCard();
  }

  function handleFavClick(){
    if (!currentCard) return;
    try{
      const favBtn = elTrainerFavBtn;
      const key    = currentDeckKey;
      const wordId = currentCard.id;

      // Guard: блок добавления в избранное при тренировке "ошибок"
      try {
        var __curKey2 = String(key||'');
        var isMistDeck2 = false;
        if (A.Mistakes && typeof A.Mistakes.isMistakesDeckKey === 'function') {
          isMistDeck2 = !!A.Mistakes.isMistakesDeckKey(__curKey2);
        } else {
          isMistDeck2 = (__curKey2.indexOf('mistakes:')===0) || (__curKey2==='mistakes');
        }
        if (isMistDeck2) {
          var uk2 = (getUILang && getUILang()==='uk');
          var msg2 = uk2
            ? 'Під час тренування помилок додавання заборонено'
            : 'Во время тренировки ошибок добавление запрещено';
          try {
            if (A.toast && typeof A.toast.show === 'function') {
              A.toast.show(msg2);
            } else if (A.notify && typeof A.notify === 'function') {
              A.notify({ type: 'error', message: msg2 });
            } else {
              try { alert(msg2); } catch(_) {}
            }
          } catch(__e){}
          favBtn.classList.add('shake'); setTimeout(function(){ favBtn.classList.remove('shake'); }, 300);
          return;
        }
      } catch(__e) {}

      // Guard: блок добавления в избранное при тренировке "избранного"
      try {
        var __curKey = String(key||'');
        var isFavoritesDeck = (__curKey.indexOf('favorites:')===0) || (__curKey==='fav') || (__curKey==='favorites');
        if (isFavoritesDeck) {
          var uk = (getUILang && getUILang()==='uk');
          var msg = uk ? 'Під час тренування обраного додаванн...ронено' : 'Во время тренировки избранного добавление запрещено';
          try {
            if (A.toast && typeof A.toast.show === 'function') {
              A.toast.show(msg);
            } else if (A.notify && typeof A.notify === 'function') {
              A.notify({ type: 'error', message: msg });
            } else {
              try { alert(msg); } catch(_) {}
            }
          } catch(__e){}
          favBtn.classList.add('shake'); setTimeout(function(){ favBtn.classList.remove('shake'); }, 300);
          return;
        }
      } catch(__e) {}

      if (A.Favorites && typeof A.Favorites.toggle === 'function'){
        A.Favorites.toggle(key, wordId);
      }
    }catch(e){
      console.error('[home] fav click error', e);
    }
  }

  function handleMistClick(){
    if (!currentCard) return;
    try{
      if (A.Mistakes && typeof A.Mistakes.mark === 'function'){
        A.Mistakes.mark(currentDeckKey, currentCard.id);
      }
    }catch(e){
      console.error('[home] mist click error', e);
    }
  }

  function handleNextClick(){
    answer(true);
  }

  function handlePrevClick(){
    answer(false);
  }

  /* ------------------------- Переключатель сложности ------------------------- */

  function initDifficultyToggle(){
    if (!elDifficultyToggle || !elDifficultyLabel) return;
    function render(){
      const lvl = getDifficulty();
      elDifficultyLabel.textContent = textDifficultyLabel(lvl);
      elDifficultyToggle.setAttribute('data-level', lvl);
      elDifficultyToggle.setAttribute('title', textDifficultyExplain(lvl));
    }
    elDifficultyToggle.addEventListener('click', async function(){
      const current = getDifficulty();
      const next    = (current === 'normal') ? 'hard' : 'normal';
      const msg = textConfirmDifficultyChange(current, next);
      const lang = getUILang();
      const okLabel = (lang==='uk') ? 'Переключити' : 'Переключить';
      const cancelLabel = (lang==='uk') ? 'Скасувати' : 'Отмена';
      const ok = await showConfirm(msg, okLabel, cancelLabel);
      if (!ok) return;

      try{
        if (A.Trainer && typeof A.Trainer.clearSetProgress === 'function'){
          A.Trainer.clearSetProgress(currentDeckKey, currentSetIndex);
        }
      }catch(e){
        console.error('[home] clearSetProgress error', e);
      }
      setDifficulty(next);
      render();
      loadSet(currentSetIndex);
    });
    render();
  }

  /* ------------------------- Инициализация ------------------------- */

  function attachEvents(){
    if (elSetButtonsWrap){
      elSetButtonsWrap.addEventListener('click', handleSetClick);
    }
    if (elTrainerCard){
      elTrainerCard.addEventListener('click', handleCardClick);
    }
    if (elTrainerFavBtn){
      elTrainerFavBtn.addEventListener('click', handleFavClick);
    }
    if (elTrainerMistBtn){
      elTrainerMistBtn.addEventListener('click', handleMistClick);
    }
    if (elTrainerNextBtn){
      elTrainerNextBtn.addEventListener('click', handleNextClick);
    }
    if (elTrainerPrevBtn){
      elTrainerPrevBtn.addEventListener('click', handlePrevClick);
    }
  }

  async function init(){
    const ready = await waitForDecksReady();
    if (!ready){
      console.warn('[home] decks not ready in time');
    }
    currentDeckKey = getActiveDeckKey();
    setActiveDeckKey(currentDeckKey);
    const deckInfo = getDeckInfo(currentDeckKey);
    renderDeckHeader(deckInfo);
    buildSetButtons(deckInfo);
    highlightActiveSetButton();
    loadSet(currentSetIndex);
    attachEvents();
    initDifficultyToggle();
  }

  init();

})();
