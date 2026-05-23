import { useState } from "react"
import { supabase } from "../supabaseClient"

export default function Auth() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [isLogin, setIsLogin] = useState(true)
  const [isForgot, setIsForgot] = useState(false)
  const [message, setMessage] = useState("")

  const handleLogin = async () => {
    setLoading(true)
    setMessage("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage("❌ " + error.message)
    setLoading(false)
  }

  const handleRegister = async () => {
    setLoading(true)
    setMessage("")
    if (!username.trim()) {
      setMessage("❌ Du må fylle inn et brukernavn")
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: username } }
    })
    if (error) setMessage("❌ " + error.message)
    else setMessage("✅ Konto opprettet! Du kan nå logge inn.")
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    setMessage("")
    if (!email.trim()) {
      setMessage("❌ Skriv inn e-postadressen din først")
      setLoading(false)
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vm2026tips.vercel.app',
    })
    if (error) setMessage("❌ " + error.message)
    else setMessage("✅ Sjekk e-posten din for å nullstille passordet!")
    setLoading(false)
  }

  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  if (isForgot) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.header}>
            <div style={styles.trophy}>🏆</div>
            <h1 style={styles.title}>Glemt passord</h1>
            <p style={styles.subtitle}>Vi sender deg en e-post med en lenke</p>
          </div>

          <div style={styles.form}>
            <input
              style={styles.input}
              type="email"
              placeholder="E-post"
              value={email}
              onFocus={handleFocus}
              onChange={e => setEmail(e.target.value)}
            />

            {message && <div style={styles.message}>{message}</div>}

            <button
              style={styles.button}
              onClick={handleForgotPassword}
              disabled={loading}
            >
              {loading ? "Sender..." : "Send tilbakestillingslenke"}
            </button>

            <button
              style={styles.backButton}
              onClick={() => { setIsForgot(false); setMessage("") }}
            >
              ← Tilbake til innlogging
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.trophy}>🏆</div>
          <h1 style={styles.title}>VM Tipping 2026</h1>
          <p style={styles.subtitle}>USA · Canada · Mexico</p>
        </div>

        <div style={styles.tabs}>
          <button
            style={{ ...styles.tab, ...(isLogin ? styles.activeTab : {}) }}
            onClick={() => setIsLogin(true)}
          >
            Logg inn
          </button>
          <button
            style={{ ...styles.tab, ...(!isLogin ? styles.activeTab : {}) }}
            onClick={() => setIsLogin(false)}
          >
            Registrer
          </button>
        </div>

        <div style={styles.form}>
          {!isLogin && (
            <input
              style={styles.input}
              type="text"
              placeholder="Brukernavn"
              value={username}
              onFocus={handleFocus}
              onChange={e => setUsername(e.target.value)}
            />
          )}
          <input
            style={styles.input}
            type="email"
            placeholder="E-post"
            value={email}
            onFocus={handleFocus}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Passord"
            value={password}
            onFocus={handleFocus}
            onChange={e => setPassword(e.target.value)}
          />

          {message && <div style={styles.message}>{message}</div>}

          <button
            style={styles.button}
            onClick={isLogin ? handleLogin : handleRegister}
            disabled={loading}
          >
            {loading ? "Laster..." : isLogin ? "Logg inn" : "Opprett konto"}
          </button>

          {isLogin && (
            <button
              style={styles.forgotButton}
              onClick={() => { setIsForgot(true); setMessage("") }}
            >
              Glemt passord?
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
  },
  card: {
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(10px)',
    borderRadius: '20px',
    padding: '40px',
    width: '100%',
    maxWidth: '400px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px',
  },
  trophy: {
    fontSize: '60px',
    marginBottom: '10px',
  },
  title: {
    color: 'white',
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 5px 0',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    margin: 0,
  },
  tabs: {
    display: 'flex',
    marginBottom: '20px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    padding: '4px',
  },
  tab: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    background: 'transparent',
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    fontWeight: '500',
  },
  activeTab: {
    background: '#e94560',
    color: 'white',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '14px 16px',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '15px',
    outline: 'none',
  },
  message: {
    padding: '12px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '14px',
    textAlign: 'center',
  },
  button: {
    padding: '14px',
    borderRadius: '10px',
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  forgotButton: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'underline',
  },
  backButton: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.5)',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'center',
    textDecoration: 'underline',
  },
}