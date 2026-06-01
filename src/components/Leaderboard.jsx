import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const COLORS = ['#e94560', '#27ae60', '#f39c12', '#3498db', '#9b59b6', '#1abc9c', '#e67e22', '#e91e63']

export default function Leaderboard() {
  const [scores, setScores] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showGraph, setShowGraph] = useState(false)

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
      .select("user_id, points_awarded, match_id, matches(match_date)")
      .order("match_id")

    const { data: bonusPreds } = await supabase
      .from("bonus_predictions")
      .select("user_id, points_awarded")

    const { data: playoffPreds } = await supabase
      .from("playoff_predictions")
      .select("user_id, points_awarded")

    const scoreMap = {}
    profiles?.forEach(p => {
      scoreMap[p.id] = { username: p.username, matchPoints: 0, bonusPoints: 0, playoffPoints: 0 }
    })

    matchPreds?.forEach(p => {
      if (scoreMap[p.user_id]) scoreMap[p.user_id].matchPoints += p.points_awarded || 0
    })

    bonusPreds?.forEach(p => {
      if (scoreMap[p.user_id]) scoreMap[p.user_id].bonusPoints += p.points_awarded || 0
    })

    playoffPreds?.forEach(p => {
      if (scoreMap[p.user_id]) scoreMap[p.user_id].playoffPoints += p.points_awarded || 0
    })

    const sorted = Object.values(scoreMap)
      .map(s => ({ ...s, total: s.matchPoints + s.bonusPoints + s.playoffPoints }))
      .sort((a, b) => b.total - a.total)

    setScores(sorted)

    // Bygg poenghistorikk per kamp
    const finishedMatches = matchPreds
      ?.filter(p => p.matches?.match_date && p.points_awarded > 0)
      .sort((a, b) => new Date(a.matches.match_date) - new Date(b.matches.match_date))

    if (finishedMatches?.length > 0) {
      const userHistory = {}
      profiles?.forEach(p => { userHistory[p.id] = { username: p.username, points: [0] } })

      const matchIds = [...new Set(finishedMatches.map(p => p.match_id))]
      matchIds.forEach(matchId => {
        const matchPredictions = finishedMatches.filter(p => p.match_id === matchId)
        profiles?.forEach(p => {
          const prev = userHistory[p.id]?.points.slice(-1)[0] || 0
          const gained = matchPredictions.find(mp => mp.user_id === p.id)?.points_awarded || 0
          userHistory[p.id]?.points.push(prev + gained)
        })
      })

      setHistory(Object.values(userHistory))
    }

    setLoading(false)
  }

  const getMedal = (index) => {
    if (index === 0) return "🥇"
    if (index === 1) return "🥈"
    if (index === 2) return "🥉"
    return `${index + 1}.`
  }

  const renderGraph = () => {
    if (history.length === 0) return null

    const maxPoints = Math.max(...history.map(u => Math.max(...u.points)))
    const width = 600
    const height = 200
    const padding = { top: 20, right: 20, bottom: 30, left: 40 }
    const graphWidth = width - padding.left - padding.right
    const graphHeight = height - padding.top - padding.bottom

    const maxX = Math.max(...history.map(u => u.points.length - 1))

    const getX = (i) => padding.left + (i / maxX) * graphWidth
    const getY = (p) => padding.top + graphHeight - (p / (maxPoints || 1)) * graphHeight

    return (
      <div style={styles.graphContainer}>
        <svg viewBox={`0 0 ${width} ${height}`} style={styles.graph}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <g key={f}>
              <line
                x1={padding.left} y1={padding.top + graphHeight * (1 - f)}
                x2={width - padding.right} y2={padding.top + graphHeight * (1 - f)}
                stroke="rgba(255,255,255,0.1)" strokeWidth="1"
              />
              <text
                x={padding.left - 5} y={padding.top + graphHeight * (1 - f) + 4}
                fill="rgba(255,255,255,0.4)" fontSize="10" textAnchor="end"
              >
                {Math.round(maxPoints * f)}
              </text>
            </g>
          ))}

          {/* Lines per user */}
          {history.map((user, i) => {
            const color = COLORS[i % COLORS.length]
            const points = user.points
            const path = points.map((p, j) =>
              `${j === 0 ? 'M' : 'L'} ${getX(j)} ${getY(p)}`
            ).join(' ')

            return (
              <g key={user.username}>
                <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
                <circle
                  cx={getX(points.length - 1)}
                  cy={getY(points[points.length - 1])}
                  r="4" fill={color}
                />
                <text
                  x={getX(points.length - 1) + 6}
                  y={getY(points[points.length - 1]) + 4}
                  fill={color} fontSize="10"
                >
                  {user.username}
                </text>
              </g>
            )
          })}
        </svg>

        <div style={styles.legend}>
          {history.map((user, i) => (
            <div key={user.username} style={styles.legendItem}>
              <div style={{ ...styles.legendColor, background: COLORS[i % COLORS.length] }} />
              <span style={styles.legendLabel}>{user.username}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (loading) return <div style={styles.loading}>Laster ledertavle...</div>

  return (
    <div>
      <h2 style={styles.title}>🏆 Ledertavle</h2>
      <p style={styles.subtitle}>Oppdateres hver kveld</p>

      {scores.length === 0 ? (
        <div style={styles.empty}>Ingen poeng registrert ennå – VM starter snart!</div>
      ) : (
        <>
          <div style={styles.list}>
            {scores.map((score, index) => (
              <div
                key={score.username}
                style={{ ...styles.row, ...(index === 0 ? styles.firstPlace : {}) }}
              >
                <div style={styles.rank}>{getMedal(index)}</div>
                <div style={styles.username}>{score.username}</div>
                <div style={styles.points}>
                  <div style={styles.totalPoints}>{score.total} poeng</div>
                  <div style={styles.breakdown}>
                    ⚽ {score.matchPoints} · 🏆 {score.playoffPoints} · 🎯 {score.bonusPoints}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {history.length > 0 && (
            <div style={styles.graphSection}>
              <button
                style={styles.toggleGraph}
                onClick={() => setShowGraph(!showGraph)}
              >
                {showGraph ? "Skjul graf" : "📈 Vis poengutvikling"}
              </button>
              {showGraph && renderGraph()}
            </div>
          )}
        </>
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
  list: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' },
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
  graphSection: { marginTop: '16px' },
  toggleGraph: {
    width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
    background: 'rgba(255,255,255,0.05)', color: 'white',
    cursor: 'pointer', fontSize: '14px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  graphContainer: {
    marginTop: '16px', background: 'rgba(255,255,255,0.03)',
    borderRadius: '12px', padding: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  graph: { width: '100%', height: 'auto' },
  legend: { display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '12px' },
  legendItem: { display: 'flex', alignItems: 'center', gap: '6px' },
  legendColor: { width: '12px', height: '12px', borderRadius: '50%' },
  legendLabel: { color: 'rgba(255,255,255,0.7)', fontSize: '12px' },
}