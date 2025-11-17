/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: view.mistakes.js
 * Назначение: Экран ошибок
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */
/* ==========================================================
 * view.mistakes.js — Экран «Мои ошибки» в стиле списка словарей
 *  - Флаги-языки для фильтра
 *  - Выбор строки + кнопка ОК для старта тренировки
 *  - 👁️ — предпросмотр, 🗑️ — удаление
 *  - Тренировка доступна только если ≥4 слов
 * ========================================================== */
(function(){
  'use strict';
  const A = (window.App = window.App || {});

  function getUiLang(){
    const s = (A.settings && (A.settings.lang || A.settings.uiLang)) || 'ru';
    return (String(s).toLowerCase()==='uk') ? 'uk' : 'ru';
  }
  function t(){
    const uk = getUiLang()==='uk';
    return uk
      ? { title:'Мої помилки', lang:'Мова словника', name:'Назва', words:'Слів', preview:'Перегляд', empty:'На данний момент помилок немає', ok:'Ок' }
      : { title:'Мои ошибки',  lang:'Язык словаря',  name:'Название', words:'Слов', preview:'Предпросмотр', empty:'В данный момент ошибок нет', ok:'Ок' };
  }

  const FLAG = { en:'🇬🇧', de:'🇩🇪', fr:'🇫🇷', es:'🇪🇸', it:'🇮🇹', ru:'🇷🇺', uk:'🇺🇦', pl:'🇵🇱', sr:'🇷🇸' };

  function gatherMistakeDecks(){
    const rows = (A.Mistakes && A.Mistakes.listSummary ? A.Mistakes.listSummary() : []);
    // преобразуем в «словарные» записи с ключом mistakes:<lang>:<baseKey>
    return rows.map(r=>{
      const mKey = r.mistakesKey;
      const name = (A.Decks && A.Decks.resolveNameByKey) ? A.Decks.resolveNameByKey(mKey) : mKey;
      const deck = (A.Decks && A.Decks.resolveDeckByKey) ? (A.Decks.resolveDeckByKey(mKey) || []) : [];
      const baseLang = (A.Decks && (A.Decks.langOfMistakesKey||A.Decks.langOfKey)) ? (A.Decks.langOfMistakesKey ? A.Decks.langOfMistakesKey(mKey) : A.Decks.langOfKey(mKey)) : '';
      const flag = (A.Decks && A.Decks.flagForKey) ? (A.Decks.flagForKey(mKey) || '🧩') : '🧩';
      return { key: mKey, baseKey: r.baseKey, trainLang: r.trainLang, name, count: deck.length, baseLang, flag };
    });
  }

  function render(){
    const app = document.getElementById('app');
    if (!app) return;
    const T = t();

    const all = gatherMistakeDecks();
    if (!all.length){
      app.innerHTML = `<div class="home"><section class="card"><h3 style="margin:0 0 6px;">${T.title}</h3><p style="opacity:.7; margin:0;">${T.empty}</p></section></div>`;
      return;
    }

    // группируем по языку базового словаря (как на экране словарей)
    const byLang = all.reduce((acc, row)=>{
      const lg = row.baseLang || 'xx';
      (acc[lg] || (acc[lg]=[])).push(row);
      return acc;
    }, {});
    const langs = Object.keys(byLang);

    // активный язык-фильтр (помним между заходами)
    let activeLang = (function load(){
      try {
        const s = (A.settings && A.settings.mistakesLang);
        if (s && byLang[s] && byLang[s].length) return s;
      } catch(_){}
      return langs[0];
    })();

    let selectedKey = (function loadSel(){
      try {
        const saved = (A.settings && A.settings.lastMistakesKey) || '';
        if (saved && byLang[activeLang]?.some(r=>r.key===saved)) return saved;
      } catch(_){}
      return (byLang[activeLang] && byLang[activeLang][0]?.key) || '';
    })();

    function saveActive(lang){
      try { A.settings = A.settings || {}; A.settings.mistakesLang = lang; if (typeof A.saveSettings==='function') A.saveSettings(A.settings); } catch(_){}
    }
    function saveSelected(key){
      try { A.settings = A.settings || {}; A.settings.lastMistakesKey = key; if (typeof A.saveSettings==='function') A.saveSettings(A.settings); } catch(_){}
    }

    function renderFlags(){
      const box = app.querySelector('#mistakes-flags');
      if (!box) return;
      box.innerHTML = '';
      langs.forEach(lang=>{
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dict-flag' + (lang===activeLang ? ' active' : '');
        btn.dataset.lang = lang;
        btn.title = String(lang).toUpperCase();
        btn.textContent = FLAG[lang] || lang.toUpperCase();
        btn.onclick = ()=>{
          if (lang===activeLang) return;
          activeLang = lang; saveActive(lang);
          selectedKey = (byLang[activeLang] && byLang[activeLang][0]?.key) || '';
          renderTable();
        };
        box.appendChild(btn);
      });
    }

    function renderTable(){
      const data = byLang[activeLang] || [];
      if (!data.length){
        app.innerHTML = `<div class="home"><section class="card"><h3>${T.title}</h3><p>${T.empty}</p></section></div>`;
        return;
      }

      const rows = data.map(r=>{
        const sel = (r.key === selectedKey) ? ' is-selected' : '';
        const canTrain = (r.count|0) >= 4;
        // эмодзи: 👁️ preview, 🗑️ delete
        return `
          <tr class="dict-row${sel}" data-key="${r.key}" data-base="${r.baseKey}" data-train-lang="${r.trainLang}" data-count="${r.count|0}">
            <td class="t-center">${r.flag}</td>
            <td>${r.name}</td>
            <td class="t-center">${r.count|0}</td>
            <td class="t-center">
              <span class="mistakes-preview" title="${T.preview}" role="button" aria-label="${T.preview}">👁️</span>
              <span class="mistakes-delete" title="Delete" role="button" aria-label="Delete" style="margin-left:10px;">🗑️</span>
            </td>
          </tr>`;
      }).join('');

      app.innerHTML = `
        <div class="home">
          <section class="card dicts-card">
            <div class="dicts-header">
              <h3>${T.title}</h3>
              <div id="mistakes-flags" class="dicts-flags"></div>
            </div>
            <table class="dicts-table">
              
              <tbody>${rows}</tbody>
              
            </table>
            <div class="dicts-actions">
              <button type="button" class="btn-primary" id="mistakes-apply">${T.ok}</button>
            </div>
          </section>
        </div>`;

      renderFlags();

      const tbody = app.querySelector('.dicts-table tbody');
      if (tbody){
        tbody.addEventListener('click', (e)=>{
          const eye = e.target.closest('.mistakes-preview');
          if (eye){
            e.stopPropagation();
            const tr = eye.closest('tr');
            if (!tr) return;
            openPreview(tr.dataset.key);
            return;
          }
          const del = e.target.closest('.mistakes-delete');
          if (del){
            e.stopPropagation();
            const tr = del.closest('tr');
            if (!tr) return;
            const mKey = tr.dataset.key;
            const p = A.Mistakes && A.Mistakes.parseKey && A.Mistakes.parseKey(mKey);
            if (p){
              try{ A.Mistakes.removeDeck(p.trainLang, p.baseDeckKey); }catch(_){}
              // пересчитать и перерисовать заново
              render();
            }
            return;
          }
          const row = e.target.closest('.dict-row');
          if (!row) return;
          selectedKey = row.dataset.key || selectedKey;
          app.querySelectorAll('.dict-row').forEach(r=> r.classList.remove('is-selected'));
          row.classList.add('is-selected');
        }, { passive:true });
      }

      // Кнопка ОК — запуск тренировки на mistakes-словаре (если >=4 слов)
      const ok = document.getElementById('mistakes-apply');
      if (ok){
        ok.onclick = ()=>{
          const row = app.querySelector('.dict-row.is-selected');
          if (!row) return;
          const key = row.getAttribute('data-key');
          const count = row.getAttribute('data-count')|0;
          if (count < 4) {
            // просто превью, тренировка недоступна
            openPreview(key);
            return;
          }
          saveSelected(key);
          try { A.Trainer && A.Trainer.setDeckKey && A.Trainer.setDeckKey(key); } catch(_){}
          // уходим на главную
          try { A.Router && A.Router.routeTo && A.Router.routeTo('home'); } catch(_){}
        };
      }
    }

    renderTable();
  }

  function tWord(w){
    const uk = getUiLang()==='uk';
    if (!w) return '';
    return uk ? (w.uk || w.translation_uk || w.trans_uk || w.ua || '')
              : (w.ru || w.translation_ru || w.trans_ru || '');
  }

  function openPreview(key){
    const deck = (A.Decks && A.Decks.resolveDeckByKey) ? (A.Decks.resolveDeckByKey(key) || []) : [];
    const name = (A.Decks && A.Decks.resolveNameByKey) ? A.Decks.resolveNameByKey(key) : key;
    const flag = (A.Decks && A.Decks.flagForKey) ? A.Decks.flagForKey(key) : '🧩';
    const T = t();

    const rows = deck.map((w,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${w.word || w.term || ''}</td>
        <td>${tWord(w)}</td>
      </tr>
    `).join('');

    const wrap = document.createElement('div');
    wrap.className = 'mmodal is-open';
    wrap.innerHTML = `
      <div class="mmodal__overlay"></div>
      <div class="mmodal__panel" role="dialog" aria-modal="true">
        <div class="mmodal__header">
          <h3>${flag} ${name}</h3>
          <button class="mmodal__close" aria-label="×">✕</button>
        </div>
        <div class="mmodal__body">
          <table class="dict-table">
            <thead><tr><th>#</th><th>Word</th><th>Translation</th></tr></thead>
            <tbody>${rows || `<tr><td colspan="3" style="opacity:.6">${T.empty}</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
    document.body.appendChild(wrap);
    const close = ()=>wrap.remove();
    wrap.querySelector('.mmodal__overlay').onclick = close;
    wrap.querySelector('.mmodal__close').onclick = close;
  }

  A.ViewMistakes = { mount: render };
})();
/* ========================= Конец файла: view.mistakes.js ========================= */
