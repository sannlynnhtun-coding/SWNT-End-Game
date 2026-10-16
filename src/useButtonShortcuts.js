import { useEffect } from 'react'

const fallbackKeys = '1234567890abcdefghijklmnopqrstuvwxyz'
const choices = '.proverb-options button, .game-mode-card, .difficulty-options button, .mode-picker button, .leaderboard-games button, .leaderboard-subfilters button'

function visible(element) {
  return element.getClientRects().length > 0 && !element.closest('[hidden], [inert]')
}

// One dispatcher owns shortcuts so a modal or menu cannot also activate the game.
export default function useButtonShortcuts() {
  useEffect(() => {
    const root = document.getElementById('root')
    let bindings = []
    function refresh() {
      const dialogs = [...root.querySelectorAll('dialog[open]')]
      const scope = dialogs.at(-1) || root.querySelector('.account-actions') || root
      const buttons = [...scope.querySelectorAll('button, a[href]')].filter(visible)
      const used = new Set()
      let number = 0
      let fallback = 0
      bindings = []
      root.querySelectorAll('[aria-keyshortcuts], [data-shortcut-label]').forEach(button => {
        button.removeAttribute('data-shortcut-label')
        button.removeAttribute('aria-keyshortcuts')
      })
      const english = Boolean(scope.querySelector('.english-board .keyboard'))
      for (const button of buttons) {
        let key = button.dataset.shortcut
        if (button.closest('.keyboard')) key = button.textContent.trim().toLowerCase()
        else if (!key && button.matches(choices)) key = String(++number)
        else if (button.matches('.panel-heading button, .setup-back')) key = 'Escape'
        else if (button.matches('.header-sound')) key = 'm'
        else if (button.matches('.challenge-pause-button')) key = 'p'
        else if (button.matches('.challenge-tools button:first-child, .hint-actions button:last-child')) key = 'h'
        else if (button.matches('.challenge-pause .text-button')) key = 'Escape'
        else if (button.matches('.next-game')) key = 'Enter'
        if (english && /^[a-z]$/.test(key || '') && !button.closest('.keyboard')) key = undefined
        if (!key || used.has(key) || /^\d{2,}$/.test(key)) {
          const character = fallbackKeys[fallback++ % fallbackKeys.length]
          const extra = fallback > fallbackKeys.length ? 'Control+' : ''
          key = `${extra}Alt+Shift+${character}`
        }
        used.add(key)
        button.setAttribute('aria-keyshortcuts', key)
        // Letter keys and numbered answers already display their shortcuts.
        if (!button.closest('.keyboard') && !button.querySelector('.answer-key, .start-shortcut-key')) {
          button.dataset.shortcutLabel = key.replace('Control', 'Ctrl').replace('Escape', 'Esc')
        }
        bindings.push({ button, key })
      }
      const pause = buttons.find(button => button.matches('.challenge-pause-button'))
      if (pause && !used.has('Escape')) bindings.push({ button: pause, key: 'Escape' })
      const retry = buttons.find(button => button.matches('.challenge-actions .next-game, .board-footer .next-game'))
      if (retry && !english && !used.has('r')) {
        bindings.push({ button: retry, key: 'r' })
        retry.setAttribute('aria-keyshortcuts', `${retry.getAttribute('aria-keyshortcuts')} r`)
        retry.dataset.shortcutLabel += ' / R'
      }
    }
    function onKey(event) {
      if (event.defaultPrevented || event.repeat || event.isComposing || event.keyCode === 229) return
      if (event.target.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
      // Preserve native activation of the focused control.
      if ((event.key === 'Enter' || event.key === ' ') && event.target.closest?.('button, a[href]')) return
      refresh()
      const binding = bindings.find(({ key }) => {
        const parts = key.toLowerCase().split('+')
        return parts.at(-1) === event.key.toLowerCase()
          && parts.includes('alt') === event.altKey
          && parts.includes('shift') === event.shiftKey
          && parts.includes('control') === event.ctrlKey && !event.metaKey
      })
      if (!binding) {
        if (event.key !== 'Escape' && root.querySelector('dialog[open], .account-actions')) event.stopImmediatePropagation()
        return
      }
      if (binding.button.disabled || binding.button.getAttribute('aria-disabled') === 'true') {
        event.stopImmediatePropagation()
        return
      }
      event.preventDefault()
      event.stopImmediatePropagation()
      binding.button.click()
    }
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['open', 'hidden', 'disabled', 'class'] })
    window.addEventListener('keydown', onKey, true)
    return () => {
      observer.disconnect()
      window.removeEventListener('keydown', onKey, true)
      root.querySelectorAll('[data-shortcut-label]').forEach(button => button.removeAttribute('data-shortcut-label'))
    }
  }, [])
}
