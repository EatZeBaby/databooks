export type ColorPalette = 'default' | 'teal' | 'purple' | 'orange' | 'rose'
export type ColorScheme = 'light' | 'dark' | 'system'

const PALETTE_KEY = 'db_theme_palette'
const SCHEME_KEY = 'db_theme_scheme'
const SCHEME_EVENT = 'db-scheme-changed'

function getSystemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function readStoredPalette(): ColorPalette {
  const value = (localStorage.getItem(PALETTE_KEY) || 'default') as ColorPalette
  return value
}

export function readStoredScheme(): ColorScheme {
  const value = (localStorage.getItem(SCHEME_KEY) || 'system') as ColorScheme
  return value
}

export function applyPalette(palette: ColorPalette): void {
  document.documentElement.setAttribute('data-palette', palette)
}

export function applyScheme(scheme: ColorScheme): void {
  const effectiveDark = scheme === 'dark' || (scheme === 'system' && getSystemPrefersDark())
  document.documentElement.setAttribute('data-theme', effectiveDark ? 'dark' : 'light')
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SCHEME_EVENT, { detail: { scheme, isDark: effectiveDark } }))
  }
}

export function setPalette(palette: ColorPalette): void {
  localStorage.setItem(PALETTE_KEY, palette)
  applyPalette(palette)
}

export function setScheme(scheme: ColorScheme): void {
  localStorage.setItem(SCHEME_KEY, scheme)
  applyScheme(scheme)
}

export function initTheme(): void {
  const palette = readStoredPalette()
  const scheme = readStoredScheme()
  applyPalette(palette)
  applyScheme(scheme)

  // React to system preference changes when scheme is 'system'
  if (typeof window !== 'undefined' && window.matchMedia) {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      if (readStoredScheme() === 'system') {
        applyScheme('system')
      }
    }
    try {
      media.addEventListener('change', handler)
    } catch {
      // Safari <14
      // @ts-ignore
      media.addListener(handler)
    }
  }
}

export function isDarkActive(): boolean {
  if (typeof document === 'undefined') return false
  return document.documentElement.getAttribute('data-theme') === 'dark'
}


