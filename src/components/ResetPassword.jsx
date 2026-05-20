import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const handleReset = async () => {
    if (password !== confirmPassword) {
      setMessage("❌ Passordene er ikke like!")
      return
    }
    if (password.length < 6) {
      setMessage("❌ Passordet må være minst 6 tegn")
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setMessage("❌ " + error.message)
      setLoading(false)
    } else {
      setMessage("✅ Passordet er oppdatert!")
      setTimeout(() => {
        onDone()
      }, 2000)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.trophy}>🏆</div>
          <h1 style={styles.title}>Sett nytt passord</h1>
          <p style={styles.subtitle}>Skriv inn ditt nye passord</p>
        </div>

        <div style={styles.form}>
          <input
            style={styles.input}
            type="password"
            placeholder="Nytt passord"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Bekreft passord"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
          />

          {message && <div style={styles.message}>{message}</div>}

          <button
            style={styles.button}
            onClick={handleReset}
            disabled={loading}
          >
            {loading ? "Lagrer..." : "Sett nytt passord"}
          </button>
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
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
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
}