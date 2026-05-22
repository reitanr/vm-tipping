import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function Admin() {
  const [matches, setMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [bonusQuestions, setBonusQuestions] = useState([])
  const [results, setResults] = useState({})
  const [bonusAnswers, setBonusAnswers] = useState({})
  const [settings, setSettings] = useState({ playoff_open: false, betting_open: true })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState("settings")
  const [activeGroup, setActiveGroup] = useState('A')

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)

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

    const resultsMap = {}
    matchesData?.forEach(m => {
      resultsMap[m.id] = {
        home: m.home_score !== null ? m.home_score.toString() : "",
        away: m.away_score !== null ? m.away_score.toString() : "",
      }
    })
    setResults(resultsMap)

    const { data: questionsData } = await supabase
      .from("bonus_questions")
      .select("*")
      .order("id")
    setBonusQuestions(questionsData || [])

    const bonusMap = {}
    questionsData?.forEach(q => {
      if (q.correct_answer) bonusMap[q.id] = q.correct_answer
    })
    setBonusAnswers(bonusMap)

    const { data: settingsData } = await supabase
      .from("app_settings")
      .select("*")
      .single()
    if (settingsData) setSettings(settingsData)

    setLoading(false)
  }

  const saveSettings = async () => {
    const { error } = await supabase
      .from("app_settings")
      .update({
        playoff_open: settings.playoff_open,
        betting_open: settings.betting_open,
      })
      .eq("id", 1)

    if (error) setMessage("❌ Noe gikk galt")
    else setMessage("✅ Innstillinger lagret!")
    setTimeout(() => setMessage(""), 3000)
  }

  const saveResult = async (matchId) => {
    const result = results[matchId]
    if (!result || result.home === "" || result.away === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    const { error } = await supabase
      .from("matches")
      .update({
        home_score: parseInt(result.home),
        away_score: parseInt(result.away),
        status: "finished"
      })
      .eq("id", matchId)

    if (error) {
      setMessage("❌ Noe gikk galt")
    } else {
      await updateMatchPoints(matchId, parseInt(result.home), parseInt(result.away))
      setMessage("✅ Resultat lagret og poeng oppdatert!")
    }
    setTimeout(() => setMessage(""), 4000)
  }

  const updateMatchPoints = async (matchId, homeScore, awayScore) => {
    const { data: predictions } = await supabase
      .from("match_predictions")
      .select("*")
      .eq("match_id", matchId)

    for (const pred of predictions || []) {
      let points = 0
      if (pred.home_score === homeScore && pred.away_score === awayScore) {
        points = 3
      } else {
        const actualWinner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
        const predWinner = pred.home_score > pred.away_score ? "home" : pred.away_score > pred.home_score ? "away" : "draw"
        if (actualWinner === predWinner) points = 1
      }
      await supabase
        .from("match_predictions")
        .update({ points_awarded: points })
        .eq("id", pred.id)
    }
  }

  const saveBonusAnswer = async (questionId) => {
    const answer = bonusAnswers[questionId]
    if (!answer || answer.trim() === "") {
      setMessage("❌ Fyll inn riktig svar!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    const { error } = await supabase
      .from("bonus_questions")
      .update({ correct_answer: answer.trim() })
      .eq("id", questionId)

    if (error) {
      setMessage("❌ Noe gikk galt")
    } else {
      await updateBonusPoints(questionId, answer.trim())
      setMessage("✅ Svar lagret og poeng oppdatert!")
    }
    setTimeout(() => setMessage(""), 4000)
  }

  const updateBonusPoints = async (questionId, correctAnswer) => {
    const { data: question } = await supabase
      .from("bonus_questions")
      .select("*")
      .eq("id", questionId)
      .single()

    const { data: predictions } = await supabase
      .from("bonus_predictions")
      .select("*")
      .eq("question_id", questionId)

    for (const pred of predictions || []) {
      let points = 0
      if (question.question_type === "number") {
        const predNum = parseInt(pred.answer)
        const correctNum = parseInt(correctAnswer)
        if (predNum === correctNum) points = question.points
        else if (Math.abs(predNum - correctNum) === 1) points = Math.floor(question.points / 2)
      } else {
        if (pred.answer.toLowerCase() === correctAnswer.toLowerCase()) {
          points = question.points
        }
      }
      await supabase
        .from("bonus_predictions")
        .update({ points_awarded: points })
        .eq("id", pred.id)
    }
  }

  const groupMatches = matches.filter(m => m.group_letter === activeGroup)
  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nb-NO', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  if (loading) return <div style={styles.loading}>Laster admin...</div>

  return (
    <div>
      <h2 style={styles.title}>⚙️ Admin-panel</h2>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.tabs}>
        {[
          { id: "settings", label: "⚙️ Innstillinger" },
          { id: "matches", label: "⚽ Resultater" },
          { id: "bonus", label: "🎯 Bonussvar" },
        ].map(t => (
          <button
            key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.activeTab : {}) }}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "settings" && (
        <div style={styles.settingsCard}>
          <h3 style={styles.sectionTitle}>Konkurranseinnstillinger</h3>

          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>🔒 Tipping åpen</div>
              <div style={styles.settingDesc}>Slå av for å stoppe tipping når VM starter</div>
            </div>
            <button
              style={{ ...styles.toggle, ...(settings.betting_open ? styles.toggleOn : styles.toggleOff) }}
              onClick={() => setSettings(prev => ({ ...prev, betting_open: !prev.betting_open }))}
            >
              {settings.betting_open ? "PÅ" : "AV"}
            </button>
          </div>

          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>🏆 Sluttspill-tipping åpen</div>
              <div style={styles.settingDesc}>Slå på når du har lagt inn 16-delsfinale-kampene</div>
            </div>
            <button
              style={{ ...styles.toggle, ...(settings.playoff_open ? styles.toggleOn : styles.toggleOff) }}
              onClick={() => setSettings(prev => ({ ...prev, playoff_open: !prev.playoff_open }))}
            >
              {settings.playoff_open ? "PÅ" : "AV"}
            </button>
          </div>

          <button style={styles.saveButton} onClick={saveSettings}>
            💾 Lagre innstillinger
          </button>
        </div>
      )}

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
              const result = results[match.id] || { home: "", away: "" }
              const hasResult = result.home !== "" && result.away !== ""

              return (
                <div key={match.id} style={{
                  ...styles.matchCard,
                  ...(hasResult ? styles.matchCardDone : {})
                }}>
                  <div style={styles.matchDate}>{formatDate(match.match_date)}</div>
                  <div style={styles.matchRow}>
                    <div style={styles.team}>
                      <span style={styles.flag}>{home?.flag_emoji}</span>
                      <span style={styles.teamName}>{home?.name}</span>
                    </div>
                    <div style={styles.scoreInputs}>
                      <input
                        style={styles.scoreInput}
                        type="number" min="0" max="20"
                        value={result.home}
                        onChange={e => setResults(prev => ({
                          ...prev, [match.id]: { ...prev[match.id], home: e.target.value }
                        }))}
                        placeholder="-"
                      />
                      <span style={styles.vs}>–</span>
                      <input
                        style={styles.scoreInput}
                        type="number" min="0" max="20"
                        value={result.away}
                        onChange={e => setResults(prev => ({
                          ...prev, [match.id]: { ...prev[match.id], away: e.target.value }
                        }))}
                        placeholder="-"
                      />
                    </div>
                    <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                      <span style={styles.teamName}>{away?.name}</span>
                      <span style={styles.flag}>{away?.flag_emoji}</span>
                    </div>
                  </div>
                  {hasResult && (
                    <div style={styles.resultDisplay}>
                      ✅ Lagret: {result.home} – {result.away}
                    </div>
                  )}
                  <button style={styles.saveButton} onClick={() => saveResult(match.id)}>
                    {hasResult ? "Oppdater resultat" : "Lagre resultat"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "bonus" && (
        <div style={styles.questions}>
          {bonusQuestions.map((q, index) => (
            <div key={q.id} style={{
              ...styles.questionCard,
              ...(q.correct_answer ? styles.questionCardDone : {})
            }}>
              <div style={styles.questionHeader}>
                <span style={styles.questionNumber}>#{index + 1}</span>
                <span style={styles.points}>{q.points} poeng</span>
              </div>
              <p style={styles.questionText}>{q.question}</p>
              {q.correct_answer && (
                <div style={styles.correctAnswerDisplay}>
                  ✅ Riktig svar: {q.correct_answer}
                </div>
              )}
              <input
                style={styles.input}
                type="text"
                placeholder="Riktig svar..."
                value={bonusAnswers[q.id] || ""}
                onChange={e => setBonusAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
              />
              <button style={styles.saveButton} onClick={() => saveBonusAnswer(q.id)}>
                {q.correct_answer ? "Oppdater svar" : "Lagre svar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  message: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)', color: 'white',
    marginBottom: '16px', textAlign: 'center',
  },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: {
    padding: '10px 20px', borderRadius: '20px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: '500',
  },
  activeTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  settingsCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '20px', border: '1px solid rgba(255,255,255,0.1)',
  },
  sectionTitle: { color: 'white', fontSize: '16px', marginBottom: '20px' },
  settingRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  settingLabel: { color: 'white', fontSize: '15px', marginBottom: '4px' },
  settingDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  toggle: {
    padding: '8px 20px', borderRadius: '20px', border: 'none',
    cursor: 'pointer', fontWeight: 'bold', fontSize: '13px',
  },
  toggleOn: { background: '#27ae60', color: 'white' },
  toggleOff: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' },
  groupTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  groupTab: {
    width: '40px', height: '40px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
  },
  activeGroupTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  matchList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  matchCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '16px', border: '1px solid rgba(255,255,255,0.1)',
  },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  matchDate: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' },
  matchRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' },
  team: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  flag: { fontSize: '24px' },
  teamName: { color: 'white', fontSize: '14px', fontWeight: '500' },
  scoreInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreInput: {
    width: '52px', height: '52px', borderRadius: '10px',
    border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: '22px', fontWeight: 'bold', textAlign: 'center', outline: 'none',
  },
  vs: { color: 'rgba(255,255,255,0.4)', fontSize: '18px' },
  resultDisplay: {
    color: '#27ae60', fontSize: '13px', textAlign: 'center',
    padding: '6px', background: 'rgba(39,174,96,0.1)',
    borderRadius: '6px', marginBottom: '8px',
  },
  saveButton: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px',
  },
  questions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questionCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '20px', border: '1px solid rgba(255,255,255,0.1)',
  },
  questionCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  questionNumber: { color: 'rgba(255,255,255,0.4)', fontSize: '13px' },
  points: { background: '#e94560', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  questionText: { color: 'white', fontSize: '16px', marginBottom: '14px', lineHeight: '1.4' },
  correctAnswerDisplay: {
    color: '#27ae60', fontSize: '13px', padding: '8px 12px',
    background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginBottom: '12px',
  },
  input: {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: '15px', marginBottom: '12px', outline: 'none', boxSizing: 'border-box',
  },
}