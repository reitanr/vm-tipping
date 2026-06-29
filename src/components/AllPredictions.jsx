import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

const R8_BRACKET = [
  [1, 4], [0, 2], [3, 5], [6, 7],
  [10, 11], [8, 9], [13, 15], [12, 14],
]
const QF_BRACKET = [[0,1],[2,3],[4,5],[6,7]]
const SF_BRACKET = [[0,1],[2,3]]

const FIFA_MATCH_NUMBERS = [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]

export default function AllPredictions() {
  const [profiles, setProfiles] = useState([])
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [predictions, setPredictions] = useState({})
  const [bonusQuestions, setBonusQuestions] = useState([])
  const [bonusPredictions, setBonusPredictions] = useState({})
  const [playoffMatches, setPlayoffMatches] = useState([])
  const [playoffPredictions, setPlayoffPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("matches")
  const [activeGroup, setActiveGroup] = useState('I')
  const [activeUser, setActiveUser] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: profilesData } = await supabase
      .from("profiles").select("*").order("username")
    setProfiles(profilesData || [])
    if (profilesData?.length > 0) setActiveUser(profilesData[0].id)

    const { data: teamsData } = await supabase.from("teams").select("*")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)

    const { data: matchesData } = await supabase
      .from("matches").select("*").eq("round", "group").order("match_date")
    setMatches(matchesData || [])

    const { data: predsData } = await supabase.from("match_predictions").select("*")
    const predsMap = {}
    predsData?.forEach(p => {
      if (!predsMap[p.user_id]) predsMap[p.user_id] = {}
      predsMap[p.user_id][p.match_id] = p
    })
    setPredictions(predsMap)

    const { data: questionsData } = await supabase
      .from("bonus_questions").select("*").order("id")
    setBonusQuestions(questionsData || [])

    const { data: bonusPredsData } = await supabase.from("bonus_predictions").select("*")
    const bonusMap = {}
    bonusPredsData?.forEach(p => {
      if (!bonusMap[p.user_id]) bonusMap[p.user_id] = {}
      bonusMap[p.user_id][p.question_id] = { answer: p.answer, points: p.points_awarded }
    })
    setBonusPredictions(bonusMap)

    const { data: playoffMatchesData } = await supabase
      .from("playoff_matches").select("*").eq("round", "r16").order("position")
    setPlayoffMatches(playoffMatchesData || [])

    const { data: playoffPredsData } = await supabase.from("playoff_predictions").select("*")
    const playoffMap = {}
    playoffPredsData?.forEach(p => {
      if (!playoffMap[p.user_id]) playoffMap[p.user_id] = {}
      playoffMap[p.user_id][p.match_id] = p
    })
    setPlayoffPredictions(playoffMap)

    setLoading(false)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const getMatchResultStyle = (match, pred) => {
    if (match.home_score === null || !pred) return null
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 'exact'
    const actualOutcome = match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw'
    const predOutcome = pred.home_score > pred.away_score ? 'home' : pred.away_score > pred.home_score ? 'away' : 'draw'
    if (actualOutcome === predOutcome) return 'correct'
    return 'wrong'
  }

  const getBonusResultStatus = (question, userBonusPred) => {
    if (!question.correct_answer) return null
    if (!userBonusPred) return 'unanswered'
    const userAnswer = userBonusPred.answer
    if (question.question_type === "number") {
      const userNum = parseInt(userAnswer)
      const correctNum = parseInt(question.correct_answer)
      if (userNum === correctNum) return 'exact'
      if (Math.abs(userNum - correctNum) === 1) return 'close'
      return 'wrong'
    }
    if (userAnswer.toLowerCase() === question.correct_answer.toLowerCase()) return 'exact'
    return 'wrong'
  }

  const getPlayoffResultStyle = (match, pred) => {
    if (!match || match.home_score === null || !pred) return null
    if (pred.home_score === match.home_score && pred.away_score === match.away_score) return 'exact'
    const actualOutcome = match.home_score > match.away_score ? 'home' : match.away_score > match.home_score ? 'away' : 'draw'
    const predOutcome = pred.home_score > pred.away_score ? 'home' : pred.away_score > pred.home_score ? 'away' : 'draw'
    if (actualOutcome === predOutcome) return 'correct'
    return 'wrong'
  }

  const getUserR16Winner = (userId, matchIndex) => {
    const match = playoffMatches[matchIndex]
    if (!match) return null
    const pred = playoffPredictions[userId]?.[String(match.id)]
    if (!pred) return null
    if (pred.home_score > pred.away_score) return match.home_team_id
    if (pred.away_score > pred.home_score) return match.away_team_id
    return pred.winner_id || null
  }

  const getUserR8Winner = (userId, r8Index) => {
    const pred = playoffPredictions[userId]?.[`r8_${r8Index}`]
    if (!pred) return null
    const [idx1, idx2] = R8_BRACKET[r8Index]
    const homeId = getUserR16Winner(userId, idx1)
    const awayId = getUserR16Winner(userId, idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getUserQFWinner = (userId, qfIndex) => {
    const pred = playoffPredictions[userId]?.[`qf_${qfIndex}`]
    if (!pred) return null
    const [idx1, idx2] = QF_BRACKET[qfIndex]
    const homeId = getUserR8Winner(userId, idx1)
    const awayId = getUserR8Winner(userId, idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getUserSFWinner = (userId, sfIndex) => {
    const pred = playoffPredictions[userId]?.[`sf_${sfIndex}`]
    if (!pred) return null
    const [idx1, idx2] = SF_BRACKET[sfIndex]
    const homeId = getUserQFWinner(userId, idx1)
    const awayId = getUserQFWinner(userId, idx2)
    if (!homeId || !awayId) return null
    if (pred.home_score > pred.away_score) return homeId
    if (pred.away_score > pred.home_score) return awayId
    return pred.winner_id || null
  }

  const getUserSFLoser = (userId, sfIndex) => {
    const [idx1, idx2] = SF_BRACKET[sfIndex]
    const homeId = getUserQFWinner(userId, idx1)
    const awayId = getUserQFWinner(userId, idx2)
    const winner = getUserSFWinner(userId, sfIndex)
    if (!winner || !homeId || !awayId) return null
    return winner === homeId ? awayId : homeId
  }

  const groupMatches = matches.filter(m => m.group_letter === activeGroup)

  const renderPlayoffMatchCard = (pred, homeId, awayId, label, resultStyle) => {
    const cardStyle = {
      ...styles.matchCard,
      ...(resultStyle === 'exact' ? styles.matchCardExact : {}),
      ...(resultStyle === 'correct' ? styles.matchCardCorrect : {}),
      ...(resultStyle === 'wrong' ? styles.matchCardWrong : {}),
      ...(!resultStyle && pred ? styles.matchCardDone : {}),
    }
    return (
      <div style={cardStyle}>
        {label && <div style={styles.matchDate}>{label}</div>}
        <div style={styles.matchRow}>
          <div style={styles.team}>
            <span style={styles.flag}>{homeId ? teams[homeId]?.flag_emoji : '❓'}</span>
            <span style={styles.teamName}>{homeId ? teams[homeId]?.name : 'Ukjent'}</span>
          </div>
          <div style={styles.scoreDisplay}>
            {pred ? <span style={styles.score}>{pred.home_score} – {pred.away_score}</span>
              : <span style={styles.noTip}>–</span>}
          </div>
          <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
            <span style={styles.teamName}>{awayId ? teams[awayId]?.name : 'Ukjent'}</span>
            <span style={styles.flag}>{awayId ? teams[awayId]?.flag_emoji : '❓'}</span>
          </div>
        </div>
        <div style={styles.matchRight}>
          {resultStyle === 'exact' && <span style={styles.badge}>🎯 Eksakt!</span>}
          {resultStyle === 'correct' && <span style={styles.badgeCorrect}>✅ Riktig</span>}
          {resultStyle === 'wrong' && <span style={styles.badgeWrong}>❌ Feil</span>}
        </div>
      </div>
    )
  }

  if (loading) return <div style={styles.loading}>Laster tips...</div>

  return (
    <div>
      <h2 style={styles.title}>👀 Alles tips</h2>
      <p style={styles.subtitle}>Se hva alle har tippet</p>

      <div style={styles.tabs}>
        {[
          { id: "matches", label: "⚽ Gruppespill" },
          { id: "playoff", label: "🏆 Sluttspill" },
          { id: "bonus", label: "🎯 Bonustips" },
        ].map(t => (
          <button key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.activeTab : {}) }}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={styles.userTabs}>
        {profiles.map(p => (
          <button key={p.id}
            style={{ ...styles.userTab, ...(activeUser === p.id ? styles.activeUserTab : {}) }}
            onClick={() => setActiveUser(p.id)}>
            {p.username}
          </button>
        ))}
      </div>

      {activeTab === "matches" && (
        <div>
          <div style={styles.groupTabs}>
            {GROUPS.map(g => (
              <button key={g}
                style={{ ...styles.groupTab, ...(activeGroup === g ? styles.activeGroupTab : {}) }}
                onClick={() => setActiveGroup(g)}>
                {g}
              </button>
            ))}
          </div>
          <div style={styles.matchList}>
            {groupMatches.map(match => {
              const home = teams[match.home_team_id]
              const away = teams[match.away_team_id]
              const pred = predictions[activeUser]?.[match.id]
              const resultStyle = getMatchResultStyle(match, pred)
              const cardStyle = {
                ...styles.matchCard,
                ...(resultStyle === 'exact' ? styles.matchCardExact : {}),
                ...(resultStyle === 'correct' ? styles.matchCardCorrect : {}),
                ...(resultStyle === 'wrong' ? styles.matchCardWrong : {}),
                ...(!resultStyle && pred ? styles.matchCardDone : {}),
              }
              return (
                <div key={match.id} style={cardStyle}>
                  <div style={styles.matchInfo}>
                    <span style={styles.matchDate}>{formatDate(match.match_date)}</span>
                    <div style={styles.matchRight}>
                      {match.home_score !== null && (
                        <span style={styles.actualResult}>Fasit: {match.home_score} – {match.away_score}</span>
                      )}
                      {resultStyle === 'exact' && <span style={styles.badge}>🎯 Eksakt!</span>}
                      {resultStyle === 'correct' && <span style={styles.badgeCorrect}>✅ Riktig</span>}
                      {resultStyle === 'wrong' && <span style={styles.badgeWrong}>❌ Feil</span>}
                    </div>
                  </div>
                  <div style={styles.matchRow}>
                    <div style={styles.team}>
                      <span style={styles.flag}>{home?.flag_emoji}</span>
                      <span style={styles.teamName}>{home?.name}</span>
                    </div>
                    <div style={styles.scoreDisplay}>
                      {pred ? <span style={styles.score}>{pred.home_score} – {pred.away_score}</span>
                        : <span style={styles.noTip}>–</span>}
                    </div>
                    <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                      <span style={styles.teamName}>{away?.name}</span>
                      <span style={styles.flag}>{away?.flag_emoji}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "playoff" && (
        <div style={styles.matchList}>
          <h3 style={styles.sectionTitle}>16-delsfinale</h3>
          {playoffMatches.map((match, index) => {
            const pred = playoffPredictions[activeUser]?.[String(match.id)]
            const resultStyle = getPlayoffResultStyle(match, pred)
            const winner = getUserR16Winner(activeUser, index)
            const cardStyle = {
              ...styles.matchCard,
              ...(resultStyle === 'exact' ? styles.matchCardExact : {}),
              ...(resultStyle === 'correct' ? styles.matchCardCorrect : {}),
              ...(resultStyle === 'wrong' ? styles.matchCardWrong : {}),
              ...(!resultStyle && pred ? styles.matchCardDone : {}),
            }
            return (
              <div key={match.id} style={cardStyle}>
                <div style={styles.matchInfo}>
                  <span style={styles.matchDate}>Kamp {FIFA_MATCH_NUMBERS[index]}</span>
                  <div style={styles.matchRight}>
                    {match.home_score !== null && (
                      <span style={styles.actualResult}>Fasit: {match.home_score} – {match.away_score}</span>
                    )}
                    {resultStyle === 'exact' && <span style={styles.badge}>🎯 Eksakt!</span>}
                    {resultStyle === 'correct' && <span style={styles.badgeCorrect}>✅ Riktig</span>}
                    {resultStyle === 'wrong' && <span style={styles.badgeWrong}>❌ Feil</span>}
                  </div>
                </div>
                <div style={styles.matchRow}>
                  <div style={styles.team}>
                    <span style={styles.flag}>{teams[match.home_team_id]?.flag_emoji}</span>
                    <span style={styles.teamName}>{teams[match.home_team_id]?.name}</span>
                  </div>
                  <div style={styles.scoreDisplay}>
                    {pred ? <span style={styles.score}>{pred.home_score} – {pred.away_score}</span>
                      : <span style={styles.noTip}>–</span>}
                  </div>
                  <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                    <span style={styles.teamName}>{teams[match.away_team_id]?.name}</span>
                    <span style={styles.flag}>{teams[match.away_team_id]?.flag_emoji}</span>
                  </div>
                </div>
                {winner && (
                  <div style={styles.winnerTip}>
                    🏆 Tipper videre: {teams[winner]?.flag_emoji} {teams[winner]?.name}
                  </div>
                )}
              </div>
            )
          })}

          <h3 style={styles.sectionTitle}>8-delsfinale</h3>
          {R8_BRACKET.map((pair, index) => {
            const homeId = getUserR16Winner(activeUser, pair[0])
            const awayId = getUserR16Winner(activeUser, pair[1])
            const pred = playoffPredictions[activeUser]?.[`r8_${index}`]
            return renderPlayoffMatchCard(
              pred, homeId, awayId,
              `Vinner kamp ${FIFA_MATCH_NUMBERS[pair[0]]} vs Vinner kamp ${FIFA_MATCH_NUMBERS[pair[1]]}`,
              null
            )
          })}

          <h3 style={styles.sectionTitle}>Kvartfinale</h3>
          {QF_BRACKET.map((pair, index) => {
            const homeId = getUserR8Winner(activeUser, pair[0])
            const awayId = getUserR8Winner(activeUser, pair[1])
            const pred = playoffPredictions[activeUser]?.[`qf_${index}`]
            return renderPlayoffMatchCard(pred, homeId, awayId, `Kvartfinale ${index + 1}`, null)
          })}

          <h3 style={styles.sectionTitle}>Semifinale</h3>
          {SF_BRACKET.map((pair, index) => {
            const homeId = getUserQFWinner(activeUser, pair[0])
            const awayId = getUserQFWinner(activeUser, pair[1])
            const pred = playoffPredictions[activeUser]?.[`sf_${index}`]
            return renderPlayoffMatchCard(pred, homeId, awayId, `Semifinale ${index + 1}`, null)
          })}

          <h3 style={styles.sectionTitle}>🥉 Bronsefinale</h3>
          {renderPlayoffMatchCard(
            playoffPredictions[activeUser]?.['bronze_0'],
            getUserSFLoser(activeUser, 0),
            getUserSFLoser(activeUser, 1),
            'Bronsefinale', null
          )}

          <h3 style={styles.sectionTitle}>🏆 Finale</h3>
          {renderPlayoffMatchCard(
            playoffPredictions[activeUser]?.['final_0'],
            getUserSFWinner(activeUser, 0),
            getUserSFWinner(activeUser, 1),
            'VM-finalen', null
          )}
        </div>
      )}

      {activeTab === "bonus" && (
        <div style={styles.bonusList}>
          {bonusQuestions.map((q, index) => {
            const userBonusPred = bonusPredictions[activeUser]?.[q.id]
            const status = getBonusResultStatus(q, userBonusPred)
            const cardStyle = {
              ...styles.bonusCard,
              ...(status === 'exact' ? styles.bonusCardExact : {}),
              ...(status === 'close' ? styles.bonusCardClose : {}),
              ...(status === 'wrong' ? styles.bonusCardWrong : {}),
              ...(status === 'unanswered' ? styles.bonusCardWrong : {}),
              ...(!status && userBonusPred ? styles.bonusCardDone : {}),
            }
            return (
              <div key={q.id} style={cardStyle}>
                <div style={styles.bonusHeader}>
                  <span style={styles.bonusNumber}>#{index + 1}</span>
                  <div style={styles.headerRight}>
                    {status === 'exact' && <span style={styles.badge}>✅ Riktig! +{userBonusPred?.points || q.points}p</span>}
                    {status === 'close' && <span style={styles.badgeClose}>🔶 Nære! +{userBonusPred?.points || 0}p</span>}
                    {status === 'wrong' && <span style={styles.badgeWrong}>❌ Feil</span>}
                    {status === 'unanswered' && <span style={styles.badgeWrong}>❌ Ikke besvart</span>}
                    <span style={styles.bonusPoints}>{q.points} poeng</span>
                  </div>
                </div>
                <p style={styles.bonusQuestion}>{q.question}</p>
                {q.correct_answer && (
                  <div style={styles.correctAnswerBox}>
                    ✅ Riktig svar: <strong>{q.correct_answer}</strong>
                  </div>
                )}
                <div style={styles.bonusAnswer}>
                  {userBonusPred ? (
                    <span style={styles.answerText}>💬 {userBonusPred.answer}</span>
                  ) : (
                    <span style={styles.noAnswer}>Ikke svart</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '8px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  empty: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tab: { padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  activeTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  userTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  userTab: { padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px' },
  activeUserTab: { background: 'rgba(233,69,96,0.3)', border: '1px solid #e94560', color: 'white' },
  groupTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  groupTab: { width: '40px', height: '40px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' },
  activeGroupTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  sectionTitle: { color: 'white', fontSize: '16px', margin: '16px 0 8px 0' },
  matchList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  matchCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)' },
  matchCardDone: { border: '1px solid rgba(39,174,96,0.2)' },
  matchCardExact: { border: '1px solid rgba(255,215,0,0.5)', background: 'rgba(255,215,0,0.05)' },
  matchCardCorrect: { border: '1px solid rgba(39,174,96,0.5)', background: 'rgba(39,174,96,0.05)' },
  matchCardWrong: { border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.03)' },
  matchInfo: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' },
  matchRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  matchDate: { color: 'rgba(255,255,255,0.4)', fontSize: '11px' },
  actualResult: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', fontStyle: 'italic' },
  badge: { background: 'rgba(255,215,0,0.2)', border: '1px solid rgba(255,215,0,0.4)', color: 'gold', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' },
  badgeCorrect: { background: 'rgba(39,174,96,0.2)', border: '1px solid rgba(39,174,96,0.4)', color: '#27ae60', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' },
  badgeClose: { background: 'rgba(243,156,18,0.2)', border: '1px solid rgba(243,156,18,0.4)', color: '#f39c12', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' },
  badgeWrong: { background: 'rgba(233,69,96,0.2)', border: '1px solid rgba(233,69,96,0.4)', color: '#e94560', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' },
  matchRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  team: { flex: 1, display: 'flex', alignItems: 'center', gap: '6px' },
  flag: { fontSize: '20px' },
  teamName: { color: 'white', fontSize: '13px', fontWeight: '500' },
  scoreDisplay: { minWidth: '60px', textAlign: 'center' },
  score: { color: 'white', fontSize: '18px', fontWeight: 'bold' },
  noTip: { color: 'rgba(255,255,255,0.2)', fontSize: '18px' },
  winnerTip: { color: '#27ae60', fontSize: '12px', marginTop: '6px', padding: '4px 8px', background: 'rgba(39,174,96,0.1)', borderRadius: '6px' },
  bonusList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  bonusCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' },
  bonusCardDone: { border: '1px solid rgba(39,174,96,0.2)' },
  bonusCardExact: { border: '1px solid rgba(255,215,0,0.5)', background: 'rgba(255,215,0,0.05)' },
  bonusCardClose: { border: '1px solid rgba(243,156,18,0.5)', background: 'rgba(243,156,18,0.05)' },
  bonusCardWrong: { border: '1px solid rgba(233,69,96,0.3)', background: 'rgba(233,69,96,0.03)' },
  bonusHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  bonusNumber: { color: 'rgba(255,255,255,0.4)', fontSize: '12px' },
  bonusPoints: { background: '#e94560', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' },
  bonusQuestion: { color: 'white', fontSize: '14px', marginBottom: '10px', lineHeight: '1.4' },
  correctAnswerBox: { color: '#27ae60', fontSize: '12px', padding: '6px 10px', background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginBottom: '10px' },
  bonusAnswer: { background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '8px 12px' },
  answerText: { color: '#27ae60', fontSize: '14px' },
  noAnswer: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontStyle: 'italic' },
}