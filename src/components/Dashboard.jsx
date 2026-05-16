import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"
import Leaderboard from "./Leaderboard"
import Predictions from "./Predictions"
import BonusQuestions from "./BonusQuestions"

export default function Dashboard({ session }) {
  const [activeTab, setActiveTab] = useState("predictions")
  const [profile, setProfile] = useState(null)

  useEffect(() => {
    getProfile()
  }, [session])

  const getProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
    setProfile(data)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  const tabs = [
    { id: "predictions", label: "⚽ Tippe kamper" },
    { id: "bonus", label: "🎯 Bonusspørsmål" },
    { id: "leaderboard", label: "🏆 Ledertavle" },
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
        {activeTab === "predictions" && <Predictions session={session} />}
        {activeTab === "bonus" && <BonusQuestions session={session} />}
        {activeTab === "leaderboard" && <Leaderboard />}
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    color: 'white',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logo: {
    fontSize: '32px',
  },
  appName: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: 'white',
  },
  welcome: {
    fontSize: '13px',
    color: 'rgba(255,255,255,0.6)',
  },
  signOut: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  tabs: {
    display: 'flex',
    padding: '16px 24px',
    gap: '8px',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    overflowX: 'auto',
  },
  tab: {
    padding: '10px 20px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    fontWeight: '500',
  },
  activeTab: {
    background: '#e94560',
    border: '1px solid #e94560',
    color: 'white',
  },
  content: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
}