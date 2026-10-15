import { createClient } from '@supabase/supabase-js'

// Publishable browser credentials; database access is controlled by RLS.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://muiwhmmcpghkazvrmafl.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_6dWvBEUofrRvRa_2yumzkQ_SUMSES1i'
async function timedFetch(input, options = {}) {
  const controller = new AbortController()
  const cancel = () => controller.abort()
  if (options.signal?.aborted) controller.abort()
  else options.signal?.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(cancel, 12000)
  try { return await fetch(input, { ...options, signal: controller.signal }) }
  finally { clearTimeout(timeout); options.signal?.removeEventListener('abort', cancel) }
}
export const supabase = createClient(url, key, { global: { fetch: timedFetch } })
export function onlineError(error) {
  if (error?.code === 'manual_linking_disabled') return 'နာမည်နဲ့ကစားသူကို Google နဲ့ချိတ်ရန် Server ပြင်ဆင်နေဆဲပါ။'
  if (error?.code === 'anonymous_provider_disabled' || /anonymous.*disabled/i.test(error?.message || '')) return 'နာမည်နဲ့ ကစားရန် Server ပြင်ဆင်နေဆဲပါ။ Email account နဲ့ ဝင်နိုင်ပါတယ်။'
  if (/provider.*(disabled|not enabled|unsupported)/i.test(error?.message || '')) return 'Google login ကို Server မှာ ပြင်ဆင်နေဆဲပါ။ နာမည်နဲ့ သို့မဟုတ် email account နဲ့ ဝင်နိုင်ပါတယ်။'
  if (/fetch|network|connection|abort/i.test(error?.message || '')) return 'Server ကို ချိတ်မရသေးပါ။ Internet ပြန်စစ်ပြီး ထပ်စမ်းပါ။'
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Leaderboard ကို ပြင်ဆင်နေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။'
  if (/invalid login/i.test(error?.message || '')) return 'Email သို့မဟုတ် password မမှန်ပါ။'
  return error?.message || 'ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ထပ်စမ်းပါ။'
}
