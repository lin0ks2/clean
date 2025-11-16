/* app.shell.logic.js — логика оболочки (бургер, футер, темы, SW и пр.) */
(function () {
  'use strict';

  // Высоты header/footer для offcanvas
  function updateHFVars() {
    const h = document.querySelector('.header');
    const f = document.querySelector('.app-footer');
    const rs = document.documentElement.style;
    if (h) rs.setProperty('--header-h-actual', h.getBoundingClientRect().height + 'px');
    if (f) rs.setProperty('--footer-h-actual', f.getBoundingClientRect().height + 'px');
  }
  window.addEventListener('load', updateHFVars);
  window.addEventListener('resize', updateHFVars);

  const burger  = document.getElementById('btnMenu');
  const ocRoot  = document.querySelector('.oc-root');
  const ocPanel = document.querySelector('.oc-panel');
  const overlay = document.querySelector('.app-overlay');

  function openMenu() {
    if (!ocRoot) return;
    document.body.classList.add('menu-open');
    ocRoot.setAttribute('aria-hidden', 'false');
    try {
      ocRoot.querySelector('[data-oc-focus]')?.focus();
    } catch (_) {}
  }

  function closeMenu() {
    if (!ocRoot) return;
    document.body.classList.remove('menu-open');
    ocRoot.setAttribute('aria-hidden', 'true');
  }

  if (burger) {
    burger.addEventListener('click', function () {
      if (document.body.classList.contains('menu-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });
  }

  // Закрытие по ESC
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (document.body.classList.contains('menu-open')) {
        e.preventDefault();
        closeMenu();
      }
    }
  });

  // Клик по overlay — закрыть меню
  if (overlay) {
    overlay.addEventListener('click', function () {
      if (document.body.classList.contains('menu-open')) {
        closeMenu();
      }
    });
  }

  // Клик внутри offcanvas
  if (ocRoot) {
    ocRoot.addEventListener('click', function (e) {
      const closeAttr = e.target && e.target.getAttribute && e.target.getAttribute('data-oc-close');
      if (closeAttr){
        e.preventDefault();
        closeMenu();
      }
    });
  }
  if (overlay) overlay.addEventListener('click', closeMenu);

  // Свайп вправо — закрыть меню
  (function(){
    let startX = null;
    if (!ocPanel) return;
    ocPanel.addEventListener('touchstart', (e)=>{ startX = e.touches[0].clientX; }, {passive:true});
    ocPanel.addEventListener('touchend', (e)=>{
      if (startX == null) return;
      const endX = (e.changedTouches[0]||{}).clientX || 0;
      if (endX - startX > 30) closeMenu();
      startX = null;
    });
  })();

  // Edge-свайп от правого края — открыть меню
  (function(){
    let startX = null, startedAtEdge = false;
    const EDGE = 16;
    document.addEventListener('touchstart', (e)=>{
      if (document.body.classList.contains('menu-open')) return;
      startX = e.touches[0].clientX;
      const vw = window.innerWidth;
      startedAtEdge = (vw - startX) <= EDGE;
    }, {passive:true});
    document.addEventListener('touchend', (e)=>{
      if (!startedAtEdge) return;
      const endX = (e.changedTouches[0]||{}).clientX || 0;
      if (startX != null && (startX - endX) < -30){
        openMenu();
      }
      startX = null;
      startedAtEdge = false;
    }, {passive:true});
  })();

  // Навигация из меню
  (function(){
    const nav = document.querySelector('.oc-nav');
    if (!nav) return;
    nav.addEventListener('click', function(e){
      const link = e.target.closest('a[data-route]');
      if (!link) return;
      const route = link.getAttribute('data-route');
      if (!route) return;

      e.preventDefault();
      closeMenu();

      try {
        if (window.Router && typeof Router.routeTo === 'function') {
          Router.routeTo(route);
        } else {
          if (route === 'home')      location.hash = '';
          else if (route === 'stats')     location.hash = '#stats';
          else if (route === 'favorites') location.hash = '#favorites';
          else if (route === 'mistakes')  location.hash = '#mistakes';
          else if (route === 'donate')    location.hash = '#donate';
          else if (route === 'guide')     location.hash = '#guide';
          else if (route === 'legal')     location.hash = '#legal';
        }
      } catch(e){
        console.warn('nav error', e);
      }
    });
  });

  // 100vh фикс + портретная заглушка
  (function(){
    function setVhUnit(){
      document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px');
    }
    const mqLandscape = window.matchMedia('(orientation: landscape)');
    function applyOrientation(){
      const isLandscape = mqLandscape.matches;
      document.body.classList.toggle('is-landscape', !!isLandscape);
    }
    window.addEventListener('resize', function(){
      setVhUnit();
      applyOrientation();
    });
    setVhUnit();
    applyOrientation();
  })();

  // Тема (тумблер в футере)
  (function(){
    const btn = document.querySelector('[data-action="toggle-theme-footer"]');
    if (!btn) return;

    function getTheme(){
      try{
        return (window.App && App.settings && App.settings.theme) || 'auto';
      }catch(_){}
      return 'auto';
    }

    function setTheme(t){
      try{
        if (!window.App) return;
        if (!App.settings) App.settings = {};
        App.settings.theme = t;
        if (App.saveSettings) App.saveSettings();
        if (App.setTheme) App.setTheme(t);
      }catch(_){}
    }

    function refreshLabel(){
      const t = getTheme();
      btn.setAttribute('data-theme', t);
    }

    btn.addEventListener('click', function(){
      const curr = getTheme();
      const next = curr === 'auto' ? 'light' : (curr === 'light' ? 'dark' : 'auto');
      setTheme(next);
      refreshLabel();
    });

    refreshLabel();
  })();

  // Shell-экшены
  (function(){
    const root = document.body;
    if (!root) return;

    const actions = {
      donate() {
        try {
          if (window.Donate && typeof window.Donate.open === 'function') {
            window.Donate.open();
          } else {
            window.Donate.open();
          }
        } catch (e) {
          console.warn('donate open error', e);
        }
      },

      guide() {
        try {
          if (window.Guide && typeof window.Guide.open === 'function') {
            window.Guide.open();
          } else {
            location.hash = '#guide';
          }
        } catch (e) {
          console.warn('guide open error', e);
        }
      },

      share() {
        const payload = { title: 'MOYAMOVA', url: location.href };
        // 1) Нативный share, если доступен
        if (navigator.share) {
          navigator.share(payload).catch(() => {});
          return;
        }
        // 2) Копирование ссылки в буфер обмена
        const url = location.href;
        const lang = (function(){
          try {
            if (document.documentElement && document.documentElement.dataset && document.documentElement.dataset.lang) {
              var l = String(document.documentElement.dataset.lang || '').toLowerCase();
              if (l === 'ua') l = 'uk';
              return (l === 'uk') ? 'uk' : 'ru';
            }
            if (window.App && App.settings && (App.settings.uiLang || App.settings.lang)) {
              var l2 = String(App.settings.uiLang || App.settings.lang || '').toLowerCase();
              if (l2 === 'ua') l2 = 'uk';
              return (l2 === 'uk') ? 'uk' : 'ru';
            }
          } catch (_) {}
          return 'ru';
        })();
        const isUk = (lang === 'uk');
        const msgOk = isUk ? 'Посилання скопійовано.' : 'Ссылка скопирована.';
        const msgFail = isUk
          ? 'Не вдалося скопіювати автоматично, скористайтеся адресним рядком браузера.'
          : 'Не удалось скопировать автоматически, используйте адресную строку браузера.';

        function showMsg(msg, type) {
          try {
            if (window.App && typeof App.notify === 'function') {
              App.notify({ type: type || 'info', message: msg });
              return;
            }
          } catch (_) {}
          try { alert(msg); } catch (_) {}
        }

        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
          navigator.clipboard.writeText(url)
            .then(function(){ showMsg(msgOk, 'info'); })
            .catch(function(){ showMsg(msgFail, 'error'); });
        } else {
          showMsg(msgFail, 'error');
        }
      },

      legal() {
        // js/legal.js уже подключён как module и создаёт window.Legal
        try {
          if (window.Legal && typeof window.Legal.open === 'function') {
            window.Legal.open('terms');
          } else {
            console.warn('Legal module not ready');
          }
        } catch (e) {
          console.warn('legal open error', e);
        }
      },

      contact() {
        location.href = 'mailto:support@moyamova.app';
      }
    };

    root.addEventListener('click', function(e){
      const el = e.target.closest('[data-shell-action]');
      if (!el) return;
      const action = el.getAttribute('data-shell-action');
      if (!action || !actions[action]) return;
      e.preventDefault();
      try{
        actions[action]();
      }catch(err){
        console.error('shell action error', err);
      }
    });
  })();

})();
