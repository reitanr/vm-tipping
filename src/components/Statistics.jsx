import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function Statistics() {
  const [stats, setStats] = useState(null)
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("username")
    setProfiles(profilesData || [])

    const { data: matchPreds } = await supabase
      .from("match_predictions")
      .select("*, matches(home_score, away_score, group_letter, home_team_id, away_team_id), profiles(username)")

    const { data: teams } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teams?.forEach(t => teamsMap[t.id] = t)

    // Beregn statistikk per bruker
    const userStats = {}
    profilesData?.forEach(p => {
      userStats[p.id] = {
        username: p.username,
        total: 0,
        exact: 0,
        correct: 0,
        wrong: 0,
        norwegianPreds: [],
        englandPreds: [],
      }
    })

    matchPreds?.forEach(pred => {
      const match = pred.matches
      const userId = pred.user_id
      if (!userStats[userId] || !match?.home_score === null) return
      if (match.home_score === null) return

      const actualOutcome = match.home_score > match.away_score ? 'home' :
        match.away_score > match.home_score ? 'away' : 'draw'
      const predOutcome = pred.home_score > pred.away_score ? 'home' :
        pred.away_score > pred.home_score ? 'away' : 'draw'

      userStats[userId].total++

      if (pred.home_score === match.home_score && pred.away_score === match.away_score) {
        userStats[userId].exact++
        userStats[userId].correct++
      } else if (actualOutcome === predOutcome) {
        userStats[userId].correct++
      } else {
        userStats[userId].wrong++
      }

      // Norge og England statistikk
      if (match.home_team_id === 35 || match.away_team_id === 35) {
        userStats[userId].norwegianPreds.push({
          pred: `${pred.home_score}-${pred.away_score}`,
          actual: `${match.home_score}-${match.away_score}`,
          points: pred.points_awarded,
        })
      }
      if (match.home_team_id === 45 || match.away_team_id === 45) {
        userStats[userId].englandPreds.push({
          pred: `${pred.home_score}-${pred.away_score}`,
          actual: `${match.home_score}-${match.away_score}`,
          points: pred.points_awarded,
        })
      }
    })

    // Sorter etter eksakte treff
    const sorted = Object.values(userStats).sort((a, b) => b.exact - a.exact)

    // Generell statistikk
    const allFinished = matchPreds?.filter(p => p.matches?.home_score !== null) || []
    const totalExact = allFinished.filter(p =>
      p.home_score === p.matches?.home_score && p.away_score === p.matches?.away_score
    ).length
    const totalCorrect = allFinished.filter(p => {
      if (!p.matches?.home_score === null) return false
      const actual = p.matches.home_score > p.matches.away_score ? 'home' :
        p.matches.away_score > p.matches.home_score ? 'away' : 'draw'
      const pred = p.home_score > p.away_score ? 'home' :
        p.away_score > p.home_score ? 'away' : 'draw'
      return actual === pred
    }).length

    setStats({ userStats: sorted, totalExact, totalCorrect, total: allFinished.length })
    setLoading(false)
  }

  if (loading) return <div style={styles.loading}>Laster statistikk...</div>

  const finishedMatches = stats?.total > 0

  return (
    <div>
      <h2 style={styles.title}>📊 Statistikk</h2>

      {!finishedMatches ? (
        <div style={styles.empty}>
          📊 Statistikk vises når VM er i gang og resultater er lagt inn!
        </div>
      ) : (
        <>
          <div style={styles.overviewGrid}>
            <div style={styles.overviewCard}>
              <div style={styles.overviewNumber}>{stats.total}</div>
              <div style={styles.overviewLabel}>Kamper spilt</div>
            </div>
            <div style={styles.overviewCard}>
              <div style={styles.overviewNumber}>{stats.totalExact}</div>
              <div style={styles.overviewLabel}>Eksakte treff totalt</div>
            </div>
            <div style={styles.overviewCard}>
              <div style={styles.overviewNumber}>
                {stats.total > 0 ? Math.round((stats.totalCorrect / stats.total) * 100) : 0}%
              </div>
              <div style={styles.overviewLabel}>Riktig utfall snitt</div>
            </div>
          </div>

          <h3 style={styles.sectionTitle}>🎯 Eksakte treff per spiller</h3>
          <div style={styles.list}>
            {stats.userStats.map((user, index) => (
              <div key={user.username} style={styles.userCard}>
                <div style={styles.userHeader}>
                  <span style={styles.rank}>#{index + 1}</span>
                  <span style={styles.username}>{user.username}</span>
                  <span style={styles.exactBadge}>🎯 {user.exact} eksakte</span>
                </div>
                {user.total > 0 && (
                  <div style={styles.userStats}>
                    <div style={styles.statItem}>
                      <span style={styles.statLabel}>Totalt tippet:</span>
                      <span style={styles.statValue}>{user.total}</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statLabel}>Riktig utfall:</span>
                      <span style={styles.statValue}>{user.correct}</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statLabel}>Feil:</span>
                      <span style={{ ...styles.statValue, color: '#e94560' }}>{user.wrong}</span>
                    </div>
                    <div style={styles.statItem}>
                      <span style={styles.statLabel}>Treffsikkerhet:</span>
                      <span style={styles.statValue}>
                        {user.total > 0 ? Math.round((user.correct / user.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                )}
                {user.norwegianPreds.length > 0 && (
                  <div style={styles.teamStats}>
                    <span style={styles.teamStatsLabel}>🇳🇴 Norge:</span>
                    {user.norwegianPreds.map((p, i) => (
                      <span key={i} style={{
                        ...styles.predBadge,
                        background: p.points > 0 ? 'rgba(39,174,96,0.2)' : 'rgba(233,69,96,0.2)'
                      }}>
                        {p.pred} {p.points > 0 ? `✅ ${p.points}p` : '❌'}
                      </span>
                    ))}
                  </div>
                )}
                {user.englandPreds.length > 0 && (
                  <div style={styles.teamStats}>
                    <span style={styles.teamStatsLabel}>🏴󠁧󠁢󠁥󠁮󠁧󠁿 England:</span>
                    {user.englandPreds.map((p, i) => (
                      <span key={i} style={{
                        ...styles.predBadge,
                        background: p.points > 0 ? 'rgba(39,174,96,0.2)' : 'rgba(233,69,96,0.2)'
                      }}>
                        {p.pred} {p.points > 0 ? `✅ ${p.points}p` : '❌'}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  empty: {
    color: 'rgba(255,255,255,0.5)', textAlign: 'center',
    padding: '40px', background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px', fontSize: '15px',
  },
  overviewGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px', marginBottom: '24px',
  },
  overviewCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
    textAlign: 'center',
  },
  overviewNumber: { color: '#e94560', fontSize: '32px', fontWeight: 'bold' },
  overviewLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginTop: '4px' },
  sectionTitle: { color: 'white', fontSize: '17px', marginBottom: '16px' },
  list: { display: 'flex', flexDirection: 'column', gap: '10px' },
  userCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  userHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' },
  rank: { color: 'rgba(255,255,255,0.4)', fontSize: '14px', minWidth: '24px' },
  username: { flex: 1, color: 'white', fontSize: '16px', fontWeight: '500' },
  exactBadge: {
    background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.3)',
    color: 'gold', padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
  },
  userStats: {
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px', marginBottom: '12px',
  },
  statItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  statLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '13px' },
  statValue: { color: 'white', fontSize: '13px', fontWeight: 'bold' },
  teamStats: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '8px' },
  teamStatsLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  predBadge: {
    padding: '3px 8px', borderRadius: '20px',
    color: 'white', fontSize: '11px',
  },
}