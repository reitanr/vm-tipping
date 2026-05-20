import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"
import ResetPassword from "./components/ResetPassword"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isReset, setIsReset] = useState(false)

  useEffect(() => {
    // Sjekk URL for reset-token
    const hash = window.location.hash
    if (hash && hash.includes("type=recovery")) {
      setIsReset(true)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsReset(true)
        setLoading(false)
      } else if (event === "USER_UPDATED") {
        setIsReset(false)
        setSession(session)
      } else {
        setSession(session)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.loadingText}>🏆 Laster VM-tipping...</div>
    </div>
  )

  if (isReset) return <ResetPassword onDone={() => setIsReset(false)} />

  return (
    <div style={styles.app}>
      {!session ? (
        <Auth />
      ) : (
        <Dashboard session={session} />
      )}
    </div>
  )
}

const styles = {
  app: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    fontFamily: "'Segoe UI', sans-serif",
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  loadingText: {
    color: 'white',
    fontSize: '24px',
    fontWeight: 'bold',
  }
}

export default App