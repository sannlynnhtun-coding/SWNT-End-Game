import { createClient } from '@supabase/supabase-js'
export { onlineError } from './onlineError'

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
