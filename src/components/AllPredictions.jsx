import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

export default function AllPredictions() {
  const [profiles, setProfiles] = useState([])
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [predictions, setPredictions] = useState({})
  const [bonusQuestions, setBonusQuestions] = useState([])
  const [bonusPredictions, setBonusPredictions] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("matches")
  const [activeGroup, setActiveGroup] = useState('I')
  const [activeUser, setActiveUser] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
      .order("username")
    setProfiles(profilesData || [])
    if (profilesData?.length > 0) setActiveUser(profilesData[0].id)

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

    const { data: predsData } = await supabase
      .from("match_predictions")
      .select("*")
    const predsMap = {}
    predsData?.forEach(p => {
      if (!predsMap[p.user_id]) predsMap[p.user_id] = {}
      predsMap[p.user_id][p.match_id] = p
    })
    setPredictions(predsMap)

    const { data: questionsData } = await supabase
      .from("bonus_questions")
      .select("*")
      .order("id")
    setBonusQuestions(questionsData || [])

    const { data: bonusPredsData } = await supabase
      .from("bonus_predictions")
      .select("*")
    const bonusMap = {}
    bonusPredsData?.forEach(p => {
      if (!bonusMap[p.user_id]) bonusMap[p.user_id] = {}
      bonusMap[p.user_id][p.question_id] = { answer: p.answer, points: p.points_awarded }
    })
    setBonusPredictions(bonusMap)

    setLoading(false)
  }

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const getMatchResultStyle = (match, pred) => {
    if (match.home_score === null || !pred) return null
    const actualHome = match.home_score
    const actualAway = match.away_score
    const predHome = pred.home_score
    const predAway = pred.away_score

    if (predHome === actualHome && predAway === actualAway) return 'exact'

    const actualOutcome = actualHome > actualAway ? 'home' : actualAway > actualHome ? 'away' : 'draw'
    const predOutcome = predHome > predAway ? 'home' : predAway > predHome ? 'away' : 'draw'

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

  const groupMatches = matches.filter(m => m.group_letter === activeGroup)

  if (loading) return <div style={styles.loading}>Laster tips...</div>

  return (
    <div>
      <h2 style={styles.title}>👀 Alles tips</h2>
      <p style={styles.subtitle}>Se hva alle har tippet</p>

      <div style={styles.tabs}>
        <button
          style={{ ...styles.tab, ...(activeTab === "matches" ? styles.activeTab : {}) }}
          onClick={() => setActiveTab("matches")}
        >
          ⚽ Kamptips
        </button>
        <button
          style={{ ...styles.tab, ...(activeTab === "bonus" ? styles.activeTab : {}) }}
          onClick={() => setActiveTab("bonus")}
        >
          🎯 Bonustips
        </button>
      </div>

      <div style={styles.userTabs}>
        {profiles.map(p => (
          <button
            key={p.id}
            style={{ ...styles.userTab, ...(activeUser === p.id ? styles.activeUserTab : {}) }}
            onClick={() => setActiveUser(p.id)}
          >
            {p.username}
          </button>
        ))}
      </div>

      {activeTab === "matches" && (
        <div>
          <div style={styles.groupTabs}>
            {GROUPS.map(g => (
              <button
                key={g}
                style={{ ...styles.groupTab, ...(activeGroup === g ? styles.activeGroupTab : {}) }}
                onClick={() => setActiveGroup(g)}
              >
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
                        <span style={styles.actualResult}>
                          Fasit: {match.home_score} – {match.away_score}
                        </span>
                      )}
                      {resultStyle === 'exact' && <span style={styles.badge}>🎯 Eksakt!</span>}
                      {resultStyle === 'correct' && <span style={styles.badgeCorrect}>✅ Riktig utfall</span>}
                      {resultStyle === 'wrong' && <span style={styles.badgeWrong}>❌ Feil</span>}
                    </div>
                  </div>
                  <div style={styles.matchRow}>
                    <div style={styles.team}>
                      <span style={styles.flag}>{home?.flag_emoji}</span>
                      <span style={styles.teamName}>{home?.name}</span>
                    </div>
                    <div style={styles.scoreDisplay}>
                      {pred ? (
                        <span style={styles.score}>
                          {pred.home_score} – {pred.away_score}
                        </span>
                      ) : (
                        <span style={styles.noTip}>–</span>
                      )}
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
  tabs: { display: 'flex', gap: '8px', marginBottom: '16px' },
  tab: {
    padding: '10px 20px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
  },
  activeTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  userTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  userTab: {
    padding: '8px 16px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px',
  },
  activeUserTab: { background: 'rgba(233,69,96,0.3)', border: '1px solid #e94560', color: 'white' },
  groupTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' },
  groupTab: {
    width: '40px', height: '40px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
  },
  activeGroupTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  matchList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '12px 16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.2)' },
  matchCardExact: {
    border: '1px solid rgba(255,215,0,0.5)',
    background: 'rgba(255,215,0,0.05)',
  },
  matchCardCorrect: {
    border: '1px solid rgba(39,174,96,0.5)',
    background: 'rgba(39,174,96,0.05)',
  },
  matchCardWrong: {
    border: '1px solid rgba(233,69,96,0.3)',
    background: 'rgba(233,69,96,0.03)',
  },
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
  score: { color: '#27ae60', fontSize: '18px', fontWeight: 'bold' },
  noTip: { color: 'rgba(255,255,255,0.2)', fontSize: '18px' },
  bonusList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  bonusCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  bonusCardDone: { border: '1px solid rgba(39, 174, 96, 0.2)' },
  bonusCardExact: {
    border: '1px solid rgba(255,215,0,0.5)',
    background: 'rgba(255,215,0,0.05)',
  },
  bonusCardClose: {
    border: '1px solid rgba(243,156,18,0.5)',
    background: 'rgba(243,156,18,0.05)',
  },
  bonusCardWrong: {
    border: '1px solid rgba(233,69,96,0.3)',
    background: 'rgba(233,69,96,0.03)',
  },
  bonusHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  bonusNumber: { color: 'rgba(255,255,255,0.4)', fontSize: '12px' },
  bonusPoints: {
    background: '#e94560', color: 'white', padding: '2px 8px',
    borderRadius: '20px', fontSize: '11px', fontWeight: 'bold',
  },
  bonusQuestion: { color: 'white', fontSize: '14px', marginBottom: '10px', lineHeight: '1.4' },
  correctAnswerBox: {
    color: '#27ae60', fontSize: '12px', padding: '6px 10px',
    background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginBottom: '10px',
  },
  bonusAnswer: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '6px',
    padding: '8px 12px',
  },
  answerText: { color: '#27ae60', fontSize: '14px' },
  noAnswer: { color: 'rgba(255,255,255,0.3)', fontSize: '13px', fontStyle: 'italic' },
}