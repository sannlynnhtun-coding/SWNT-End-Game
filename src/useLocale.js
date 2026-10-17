import { useEffect, useState } from 'react'

export default function useLocale() {
  const [locale, setLocale] = useState(() => {
    try { return localStorage.getItem('assembly-locale') === 'en' ? 'en' : 'my' }
    catch { return 'my' }
  })
  useEffect(() => {
    document.documentElement.lang = locale
    try { localStorage.setItem('assembly-locale', locale) } catch { /* Keep the current selection in memory. */ }
  }, [locale])
  return { locale, setLocale, t: (english, myanmar) => locale === 'en' ? english : myanmar }
}
