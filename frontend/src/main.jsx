import React from "react"
import ReactDOM from "react-dom/client"
import { HashRouter } from "react-router-dom"
import App from "./App.jsx"
import { TelegramProvider } from "./providers/TelegramProvider.jsx"
import { StatisticsProvider } from "./providers/StatisticsProvider.jsx"
import { AdminProvider } from "./providers/AdminProvider.jsx"
import { SettingsProvider } from "./providers/SettingsProvider.jsx"
import { injectSpeedInsights } from "@vercel/speed-insights"
import { Analytics } from "@vercel/analytics/react"
import "./styles/global.css"
import "./styles/design.css"
import "./styles/telegram.css"

const enableSpeedInsights = import.meta.env.PROD && import.meta.env.VITE_ENABLE_SPEED_INSIGHTS !== "false"
const enableVercelAnalytics = import.meta.env.PROD && import.meta.env.VITE_ENABLE_VERCEL_ANALYTICS !== "false"

if (enableSpeedInsights) {
  injectSpeedInsights()
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <HashRouter>
      <SettingsProvider>
        <TelegramProvider>
          <StatisticsProvider>
            <AdminProvider>
              <>
                <App />
                {enableVercelAnalytics && <Analytics />}
              </>
            </AdminProvider>
          </StatisticsProvider>
        </TelegramProvider>
      </SettingsProvider>
    </HashRouter>
  </React.StrictMode>,
)
