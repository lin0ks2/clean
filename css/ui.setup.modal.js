/* ==========================================================
 * ui.setup.modal.css — стили мастера начальной настройки
 * ========================================================== */

.setup-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif;
}

.setup-overlay--hidden {
  display: none;
}

.setup-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
}

.setup-modal {
  position: relative;
  max-width: 520px;
  width: calc(100% - 32px);
  z-index: 1;
}

.setup-modal__inner {
  background: var(--mm-card-bg, #111827);
  color: var(--mm-card-fg, #F9FAFB);
  border-radius: 18px;
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.55),
    0 0 0 1px rgba(148, 163, 184, 0.18);
  padding: 18px 18px 16px;
}

body[data-theme="light"] .setup-modal__inner,
html[data-theme="light"] .setup-modal__inner {
  background: var(--mm-card-bg-light, #ffffff);
  color: var(--mm-card-fg-light, #0f172a);
  box-shadow:
    0 18px 45px rgba(15, 23, 42, 0.18),
    0 0 0 1px rgba(148, 163, 184, 0.20);
}

.setup-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

/* Секции */

.setup-section {
  margin-bottom: 14px;
}

.setup-section__title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  opacity: 0.8;
}

.setup-section__title--compact {
  font-size: 12px;
}

/* Флаги */

.setup-flags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.setup-flag-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.8);
  color: inherit;
  font-size: 13px;
  cursor: pointer;
  transition:
    background 0.16s ease,
    border-color 0.16s ease,
    transform 0.12s ease,
    box-shadow 0.16s ease;
}

body[data-theme="light"] .setup-flag-btn,
html[data-theme="light"] .setup-flag-btn {
  background: rgba(255, 255, 255, 0.9);
}

.setup-flag-btn__flag {
  font-size: 16px;
  line-height: 1;
}

.setup-flag-btn__label {
  font-size: 12px;
  opacity: 0.9;
}

.setup-flag-btn.is-active {
  border-color: var(--mm-accent, #38bdf8);
  background: linear-gradient(
    135deg,
    rgba(56, 189, 248, 0.12),
    rgba(59, 130, 246, 0.10)
  );
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4);
}

body[data-theme="light"] .setup-flag-btn.is-active,
html[data-theme="light"] .setup-flag-btn.is-active {
  background: linear-gradient(
    135deg,
    rgba(56, 189, 248, 0.16),
    rgba(59, 130, 246, 0.12)
  );
}

.setup-flag-btn:active {
  transform: scale(0.97);
}

/* Режим сложности */

.setup-mode-toggle {
  display: inline-flex;
  padding: 3px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.4);
}

body[data-theme="light"] .setup-mode-toggle,
html[data-theme="light"] .setup-mode-toggle {
  background: rgba(255, 255, 255, 0.9);
}

.setup-mode-btn {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  cursor: pointer;
  opacity: 0.7;
  white-space: nowrap;
  transition:
    background 0.16s ease,
    opacity 0.16s ease,
    transform 0.12s ease;
}

.setup-mode-btn.is-active {
  background: var(--mm-accent, #38bdf8);
  color: #0f172a;
  opacity: 1;
}

body[data-theme="light"] .setup-mode-btn.is-active,
html[data-theme="light"] .setup-mode-btn.is-active {
  background: var(--mm-accent, #0ea5e9);
  color: #f9fafb;
}

.setup-mode-btn:active {
  transform: scale(0.97);
}

/* Примечание / подсказки */

.setup-note {
  margin: 2px 0 0;
  font-size: 11px;
  opacity: 0.75;
}

.setup-note--warning {
  color: #facc15;
}

/* Футер */

.setup-footer {
  margin-top: 14px;
  display: flex;
  justify-content: flex-end;
}

.setup-start-btn {
  padding: 8px 16px;
  border-radius: 999px;
  border: none;
  background: var(--mm-accent, #38bdf8);
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  box-shadow:
    0 10px 25px rgba(56, 189, 248, 0.35),
    0 0 0 1px rgba(15, 23, 42, 0.6);
  transition:
    transform 0.12s ease,
    box-shadow 0.16s ease,
    background 0.16s ease;
}

body[data-theme="light"] .setup-start-btn,
html[data-theme="light"] .setup-start-btn {
  box-shadow:
    0 10px 24px rgba(56, 189, 248, 0.35),
    0 0 0 1px rgba(15, 23, 42, 0.04);
}

.setup-start-btn:hover {
  transform: translateY(-1px);
  box-shadow:
    0 14px 30px rgba(56, 189, 248, 0.4),
    0 0 0 1px rgba(15, 23, 42, 0.7);
}

.setup-start-btn:active {
  transform: translateY(0);
  box-shadow:
    0 8px 18px rgba(56, 189, 248, 0.35),
    0 0 0 1px rgba(15, 23, 42, 0.7);
}

/* Когда мастер открыт, можно чуть блокировать скролл */

body.setup-open {
  overflow: hidden;
}
