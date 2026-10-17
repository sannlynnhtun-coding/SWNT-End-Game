// Only known, actionable errors reach the UI. Backend diagnostics stay private.
export function retryDelaySeconds(error) {
  const match = /(?:request this after|try again (?:in|after))\s+(\d+)\s*seconds?/i.exec(error?.message || '')
  const seconds = Number(match?.[1])
  return Number.isSafeInteger(seconds) && seconds > 0 ? seconds : 0
}

export function onlineError(error) {
  if (error?.code === 'manual_linking_disabled') return 'နာမည်နဲ့ကစားသူကို Google နဲ့ချိတ်ရန် Server ပြင်ဆင်နေဆဲပါ။'
  if (error?.code === 'anonymous_provider_disabled' || /anonymous.*disabled/i.test(error?.message || '')) return 'နာမည်နဲ့ ကစားရန် Server ပြင်ဆင်နေဆဲပါ။ Email account နဲ့ ဝင်နိုင်ပါတယ်။'
  if (/provider.*(disabled|not enabled|unsupported)/i.test(error?.message || '')) return 'Google login ကို Server မှာ ပြင်ဆင်နေဆဲပါ။ နာမည်နဲ့ သို့မဟုတ် email account နဲ့ ဝင်နိုင်ပါတယ်။'
  if (error?.message === 'result_submission_limit' || error?.status === 429 || error?.code === 'over_request_rate_limit' || error?.code === 'over_email_send_rate_limit') return 'တောင်းဆိုမှု များနေပါတယ်။ ခဏစောင့်ပြီး ပြန်စမ်းပါ။'
  if (/fetch|network|connection|abort/i.test(error?.message || '')) return 'Server ကို ချိတ်မရသေးပါ။ Internet ပြန်စစ်ပြီး ထပ်စမ်းပါ။'
  if (['42P01', 'PGRST202', 'PGRST205'].includes(error?.code)) return 'Leaderboard ကို ပြင်ဆင်နေဆဲပါ။ ခဏနေ ပြန်စမ်းပါ။'
  if (error?.code === 'email_not_confirmed') return 'Email ထဲက အတည်ပြု link ကို အရင်နှိပ်ပါ။'
  if (/invalid login/i.test(error?.message || '') || error?.code === 'invalid_credentials') return 'Email သို့မဟုတ် password မမှန်ပါ။'
  return 'ချိတ်ဆက်မှု မအောင်မြင်ပါ။ ထပ်စမ်းပါ။'
}
