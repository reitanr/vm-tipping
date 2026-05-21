import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const ROUNDS = [
  { id: 'r32', label: '8-delsfinale', matches: 16 },
  { id: 'r16', label: 'Kvartfinale', matches: 8 },
  { id: 'qf', label: 'Semifinale', matches: 4 },
  { id: 'sf', label: 'Finale', matches: 2 },
  { id: 'final', label: 'Finale', matches: 1 },
]

export default function Playoff({ session }) {
  const [teams, setTeams] = useState({})
  const [matchPredictions, setMatchPredictions] = useState({})
  const [playoffPredictions, setPlayoffPredictions] = useState({})
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [activeRound, setActiveRound] = useState('r32')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: teamsData } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)

    const { data: matches } = await supabase
      .from("matches")
      .select("*")
      .eq("round", "group")
      .order("match_date")

    const { data: preds } = await supabase
      .from("match_predictions")
      .select("*")
      .eq("user_id", session.user.id)

    const predsMap = {}
    preds?.forEach(p => predsMap[p.match_id] = p)

    const { data: playoffPreds } = await supabase
      .from("playoff_predictions")
      .select("*")
      .eq("user_id", session.user.id)

    const playoffMap = {}
    playoffPreds?.forEach(p => {
      if (!playoffMap[p.round]) playoffMap[p.round] = {}
      playoffMap[p.round][p.position] = p
    })
    setPlayoffPredictions(playoffMap)

    const calculatedBracket = calculateBracket(matches || [], predsMap, teamsMap)
    setBracket(calculatedBracket)
    setMatchPredictions(predsMap)
    setLoading(false)
  }

  const calculateGroupStandings = (matches, predictions, teamsMap) => {
    const groups = {}
    const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

    GROUPS.forEach(g => {
      const groupMatches = matches.filter(m => m.group_letter === g)
      const teamIds = [...new Set([
        ...groupMatches.map(m => m.home_team_id),
        ...groupMatches.map(m => m.away_team_id)
      ])]

      const standings = {}
      teamIds.forEach(id => {
        standings[id] = { id, points: 0, gd: 0, gf: 0 }
      })

      groupMatches.forEach(match => {
        const pred = predictions[match.id]
        if (!pred) return

        const h = pred.home_score
        const a = pred.away_score

        standings[match.home_team_id].gf += h
        standings[match.home_team_id].gd += (h - a)
        standings[match.away_team_id].gf += a
        standings[match.away_team_id].gd += (a - h)

        if (h > a) {
          standings[match.home_team_id].points += 3
        } else if (h === a) {
          standings[match.home_team_id].points += 1
          standings[match.away_team_id].points += 1
        } else {
          standings[match.away_team_id].points += 3
        }
      })

      const sorted = Object.values(standings).sort((a, b) =>
        b.points - a.points || b.gd - a.gd || b.gf - a.gf
      )

      groups[g] = sorted
    })

    return groups
  }

  const calculateBracket = (matches, predictions, teamsMap) => {
    const standings = calculateGroupStandings(matches, predictions, teamsMap)

    // VM 2026 har 32 lag i sluttspillet (16 gruppevinnere + 16 toere)
    // Forenklet bracket basert på gruppe-plasseringer
    const r32 = [
      // Basert på FIFA VM 2026 bracket
      { home: standings['A']?.[0], away: standings['B']?.[1] },
      { home: standings['C']?.[0], away: standings['D']?.[1] },
      { home: standings['B']?.[0], away: standings['A']?.[1] },
      { home: standings['D']?.[0], away: standings['C']?.[1] },
      { home: standings['E']?.[0], away: standings['F']?.[1] },
      { home: standings['G']?.[0], away: standings['H']?.[1] },
      { home: standings['F']?.[0], away: standings['E']?.[1] },
      { home: standings['H']?.[0], away: standings['G']?.[1] },
      { home: standings['I']?.[0], away: standings['J']?.[1] },
      { home: standings['K']?.[0], away: standings['L']?.[1] },
      { home: standings['J']?.[0], away: standings['I']?.[1] },
      { home: standings['L']?.[0], away: standings['K']?.[1] },
      { home: standings['A']?.[0], away: standings['C']?.[1] },
      { home: standings['E']?.[0], away: standings['G']?.[1] },
      { home: standings['I']?.[0], away: standings['K']?.[1] },
      { home: standings['B']?.[0], away: standings['D']?.[1] },
    ]

    return { r32 }
  }

  const getPlayoffTeam = (round, position, side) => {
    const pred = playoffPredictions[round]?.[position]
    if (!pred) return null
    if (side === 'home') return teams[pred.home_team_id]
    if (side === 'away') return teams[pred.away_team_id]
    return null
  }

  const getR32Teams = (position) => {
    const match = bracket?.r32?.[position]
    if (!match) return { home: null, away: null }
    return {
      home: match.home ? teams[match.home.id] : null,
      away: match.away ? teams[match.away.id] : null,
    }
  }

  const savePrediction = async (round, position, homeId, awayId, homeScore, awayScore, winnerId) => {
    if (homeScore === "" || awayScore === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from("playoff_predictions")
      .upsert({
        user_id: session.user.id,
        round,
        position,
        home_team_id: homeId,
        away_team_id: awayId,
        home_score: parseInt(homeScore),
        away_score: parseInt(awayScore),
        winner_id: winnerId,
      }, { onConflict: "user_id,round,position" })

    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Tipp lagret!")
      setPlayoffPredictions(prev => ({
        ...prev,
        [round]: {
          ...prev[round],
          [position]: {
            home_team_id: homeId,
            away_team_id: awayId,
            home_score: parseInt(homeScore),
            away_score: parseInt(awayScore),
            winner_id: winnerId,
          }
        }
      }))
    }
    setTimeout(() => setMessage(""), 3000)
    setSaving(false)
  }

  const MatchCard = ({ round, position, homeTeam, awayTeam }) => {
    const existingPred = playoffPredictions[round]?.[position]
    const [homeScore, setHomeScore] = useState(existingPred?.home_score?.toString() || "")
    const [awayScore, setAwayScore] = useState(existingPred?.away_score?.toString() || "")
    const [winner, setWinner] = useState(existingPred?.winner_id || null)

    if (!homeTeam || !awayTeam) {
      return (
        <div style={styles.matchCard}>
          <div style={styles.tbd}>Avventer gruppespillresultater</div>
        </div>
      )
    }

    const isDrawn = homeScore !== "" && awayScore !== "" && parseInt(homeScore) === parseInt(awayScore)

    return (
      <div style={{
        ...styles.matchCard,
        ...(existingPred ? styles.matchCardDone : {})
      }}>
        <div style={styles.matchRow}>
          <div style={styles.team}>
            <span style={styles.flag}>{homeTeam.flag_emoji}</span>
            <span style={styles.teamName}>{homeTeam.name}</span>
          </div>

          <div style={styles.scoreInputs}>
            <input
              style={styles.scoreInput}
              type="number"
              min="0"
              max="20"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              placeholder="-"
            />
            <span style={styles.vs}>–</span>
            <input
              style={styles.scoreInput}
              type="number"
              min="0"
              max="20"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              placeholder="-"
            />
          </div>

          <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
            <span style={styles.teamName}>{awayTeam.name}</span>
            <span style={styles.flag}>{awayTeam.flag_emoji}</span>
          </div>
        </div>

        {isDrawn && (
          <div style={styles.winnerSection}>
            <p style={styles.winnerLabel}>Hvem går videre?</p>
            <div style={styles.winnerButtons}>
              <button
                style={{
                  ...styles.winnerButton,
                  ...(winner === homeTeam.id ? styles.winnerActive : {})
                }}
                onClick={() => setWinner(homeTeam.id)}
              >
                {homeTeam.flag_emoji} {homeTeam.name}
              </button>
              <button
                style={{
                  ...styles.winnerButton,
                  ...(winner === awayTeam.id ? styles.winnerActive : {})
                }}
                onClick={() => setWinner(awayTeam.id)}
              >
                {awayTeam.flag_emoji} {awayTeam.name}
              </button>
            </div>
          </div>
        )}

        <button
          style={{ ...styles.saveButton, opacity: saving ? 0.6 : 1 }}
          onClick={() => {
            const w = isDrawn ? winner : (parseInt(homeScore) > parseInt(awayScore) ? homeTeam.id : awayTeam.id)
            savePrediction(round, position, homeTeam.id, awayTeam.id, homeScore, awayScore, w)
          }}
          disabled={saving}
        >
          {saving ? "Lagrer..." : existingPred ? "✅ Oppdater" : "Lagre tipp"}
        </button>
      </div>
    )
  }

  if (loading) return <div style={styles.loading}>Laster sluttspill...</div>

  const r32Teams = bracket?.r32?.map((m, i) => ({
    position: i,
    home: m.home ? teams[m.home.id] : null,
    away: m.away ? teams[m.away.id] : null,
  })) || []

  const tippedCount = Object.keys(playoffPredictions['r32'] || {}).length

  return (
    <div>
      <h2 style={styles.title}>🏆 Sluttspill</h2>
      <p style={styles.subtitle}>
        Basert på dine gruppespilltipps – tippe alle sluttspillkamper
      </p>

      {tippedCount < 16 && (
        <div style={styles.warning}>
          ⚠️ Du har tippet {Object.keys(matchPredictions).length} av 72 gruppespillkamper. 
          Jo flere du tipper, jo mer nøyaktig blir sluttspillbracket ditt!
        </div>
      )}

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.roundTabs}>
        {[
          { id: 'r32', label: '8-delsfinale' },
          { id: 'r16', label: 'Kvartfinale' },
          { id: 'qf', label: 'Semifinale' },
          { id: 'sf', label: 'Finale' },
        ].map(r => (
          <button
            key={r.id}
            style={{ ...styles.roundTab, ...(activeRound === r.id ? styles.activeRoundTab : {}) }}
            onClick={() => setActiveRound(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      {activeRound === 'r32' && (
        <div style={styles.matches}>
          {r32Teams.map((m, i) => (
            <MatchCard
              key={i}
              round="r32"
              position={i}
              homeTeam={m.home}
              awayTeam={m.away}
            />
          ))}
        </div>
      )}

      {activeRound === 'r16' && (
        <div style={styles.matches}>
          {Array.from({ length: 8 }, (_, i) => {
            const prev1 = playoffPredictions['r32']?.[i * 2]
            const prev2 = playoffPredictions['r32']?.[i * 2 + 1]
            return (
              <MatchCard
                key={i}
                round="r16"
                position={i}
                homeTeam={prev1?.winner_id ? teams[prev1.winner_id] : null}
                awayTeam={prev2?.winner_id ? teams[prev2.winner_id] : null}
              />
            )
          })}
        </div>
      )}

      {activeRound === 'qf' && (
        <div style={styles.matches}>
          {Array.from({ length: 4 }, (_, i) => {
            const prev1 = playoffPredictions['r16']?.[i * 2]
            const prev2 = playoffPredictions['r16']?.[i * 2 + 1]
            return (
              <MatchCard
                key={i}
                round="qf"
                position={i}
                homeTeam={prev1?.winner_id ? teams[prev1.winner_id] : null}
                awayTeam={prev2?.winner_id ? teams[prev2.winner_id] : null}
              />
            )
          })}
        </div>
      )}

      {activeRound === 'sf' && (
        <div style={styles.matches}>
          {Array.from({ length: 2 }, (_, i) => {
            const prev1 = playoffPredictions['qf']?.[i * 2]
            const prev2 = playoffPredictions['qf']?.[i * 2 + 1]
            return (
              <MatchCard
                key={i}
                round="sf"
                position={i}
                homeTeam={prev1?.winner_id ? teams[prev1.winner_id] : null}
                awayTeam={prev2?.winner_id ? teams[prev2.winner_id] : null}
              />
            )
          })}
          <div style={styles.finalCard}>
            <h3 style={styles.finalTitle}>🏆 Finale</h3>
            {(() => {
              const prev1 = playoffPredictions['sf']?.[0]
              const prev2 = playoffPredictions['sf']?.[1]
              return (
                <MatchCard
                  round="final"
                  position={0}
                  homeTeam={prev1?.winner_id ? teams[prev1.winner_id] : null}
                  awayTeam={prev2?.winner_id ? teams[prev2.winner_id] : null}
                />
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  title: {
    color: 'white',
    fontSize: '22px',
    marginBottom: '8px',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '14px',
    marginBottom: '20px',
  },
  loading: {
    color: 'white',
    textAlign: 'center',
    padding: '40px',
  },
  warning: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(255,165,0,0.2)',
    border: '1px solid rgba(255,165,0,0.4)',
    color: 'white',
    marginBottom: '16px',
    fontSize: '14px',
  },
  message: {
    padding: '12px 16px',
    borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)',
    color: 'white',
    marginBottom: '16px',
    textAlign: 'center',
  },
  roundTabs: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '20px',
  },
  roundTab: {
    padding: '10px 16px',
    borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
  },
  activeRoundTab: {
    background: '#e94560',
    border: '1px solid #e94560',
    color: 'white',
  },
  matches: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  matchCard: {
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: {
    border: '1px solid rgba(39, 174, 96, 0.3)',
  },
  tbd: {
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    padding: '20px',
    fontSize: '14px',
  },
  matchRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    margin: '8px 0',
  },
  team: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  flag: {
    fontSize: '24px',
  },
  teamName: {
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
  },
  scoreInputs: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  scoreInput: {
    width: '52px',
    height: '52px',
    borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'white',
    fontSize: '22px',
    fontWeight: 'bold',
    textAlign: 'center',
    outline: 'none',
  },
  vs: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: '18px',
  },
  winnerSection: {
    marginTop: '12px',
    padding: '12px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '8px',
  },
  winnerLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: '13px',
    marginBottom: '8px',
    margin: '0 0 8px 0',
  },
  winnerButtons: {
    display: 'flex',
    gap: '8px',
  },
  winnerButton: {
    flex: 1,
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'transparent',
    color: 'rgba(255,255,255,0.7)',
    cursor: 'pointer',
    fontSize: '13px',
  },
  winnerActive: {
    background: 'rgba(233,69,96,0.3)',
    border: '1px solid #e94560',
    color: 'white',
  },
  saveButton: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '8px',
  },
  finalCard: {
    marginTop: '20px',
    padding: '20px',
    background: 'rgba(255,215,0,0.05)',
    borderRadius: '12px',
    border: '1px solid rgba(255,215,0,0.2)',
  },
  finalTitle: {
    color: 'gold',
    fontSize: '20px',
    textAlign: 'center',
    marginBottom: '16px',
  },
}