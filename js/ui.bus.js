/* ==========================================================
 * Проект: MOYAMOVA
 * Файл: ui.bus.js
 * Назначение: Простой event bus внутри UI
 * Версия: 1.0
 * Обновлено: 2025-11-17
 * ========================================================== */

window.UIBus = (function(){
  const map = {};
  return {
    on: function(evt, cb){ (map[evt] ||= []).push(cb); },
    off: function(evt, cb){ if(!map[evt]) return; map[evt] = map[evt].filter(x=>x!==cb); },
    emit: function(evt, data){ (map[evt]||[]).forEach(cb=>{ try{ cb(data); }catch(_){} }); }
  };
})();

/* ========================= Конец файла: ui.bus.js ========================= */
