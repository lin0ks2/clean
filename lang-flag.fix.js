/*!
 * lang-flag.fix.js — keeps header language flag in sync
 * Version: 1.6.1
 */
(function(){
  'use strict';

  function currentLang(){
    try{
      if (window.App && App.settings && App.settings.lang)
        return String(App.settings.lang).toLowerCase();
      var ls = localStorage.getItem('lexitron.uiLang');
      if (ls) return String(ls).toLowerCase();
    }catch(_){}
    return 'ru';
  }

  function flagFor(lang){
    lang = (lang||'ru').toLowerCase();
    return (lang.indexOf('uk')===0)
      ? {flag:'🇺🇦', title:'Українська мова'}
      : {flag:'🇷🇺', title:'Русский язык'};
  }

  function applyFlag(){
    try{
      var el = document.getElementById('langToggleBtn');
      if (!el) return;
      var meta = flagFor(currentLang());
      el.textContent = meta.flag;
      el.setAttribute('title', meta.title);
      el.setAttribute('aria-label', meta.title);
    }catch(_){}
  }

  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',applyFlag,{once:true});
  }else{
    applyFlag();
  }

  document.addEventListener('i18n:lang-changed',applyFlag);
  document.addEventListener('lexitron:setup:done',applyFlag);
  document.addEventListener('visibilitychange',function(){
    if(!document.hidden) applyFlag();
  });

})();
