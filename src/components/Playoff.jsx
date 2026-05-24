import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

// Offisielt FIFA bracket - hvilke kamper møter hverandre i neste runde
const BRACKET = {
  // 8-delsfinale: [kamp_posisjon_i_r16, kamp_posisjon_i_r16]
  r8: [
    [1, 3],   // Kamp 89: Vinner 74 vs Vinner 77
    [0, 2],   // Kamp 90: Vinner 73 vs Vinner 75
    [4, 6],   // Kamp 91: Vinner 76 vs Vinner 78  (pos 3 og 5 i 0-indeks)
    [7, 5],   // Kamp 92: Vinner 79 vs Vinner 80
    [10, 11], // Kamp 93: Vinner 83 vs Vinner 84
    [8, 9],   // Kamp 94: Vinner 81 vs Vinner 82
    [13, 15], // Kamp 95: Vinner 86 vs Vinner 88
    [12, 14], // Kamp 96: Vinner 85 vs Vinner 87
  ],
  // Kvartfinale
  qf: [
    [0, 1],   // Kamp 97: Vinner 89 vs Vinner 90
    [2, 3],   // Kamp 99: Vinner 91 vs Vinner 92
    [4, 5],   // Kamp 98: Vinner 93 vs Vinner 94
    [6, 7],   // Kamp 100: Vinner 95 vs Vinner 96
  ],
  // Semifinale
  sf: [
    [0, 1],   // Kamp 101: Vinner 97 vs Vinner 98
    [2, 3],   // Kamp 102: Vinner 99 vs Vinner 100
  ],
  // Finale og bronsefinale
  final: [
    [0, 1],   // Finale: Vinner 101 vs Vinner 102
  ],
  bronze: [
    [0, 1],   // Bronsefinale: Taper 101 vs Taper 102
  ]
}

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

  // Hent hvem brukeren tippet vinner av en r16-kamp
  const getPredictedWinner = (matchIndex) => {
    const match = r16Matches[matchIndex]
    if (!match) return null
    const pred = predictions[match.id]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.home_team_id
    if (pred.away_score > pred.home_score) return match.away_team_id
    return pred.winner_id || null
  }

  // Hent hvem brukeren tippet vinner av en r8-kamp
  const getR8PredictedWinner = (matchIndex) => {
    const [idx1, idx2] = BRACKET.r8[matchIndex]
    const homeId = getPredictedWinner(idx1)
    const awayId = getPredictedWinner(idx2)
    if (!homeId || !awayId) return null

    // Finn r8-kampen i databasen
    const r8Match = getR8Match(matchIndex)
    if (!r8Match) return null

    const pred = predictions[r8Match.id]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  // Generer r8-kamp basert på tipperens r16-resultater
  const getR8Match = (matchIndex) => {
    const [idx1, idx2] = BRACKET.r8[matchIndex]
    const homeId = getPredictedWinner(idx1)
    const awayId = getPredictedWinner(idx2)
    if (!homeId || !awayId) return null
    return { homeId, awayId, position: matchIndex }
  }

  // Generer qf-kamp
  const getQFMatch = (matchIndex) => {
    const [idx1, idx2] = BRACKET.qf[matchIndex]
    const homeId = getR8PredictedWinner(idx1)
    const awayId = getR8PredictedWinner(idx2)
    if (!homeId || !awayId) return null
    return { homeId, awayId, position: matchIndex }
  }

  const getQFPredictedWinner = (matchIndex) => {
    const match = getQFMatch(matchIndex)
    if (!match) return null
    const qfDbMatch = getQFDbMatch(matchIndex)
    if (!qfDbMatch) return null
    const pred = predictions[qfDbMatch.id]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.homeId
    if (pred.away_score > pred.home_score) return match.awayId
    return pred.winner_id || null
  }

  // Generer sf-kamp
  const getSFMatch = (matchIndex) => {
    const [idx1, idx2] = BRACKET.sf[matchIndex]
    const homeId = getQFPredictedWinner(idx1)
    const awayId = getQFPredictedWinner(idx2)
    if (!homeId || !awayId) return null
    return { homeId, awayId, position: matchIndex }
  }

  const getSFPredictedWinner = (matchIndex) => {
    const match = getSFMatch(matchIndex)
    if (!match) return null
    const sfDbMatch = getSFDbMatch(matchIndex)
    if (!sfDbMatch) return null
    const pred = predictions[sfDbMatch.id]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.homeId
    if (pred.away_score > pred.home_score) return match.awayId
    return pred.winner_id || null
  }

  const getSFLoser = (matchIndex) => {
    const match = getSFMatch(matchIndex)
    if (!match) return null
    const winner = getSFPredictedWinner(matchIndex)
    if (!winner) return null
    return winner === match.homeId ? match.awayId : match.homeId
  }

  // Database-kamp ID-er for genererte kamper
  const getR8DbMatch = (matchIndex) => {
    // Vi bruker en virtuell ID basert på round og position
    return { id: `r8_${matchIndex}`, round: 'r8', position: matchIndex }
  }

  const getQFDbMatch = (matchIndex) => {
    return { id: `qf_${matchIndex}`, round: 'qf', position: matchIndex }
  }

  const getSFDbMatch = (matchIndex) => {
    return { id: `sf_${matchIndex}`, round: 'sf', position: matchIndex }
  }

  const savePrediction = async (virtualMatchId, homeTeamId, awayTeamId, homeScore, awayScore, winnerId, round, position) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(prev => ({ ...prev, [virtualMatchId]: true }))

    // For r16 bruker vi faktisk match_id fra databasen
    // For andre runder lagrer vi med round og position
    let matchId = null

    if (round === 'r16') {
      matchId = homeTeamId // Her er homeTeamId faktisk match.id for r16
    } else {
      // Finn eller opprett en playoff_match for denne runden/posisjonen
      const { data: existing } = await supabase
        .from("playoff_matches")
        .select("id")
        .eq("round", round)
        .eq("position", position)
        .single()

      if (existing) {
        matchId = existing.id
      } else {
        const { data: newMatch } = await supabase
          .from("playoff_matches")
          .insert({
            round,
            position,
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
          })
          .select()
          .single()
        matchId = newMatch?.id
      }
    }

    if (!matchId) {
      setMessage("❌ Noe gikk galt")
      setSaving(prev => ({ ...prev, [virtualMatchId]: false }))
      return
    }

    const isDrawn = parseInt(homeScore) === parseInt(awayScore)
    const autoWinner = !isDrawn
      ? parseInt(homeScore) > parseInt(awayScore) ? homeTeamId : awayTeamId
      : winnerId

    const { error } = await supabase
      .from("playoff_predictions")
      .upsert({
        user_id: session.user.id,
        match_id: matchId,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        winner_id: autoWinner,
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
          winner_id: autoWinner,
        }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [virtualMatchId]: false }))
  }

  const MatchCard = ({ matchId, homeId, awayId, round, position, isSavingKey }) => {
    const home = teams[homeId]
    const away = teams[awayId]
    const pred = predictions[matchId]
    const [homeScore, setHomeScore] = useState(pred?.home_score?.toString() ?? "")
    const [awayScore, setAwayScore] = useState(pred?.away_score?.toString() ?? "")
    const [winner, setWinner] = useState(pred?.winner_id || null)

    if (!home || !away) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>⏳ Tippe tidligere runder for å se denne kampen</div>
        </div>
      )
    }

    const isDrawn = homeScore !== "" && awayScore !== "" &&
      parseInt(homeScore) === parseInt(awayScore)

    const hasPred = pred !== undefined

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
                style={{ ...styles.winnerButton, ...(winner === homeId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(homeId)}
              >
                {home.flag_emoji} {home.name}
              </button>
              <button
                style={{ ...styles.winnerButton, ...(winner === awayId ? styles.winnerActive : {}) }}
                onClick={() => setWinner(awayId)}
              >
                {away.flag_emoji} {away.name}
              </button>
            </div>
          </div>
        )}

        {!bettingOpen && hasPred && pred.winner_id && (
          <div style={styles.lockedWinner}>
            🏆 Videre: {teams[pred.winner_id]?.flag_emoji} {teams[pred.winner_id]?.name}
          </div>
        )}

        {bettingOpen && (
          <button
            style={{ ...styles.saveButton, opacity: saving[isSavingKey] ? 0.6 : 1 }}
            onClick={() => savePrediction(
              matchId, homeId, awayId, homeScore, awayScore,
              isDrawn ? winner : null, round, position
            )}
            disabled={saving[isSavingKey]}
          >
            {saving[isSavingKey] ? "Lagrer..." : hasPred ? "✅ Oppdater" : "Lagre tipp"}
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
        <p style={styles.subtitle}>Tipp alle sluttspillkampene – bracketet genereres automatisk!</p>
      ) : (
        <div style={styles.closedBanner}>
          🔒 Tippingen er stengt – her ser du dine innleverte tips.
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.roundTabs}>
        {ROUNDS.map(r => (
          <button
            key={r.id}
            style={{ ...styles.roundTab, ...(activeRound === r.id ? styles.activeRoundTab : {}) }}
            onClick={() => setActiveRound(r.id)}
          >
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
              <MatchCard
                key={match.id}
                matchId={match.id}
                homeId={match.home_team_id}
                awayId={match.away_team_id}
                round="r16"
                position={index}
                isSavingKey={match.id}
              />
            ))
          )}
        </div>
      )}

      {activeRound === 'r8' && (
        <div style={styles.matches}>
          {BRACKET.r8.map((pair, index) => {
            const match = getR8Match(index)
            const dbMatch = getR8DbMatch(index)
            const existingPred = Object.values(predictions).find(p =>
              p.match_id === `r8_${index}` || false
            )

            return (
              <div key={index}>
                <div style={styles.matchLabel}>
                  Kamp {index + 1}: Vinner kamp {pair[0] + 1} vs Vinner kamp {pair[1] + 1}
                </div>
                <MatchCard
                  matchId={dbMatch.id}
                  homeId={match?.homeId}
                  awayId={match?.awayId}
                  round="r8"
                  position={index}
                  isSavingKey={dbMatch.id}
                />
              </div>
            )
          })}
        </div>
      )}

      {activeRound === 'qf' && (
        <div style={styles.matches}>
          {BRACKET.qf.map((pair, index) => {
            const match = getQFMatch(index)
            const dbMatch = getQFDbMatch(index)

            return (
              <div key={index}>
                <div style={styles.matchLabel}>Kvartfinale {index + 1}</div>
                <MatchCard
                  matchId={dbMatch.id}
                  homeId={match?.homeId}
                  awayId={match?.awayId}
                  round="qf"
                  position={index}
                  isSavingKey={dbMatch.id}
                />
              </div>
            )
          })}
        </div>
      )}

      {activeRound === 'sf' && (
        <div style={styles.matches}>
          {BRACKET.sf.map((pair, index) => {
            const match = getSFMatch(index)
            const dbMatch = getSFDbMatch(index)

            return (
              <div key={index}>
                <div style={styles.matchLabel}>Semifinale {index + 1}</div>
                <MatchCard
                  matchId={dbMatch.id}
                  homeId={match?.homeId}
                  awayId={match?.awayId}
                  round="sf"
                  position={index}
                  isSavingKey={dbMatch.id}
                />
              </div>
            )
          })}
        </div>
      )}

      {activeRound === 'bronze' && (
        <div style={styles.matches}>
          <div style={styles.matchLabel}>Bronsefinale</div>
          <MatchCard
            matchId="bronze_0"
            homeId={getSFLoser(0)}
            awayId={getSFLoser(1)}
            round="bronze"
            position={0}
            isSavingKey="bronze_0"
          />
        </div>
      )}

      {activeRound === 'final' && (
        <div style={styles.matches}>
          <div style={styles.matchLabel}>🏆 VM-FINALEN</div>
          <MatchCard
            matchId="final_0"
            homeId={getSFPredictedWinner(0)}
            awayId={getSFPredictedWinner(1)}
            round="final"
            position={0}
            isSavingKey="final_0"
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
    color: 'rgba(255,255,255,0.5)', fontSize: '12px',
    marginBottom: '4px', marginTop: '8px',
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