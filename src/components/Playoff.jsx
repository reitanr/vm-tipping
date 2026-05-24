import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const ROUNDS = [
  { id: 'r16', label: '16-delsfinale' },
  { id: 'r8', label: '8-delsfinale' },
  { id: 'qf', label: 'Kvartfinale' },
  { id: 'sf', label: 'Semifinale' },
  { id: 'bronze', label: 'Bronsefinale' },
  { id: 'final', label: 'Finale' },
]

export default function Playoff({ session }) {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [predictions, setPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState({})
  const [message, setMessage] = useState("")
  const [activeRound, setActiveRound] = useState('r16')
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
      .from("playoff_matches")
      .select("*")
      .order("position")
    setMatches(matchesData || [])

    const { data: predsData } = await supabase
      .from("playoff_predictions")
      .select("*")
      .eq("user_id", session.user.id)

    const predsMap = {}
    predsData?.forEach(p => {
      predsMap[p.match_id] = p
    })
    setPredictions(predsMap)
    setLoading(false)
  }

  const savePrediction = async (matchId, homeScore, awayScore, winnerId) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(prev => ({ ...prev, [matchId]: true }))

    const { error } = await supabase
      .from("playoff_predictions")
      .upsert({
        user_id: session.user.id,
        match_id: matchId,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        winner_id: winnerId,
      }, { onConflict: "user_id,match_id" })

    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPredictions(prev => ({
        ...prev,
        [matchId]: {
          match_id: matchId,
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          winner_id: winnerId,
        }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [matchId]: false }))
  }

  const MatchCard = ({ match }) => {
    const home = teams[match.home_team_id]
    const away = teams[match.away_team_id]
    const pred = predictions[match.id]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)

    const isDrawn = homeScore !== "" && awayScore !== "" && 
      parseInt(homeScore) === parseInt(awayScore) &&
      match.round !== 'group'

    const autoWinner = !isDrawn && homeScore !== "" && awayScore !== ""
      ? parseInt(homeScore) > parseInt(awayScore) ? match.home_team_id : match.away_team_id
      : null

    const hasPred = pred !== undefined

    if (!home || !away) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>⏳ Venter på at lagene blir klare</div>
        </div>
      )
    }

    return (
      <div style={{ ...styles.matchCard, ...(hasPred ? styles.matchCardDone : {}) }}>
        {match.match_date && (
          <div style={styles.matchDate}>
            {new Date(match.match_date).toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        )}
        {match.stadium && <div style={styles.matchStadium}>{match.stadium}</div>}

        <div style={styles.matchRow}>
          <div style={styles.team}>
            <span style={styles.flag}>{home.flag_emoji}</span>
            <span style={styles.teamName}>{home.name}</span>
          </div>

          <div style={styles.scoreInputs}>
            {bettingOpen ? (
              <>
                <input
                  style={styles.scoreInput}
                  type="number" min="0" max="20"
                  value={homeScore}
                  onChange={e => setHomeScore(e.target.value)}
                  placeholder="-"
                />
                <span style={styles.vs}>–</span>
                <input
                  style={styles.scoreInput}
                  type="number" min="0" max="20"
                  value={awayScore}
                  onChange={e => setAwayScore(e.target.value)}
                  placeholder="-"
                />
              </>
            ) : (
              <span style={styles.lockedScore}>
                {hasPred ? `${pred.home_score} – ${pred.away_score}` : "– – –"}
              </span>
            )}
          </div>

          <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
            <span style={styles.teamName}>{away.name}</span>
            <span style={styles.flag}>{away.flag_emoji}</span>
          </div>
        </div>

        {bettingOpen && isDrawn && (
          <div style={styles.winnerSection}>
            <p style={styles.winnerLabel}>🏆 Hvem går videre?</p>
            <div style={styles.winnerButtons}>
              <button
                style={{ ...styles.winnerButton, ...(winner === home.id ? styles.winnerActive : {}) }}
                onClick={() => setWinner(home.id)}
              >
                {home.flag_emoji} {home.name}
              </button>
              <button
                style={{ ...styles.winnerButton, ...(winner === away.id ? styles.winnerActive : {}) }}
                onClick={() => setWinner(away.id)}
              >
                {away.flag_emoji} {away.name}
              </button>
            </div>
          </div>
        )}

        {!bettingOpen && hasPred && pred.winner_id && isDrawn && (
          <div style={styles.lockedWinner}>
            🏆 Videre: {teams[pred.winner_id]?.flag_emoji} {teams[pred.winner_id]?.name}
          </div>
        )}

        {bettingOpen && (
          <button
            style={{ ...styles.saveButton, opacity: saving[match.id] ? 0.6 : 1 }}
            onClick={() => savePrediction(
              match.id, homeScore, awayScore,
              isDrawn ? winner : autoWinner
            )}
            disabled={saving[match.id]}
          >
            {saving[match.id] ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
          </button>
        )}
      </div>
    )
  }

  const roundMatches = matches.filter(m => m.round === activeRound)

  if (loading) return <div style={styles.loading}>Laster sluttspill...</div>

  return (
    <div>
      <h2 style={styles.title}>🏆 Sluttspill</h2>
      {bettingOpen ? (
        <p style={styles.subtitle}>Tipp alle sluttspillkampene!</p>
      ) : (
        <div style={styles.closedBanner}>
          🔒 Tippingen er stengt – her ser du dine innleverte tips.
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.roundTabs}>
        {ROUNDS.map(r => {
          const count = matches.filter(m => m.round === r.id).length
          return (
            <button
              key={r.id}
              style={{ ...styles.roundTab, ...(activeRound === r.id ? styles.activeRoundTab : {}) }}
              onClick={() => setActiveRound(r.id)}
            >
              {r.label}
              {count > 0 && <span style={styles.roundCount}> ({count})</span>}
            </button>
          )
        })}
      </div>

      {roundMatches.length === 0 ? (
        <div style={styles.empty}>
          ⏳ Kampene for denne runden er ikke lagt inn ennå.
        </div>
      ) : (
        <div style={styles.matches}>
          {roundMatches.map(match => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
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
  empty: {
    color: 'rgba(255,255,255,0.5)', textAlign: 'center',
    padding: '40px', background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px', fontSize: '15px',
  },
  message: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)', color: 'white',
    marginBottom: '16px', textAlign: 'center',
  },
  roundTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  roundTab: {
    padding: '10px 16px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px', fontWeight: '500',
  },
  activeRoundTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  roundCount: { fontSize: '11px', opacity: 0.7 },
  matches: { display: 'flex', flexDirection: 'column', gap: '12px' },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  tbd: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px', fontSize: '14px' },
  matchDate: { color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '4px' },
  matchStadium: { color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginBottom: '8px' },
  matchRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' },
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
  winnerSection: {
    marginTop: '12px', padding: '12px',
    background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
  },
  winnerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 8px 0' },
  winnerButtons: { display: 'flex', gap: '8px' },
  winnerButton: {
    flex: 1, padding: '10px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px',
  },
  winnerActive: { background: 'rgba(233,69,96,0.3)', border: '1px solid #e94560', color: 'white' },
  lockedWinner: {
    color: '#27ae60', fontSize: '13px', padding: '8px 12px',
    background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginTop: '8px',
  },
  saveButton: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px',
  },
}