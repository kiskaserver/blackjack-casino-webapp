"use client"

import { useEffect } from "react"

/**
 * Hook to apply Telegram WebApp theme colors to the document
 * Supports both light and dark themes
 */
export const useTelegramTheme = () => {
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const tg = window.Telegram?.WebApp
    if (!tg) {
      return
    }

    const applyTheme = () => {
      const isDark = tg.colorScheme === "dark"
      const root = document.documentElement

      // Apply color scheme
      root.style.colorScheme = tg.colorScheme || "dark"

      // Apply Telegram WebApp theme colors to CSS variables
      if (tg.themeParams) {
        const params = tg.themeParams

        // Map Telegram colors to our CSS variables
        const colorMap = {
          bg_color: "--tg-bg-color",
          text_color: "--tg-text-color",
          hint_color: "--tg-hint-color",
          link_color: "--tg-link-color",
          button_color: "--tg-button-color",
          button_text_color: "--tg-button-text-color",
          secondary_bg_color: "--tg-secondary-bg-color",
          header_bg_color: "--tg-header-bg-color",
          accent_text_color: "--tg-accent-text-color",
          section_bg_color: "--tg-section-bg-color",
          section_header_text_color: "--tg-section-header-text-color",
          subtitle_text_color: "--tg-subtitle-text-color",
          destructive_text_color: "--tg-destructive-text-color",
        }

        Object.entries(colorMap).forEach(([telegramKey, cssVar]) => {
          if (params[telegramKey]) {
            root.style.setProperty(cssVar, params[telegramKey])
          }
        })

        // Also set HSL versions for Tailwind compatibility
        root.style.setProperty("--tg-bg-hsl", hexToHsl(params.bg_color || "#ffffff"))
        root.style.setProperty("--tg-text-hsl", hexToHsl(params.text_color || "#000000"))
        root.style.setProperty("--tg-button-hsl", hexToHsl(params.button_color || "#0088cc"))
      }

      // Apply dark class if needed
      if (isDark) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
    }

    // Apply theme immediately
    applyTheme()

    // Listen for theme changes
    tg.onEvent("themeChanged", applyTheme)

    return () => {
      tg.offEvent("themeChanged", applyTheme)
    }
  }, [])
}

/**
 * Convert hex color to HSL format for Tailwind
 */
function hexToHsl(hex) {
  if (!hex || typeof hex !== "string") {
    return "0 0% 100%"
  }

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    return "0 0% 100%"
  }

  const r = Number.parseInt(result[1], 16) / 255
  const g = Number.parseInt(result[2], 16) / 255
  const b = Number.parseInt(result[3], 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0,
    s = 0,
    l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  const hDeg = Math.round(h * 360)
  const sPct = Math.round(s * 100)
  const lPct = Math.round(l * 100)

  return `${hDeg} ${sPct}% ${lPct}%`
}
