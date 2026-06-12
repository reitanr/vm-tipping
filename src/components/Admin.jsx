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

const FIFA_MATCH_NUMBERS = [73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88]

const R8_BRACKET = [
  [1, 4], [0, 2], [3, 5], [6, 7],
  [10, 11], [8, 9], [13, 15], [12, 14],
]
const QF_BRACKET = [[0,1],[2,3],[4,5],[6,7]]
const SF_BRACKET = [[0,1],[2,3]]

const BONUS_POINTS = { r8: 1, qf: 2, sf: 3, final: 4 }

export default function Admin() {
  const [matches, setMatches] = useState([])
  const [playoffMatches, setPlayoffMatches] = useState([])
  const [teams, setTeams] = useState({})
  const [teamsList, setTeamsList] = useState([])
  const [bonusQuestions, setBonusQuestions] = useState([])
  const [results, setResults] = useState({})
  const [playoffResults, setPlayoffResults] = useState({})
  const [bonusAnswers, setBonusAnswers] = useState({})
  const [settings, setSettings] = useState({
    playoff_open: false, betting_open: true,
    show_all_predictions: false, group_betting_open: true, bonus_betting_open: true,
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState("settings")
  const [activeGroup, setActiveGroup] = useState('A')
  const [activeRound, setActiveRound] = useState('r16')
  const [profiles, setProfiles] = useState([])
  const [bonusPredictions, setBonusPredictions] = useState({})
  const [activeUser, setActiveUser] = useState(null)
  const [editAnswers, setEditAnswers] = useState({})
  const [newMatch, setNewMatch] = useState({ home_team_id: '', away_team_id: '', match_date: '', stadium: '' })

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchData = async () => {
    setLoading(true)

    const { data: teamsData } = await supabase.from("teams").select("*").order("name")
    const teamsMap = {}
    teamsData?.forEach(t => teamsMap[t.id] = t)
    setTeams(teamsMap)
    setTeamsList(teamsData || [])

    const { data: matchesData } = await supabase
      .from("matches").select("*").eq("round", "group").order("match_date")
    setMatches(matchesData || [])

    const resultsMap = {}
    matchesData?.forEach(m => {
      resultsMap[m.id] = {
        home: m.home_score !== null ? m.home_score.toString() : "",
        away: m.away_score !== null ? m.away_score.toString() : "",
      }
    })
    setResults(resultsMap)

    const { data: playoffMatchesData } = await supabase
      .from("playoff_matches").select("*").order("round").order("position")
    setPlayoffMatches(playoffMatchesData || [])

    const playoffResultsMap = {}
    playoffMatchesData?.forEach(m => {
      playoffResultsMap[m.id] = {
        home: m.home_score !== null ? m.home_score.toString() : "",
        away: m.away_score !== null ? m.away_score.toString() : "",
        winner_id: m.winner_id || "",
      }
    })
    setPlayoffResults(playoffResultsMap)

    const { data: questionsData } = await supabase
      .from("bonus_questions").select("*").order("id")
    setBonusQuestions(questionsData || [])

    const bonusMap = {}
    questionsData?.forEach(q => { if (q.correct_answer) bonusMap[q.id] = q.correct_answer })
    setBonusAnswers(bonusMap)

    const { data: settingsData } = await supabase.from("app_settings").select("*").single()
    if (settingsData) setSettings(settingsData)

    const { data: profilesData } = await supabase.from("profiles").select("*").order("username")
    setProfiles(profilesData || [])
    if (profilesData?.length > 0 && !activeUser) setActiveUser(profilesData[0].id)

    const { data: bonusPredsData } = await supabase.from("bonus_predictions").select("*")
    const bonusPredMap = {}
    const editMap = {}
    bonusPredsData?.forEach(p => {
      if (!bonusPredMap[p.user_id]) bonusPredMap[p.user_id] = {}
      bonusPredMap[p.user_id][p.question_id] = { answer: p.answer, id: p.id }
      if (!editMap[p.user_id]) editMap[p.user_id] = {}
      editMap[p.user_id][p.question_id] = p.answer
    })
    setBonusPredictions(bonusPredMap)
    setEditAnswers(editMap)

    setLoading(false)
  }

  const saveSettings = async () => {
    const { error } = await supabase.from("app_settings")
      .update({
        playoff_open: settings.playoff_open,
        betting_open: settings.betting_open,
        show_all_predictions: settings.show_all_predictions,
        group_betting_open: settings.group_betting_open,
        bonus_betting_open: settings.bonus_betting_open,
      }).eq("id", 1)
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
    const { error } = await supabase.from("matches")
      .update({ home_score: parseInt(result.home), away_score: parseInt(result.away), status: "finished" })
      .eq("id", matchId)
    if (error) { setMessage("❌ Noe gikk galt") }
    else {
      await updateMatchPoints(matchId, parseInt(result.home), parseInt(result.away))
      setMessage("✅ Resultat lagret og poeng oppdatert!")
    }
    setTimeout(() => setMessage(""), 4000)
  }

  const updateMatchPoints = async (matchId, homeScore, awayScore) => {
    const { data: predictions } = await supabase
      .from("match_predictions").select("*").eq("match_id", matchId)
    for (const pred of predictions || []) {
      let points = 0
      if (pred.home_score === homeScore && pred.away_score === awayScore) {
        points = 3
      } else {
        const actualWinner = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
        const predWinner = pred.home_score > pred.away_score ? "home" : pred.away_score > pred.home_score ? "away" : "draw"
        if (actualWinner === predWinner) points = 1
      }
      await supabase.from("match_predictions").update({ points_awarded: points }).eq("id", pred.id)
    }
  }

  const savePlayoffResult = async (matchId) => {
    const result = playoffResults[matchId]
    if (!result || result.home === "" || result.away === "") {
      setMessage("❌ Fyll inn begge scorene!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    const match = playoffMatches.find(m => m.id === matchId)
    const homeScore = parseInt(result.home)
    const awayScore = parseInt(result.away)

    let winnerId = result.winner_id || null
    if (homeScore !== awayScore) {
      winnerId = homeScore > awayScore ? match.home_team_id : match.away_team_id
    }

    const { error } = await supabase.from("playoff_matches")
      .update({ home_score: homeScore, away_score: awayScore, winner_id: winnerId, status: "finished" })
      .eq("id", matchId)

    if (error) { setMessage("❌ Noe gikk galt") }
    else {
      await updatePlayoffPoints(match, homeScore, awayScore, winnerId)
      setMessage("✅ Resultat lagret og poeng oppdatert!")
    }
    setTimeout(() => setMessage(""), 4000)
  }

  const updatePlayoffPoints = async (match, homeScore, awayScore, actualWinnerId) => {
    const matchKey = String(match.id)

    const r16Sorted = playoffMatches
      .filter(m => m.round === 'r16')
      .sort((a, b) => a.position - b.position)

    const r16Index = r16Sorted.findIndex(m => m.id === match.id)

    const { data: predictions } = await supabase
      .from("playoff_predictions")
      .select("*")
      .eq("match_id", matchKey)

    for (const pred of predictions || []) {
      let points = 0

      if (pred.home_score === homeScore && pred.away_score === awayScore) {
        points = 3
      } else {
        const actualOutcome = homeScore > awayScore ? "home" : awayScore > homeScore ? "away" : "draw"
        const predOutcome = pred.home_score > pred.away_score ? "home" : pred.away_score > pred.home_score ? "away" : "draw"
        if (actualOutcome === predOutcome) points = 1
      }

      await supabase.from("playoff_predictions")
        .update({ points_awarded: points })
        .eq("id", pred.id)
    }

    if (actualWinnerId && match.round === 'r16' && r16Index >= 0) {
      await giveR16BonusPoints(r16Index, actualWinnerId, r16Sorted)
    }
  }

  const giveR16BonusPoints = async (r16Index, winnerId, r16Sorted) => {
    const r8Index = R8_BRACKET.findIndex(pair => pair.includes(r16Index))
    if (r8Index === -1) return

    const r8Key = `r8_${r8Index}`

    const { data: r8Preds } = await supabase
      .from("playoff_predictions")
      .select("*")
      .eq("match_id", r8Key)

    for (const pred of r8Preds || []) {
      const pair = R8_BRACKET[r8Index]
      const otherR16Index = pair[0] === r16Index ? pair[1] : pair[0]
      const otherMatch = r16Sorted[otherR16Index]

      if (!otherMatch) continue

      const r16Match = r16Sorted[r16Index]
      const tipperHadWinner = pred.winner_id === winnerId ||
        (pred.home_score > pred.away_score && r16Match.home_team_id === winnerId) ||
        (pred.away_score > pred.home_score && r16Match.away_team_id === winnerId)

      if (tipperHadWinner) {
        const currentPoints = pred.points_awarded || 0
        await supabase.from("playoff_predictions")
          .update({ points_awarded: currentPoints + BONUS_POINTS.r8 })
          .eq("id", pred.id)
      }
    }
  }

  const addPlayoffMatch = async () => {
    if (!newMatch.home_team_id || !newMatch.away_team_id) {
      setMessage("❌ Velg begge lag!")
      setTimeout(() => setMessage(""), 3000)
      return
    }
    const roundMatches = playoffMatches.filter(m => m.round === activeRound)
    const position = roundMatches.length + 1
    const { error } = await supabase.from("playoff_matches").insert({
      round: activeRound, position,
      home_team_id: parseInt(newMatch.home_team_id),
      away_team_id: parseInt(newMatch.away_team_id),
      match_date: newMatch.match_date || null,
      stadium: newMatch.stadium || null,
    })
    if (error) setMessage("❌ Noe gikk galt")
    else {
      setMessage("✅ Kamp lagt inn!")
      setNewMatch({ home_team_id: '', away_team_id: '', match_date: '', stadium: '' })
      fetchData()
    }
    setTimeout(() => setMessage(""), 3000)
  }

  const deletePlayoffMatch = async (matchId) => {
    await supabase.from("playoff_predictions").delete().eq("match_id", String(matchId))
    await supabase.from("playoff_matches").delete().eq("id", matchId)
    setMessage("✅ Kamp slettet!")
    setTimeout(() => setMessage(""), 3000)
    fetchData()
  }

  const saveBonusAnswer = async (questionId) => {
    const answer = bonusAnswers[questionId]
    if (!answer || answer.trim() === "") {
      setMessage("❌ Fyll inn riktig svar!")
      setTimeout(() => setMessage(""), 3000)
      return
    }
    const { error } = await supabase.from("bonus_questions")
      .update({ correct_answer: answer.trim() }).eq("id", questionId)
    if (error) { setMessage("❌ Noe gikk galt") }
    else {
      await updateBonusPoints(questionId, answer.trim())
      setMessage("✅ Svar lagret og poeng oppdatert!")
    }
    setTimeout(() => setMessage(""), 4000)
  }

  const clearBonusAnswer = async (questionId) => {
    const { error } = await supabase.from("bonus_questions")
      .update({ correct_answer: null }).eq("id", questionId)
    if (error) { setMessage("❌ Noe gikk galt") }
    else {
      // Nullstill poeng for dette spørsmålet
      await supabase.from("bonus_predictions")
        .update({ points_awarded: 0 }).eq("question_id", questionId)
      setBonusAnswers(prev => {
        const updated = { ...prev }
        delete updated[questionId]
        return updated
      })
      setMessage("✅ Fasit fjernet og poeng nullstilt!")
      fetchData()
    }
    setTimeout(() => setMessage(""), 3000)
  }

  const updateBonusPoints = async (questionId, correctAnswer) => {
    const { data: question } = await supabase.from("bonus_questions")
      .select("*").eq("id", questionId).single()
    const { data: predictions } = await supabase.from("bonus_predictions")
      .select("*").eq("question_id", questionId)
    for (const pred of predictions || []) {
      let points = 0
      if (question.question_type === "number") {
        const predNum = parseInt(pred.answer)
        const correctNum = parseInt(correctAnswer)
        if (predNum === correctNum) points = question.points
        else if (Math.abs(predNum - correctNum) === 1) points = Math.floor(question.points / 2)
      } else {
        if (pred.answer.toLowerCase() === correctAnswer.toLowerCase()) points = question.points
      }
      await supabase.from("bonus_predictions").update({ points_awarded: points }).eq("id", pred.id)
    }
  }

  const updateUserBonusAnswer = async (userId, questionId) => {
    const newAnswer = editAnswers[userId]?.[questionId] || ""
    const { error } = await supabase.from("bonus_predictions")
      .upsert({ user_id: userId, question_id: questionId, answer: newAnswer },
        { onConflict: "user_id,question_id" })
    if (error) setMessage("❌ Noe gikk galt")
    else setMessage("✅ Svar oppdatert!")
    setTimeout(() => setMessage(""), 3000)
  }

  const giveManualPoints = async (userId, questionId, points) => {
    const { error } = await supabase.from("bonus_predictions")
      .update({ points_awarded: points })
      .eq("user_id", userId).eq("question_id", questionId)
    if (error) setMessage("❌ Noe gikk galt")
    else setMessage(`✅ ${points} poeng gitt!`)
    setTimeout(() => setMessage(""), 3000)
  }

  const groupMatches = matches.filter(m => m.group_letter === activeGroup)
  const roundPlayoffMatches = playoffMatches.filter(m => m.round === activeRound)
  const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']

  const formatDate = (dateStr) => {
    if (!dateStr) return ""
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
          { id: "matches", label: "⚽ Gruppespill" },
          { id: "playoff", label: "🏆 Sluttspill" },
          { id: "bonus", label: "🎯 Bonussvar" },
          { id: "userbonustips", label: "👥 Brukertips" },
        ].map(t => (
          <button key={t.id}
            style={{ ...styles.tab, ...(activeTab === t.id ? styles.activeTab : {}) }}
            onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "settings" && (
        <div style={styles.settingsCard}>
          <h3 style={styles.sectionTitle}>Konkurranseinnstillinger</h3>
          {[
            { key: 'group_betting_open', label: '⚽ Gruppespill-tipping åpen', desc: 'Slå av når VM starter 11. juni' },
            { key: 'bonus_betting_open', label: '🎯 Bonusspørsmål-tipping åpen', desc: 'Slå av når VM starter 11. juni' },
            { key: 'playoff_open', label: '🏆 Sluttspill-tipping åpen', desc: 'Slå på etter gruppespillet er ferdig' },
            { key: 'show_all_predictions', label: '👀 Vis alles tips', desc: 'Slå på etter tippefristen' },
          ].map(s => (
            <div key={s.key} style={styles.settingRow}>
              <div>
                <div style={styles.settingLabel}>{s.label}</div>
                <div style={styles.settingDesc}>{s.desc}</div>
              </div>
              <button
                style={{ ...styles.toggle, ...(settings[s.key] ? styles.toggleOn : styles.toggleOff) }}
                onClick={() => setSettings(prev => ({ ...prev, [s.key]: !prev[s.key] }))}>
                {settings[s.key] ? "PÅ" : "AV"}
              </button>
            </div>
          ))}
          <button style={styles.saveButton} onClick={saveSettings}>💾 Lagre innstillinger</button>
        </div>
      )}

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
              const result = results[match.id] || { home: "", away: "" }
              const hasResult = result.home !== "" && result.away !== ""
              return (
                <div key={match.id} style={{ ...styles.matchCard, ...(hasResult ? styles.matchCardDone : {}) }}>
                  <div style={styles.matchDate}>{formatDate(match.match_date)}</div>
                  <div style={styles.matchRow}>
                    <div style={styles.team}>
                      <span style={styles.flag}>{home?.flag_emoji}</span>
                      <span style={styles.teamName}>{home?.name}</span>
                    </div>
                    <div style={styles.scoreInputs}>
                      <input style={styles.scoreInput} type="number" min="0" max="20"
                        value={result.home}
                        onChange={e => setResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                        placeholder="-" />
                      <span style={styles.vs}>–</span>
                      <input style={styles.scoreInput} type="number" min="0" max="20"
                        value={result.away}
                        onChange={e => setResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                        placeholder="-" />
                    </div>
                    <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                      <span style={styles.teamName}>{away?.name}</span>
                      <span style={styles.flag}>{away?.flag_emoji}</span>
                    </div>
                  </div>
                  {hasResult && <div style={styles.resultDisplay}>✅ Lagret: {result.home} – {result.away}</div>}
                  <button style={styles.saveButton} onClick={() => saveResult(match.id)}>
                    {hasResult ? "Oppdater resultat" : "Lagre resultat"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "playoff" && (
        <div>
          <div style={styles.groupTabs}>
            {ROUNDS.map(r => (
              <button key={r.id}
                style={{ ...styles.groupTab, ...(activeRound === r.id ? styles.activeGroupTab : {}) }}
                onClick={() => setActiveRound(r.id)}>
                {r.label.split('-')[0]}
              </button>
            ))}
          </div>

          <h3 style={styles.sectionTitle}>{ROUNDS.find(r => r.id === activeRound)?.label}</h3>

          {activeRound === 'r16' && (
            <div style={styles.addMatchCard}>
              <h4 style={styles.addMatchTitle}>➕ Legg inn ny kamp</h4>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', marginBottom: '8px' }}>
                FIFA kampnummer: Kamp 73 = posisjon 1, Kamp 74 = posisjon 2 osv.
              </p>
              <div style={styles.addMatchRow}>
                <select style={styles.select} value={newMatch.home_team_id}
                  onChange={e => setNewMatch(prev => ({ ...prev, home_team_id: e.target.value }))}>
                  <option value="">-- Hjemmelag --</option>
                  {teamsList.map(t => <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>)}
                </select>
                <span style={styles.vs}>vs</span>
                <select style={styles.select} value={newMatch.away_team_id}
                  onChange={e => setNewMatch(prev => ({ ...prev, away_team_id: e.target.value }))}>
                  <option value="">-- Bortelag --</option>
                  {teamsList.map(t => <option key={t.id} value={t.id}>{t.flag_emoji} {t.name}</option>)}
                </select>
              </div>
              <input style={styles.input} type="date" value={newMatch.match_date}
                onChange={e => setNewMatch(prev => ({ ...prev, match_date: e.target.value }))} />
              <input style={styles.input} type="text" placeholder="Stadion (valgfritt)"
                value={newMatch.stadium}
                onChange={e => setNewMatch(prev => ({ ...prev, stadium: e.target.value }))} />
              <button style={styles.saveButton} onClick={addPlayoffMatch}>➕ Legg inn kamp</button>
            </div>
          )}

          <div style={styles.matchList}>
            {roundPlayoffMatches.map((match, index) => {
              const home = teams[match.home_team_id]
              const away = teams[match.away_team_id]
              const result = playoffResults[match.id] || { home: "", away: "", winner_id: "" }
              const hasResult = result.home !== "" && result.away !== ""
              const isDrawn = hasResult && parseInt(result.home) === parseInt(result.away)
              const fifaNum = activeRound === 'r16' ? FIFA_MATCH_NUMBERS[index] : null

              return (
                <div key={match.id} style={{ ...styles.matchCard, ...(hasResult ? styles.matchCardDone : {}) }}>
                  {fifaNum && <div style={styles.matchDate}>Kamp {fifaNum}</div>}
                  <div style={styles.matchRow}>
                    <div style={styles.team}>
                      <span style={styles.flag}>{home?.flag_emoji}</span>
                      <span style={styles.teamName}>{home?.name}</span>
                    </div>
                    <div style={styles.scoreInputs}>
                      <input style={styles.scoreInput} type="number" min="0" max="20"
                        value={result.home}
                        onChange={e => setPlayoffResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], home: e.target.value } }))}
                        placeholder="-" />
                      <span style={styles.vs}>–</span>
                      <input style={styles.scoreInput} type="number" min="0" max="20"
                        value={result.away}
                        onChange={e => setPlayoffResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], away: e.target.value } }))}
                        placeholder="-" />
                    </div>
                    <div style={{ ...styles.team, justifyContent: 'flex-end' }}>
                      <span style={styles.teamName}>{away?.name}</span>
                      <span style={styles.flag}>{away?.flag_emoji}</span>
                    </div>
                  </div>
                  {isDrawn && (
                    <div style={{ marginBottom: '8px' }}>
                      <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', marginBottom: '6px' }}>Hvem gikk videre?</p>
                      <div style={styles.winnerButtons}>
                        <button
                          style={{ ...styles.winnerButton, ...(result.winner_id === match.home_team_id ? styles.winnerActive : {}) }}
                          onClick={() => setPlayoffResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], winner_id: match.home_team_id } }))}>
                          {home?.flag_emoji} {home?.name}
                        </button>
                        <button
                          style={{ ...styles.winnerButton, ...(result.winner_id === match.away_team_id ? styles.winnerActive : {}) }}
                          onClick={() => setPlayoffResults(prev => ({ ...prev, [match.id]: { ...prev[match.id], winner_id: match.away_team_id } }))}>
                          {away?.flag_emoji} {away?.name}
                        </button>
                      </div>
                    </div>
                  )}
                  {hasResult && <div style={styles.resultDisplay}>✅ Lagret: {result.home} – {result.away}</div>}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button style={{ ...styles.saveButton, flex: 1 }} onClick={() => savePlayoffResult(match.id)}>
                      {hasResult ? "Oppdater resultat" : "Lagre resultat"}
                    </button>
                    <button style={styles.deleteButton} onClick={() => deletePlayoffMatch(match.id)}>🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {activeTab === "bonus" && (
        <div style={styles.questions}>
          {bonusQuestions.map((q, index) => (
            <div key={q.id} style={{ ...styles.questionCard, ...(q.correct_answer ? styles.questionCardDone : {}) }}>
              <div style={styles.questionHeader}>
                <span style={styles.questionNumber}>#{index + 1}</span>
                <span style={styles.points}>{q.points} poeng</span>
              </div>
              <p style={styles.questionText}>{q.question}</p>
              {q.correct_answer && <div style={styles.correctAnswerDisplay}>✅ Riktig svar: {q.correct_answer}</div>}
              <input style={styles.input} type="text" placeholder="Riktig svar..."
                value={bonusAnswers[q.id] || ""}
                onChange={e => setBonusAnswers(prev => ({ ...prev, [q.id]: e.target.value }))} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button style={{ ...styles.saveButton, flex: 1 }} onClick={() => saveBonusAnswer(q.id)}>
                  {q.correct_answer ? "Oppdater svar" : "Lagre svar"}
                </button>
                {q.correct_answer && (
                  <button style={styles.deleteButton} onClick={() => clearBonusAnswer(q.id)}>
                    🗑️ Fjern fasit
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "userbonustips" && (
        <div>
          <div style={styles.userTabs}>
            {profiles.map(p => (
              <button key={p.id}
                style={{ ...styles.userTab, ...(activeUser === p.id ? styles.activeUserTab : {}) }}
                onClick={() => setActiveUser(p.id)}>
                {p.username}
              </button>
            ))}
          </div>
          {activeUser && (
            <div style={styles.questions}>
              {bonusQuestions.map((q, index) => {
                const userAnswer = editAnswers[activeUser]?.[q.id] || ""
                const hasPred = bonusPredictions[activeUser]?.[q.id]
                return (
                  <div key={q.id} style={{ ...styles.questionCard, ...(hasPred ? styles.questionCardDone : {}) }}>
                    <div style={styles.questionHeader}>
                      <span style={styles.questionNumber}>#{index + 1}</span>
                      <span style={styles.points}>{q.points} poeng</span>
                    </div>
                    <p style={styles.questionText}>{q.question}</p>
                    <input style={styles.input} type="text" value={userAnswer} placeholder="Ingen svar"
                      onChange={e => setEditAnswers(prev => ({
                        ...prev, [activeUser]: { ...prev[activeUser], [q.id]: e.target.value }
                      }))} />
                    <div style={styles.buttonRow}>
                      <button style={styles.editButton} onClick={() => updateUserBonusAnswer(activeUser, q.id)}>💾 Lagre</button>
                      <button style={styles.pointsButton} onClick={() => giveManualPoints(activeUser, q.id, q.points)}>✅ {q.points}p</button>
                      <button style={styles.halfPointsButton} onClick={() => giveManualPoints(activeUser, q.id, Math.floor(q.points / 2))}>½ {Math.floor(q.points / 2)}p</button>
                      <button style={styles.zeroButton} onClick={() => giveManualPoints(activeUser, q.id, 0)}>❌ 0p</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  message: { padding: '12px 16px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', marginBottom: '16px', textAlign: 'center' },
  tabs: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { padding: '10px 20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '14px', fontWeight: '500' },
  activeTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  settingsCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' },
  sectionTitle: { color: 'white', fontSize: '16px', marginBottom: '16px' },
  settingRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' },
  settingLabel: { color: 'white', fontSize: '15px', marginBottom: '4px' },
  settingDesc: { color: 'rgba(255,255,255,0.5)', fontSize: '12px' },
  toggle: { padding: '8px 20px', borderRadius: '20px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  toggleOn: { background: '#27ae60', color: 'white' },
  toggleOff: { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' },
  groupTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  groupTab: { padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' },
  activeGroupTab: { background: '#e94560', border: '1px solid #e94560', color: 'white' },
  addMatchCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '16px' },
  addMatchTitle: { color: 'white', fontSize: '15px', marginBottom: '12px', marginTop: 0 },
  addMatchRow: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' },
  matchList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  matchCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.1)' },
  matchCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  matchDate: { color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginBottom: '8px' },
  matchRow: { display: 'flex', alignItems: 'center', gap: '12px', margin: '8px 0' },
  team: { flex: 1, display: 'flex', alignItems: 'center', gap: '8px' },
  flag: { fontSize: '24px' },
  teamName: { color: 'white', fontSize: '14px', fontWeight: '500' },
  scoreInputs: { display: 'flex', alignItems: 'center', gap: '8px' },
  scoreInput: { width: '52px', height: '52px', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '22px', fontWeight: 'bold', textAlign: 'center', outline: 'none' },
  vs: { color: 'rgba(255,255,255,0.4)', fontSize: '18px' },
  resultDisplay: { color: '#27ae60', fontSize: '13px', textAlign: 'center', padding: '6px', background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginBottom: '8px' },
  winnerButtons: { display: 'flex', gap: '8px' },
  winnerButton: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px' },
  winnerActive: { background: 'rgba(233,69,96,0.3)', border: '1px solid #e94560', color: 'white' },
  saveButton: { width: '100%', padding: '10px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' },
  deleteButton: { padding: '10px 14px', borderRadius: '8px', border: 'none', background: 'rgba(233,69,96,0.2)', color: 'white', fontSize: '13px', cursor: 'pointer', marginTop: '8px', whiteSpace: 'nowrap' },
  select: { flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: '#1a1a2e', color: 'white', fontSize: '13px', outline: 'none' },
  input: { width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', fontSize: '15px', marginBottom: '8px', outline: 'none', boxSizing: 'border-box' },
  questions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questionCard: { background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '20px', border: '1px solid rgba(255,255,255,0.1)' },
  questionCardDone: { border: '1px solid rgba(39, 174, 96, 0.3)' },
  questionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  questionNumber: { color: 'rgba(255,255,255,0.4)', fontSize: '13px' },
  points: { background: '#e94560', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  questionText: { color: 'white', fontSize: '16px', marginBottom: '14px', lineHeight: '1.4' },
  correctAnswerDisplay: { color: '#27ae60', fontSize: '13px', padding: '8px 12px', background: 'rgba(39,174,96,0.1)', borderRadius: '6px', marginBottom: '12px' },
  userTabs: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' },
  userTab: { padding: '8px 16px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '13px' },
  activeUserTab: { background: 'rgba(233,69,96,0.3)', border: '1px solid #e94560', color: 'white' },
  buttonRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  editButton: { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '13px', cursor: 'pointer' },
  pointsButton: { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#27ae60', color: 'white', fontSize: '13px', cursor: 'pointer' },
  halfPointsButton: { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: '#f39c12', color: 'white', fontSize: '13px', cursor: 'pointer' },
  zeroButton: { flex: 1, padding: '8px', borderRadius: '8px', border: 'none', background: 'rgba(233,69,96,0.3)', color: 'white', fontSize: '13px', cursor: 'pointer' },
}