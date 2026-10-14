import { createClient } from '@supabase/supabase-js'

// Publishable browser credentials; database access is controlled by RLS.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://fvylqtaiwzbhfpjkrwlo.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_2L3mjAKw1LnFmVF40yKAXA_Zf46ova-'
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
  if (/fetch|network|connection|abort/i.test(error?.message || '')) return 'Server ကို ချိတ်မရသေးပါ။ Internet ပြန်စစ်ပြီး ထပ်စမ်းပါ။'
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Leaderboard ကို ပြင်ဆင်နေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။'
  if (/invalid login/i.test(error?.message || '')) return 'Email သို့မဟုတ် password မမှန်ပါ။'
  return error?.message || 'ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ထပ်စမ်းပါ။'
}
