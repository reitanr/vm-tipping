import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Auth from "./components/Auth"
import Dashboard from "./components/Dashboard"

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={styles.loading}>
      <div style={styles.loadingText}>🏆 Laster VM-tipping...</div>
    </div>
  )

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