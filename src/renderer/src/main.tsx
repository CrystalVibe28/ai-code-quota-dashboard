import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import './i18n'

async function render(): Promise<void> {
  const root = ReactDOM.createRoot(document.getElementById('root')!)
  const isTrayPopover = new URLSearchParams(window.location.search).get('mode') === 'tray'

  if (isTrayPopover) {
    const { TrayPopover } = await import('./components/tray/TrayPopover')
    root.render(
      <React.StrictMode>
        <TrayPopover />
      </React.StrictMode>
    )
    return
  }

  const [{ default: App }, { TooltipProvider }] = await Promise.all([
    import('./App'),
    import('./components/ui/tooltip')
  ])
  root.render(
    <React.StrictMode>
      <TooltipProvider delayDuration={300}>
        <App />
      </TooltipProvider>
    </React.StrictMode>
  )
}

void render()
