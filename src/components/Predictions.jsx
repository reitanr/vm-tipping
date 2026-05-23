import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function Predictions({ session }) {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [activeGroup, setActiveGroup] = useState('I')
  const [message, setMessage] = useState("")
  const [bettingOpen, setBettingOpen] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .single()
    if (settingsData) setBettingOpen(settingsData.group_betting_open)

    const { data: teamsData } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)

    const { data: matchesData } = await supabase
      .from("matches")
      .select("*")
      .eq("round", "group")
      .order("match_date")
    setMatches(matchesData || [])

    const { data: predictionsData } = await supabase
      .from("match_predictions")
      .select("*")
      .eq("user_id", session.user.id)

    const predsMap = {}
    predictionsData?.forEach(p => {
      predsMap[p.match_id] = {
        home: p.home_score.toString(),
        away: p.away_score.toString(),
      }
    })
    setPredictions(predsMap)
    setLoading(false)
  }

  const handleScoreChange = (matchId, side, value) => {
    if (value !== "" && (isNaN(value) || parseInt(value) < 0)) return
    setPredictions(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side]: value,
      }
    }))
  }

  const savePrediction = async (matchId) => {
    const pred = predictions[matchId]
    if (!pred || pred.home === "" || pred.away === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(prev => ({ ...prev, [matchId]: true }))

    const { error } = await supabase
      .from("match_predictions")
      .upsert({
        user_id: session.user.id,
        match_id: matchId,
        home_score: parseInt(pred.home),
        away_score: parseInt(pred.away),
      }, { onConflict: "user_id,match_id" })

    if (error) {
      setMessage("❌ Noe gikk galt, prøv igjen")
    } else {
      setMessage("✅ Tipp lagret!")
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [matchId]: false }))
  }

  const saveAll = async () => {
    const groupMatches = matches.filter(m => m.group_letter === activeGroup)
    let saved = 0
    for (const match of groupMatches) {
      const pred = predictions[match.id]
      if (pred && pred.home !== "" && pred.away !== "") {
        await supabase.from("match_predictions").upsert({
          user_id: session.user.id,
          match_id: match.id,
          home_score: parseInt(pred.home),
          away_score: parseInt(pred.away),
        }, { onConflict: "user_id,match_id" })
        saved++
      }
    }
    setMessage(`✅ Lagret ${saved} tipps!`)
    setTimeout(() => setMessage(""), 3000)
  }

  const groupMatches = matches.filter(m => m.group_letter === activeGroup)

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nb-NO', {
      weekday: 'long', day: 'numeric', month: 'long'
    })
  }

  const countPredictions = (group) => {
    const gMatches = matches.filter(m => m.group_letter === group)
    return gMatches.filter(m => predictions[m.id]?.home !== "" && predictions[m.id]?.home !== undefined).length
  }

  if (loading) return <div style={styles.loading}>Laster kamper...</div>

  return (
    <div>
      <h2 style={styles.title}>⚽ Tippe kampresultater</h2>
      {bettingOpen ? (
        <p style={styles.subtitle}>Tipp eksakt resultat på alle 72 gruppespillkamper</p>
      ) : (
        <div style={styles.closedBanner}>
          🔒 Tippingen er stengt – VM er i gang! Her ser du dine innleverte tips.
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.groupTabs}>
        {GROUPS.map(g => {
          const count = countPredictions(g)
          const total = matches.filter(m => m.group_letter === g).length
          const done = count === total
          return (
            <button
              key={g}
              style={{
                ...styles.groupTab,
                ...(activeGroup === g ? styles.activeGroupTab : {}),
                ...(done ? styles.doneGroupTab : {}),
              }}
              onClick={() => setActiveGroup(g)}
            >
              {g}
              {done && <span style={styles.checkmark}>✓</span>}
            </button>
          )
        })}
      </div>

      <div style={styles.groupHeader}>
        <h3 style={styles.groupTitle}>Gruppe {activeGroup}</h3>
        {bettingOpen && (
          <button style={styles.saveAllButton} onClick={saveAll}>
            💾 Lagre alle
          </button>
        )}
      </div>

      <div style={styles.matches}>
        {groupMatches.map(match => {
          const home = teams[match.home_team_id]
          const away = teams[match.away_team_id]
          const pred = predictions[match.id] || { home: "", away: "" }
          const isSaving = saving[match.id]
          const hasPred = pred.home !== "" && pred.away !== ""

          return (
            <div key={match.id} style={{
              ...styles.matchCard,
              ...(hasPred ? styles.matchCardDone : {})
            }}>
              <div style={styles.matchInfo}>
                <span style={styles.matchDate}>{formatDate(match.match_date)}</span>
                <span style={styles.matchStadium}>{match.stadium}</span>
              </div>

              <div style={styles.matchRow}>
                <div style={styles.team}>
                  <span style={styles.flag}>{home?.flag_emoji}</span>
                  <span style={styles.teamName}>{home?.name}</span>
                </div>

                <div style={styles.scoreInputs}>
                  {bettingOpen ? (
                    <>
                      <input
                        style={styles.scoreInput}
                        type="number"
                        min="0"
                        max="20"
                        value={pred.home}
                        onChange={e => handleScoreChange(match.id, "home", e.target.value)}
                        placeholder="-"
                      />
                      <span style={styles.vs}>–</span>
                      <input
                        style={styles.scoreInput}
                        type="number"
                        min="0"
                        max="20"
                        value={pred.away}
                        onChange={e => handleScoreChange(match.id, "away", e.target.value)}
                        placeholder="-"
                      />
                    </>
                  ) : (
                    <span style={styles.lockedScore}>
                      {hasPred ? `${pred.home} – ${pred.away}` : "– – –"}
                    </span>
                  )}
                </div>

                <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                  <span style={styles.teamName}>{away?.name}</span>
                  <span style={styles.flag}>{away?.flag_emoji}</span>
                </div>
              </div>

              {bettingOpen && (
                <button
                  style={{ ...styles.saveButton, opacity: isSaving ? 0.6 : 1 }}
                  onClick={() => savePrediction(match.id)}
                  disabled={isSaving}
                >
                  {isSaving ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '8px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' },
  closedBanner: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'rgba(233,69,96,0.2)', border: '1px solid rgba(233,69,96,0.4)',
    color: 'white', marginBottom: '20px', fontSize: '14px',
  },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  message: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)', color: 'white',
    marginBottom: '16px', textAlign: 'center',
  },
  groupTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  groupTab: {
    width: '44px', height: '44px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px',
    fontWeight: 'bold', position: 'relative', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
  },
  activeGroupTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  doneGroupTab: { background: 'rgba(39, 174, 96, 0.3)', border: '1px solid #27ae60', color: 'white' },
  checkmark: { fontSize: '9px', color: '#27ae60' },
  groupHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
  groupTitle: { color: 'white', fontSize: '18px', margin: 0 },
  saveAllButton: {
    padding: '8px 16px', borderRadius: '8px', border: 'none',
    background: 'rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', fontSize: '14px',
  },
  matches: { display: 'flex', flexDirection: 'column', gap: '12px' },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  matchInfo: { display: 'flex', justifyContent: 'space-between', marginBottom: '8px' },
  matchDate: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  matchStadium: { color: 'rgba(255,255,255,0.3)', fontSize: '11px', textAlign: 'right' },
  matchRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '12px 0' },
  team: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  flag: { fontSize: '24px' },
  teamName: { color: 'white', fontSize: '15px', fontWeight: '500' },
  scoreInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreInput: {
    width: '52px', height: '52px', borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: '22px', fontWeight: 'bold', textAlign: 'center', outline: 'none',
  },
  lockedScore: {
    color: 'white', fontSize: '22px', fontWeight: 'bold',
    padding: '0 12px', minWidth: '80px', textAlign: 'center',
  },
  vs: { color: 'rgba(255,255,255,0.4)', fontSize: '18px' },
  saveButton: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '4px',
  },
}