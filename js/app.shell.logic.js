/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: app.shell.logic.js
 * Назначение: Логика оболочки приложения и переходов между экранами
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */

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
  const overlay = document.querySelector('.oc-overlay');

  function openMenu(){
    document.body.classList.add('menu-open');
    if (ocRoot) ocRoot.setAttribute('aria-hidden','false');
    updateHFVars();
  }
  function closeMenu(){
    document.body.classList.remove('menu-open');
    if (ocRoot) ocRoot.setAttribute('aria-hidden','true');
  }

  // Клик по бургеру
  if (burger){
    burger.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      document.body.classList.contains('menu-open') ? closeMenu() : openMenu();
    }, { passive:false });
  }

  // Закрытие меню по кнопкам с data-close
  document.addEventListener('click', (e) => {
    const t = e.target;
    const closeAttr = t.getAttribute && t.getAttribute('data-close');
    if (closeAttr){
      e.preventDefault();
      closeMenu();
    }
  });
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
      if (startX - endX > 30) openMenu();
      startedAtEdge = false;
      startX = null;
    }, {passive:true});
  })();

  // Навигация футера — SPA-роутинг через App.Router
  document.querySelectorAll('.app-footer .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const act = btn.getAttribute('data-action');

      // Переключаем активную кнопку
      document.querySelectorAll('.app-footer .nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      try {
        if (window.App && App.Router && typeof App.Router.routeTo === 'function') {
          App.Router.routeTo(act);
        } else if (act === 'home') {
          // Запасной вариант, если роутер ещё не инициализирован
          if (window.App && App.Home && typeof App.Home.mount === 'function') {
            App.Home.mount();
          } else {
            location.assign('./');
          }
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
      document.body.classList.toggle('landscape', isLandscape);
      const app = document.getElementById('app');
      if (app) app.setAttribute('aria-hidden', isLandscape ? 'true' : 'false');
      try {
        if (window.App && App.applyI18nTitles) {
          App.applyI18nTitles(document.querySelector('.rotate-lock'));
        }
      } catch (_) {}
    }
    try { mqLandscape.addEventListener('change', applyOrientation); }
    catch(_) { mqLandscape.addListener && mqLandscape.addListener(applyOrientation); }
    window.addEventListener('resize', setVhUnit);
    window.addEventListener('orientationchange', function(){
      setVhUnit();
      applyOrientation();
    });
    setVhUnit();
    applyOrientation();
  })();

  // Тема / язык / сложность (локальные data-* для CSS)
  const themeToggle = document.getElementById('themeToggle');
  if(themeToggle){
    themeToggle.addEventListener('change', e=>{
      document.documentElement.dataset.theme = e.target.checked ? 'dark' : 'light';
    });
  }
  const langToggle = document.getElementById('langToggle');
  if(langToggle){
    langToggle.addEventListener('change', e=>{
      document.documentElement.dataset.lang = e.target.checked ? 'ru' : 'uk';
    });
  }
  const levelToggle = document.getElementById('levelToggle');
  if(levelToggle){
    levelToggle.addEventListener('change', e=>{
      document.documentElement.dataset.level = e.target.checked ? 'hard' : 'normal';
    });
  }

  // Версия приложения (app.core.js → App.APP_VER)
  (function(){
    function renderVersion(){
      var el = document.getElementById('appVersion');
      if (!el) return;
      var v = (window.App && App.APP_VER) || null;
      if (v) el.textContent = v;
    }
    if (!(window.App && App.APP_VER)) {
      var s = document.createElement('script');
      s.src = './js/app.core.js';
      s.onload = renderVersion;
      s.onerror = function(){};
      document.head.appendChild(s);
    } else {
      renderVersion();
    }
  })();

    // Actions внизу меню (кнопки в бургер-меню)
  const actionsMap = {
    guide() {
      // Экран "Инструкция" реализован в js/view.guide.js (объект Guide)
      try {
        if (window.Guide && typeof window.Guide.open === 'function') {
          window.Guide.open();
        } else if (window.App && App.Guide && typeof App.Guide.open === 'function') {
          App.Guide.open();
        } else {
          console.warn('Guide module not found');
        }
      } catch (e) {
        console.warn('guide open error', e);
      }
      // закрываем меню так же, как для остальных действий
      try { closeMenu(); } catch (_) {}
    },

    donate() {
      if (!window.Donate) {
        const s = document.createElement('script');
        s.src = './js/donate.js';
        s.onload = () =>
          window.Donate && window.Donate.open && window.Donate.open();
        document.head.appendChild(s);
      } else {
        window.Donate.open();
      }
    },

    share() {
      const data = { title: 'MOYAMOVA', url: location.href };
      if (navigator.share) {
        navigator.share(data).catch(() => {});
      } else {
        try {
          navigator.clipboard.writeText(location.href);
          alert('Ссылка скопирована');
        } catch {
          prompt('Скопируйте ссылку:', location.href);
        }
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

  // навешивание обработчиков на кнопки
  document
    .querySelectorAll('.actions-row-bottom .action-btn')
    .forEach((btn) => {
      btn.addEventListener('click', () => {
        const act = btn.dataset.action;
        (actionsMap[act] || function () {})();
        // для guide меню мы уже закрыли внутри, остальные закрываем здесь
        if (act !== 'guide') {
          try {
            closeMenu();
          } catch (_) {}
        }
      });
    });

  // Service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
      navigator.serviceWorker.register('./sw.js').catch(console.warn);
    });
  }
})();
/* ========================= Конец файла: app.shell.logic.js ========================= */
