import { useState } from 'react'
import Panel from './Panel'

export default function ShortcutHelp() {
  const [shortcuts, setShortcuts] = useState(null)
  function openHelp() {
    const controls = [...document.querySelectorAll('#root [aria-keyshortcuts]')]
      .filter(element => element.getClientRects().length && !element.closest('.keyboard'))
    setShortcuts(controls.map(element => ({
      label: element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent.trim(),
      keys: element.getAttribute('aria-keyshortcuts').replaceAll('Escape', 'Esc').replaceAll('Control', 'Ctrl'),
      disabled: element.disabled,
    })))
  }
  return <>
    <button className="header-icon shortcut-help-button" data-shortcut="?" aria-label="Keyboard shortcuts · ဖြတ်လမ်းခလုတ်များ" aria-haspopup="dialog" onClick={openHelp}>?</button>
    {shortcuts && <Panel className="shortcut-help" title="Keyboard shortcuts · ဖြတ်လမ်းခလုတ်များ" onClose={() => setShortcuts(null)}>
      <p>လက်ရှိစာမျက်နှာမှာ သုံးနိုင်တဲ့ shortcut များ။ Popup ဖွင့်ထားချိန်မှာ နောက်ခံဂိမ်း shortcut များ ရပ်ထားပါတယ်။</p>
      <h3>လက်ရှိစာမျက်နှာ</h3>
      <dl className="shortcut-list">{shortcuts.map(({ label, keys, disabled }, index) => <div key={index}>
        <dt>{label}{disabled && <small> · လောလောဆယ် မရနိုင်ပါ</small>}</dt><dd><kbd>{keys}</kbd></dd>
      </div>)}</dl>
      <h3>ဂိမ်းအားလုံးအတွက် လမ်းညွှန်</h3>
      <dl className="shortcut-list">
        <div><dt>Mode / အဖြေ / အခက်အခဲအဆင့် ရွေးရန်</dt><dd><kbd>1–9</kbd></dd></div>
        <div><dt>English စာလုံး ခန့်မှန်းရန်</dt><dd><kbd>A–Z</kbd></dd></div>
        <div><dt>Start / Next / Confirm</dt><dd><kbd>Enter</kbd></dd></div>
        <div><dt>Back / Close / Challenge pause</dt><dd><kbd>Esc</kbd></dd></div>
        <div><dt>Challenge pause / resume</dt><dd><kbd>P</kbd></dd></div>
        <div><dt>Hint · English မှာ ခလုတ်ရဲ့ shortcut ကို သုံးပါ</dt><dd><kbd>H</kbd></dd></div>
        <div><dt>အသံ · English မှာ ခလုတ်ရဲ့ shortcut ကို သုံးပါ</dt><dd><kbd>M</kbd></dd></div>
        <div><dt>ပွဲပြီးချိန် နောက်တစ်ပွဲ</dt><dd><kbd>R</kbd></dd></div>
        <div><dt>ခလုတ်များကြား ရွှေ့ရန်</dt><dd><kbd>Tab / Shift+Tab</kbd></dd></div>
        <div><dt>ရွေးထားတဲ့ခလုတ်ကို နှိပ်ရန်</dt><dd><kbd>Enter / Space</kbd></dd></div>
        <div><dt>Shortcut လမ်းညွှန်ဖွင့်ရန်</dt><dd><kbd>?</kbd></dd></div>
      </dl>
      <p>ကျန်ခလုတ်များအတွက် Alt+Shift နဲ့ တွဲသုံးပါ။ Header ကို hover သို့မဟုတ် focus လုပ်ရင် shortcut ပြပါမယ်။ စာရိုက်နေချိန်မှာ စာရိုက်ခြင်းကို ဦးစားပေးပါတယ်။</p>
    </Panel>}
  </>
}
