import { proverbCredit } from '../proverbData'

export function SlangCredit() {
  return <p className="source-credit">မြန်မာဗန်းစကားများအတွက် အရင်းအမြစ် — <a href="https://bansagar.com/" target="_blank" rel="noreferrer">Ban Sagar (ဗန်းစကား)</a>။ Game အတွက် clues များကို ပြန်လည်ရေးသားထားပါတယ်။</p>
}

export default function AboutCredits() {
  return <div className="about-credits">
    <section><h3>Original creator & inspiration</h3><p>ဒီ game ဟာ <strong>Jeff307-kib (Sai Wanna Tun)</strong> ရဲ့ <strong>Assembly: End-Game</strong> ကို အခြေခံပြီး စိတ်ကူးရယူ ဖန်တီးထားပါတယ်။</p><p>မူရင်း game မှာ စာလုံးတစ်လုံးချင်း ခန့်မှန်းပြီး programming languages များကို ကယ်တင်ရပါတယ်။</p><a href="https://github.com/Jeff307-kib/End-Game" target="_blank" rel="noreferrer">Original repository · Jeff307-kib/End-Game ↗</a></section>
    <section><h3>Additional development</h3><p><strong>Sann Lynn Htun</strong> က ဒီ version အတွက် ထပ်မံဖြည့်စွက် ပြင်ဆင်ထားပါတယ်။</p><p>မြန်မာ Slang နဲ့ စကားပုံ modes၊ မြန်မာလို clues၊ difficulty နဲ့ categories၊ mobile layout၊ Google sign-in၊ timed leaderboard၊ feedback နဲ့ PWA support တို့ ပါဝင်ပါတယ်။</p></section>
    <section><h3>Myanmar slang source</h3><SlangCredit /></section>
    <section><h3>Myanmar proverb source</h3><p>{proverbCredit}</p></section>
    <section><h3>Mobile reading font</h3><p><a href="https://github.com/google/fonts/tree/main/ofl/notosansmyanmar" target="_blank" rel="noreferrer">Noto Sans Myanmar</a> · <a href="/fonts/noto-sans-myanmar-OFL.txt" target="_blank" rel="noreferrer">SIL Open Font License</a></p></section>
  </div>
}
