import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function Leaderboard() {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScores()
  }, [])

  const fetchScores = async () => {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("username")

    const { data: matchPreds } = await supabase
      .from("match_predictions")
      .select("user_id, points_awarded")

    const { data: bonusPreds } = await supabase
      .from("bonus_predictions")
      .select("user_id, points_awarded")

    const scoreMap = {}
    profiles?.forEach(p => {
      scoreMap[p.id] = { username: p.username, matchPoints: 0, bonusPoints: 0 }
    })

    matchPreds?.forEach(p => {
      if (scoreMap[p.user_id]) scoreMap[p.user_id].matchPoints += p.points_awarded || 0
    })

    bonusPreds?.forEach(p => {
      if (scoreMap[p.user_id]) scoreMap[p.user_id].bonusPoints += p.points_awarded || 0
    })

    const sorted = Object.values(scoreMap)
      .map(s => ({ ...s, total: s.matchPoints + s.bonusPoints }))
      .sort((a, b) => b.total - a.total)

    setScores(sorted)
    setLoading(false)
  }

  const getMedal = (index) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  if (loading) return <div style={styles.loading}>Laster ledertavle...</div>

  return (
    <div>
      <h2 style={styles.title}>🏆 Ledertavle</h2>
      <p style={styles.subtitle}>Oppdateres hver kveld</p>

      {scores.length === 0 ? (
        <div style={styles.empty}>Ingen poeng registrert ennå – VM starter snart!</div>
      ) : (
        <div style={styles.list}>
          {scores.map((score, index) => (
            <div
              key={score.username}
              style={{
                ...styles.row,
                ...(index === 0 ? styles.firstPlace : {}),
              }}
            >
              <div style={styles.rank}>{getMedal(index)}</div>
              <div style={styles.username}>{score.username}</div>
              <div style={styles.points}>
                <div style={styles.totalPoints}>{score.total} poeng</div>
                <div style={styles.breakdown}>
                  ⚽ {score.matchPoints} + 🎯 {score.bonusPoints}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '8px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  empty: {
    color: 'rgba(255,255,255,0.5)', textAlign: 'center',
    padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
  },
  list: { display: 'flex', flexDirection: 'column', gap: '8px' },
  row: {
    display: 'flex', alignItems: 'center', gap: '16px',
    padding: '16px 20px', background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
  },
  firstPlace: {
    background: 'rgba(255,215,0,0.1)',
    border: '1px solid rgba(255,215,0,0.3)',
  },
  rank: { fontSize: '24px', width: '40px', textAlign: 'center' },
  username: { flex: 1, color: 'white', fontSize: '16px', fontWeight: '500' },
  points: { textAlign: 'right' },
  totalPoints: { color: 'white', fontSize: '18px', fontWeight: 'bold' },
  breakdown: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginTop: '2px' },
}