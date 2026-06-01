import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import Leaderboard from "./Leaderboard"
import Predictions from "./Predictions"
import BonusQuestions from "./BonusQuestions"
import Admin from "./Admin"
import Rules from "./Rules"
import AllPredictions from "./AllPredictions"
import Playoff from "./Playoff"

function Countdown() {
  const [timeLeft, setTimeLeft] = useState({})
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const target = new Date('2026-06-11T19:00:00Z') // 11. juni kl 21:00 norsk tid

    const update = () => {
      const now = new Date()
      const diff = target - now

      if (diff <= 0) {
        setStarted(true)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setTimeLeft({ days, hours, minutes, seconds })
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  if (started) return (
    <div style={countdownStyles.banner}>
      <span style={countdownStyles.emoji}>⚽</span>
      <span style={countdownStyles.text}>VM 2026 er i gang!</span>
    </div>
  )

  return (
    <div style={countdownStyles.banner}>
      <span style={countdownStyles.label}>⏳ VM starter om:</span>
      <div style={countdownStyles.units}>
        <div style={countdownStyles.unit}>
          <span style={countdownStyles.number}>{timeLeft.days}</span>
          <span style={countdownStyles.unitLabel}>dager</span>
        </div>
        <span style={countdownStyles.separator}>:</span>
        <div style={countdownStyles.unit}>
          <span style={countdownStyles.number}>{String(timeLeft.hours).padStart(2, '0')}</span>
          <span style={countdownStyles.unitLabel}>timer</span>
        </div>
        <span style={countdownStyles.separator}>:</span>
        <div style={countdownStyles.unit}>
          <span style={countdownStyles.number}>{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span style={countdownStyles.unitLabel}>min</span>
        </div>
        <span style={countdownStyles.separator}>:</span>
        <div style={countdownStyles.unit}>
          <span style={countdownStyles.number}>{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span style={countdownStyles.unitLabel}>sek</span>
        </div>
      </div>
    </div>
  )
}

const countdownStyles = {
  banner: {
    background: 'linear-gradient(135deg, rgba(233,69,96,0.3), rgba(12,52,96,0.3))',
    borderBottom: '1px solid rgba(233,69,96,0.3)',
    padding: '12px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  label: { color: 'rgba(255,255,255,0.7)', fontSize: '14px' },
  emoji: { fontSize: '24px' },
  text: { color: 'white', fontSize: '18px', fontWeight: 'bold' },
  units: { display: 'flex', alignItems: 'center', gap: '8px' },
  unit: { display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '48px' },
  number: { color: 'white', fontSize: '24px', fontWeight: 'bold', lineHeight: 1 },
  unitLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: '2px' },
  separator: { color: 'rgba(255,255,255,0.4)', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' },
}

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState("predictions")
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState(null)

  useEffect(() => {
    getProfile()
    getSettings()
  }, [session])

  const getProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
    setProfile(data)
  }

  const getSettings = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("*")
      .single()
    if (data) setSettings(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const isAdmin = profile?.is_admin
  const showAllPredictions = isAdmin || settings?.show_all_predictions === true

  if (!settings) return (
    <div style={styles.loadingContainer}>
      <div style={styles.loadingText}>🏆 Laster...</div>
    </div>
  )

  const tabs = [
    { id: "predictions", label: "⚽ Gruppespill" },
    ...(settings?.playoff_open ? [{ id: "playoff", label: "🏆 Sluttspill" }] : []),
    { id: "bonus", label: "🎯 Bonus" },
    { id: "leaderboard", label: "🥇 Ledertavle" },
    ...(showAllPredictions ? [{ id: "allpredictions", label: "👀 Alles tips" }] : []),
    { id: "rules", label: "📋 Regler" },
    ...(isAdmin ? [{ id: "admin", label: "⚙️ Admin" }] : []),
  ]

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.logo}>🏆</div>
          <div>
            <div style={styles.appName}>VM Tipping 2026</div>
            <div style={styles.welcome}>Hei, {profile?.username || "spiller"}!</div>
          </div>
        </div>
        <button style={styles.signOut} onClick={handleSignOut}>
          Logg ut
        </button>
      </div>

      <Countdown />

      <div style={styles.tabs}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            style={{ ...styles.tab, ...(activeTab === tab.id ? styles.activeTab : {}) }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        <div style={{ display: activeTab === "predictions" ? "block" : "none" }}>
          <Predictions session={session} />
        </div>
        <div style={{ display: activeTab === "playoff" ? "block" : "none" }}>
          <Playoff session={session} />
        </div>
        <div style={{ display: activeTab === "bonus" ? "block" : "none" }}>
          <BonusQuestions session={session} />
        </div>
        <div style={{ display: activeTab === "leaderboard" ? "block" : "none" }}>
          <Leaderboard />
        </div>
        {showAllPredictions && (
          <div style={{ display: activeTab === "allpredictions" ? "block" : "none" }}>
            <AllPredictions />
          </div>
        )}
        <div style={{ display: activeTab === "rules" ? "block" : "none" }}>
          <Rules />
        </div>
        {isAdmin && (
          <div style={{ display: activeTab === "admin" ? "block" : "none" }}>
            <Admin />
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { minHeight: '100vh', color: 'white' },
  loadingContainer: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  },
  loadingText: { color: 'white', fontSize: '24px', fontWeight: 'bold' },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 24px', background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { fontSize: '32px' },
  appName: { fontSize: '18px', fontWeight: 'bold', color: 'white' },
  welcome: { fontSize: '13px', color: 'rgba(255,255,255,0.6)' },
  signOut: {
    padding: '8px 16px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px',
  },
  tabs: {
    display: 'flex', padding: '16px 24px', gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)', overflowX: 'auto',
  },
  tab: {
    padding: '10px 20px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px',
    whiteSpace: 'nowrap', fontWeight: '500',
  },
  activeTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  content: { padding: '24px', maxWidth: '900px', margin: '0 auto' },
}