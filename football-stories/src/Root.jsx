import { useEffect, useState } from 'react'
import App from './App.jsx'
import DesktopApp from './desktop/DesktopApp.jsx'

// ---- mobile / desktop switch ----
// Wide viewports get the landscape timeline (src/desktop/); narrow ones the
// phone UI. `?view=mobile` / `?view=desktop` forces either (testing, or
// deliberately using the phone letterbox on a big screen). The two are fully
// separate component trees — switching swaps trees (state resets), which only
// happens on an explicit override or a real viewport-class change.
const DESKTOP_MQ = '(min-width: 900px)'

function forcedView() {
  const p = new URLSearchParams(window.location.search).get('view')
  return p === 'mobile' || p === 'desktop' ? p : null
}

function chooseView() {
  return forcedView() ?? (window.matchMedia(DESKTOP_MQ).matches ? 'desktop' : 'mobile')
}

export default function Root() {
  const [view, setView] = useState(chooseView)

  // No explicit override -> follow the viewport class live.
  useEffect(() => {
    if (forcedView()) return
    const mq = window.matchMedia(DESKTOP_MQ)
    const onChange = () => setView(mq.matches ? 'desktop' : 'mobile')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  // Let CSS know which tree is mounted (desktop.css undoes the letterbox).
  useEffect(() => {
    document.body.dataset.view = view
    return () => {
      delete document.body.dataset.view
    }
  }, [view])

  return view === 'desktop' ? <DesktopApp /> : <App />
}
