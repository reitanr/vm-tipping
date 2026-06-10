import { useState, useEffect, useRef } from "react"
import { supabase } from "../supabaseClient"

const EMOJIS = ["👍", "❤️", "😂", "🔥", "⚽", "🏆", "😮", "👏", "🎯", "🇳🇴", "🏴󠁧󠁢󠁥󠁮󠁧󠁿"]

export default function Chat({ session }) {
  const [messages, setMessages] = useState([])
  const [profiles, setProfiles] = useState({})
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showEmojis, setShowEmojis] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchData()

    const channel = supabase
      .channel('chat')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages'
      }, payload => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchData = async () => {
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("*")
    const profilesMap = {}
    profilesData?.forEach(p => profilesMap[p.id] = p)
    setProfiles(profilesMap)

    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at")
      .limit(100)
    setMessages(messagesData || [])
    setLoading(false)
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    setSending(true)

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        user_id: session.user.id,
        message: newMessage.trim(),
      })

    if (!error) setNewMessage("")
    setSending(false)
    setShowEmojis(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const addEmoji = (emoji) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojis(false)
  }

  const deleteMessage = async (messageId) => {
    await supabase.from("chat_messages").delete().eq("id", messageId)
    setMessages(prev => prev.filter(m => m.id !== messageId))
  }

  const formatTime = (dateStr) => {
    const date = new Date(dateStr)
    return date.toLocaleString('nb-NO', {
      day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const isMyMessage = (msg) => msg.user_id === session.user.id
  const isAdmin = profiles[session.user.id]?.is_admin

  if (loading) return <div style={styles.loading}>Laster chat...</div>

  return (
    <div>
      <h2 style={styles.title}>💬 Chat</h2>
      <p style={styles.subtitle}>Snakk med de andre deltakerne!</p>

      {/* Input øverst */}
      <div style={styles.inputArea}>
        {showEmojis && (
          <div style={styles.emojiPicker}>
            {EMOJIS.map(emoji => (
              <button key={emoji} style={styles.emojiBtn} onClick={() => addEmoji(emoji)}>
                {emoji}
              </button>
            ))}
          </div>
        )}
        <div style={styles.inputRow}>
          <button style={styles.emojiToggle} onClick={() => setShowEmojis(!showEmojis)}>
            😊
          </button>
          <input
            style={styles.input}
            type="text"
            placeholder="Skriv en melding..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button
            style={{ ...styles.sendBtn, opacity: sending || !newMessage.trim() ? 0.5 : 1 }}
            onClick={sendMessage}
            disabled={sending || !newMessage.trim()}
          >
            ➤
          </button>
        </div>
      </div>

      {/* Meldinger under */}
      <div style={styles.messageList}>
        {messages.length === 0 && (
          <div style={styles.empty}>Ingen meldinger ennå – vær den første! 👋</div>
        )}
        {messages.map(msg => {
          const profile = profiles[msg.user_id]
          const mine = isMyMessage(msg)
          return (
            <div key={msg.id} style={{ ...styles.messageRow, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              {!mine && (
                <div style={styles.avatar}>
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <div style={{ maxWidth: '70%' }}>
                {!mine && (
                  <div style={styles.senderName}>{profile?.username || 'Ukjent'}</div>
                )}
                <div style={{ ...styles.bubble, ...(mine ? styles.myBubble : styles.theirBubble) }}>
                  <span style={styles.messageText}>{msg.message}</span>
                  {(mine || isAdmin) && (
                    <button style={styles.deleteBtn} onClick={() => deleteMessage(msg.id)}>×</button>
                  )}
                </div>
                <div style={{ ...styles.time, textAlign: mine ? 'right' : 'left' }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
              {mine && (
                <div style={{ ...styles.avatar, background: 'rgba(233,69,96,0.3)' }}>
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '4px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '16px' },
  loading: { color: 'white', textAlign: 'center', padding: '40px' },
  empty: { color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px', fontSize: '15px' },
  inputArea: { marginBottom: '16px' },
  emojiPicker: {
    display: 'flex', flexWrap: 'wrap', gap: '8px',
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '12px', marginBottom: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  emojiBtn: { background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px' },
  inputRow: { display: 'flex', gap: '8px', alignItems: 'center' },
  emojiToggle: { background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '4px' },
  input: {
    flex: 1, padding: '12px 16px', borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)',
    color: 'white', fontSize: '15px', outline: 'none',
  },
  sendBtn: {
    width: '44px', height: '44px', borderRadius: '50%', border: 'none',
    background: '#e94560', color: 'white', fontSize: '18px',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  messageList: {
    display: 'flex', flexDirection: 'column', gap: '12px',
    padding: '8px',
  },
  messageRow: { display: 'flex', alignItems: 'flex-end', gap: '8px' },
  avatar: {
    width: '32px', height: '32px', borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: '14px', fontWeight: 'bold', flexShrink: 0,
  },
  senderName: { color: 'rgba(255,255,255,0.5)', fontSize: '11px', marginBottom: '4px', paddingLeft: '4px' },
  bubble: {
    padding: '10px 14px', borderRadius: '18px',
    display: 'flex', alignItems: 'center', gap: '8px',
  },
  myBubble: { background: '#e94560', borderBottomRightRadius: '4px' },
  theirBubble: { background: 'rgba(255,255,255,0.1)', borderBottomLeftRadius: '4px' },
  messageText: { color: 'white', fontSize: '15px', lineHeight: '1.4', wordBreak: 'break-word' },
  deleteBtn: {
    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)',
    cursor: 'pointer', fontSize: '16px', padding: '0', lineHeight: 1, flexShrink: 0,
  },
  time: { color: 'rgba(255,255,255,0.3)', fontSize: '10px', marginTop: '4px', paddingLeft: '4px' },
}