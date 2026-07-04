import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const R8_BRACKET = [
  [1, 4], [0, 2], [3, 5], [6, 7],
  [10, 11], [8, 9], [13, 15], [12, 14],
]

const QF_BRACKET = [
  [0, 1], [2, 3], [4, 5], [6, 7],
]

const SF_BRACKET = [
  [0, 2], [1, 3],
]

const ROUNDS = [
  { id: 'r16', label: '16-delsfinale' },
  { id: 'r8', label: '8-delsfinale' },
  { id: 'qf', label: 'Kvartfinale' },
  { id: 'sf', label: 'Semifinale' },
  { id: 'bronze', label: 'Bronsefinale' },
  { id: 'final', label: '🏆 Finale' },
]

const FIFA_MATCH_NUMBERS = [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]

export default function Playoff({ session }) {
  const [r16Matches, setR16Matches] = useState([])
  const [r8Matches, setR8Matches] = useState([])
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
      .from("app_settings").select("*").single()
    if (settingsData) setBettingOpen(settingsData.playoff_open)

    const { data: teamsData } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)

    const { data: r16Data } = await supabase
      .from("playoff_matches").select("*").eq("round", "r16").order("position")
    setR16Matches(r16Data || [])

    const { data: r8Data } = await supabase
      .from("playoff_matches").select("*").eq("round", "r8").order("position")
    setR8Matches(r8Data || [])

    const { data: predsData } = await supabase
      .from("playoff_predictions").select("*").eq("user_id", session.user.id)
    const predsMap = {}
    predsData?.forEach(p => { predsMap[p.match_id] = p })
    setPredictions(predsMap)
    setLoading(false)
  }

  const getR16Winner = (matchIndex) => {
    const match = r16Matches[matchIndex]
    if (!match) return null
    const pred = predictions[String(match.id)]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.home_team_id
    if (pred.away_score > pred.home_score) return match.away_team_id
    return pred.winner_id || null
  }

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

  // Sjekk om tippede lag matcher faktiske lag i en kamp
  const checkTeamsMatch = (actualHomeId, actualAwayId, tippedHomeId, tippedAwayId) => {
    if (!actualHomeId || !actualAwayId || !tippedHomeId || !tippedAwayId) return 'unknown'
    if ((actualHomeId === tippedHomeId && actualAwayId === tippedAwayId) ||
        (actualHomeId === tippedAwayId && actualAwayId === tippedHomeId)) return 'correct'
    return 'wrong'
  }

  const getR16ActualResult = (matchIndex) => {
    const match = r16Matches[matchIndex]
    if (!match || match.home_score === null) return null
    if (match.home_score > match.away_score) return match.home_team_id
    if (match.away_score > match.home_score) return match.away_team_id
    return match.winner_id || null
  }

  const saveR16Prediction = async (match, homeScore, awayScore, winnerId) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }
    const key = String(match.id)
    setSaving(prev => ({ ...prev, [key]: true }))
    const isDrawn = parseInt(homeScore) === parseInt(awayScore)
    const autoWinner = !isDrawn
      ? parseInt(homeScore) > parseInt(awayScore) ? match.home_team_id : match.away_team_id
      : winnerId
    const { error } = await supabase.from("playoff_predictions")
      .upsert({
        user_id: session.user.id, match_id: String(match.id),
        home_score: parseInt(homeScore), away_score: parseInt(awayScore),
        winner_id: autoWinner || null,
      }, { onConflict: "user_id,match_id" })
    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPredictions(prev => ({
        ...prev, [key]: { match_id: key, home_score: parseInt(homeScore), away_score: parseInt(awayScore), winner_id: autoWinner || null }
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
    const { error } = await supabase.from("playoff_predictions")
      .upsert({
        user_id: session.user.id, match_id: virtualKey,
        home_score: parseInt(homeScore), away_score: parseInt(awayScore),
        winner_id: autoWinner || null,
      }, { onConflict: "user_id,match_id" })
    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPredictions(prev => ({
        ...prev, [virtualKey]: { match_id: virtualKey, home_score: parseInt(homeScore), away_score: parseInt(awayScore), winner_id: autoWinner || null }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [virtualKey]: false }))
  }

  const getMatchResultBadge = (actualMatch, predHomeScore, predAwayScore) => {
    if (!actualMatch || actualMatch.home_score === null) return null
    if (predHomeScore === actualMatch.home_score && predAwayScore === actualMatch.away_score)
      return <span style={styles.badgeExact}>🎯 Eksakt!</span>
    const actualOutcome = actualMatch.home_score > actualMatch.away_score ? 'home' : actualMatch.away_score > actualMatch.home_score ? 'away' : 'draw'
    const predOutcome = predHomeScore > predAwayScore ? 'home' : predAwayScore > predHomeScore ? 'away' : 'draw'
    if (actualOutcome === predOutcome) return <span style={styles.badgeCorrect}>✅ Riktig utfall</span>
    return <span style={styles.badgeWrong}>❌ Feil</span>
  }

  const R16MatchCard = ({ match, index }) => {
    const home = teams[match.home_team_id]
    const away = teams[match.away_team_id]
    const pred = predictions[String(match.id)]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)
    const isDrawn = homeScore !== "" && awayScore !== "" && parseInt(homeScore) === parseInt(awayScore)
    const hasPred = pred !== undefined
    const fifaNum = FIFA_MATCH_NUMBERS[index] || (73 + index)
    const hasResult = match.home_score !== null

    const cardStyle = {
      ...styles.matchCard,
      ...(hasResult && hasPred && pred.home_score === match.home_score && pred.away_score === match.away_score ? styles.matchCardExact : {}),
      ...(hasResult && hasPred && pred.home_score !== match.home_score || pred?.away_score !== match.away_score ? styles.matchCardNormal : {}),
    }

    return (
      <div style={{ ...styles.matchCard, ...(hasPred ? styles.matchCardDone : {}) }}>
        <div style={styles.matchHeader}>
          <span style={styles.matchLabel}>Kamp {fifaNum}</span>
          {hasResult && hasPred && getMatchResultBadge(match, pred.home_score, pred.away_score)}
          {hasResult && <span style={styles.actualResult}>Fasit: {match.home_score} – {match.away_score}</span>}
        </div>
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
          <button style={{ ...styles.saveButton, opacity: saving[String(match.id)] ? 0.6 : 1 }}
            onClick={() => saveR16Prediction(match, homeScore, awayScore, winner)}
            disabled={saving[String(match.id)]}>
            {saving[String(match.id)] ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
          </button>
        )}
      </div>
    )
  }

  const VirtualMatchCard = ({ virtualKey, homeId, awayId, label, actualMatch }) => {
    const home = teams[homeId]
    const away = teams[awayId]
    const pred = predictions[virtualKey]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)
    const isDrawn = homeScore !== "" && awayScore !== "" && parseInt(homeScore) === parseInt(awayScore)
    const hasPred = pred !== undefined
    const hasResult = actualMatch?.home_score !== null && actualMatch?.home_score !== undefined

    // Sjekk om tippede lag matcher faktiske lag
    const teamsMatch = actualMatch
      ? checkTeamsMatch(actualMatch.home_team_id, actualMatch.away_team_id, homeId, awayId)
      : 'unknown'

    if (!homeId || !awayId) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>⏳ Tippe tidligere runder for å se denne kampen</div>
        </div>
      )
    }

    if (teamsMatch === 'wrong') {
      return (
        <div style={styles.matchCardWrongTeams}>
          {label && <div style={styles.matchLabel}>{label}</div>}
          <div style={styles.wrongTeamsContent}>
            <span style={styles.badgeWrong}>❌ Feil lag tippet videre</span>
            <div style={styles.matchRow}>
              <div style={styles.team}>
                <span style={styles.flag}>{home?.flag_emoji}</span>
                <span style={{ ...styles.teamName, opacity: 0.5 }}>{home?.name}</span>
              </div>
              <span style={styles.vs}>vs</span>
              <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                <span style={{ ...styles.teamName, opacity: 0.5 }}>{away?.name}</span>
                <span style={styles.flag}>{away?.flag_emoji}</span>
              </div>
            </div>
            {actualMatch && (
              <div style={styles.actualMatchInfo}>
                Faktisk kamp: {teams[actualMatch.home_team_id]?.flag_emoji} {teams[actualMatch.home_team_id]?.name} vs {teams[actualMatch.away_team_id]?.flag_emoji} {teams[actualMatch.away_team_id]?.name}
              </div>
            )}
          </div>
        </div>
      )
    }

    return (
      <div style={{ ...styles.matchCard, ...(hasPred ? styles.matchCardDone : {}) }}>
        {label && (
          <div style={styles.matchHeader}>
            <span style={styles.matchLabel}>{label}</span>
            {hasResult && hasPred && getMatchResultBadge(actualMatch, pred.home_score, pred.away_score)}
            {hasResult && <span style={styles.actualResult}>Fasit: {actualMatch.home_score} – {actualMatch.away_score}</span>}
          </div>
        )}
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
              <button style={{ ...styles.winnerButton, ...(winner === homeId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(homeId)}>
                {home?.flag_emoji} {home?.name}
              </button>
              <button style={{ ...styles.winnerButton, ...(winner === awayId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(awayId)}>
                {away?.flag_emoji} {away?.name}
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
          {R8_BRACKET.map((pair, index) => {
            const tippedHomeId = getR16Winner(pair[0])
            const tippedAwayId = getR16Winner(pair[1])
            const actualMatch = r8Matches[index]
            return (
              <div key={index}>
                <VirtualMatchCard
                  virtualKey={`r8_${index}`}
                  homeId={tippedHomeId}
                  awayId={tippedAwayId}
                  label={`Kamp ${89 + index}: Vinner kamp ${FIFA_MATCH_NUMBERS[pair[0]]} vs Vinner kamp ${FIFA_MATCH_NUMBERS[pair[1]]}`}
                  actualMatch={actualMatch}
                />
              </div>
            )
          })}
        </div>
      )}

      {activeRound === 'qf' && (
        <div style={styles.matches}>
          {QF_BRACKET.map((pair, index) => (
            <div key={index}>
              <VirtualMatchCard
                virtualKey={`qf_${index}`}
                homeId={getR8Winner(pair[0])}
                awayId={getR8Winner(pair[1])}
                label={`Kvartfinale ${index + 1}`}
                actualMatch={null}
              />
            </div>
          ))}
        </div>
      )}

      {activeRound === 'sf' && (
        <div style={styles.matches}>
          {SF_BRACKET.map((pair, index) => (
            <div key={index}>
              <VirtualMatchCard
                virtualKey={`sf_${index}`}
                homeId={getQFWinner(pair[0])}
                awayId={getQFWinner(pair[1])}
                label={`Semifinale ${index + 1}`}
                actualMatch={null}
              />
            </div>
          ))}
        </div>
      )}

      {activeRound === 'bronze' && (
        <div style={styles.matches}>
          <VirtualMatchCard
            virtualKey="bronze_0"
            homeId={getSFLoser(0)}
            awayId={getSFLoser(1)}
            label="🥉 Bronsefinale"
            actualMatch={null}
          />
        </div>
      )}

      {activeRound === 'final' && (
        <div style={styles.matches}>
          <VirtualMatchCard
            virtualKey="final_0"
            homeId={getSFWinner(0)}
            awayId={getSFWinner(1)}
            label="🏆 VM-FINALEN"
            actualMatch={null}
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
  matchHeader: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' },
  matchLabel: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  actualResult: { color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontStyle: 'italic' },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  matchCardExact: { border: '1px solid rgba(255,215,0,0.5)', background: 'rgba(255,215,0,0.05)' },
  matchCardNormal: {},
  matchCardWrongTeams: {
    background: 'rgba(233,69,96,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(233,69,96,0.3)',
  },
  wrongTeamsContent: { display: 'flex', flexDirection: 'column', gap: '8px' },
  actualMatchInfo: {
    color: 'rgba(255,255,255,0.5)', fontSize: '12px',
    padding: '6px 10px', background: 'rgba(255,255,255,0.05)',
    borderRadius: '6px', marginTop: '4px',
  },
  tbd: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '20px', fontSize: '14px' },
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
  badgeExact: {
    background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)',
    color: 'gold', padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
  },
  badgeCorrect: {
    background: 'rgba(39,174,96,0.2)', border: '1px solid rgba(39,174,96,0.4)',
    color: '#27ae60', padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
  },
  badgeWrong: {
    background: 'rgba(233,69,96,0.2)', border: '1px solid rgba(233,69,96,0.4)',
    color: '#e94560', padding: '2px 8px', borderRadius: '20px', fontSize: '11px',
  },
}