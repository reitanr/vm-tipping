import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

// Offisielt FIFA bracket - 0-indeksert basert på posisjon i r16
// Posisjon 0 = kamp 73, posisjon 1 = kamp 74 osv.
const R8_BRACKET = [
  [1, 4],   // Kamp 89: Vinner 74 vs Vinner 77
  [0, 2],   // Kamp 90: Vinner 73 vs Vinner 75
  [3, 5],   // Kamp 91: Vinner 76 vs Vinner 78
  [6, 7],   // Kamp 92: Vinner 79 vs Vinner 80
  [10, 11], // Kamp 93: Vinner 83 vs Vinner 84
  [8, 9],   // Kamp 94: Vinner 81 vs Vinner 82
  [13, 15], // Kamp 95: Vinner 86 vs Vinner 88
  [12, 14], // Kamp 96: Vinner 85 vs Vinner 87
]

const QF_BRACKET = [
  [0, 1], // Kamp 97: Vinner 89 vs Vinner 90
  [2, 3], // Kamp 99: Vinner 91 vs Vinner 92
  [4, 5], // Kamp 98: Vinner 93 vs Vinner 94
  [6, 7], // Kamp 100: Vinner 95 vs Vinner 96
]

const SF_BRACKET = [
  [0, 1], // Kamp 101: Vinner 97 vs Vinner 98
  [2, 3], // Kamp 102: Vinner 99 vs Vinner 100
]

const ROUNDS = [
  { id: 'r16', label: '16-delsfinale' },
  { id: 'r8', label: '8-delsfinale' },
  { id: 'qf', label: 'Kvartfinale' },
  { id: 'sf', label: 'Semifinale' },
  { id: 'bronze', label: 'Bronsefinale' },
  { id: 'final', label: '🏆 Finale' },
]

export default function Playoff({ session }) {
  const [r16Matches, setR16Matches] = useState([])
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
    if (settingsData) setBettingOpen(settingsData.playoff_open)

    const { data: teamsData } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)

    const { data: matchesData } = await supabase
      .from("playoff_matches")
      .select("*")
      .eq("round", "r16")
      .order("position")
    setR16Matches(matchesData || [])

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

  // Hent predicted winner for en r16-kamp (basert på match.id)
  const getR16Winner = (matchIndex) => {
    const match = r16Matches[matchIndex]
    if (!match) return null
    const pred = predictions[match.id]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.home_team_id
    if (pred.away_score > pred.home_score) return match.away_team_id
    return pred.winner_id || null
  }

  // Hent predicted winner for en r8-kamp (basert på virtual key)
  const getR8Winner = (r8Index) => {
    const key = `r8_${r8Index}`
    const pred = predictions[key]
    if (!pred) return null
    const [idx1, idx2] = R8_BRACKET[r8Index]
    const homeId = getR16Winner(idx1)
    const awayId = getR16Winner(idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getQFWinner = (qfIndex) => {
    const key = `qf_${qfIndex}`
    const pred = predictions[key]
    if (!pred) return null
    const [idx1, idx2] = QF_BRACKET[qfIndex]
    const homeId = getR8Winner(idx1)
    const awayId = getR8Winner(idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getSFWinner = (sfIndex) => {
    const key = `sf_${sfIndex}`
    const pred = predictions[key]
    if (!pred) return null
    const [idx1, idx2] = SF_BRACKET[sfIndex]
    const homeId = getQFWinner(idx1)
    const awayId = getQFWinner(idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getSFLoser = (sfIndex) => {
    const [idx1, idx2] = SF_BRACKET[sfIndex]
    const homeId = getQFWinner(idx1)
    const awayId = getQFWinner(idx2)
    const winner = getSFWinner(sfIndex)
    if (!winner || !homeId || !awayId) return null
    return winner === homeId ? awayId : homeId
  }

  const saveR16Prediction = async (match, homeScore, awayScore, winnerId) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    const key = match.id
    setSaving(prev => ({ ...prev, [key]: true }))

    const isDrawn = parseInt(homeScore) === parseInt(awayScore)
    const autoWinner = !isDrawn
      ? parseInt(homeScore) > parseInt(awayScore) ? match.home_team_id : match.away_team_id
      : winnerId

    const { error } = await supabase
      .from("playoff_predictions")
      .upsert({
        user_id: session.user.id,
        match_id: match.id,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        winner_id: autoWinner,
      }, { onConflict: "user_id,match_id" })

    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPredictions(prev => ({
        ...prev,
        [match.id]: {
          match_id: match.id,
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          winner_id: autoWinner,
        }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [key]: false }))
  }

  const saveVirtualPrediction = async (virtualKey, homeId, awayId, homeScore, awayScore, winnerId) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(prev => ({ ...prev, [virtualKey]: true }))

    const isDrawn = parseInt(homeScore) === parseInt(awayScore)
    const autoWinner = !isDrawn
      ? parseInt(homeScore) > parseInt(awayScore) ? homeId : awayId
      : winnerId

    // Lagre med virtual key som match_id
    const { error } = await supabase
      .from("playoff_predictions")
      .upsert({
        user_id: session.user.id,
        match_id: virtualKey,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        winner_id: autoWinner,
      }, { onConflict: "user_id,match_id" })

    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPredictions(prev => ({
        ...prev,
        [virtualKey]: {
          match_id: virtualKey,
          home_score: parseInt(homeScore),
          away_score: parseInt(awayScore),
          winner_id: autoWinner,
        }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [virtualKey]: false }))
  }

  const R16MatchCard = ({ match, index }) => {
    const home = teams[match.home_team_id]
    const away = teams[match.away_team_id]
    const pred = predictions[match.id]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)
    const isDrawn = homeScore !== "" && awayScore !== "" && parseInt(homeScore) === parseInt(awayScore)
    const hasPred = pred !== undefined

    return (
      <div style={{ ...styles.matchCard, ...(hasPred ? styles.matchCardDone : {}) }}>
        <div style={styles.matchLabel}>Kamp {index + 1}</div>
        <div style={styles.matchRow}>
          <div style={styles.team}>
            <span style={styles.flag}>{home?.flag_emoji}</span>
            <span style={styles.teamName}>{home?.name}</span>
          </div>
          <div style={styles.scoreInputs}>
            {bettingOpen ? (
              <>
                <input style={styles.scoreInput} type="number" min="0" max="20"
                  value={homeScore} onChange={e => setHomeScore(e.target.value)} placeholder="-" />
                <span style={styles.vs}>–</span>
                <input style={styles.scoreInput} type="number" min="0" max="20"
                  value={awayScore} onChange={e => setAwayScore(e.target.value)} placeholder="-" />
              </>
            ) : (
              <span style={styles.lockedScore}>
                {hasPred ? `${pred.home_score} – ${pred.away_score}` : "– – –"}
              </span>
            )}
          </div>
          <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
            <span style={styles.teamName}>{away?.name}</span>
            <span style={styles.flag}>{away?.flag_emoji}</span>
          </div>
        </div>
        {bettingOpen && isDrawn && (
          <div style={styles.winnerSection}>
            <p style={styles.winnerLabel}>🏆 Hvem går videre?</p>
            <div style={styles.winnerButtons}>
              <button style={{ ...styles.winnerButton, ...(winner === match.home_team_id ? styles.winnerActive : {}) }}
                onClick={() => setWinner(match.home_team_id)}>
                {home?.flag_emoji} {home?.name}
              </button>
              <button style={{ ...styles.winnerButton, ...(winner === match.away_team_id ? styles.winnerActive : {}) }}
                onClick={() => setWinner(match.away_team_id)}>
                {away?.flag_emoji} {away?.name}
              </button>
            </div>
          </div>
        )}
        {bettingOpen && (
          <button style={{ ...styles.saveButton, opacity: saving[match.id] ? 0.6 : 1 }}
            onClick={() => saveR16Prediction(match, homeScore, awayScore, winner)}
            disabled={saving[match.id]}>
            {saving[match.id] ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
          </button>
        )}
      </div>
    )
  }

  const VirtualMatchCard = ({ virtualKey, homeId, awayId }) => {
    const home = teams[homeId]
    const away = teams[awayId]
    const pred = predictions[virtualKey]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)
    const isDrawn = homeScore !== "" && awayScore !== "" && parseInt(homeScore) === parseInt(awayScore)
    const hasPred = pred !== undefined

    if (!homeId || !awayId) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>⏳ Tippe tidligere runder for å se denne kampen</div>
        </div>
      )
    }

    if (!home || !away) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>⏳ Laster lag...</div>
        </div>
      )
    }

    return (
      <div style={{ ...styles.matchCard, ...(hasPred ? styles.matchCardDone : {}) }}>
        <div style={styles.matchRow}>
          <div style={styles.team}>
            <span style={styles.flag}>{home.flag_emoji}</span>
            <span style={styles.teamName}>{home.name}</span>
          </div>
          <div style={styles.scoreInputs}>
            {bettingOpen ? (
              <>
                <input style={styles.scoreInput} type="number" min="0" max="20"
                  value={homeScore} onChange={e => setHomeScore(e.target.value)} placeholder="-" />
                <span style={styles.vs}>–</span>
                <input style={styles.scoreInput} type="number" min="0" max="20"
                  value={awayScore} onChange={e => setAwayScore(e.target.value)} placeholder="-" />
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
              <button style={{ ...styles.winnerButton, ...(winner === homeId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(homeId)}>
                {home.flag_emoji} {home.name}
              </button>
              <button style={{ ...styles.winnerButton, ...(winner === awayId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(awayId)}>
                {away.flag_emoji} {away.name}
              </button>
            </div>
          </div>
        )}
        {bettingOpen && (
          <button style={{ ...styles.saveButton, opacity: saving[virtualKey] ? 0.6 : 1 }}
            onClick={() => saveVirtualPrediction(virtualKey, homeId, awayId, homeScore, awayScore, winner)}
            disabled={saving[virtualKey]}>
            {saving[virtualKey] ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
          </button>
        )}
      </div>
    )
  }

  if (loading) return <div style={styles.loading}>Laster sluttspill...</div>

  return (
    <div>
      <h2 style={styles.title}>🏆 Sluttspill</h2>
      {bettingOpen ? (
        <p style={styles.subtitle}>Bracketet genereres automatisk basert på hvem du tipper vinner!</p>
      ) : (
        <div style={styles.closedBanner}>
          🔒 Tippingen er stengt – her ser du dine innleverte tips.
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.roundTabs}>
        {ROUNDS.map(r => (
          <button key={r.id}
            style={{ ...styles.roundTab, ...(activeRound === r.id ? styles.activeRoundTab : {}) }}
            onClick={() => setActiveRound(r.id)}>
            {r.label}
          </button>
        ))}
      </div>

      {activeRound === 'r16' && (
        <div style={styles.matches}>
          {r16Matches.length === 0 ? (
            <div style={styles.empty}>⏳ 16-delsfinale-kampene er ikke lagt inn ennå.</div>
          ) : (
            r16Matches.map((match, index) => (
              <R16MatchCard key={match.id} match={match} index={index} />
            ))
          )}
        </div>
      )}

      {activeRound === 'r8' && (
        <div style={styles.matches}>
          {R8_BRACKET.map((pair, index) => (
            <div key={index}>
              <div style={styles.roundLabel}>
                8-delsfinale {index + 1}: Vinner kamp {pair[0] + 1} vs Vinner kamp {pair[1] + 1}
              </div>
              <VirtualMatchCard
                virtualKey={`r8_${index}`}
                homeId={getR16Winner(pair[0])}
                awayId={getR16Winner(pair[1])}
              />
            </div>
          ))}
        </div>
      )}

      {activeRound === 'qf' && (
        <div style={styles.matches}>
          {QF_BRACKET.map((pair, index) => (
            <div key={index}>
              <div style={styles.roundLabel}>Kvartfinale {index + 1}</div>
              <VirtualMatchCard
                virtualKey={`qf_${index}`}
                homeId={getR8Winner(pair[0])}
                awayId={getR8Winner(pair[1])}
              />
            </div>
          ))}
        </div>
      )}

      {activeRound === 'sf' && (
        <div style={styles.matches}>
          {SF_BRACKET.map((pair, index) => (
            <div key={index}>
              <div style={styles.roundLabel}>Semifinale {index + 1}</div>
              <VirtualMatchCard
                virtualKey={`sf_${index}`}
                homeId={getQFWinner(pair[0])}
                awayId={getQFWinner(pair[1])}
              />
            </div>
          ))}
        </div>
      )}

      {activeRound === 'bronze' && (
        <div style={styles.matches}>
          <div style={styles.roundLabel}>🥉 Bronsefinale</div>
          <VirtualMatchCard
            virtualKey="bronze_0"
            homeId={getSFLoser(0)}
            awayId={getSFLoser(1)}
          />
        </div>
      )}

      {activeRound === 'final' && (
        <div style={styles.matches}>
          <div style={styles.roundLabel}>🏆 VM-FINALEN</div>
          <VirtualMatchCard
            virtualKey="final_0"
            homeId={getSFWinner(0)}
            awayId={getSFWinner(1)}
          />
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
  matches: { display: 'flex', flexDirection: 'column', gap: '12px' },
  matchLabel: {
    color: 'rgba(255,255,255,0.4)', fontSize: '11px',
    marginBottom: '2px', marginTop: '4px',
  },
  roundLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: '13px',
    marginBottom: '6px', marginTop: '8px', fontWeight: 'bold',
  },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  tbd: {
    color: 'rgba(255,255,255,0.3)', textAlign: 'center',
    padding: '20px', fontSize: '14px',
  },
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
  saveButton: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px',
  },
}