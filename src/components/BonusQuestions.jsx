import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function BonusQuestions({ session }) {
  const [questions, setQuestions] = useState([])
  const [players, setPlayers] = useState([])
  const [teams, setTeams] = useState([])
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: questionsData } = await supabase
      .from("bonus_questions")
      .select("*")
      .order("id")
    setQuestions(questionsData || [])

    const { data: playersData } = await supabase
      .from("players")
      .select("*, teams(name, flag_emoji, group_letter)")
      .order("team_id")
    setPlayers(playersData || [])

    const { data: teamsData } = await supabase
      .from("teams")
      .select("*")
      .order("name")
    setTeams(teamsData || [])

    const { data: answersData } = await supabase
      .from("bonus_predictions")
      .select("*")
      .eq("user_id", session.user.id)

    const answersMap = {}
    answersData?.forEach(a => {
      answersMap[a.question_id] = a.answer
    })
    setAnswers(answersMap)
    setLoading(false)
  }

  const saveAnswer = async (questionId) => {
    const answer = answers[questionId]
    if (!answer || answer.trim() === "") {
      setMessage("❌ Du må fylle inn et svar!")
      setTimeout(() => setMessage(""), 3000)
      return
    }

    setSaving(prev => ({ ...prev, [questionId]: true }))

    const { error } = await supabase
      .from("bonus_predictions")
      .upsert({
        user_id: session.user.id,
        question_id: questionId,
        answer: answer.trim(),
      }, { onConflict: "user_id,question_id" })

    if (error) setMessage("❌ Noe gikk galt, prøv igjen")
    else setMessage("✅ Svar lagret!")
    setTimeout(() => setMessage(""), 3000)
    setSaving(prev => ({ ...prev, [questionId]: false }))
  }

  const handleFocus = (e) => {
    setTimeout(() => {
      e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }

  const renderInput = (question) => {
    const value = answers[question.id] || ""

    if (question.question_type === "yesno") {
      return (
        <div style={styles.yesNoRow}>
          {["Ja", "Nei"].map(opt => (
            <button
              key={opt}
              style={{
                ...styles.yesNoButton,
                ...(value === opt ? styles.yesNoActive : {})
              }}
              onClick={() => setAnswers(prev => ({ ...prev, [question.id]: opt }))}
            >
              {opt === "Ja" ? "✅ Ja" : "❌ Nei"}
            </button>
          ))}
        </div>
      )
    }

    if (question.question_type === "select" && question.options) {
      return (
        <select
          style={styles.select}
          value={value}
          onFocus={handleFocus}
          onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
        >
          <option value="">-- Velg kamp --</option>
          {question.options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )
    }

    if (question.question_type === "player") {
      return (
        <select
          style={styles.select}
          value={value}
          onFocus={handleFocus}
          onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
        >
          <option value="">-- Velg spiller --</option>
          {players
            .sort((a, b) => {
              if (a.team_id !== b.team_id) return a.team_id - b.team_id
              const lastA = a.name.split(' ').pop()
              const lastB = b.name.split(' ').pop()
              return lastA.localeCompare(lastB)
            })
            .map(p => (
              <option key={p.id} value={p.name}>
                {p.teams?.flag_emoji} {p.name} ({p.teams?.name})
              </option>
            ))
          }
        </select>
      )
    }

    if (question.question_type === "team") {
      return (
        <select
          style={styles.select}
          value={value}
          onFocus={handleFocus}
          onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
        >
          <option value="">-- Velg lag --</option>
          {teams.map(t => (
            <option key={t.id} value={t.name}>
              {t.flag_emoji} {t.name}
            </option>
          ))}
        </select>
      )
    }

    return (
      <input
        style={styles.input}
        type={question.question_type === "number" ? "number" : "text"}
        placeholder={question.question_type === "number" ? "Skriv et tall..." : "Skriv ditt svar..."}
        value={value}
        onFocus={handleFocus}
        onChange={e => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
      />
    )
  }

  if (loading) return <div style={styles.loading}>Laster spørsmål...</div>

  return (
    <div>
      <h2 style={styles.title}>🎯 Bonusspørsmål</h2>
      <p style={styles.subtitle}>Svar på alle spørsmålene for ekstrapoeng!</p>

      {message && <div style={styles.message}>{message}</div>}

      <div style={styles.questions}>
        {questions.map((q, index) => (
          <div key={q.id} style={styles.questionCard}>
            <div style={styles.questionHeader}>
              <span style={styles.questionNumber}>#{index + 1}</span>
              <span style={styles.points}>{q.points} poeng</span>
            </div>
            <p style={styles.questionText}>{q.question}</p>

            {renderInput(q)}

            <button
              style={{ ...styles.saveButton, opacity: saving[q.id] ? 0.6 : 1 }}
              onClick={() => saveAnswer(q.id)}
              disabled={saving[q.id]}
            >
              {saving[q.id] ? "Lagrer..." : answers[q.id] ? "✅ Oppdater svar" : "Lagre svar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '8px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '20px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  message: {
    padding: '12px 16px', borderRadius: '8px',
    background: 'rgba(255,255,255,0.1)', color: 'white',
    marginBottom: '16px', textAlign: 'center',
  },
  questions: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questionCard: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '20px', border: '1px solid rgba(255,255,255,0.1)',
  },
  questionHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: '10px',
  },
  questionNumber: { color: 'rgba(255,255,255,0.4)', fontSize: '13px' },
  points: {
    background: '#e94560', color: 'white', padding: '3px 10px',
    borderRadius: '20px', fontSize: '12px', fontWeight: 'bold',
  },
  questionText: { color: 'white', fontSize: '16px', marginBottom: '14px', lineHeight: '1.4' },
  yesNoRow: { display: 'flex', gap: '10px', marginBottom: '12px' },
  yesNoButton: {
    flex: 1, padding: '12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'transparent',
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '15px',
  },
  yesNoActive: {
    background: 'rgba(233,69,96,0.3)',
    border: '1px solid #e94560', color: 'white',
  },
  select: {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: '#1a1a2e',
    color: 'white', fontSize: '15px', marginBottom: '12px', outline: 'none',
  },
  input: {
    width: '100%', padding: '12px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: '15px', marginBottom: '12px',
    outline: 'none', boxSizing: 'border-box',
  },
  saveButton: {
    width: '100%', padding: '10px', borderRadius: '8px', border: 'none',
    background: 'linear-gradient(135deg, #e94560, #c62a47)', color: 'white',
    fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
  },
}