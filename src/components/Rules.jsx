import { useState, useEffect } from "react"
import { supabase } from "../supabaseClient"

export default function Rules() {
  const [participantCount, setParticipantCount] = useState(0)

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("*", { count: 'exact', head: true })
      setParticipantCount(count || 0)
    }
    fetchCount()
  }, [])

  const pot = participantCount * 200
  const first = Math.round(pot * 0.7)
  const second = Math.round(pot * 0.2)
  const third = Math.round(pot * 0.1)

  return (
    <div>
      <h2 style={styles.title}>📋 Regler</h2>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>🏆 Om konkurransen</h3>
        <p style={styles.text}>
          Velkommen til VM-tipping 2026! Tipp på alle kamper og bonusspørsmål for å samle flest mulig poeng.
          Konkurransen koster <strong style={styles.highlight}>200 kr per person</strong> å delta i.
        </p>
        <div style={styles.prizeBox}>
          <h4 style={styles.prizeTitle}>💰 Premiepott</h4>
          <div style={styles.prizeInfo}>
            {participantCount} deltakere × 200 kr = <strong style={styles.highlight}>{pot} kr</strong>
          </div>
          <div style={styles.prizeRow}>
            <span>🥇 1. plass (70%)</span>
            <span style={styles.prizeAmount}>{first} kr</span>
          </div>
          <div style={styles.prizeRow}>
            <span>🥈 2. plass (20%)</span>
            <span style={styles.prizeAmount}>{second} kr</span>
          </div>
          <div style={styles.prizeRow}>
            <span>🥉 3. plass (10%)</span>
            <span style={styles.prizeAmount}>{third} kr</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>⚽ Kampresultater</h3>
        <p style={styles.text}>Det er to runder med tipping av kampresultater:</p>
        <div style={styles.roundBox}>
          <div style={styles.round}>
            <div style={styles.roundTitle}>Runde 1 – Gruppespill</div>
            <div style={styles.roundDesc}>Tipp eksakt resultat på alle 72 gruppespillkamper. Frist: 10. juni kl. 20:00.</div>
          </div>
          <div style={styles.round}>
            <div style={styles.roundTitle}>Runde 2 – Sluttspill</div>
            <div style={styles.roundDesc}>Etter at gruppespillet er ferdig legges sluttspillkampene ut. Da kan alle tippe på 16-delsfinale, 8-delsfinale, kvartfinale, semifinale, bronsefinale og finale.</div>
          </div>
        </div>

        <h4 style={styles.subTitle}>Poeng per kamp – Gruppespill:</h4>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Eksakt riktig resultat</span>
            <span style={styles.points}>3 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig utfall (seier/uavgjort/tap)</span>
            <span style={styles.points}>1 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Feil utfall</span>
            <span style={styles.points}>0 poeng</span>
          </div>
        </div>

        <h4 style={styles.subTitle}>Poeng per kamp – Sluttspill:</h4>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Eksakt riktig resultat</span>
            <span style={styles.points}>3 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig utfall</span>
            <span style={styles.points}>1 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Feil lag i kampen</span>
            <span style={styles.points}>0 poeng</span>
          </div>
        </div>

        <h4 style={styles.subTitle}>Bonuspoeng for riktig lag videre:</h4>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Riktig lag i 8-delsfinale</span>
            <span style={styles.points}>+1 poeng per lag</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig lag i kvartfinale</span>
            <span style={styles.points}>+2 poeng per lag</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig lag i semifinale</span>
            <span style={styles.points}>+3 poeng per lag</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig finalist</span>
            <span style={styles.points}>+4 poeng per lag</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Riktig VM-vinner</span>
            <span style={styles.points}>+5 poeng</span>
          </div>
        </div>

        <div style={styles.noteBox}>
          <p style={styles.note}>I sluttspillet gjelder kun resultat etter 90 minutter. Ved uavgjort må du også tippe hvem som går videre.</p>
          <p style={styles.note}>Tipper du feil lag videre i sluttspillet, får du 0 poeng for den kampen selv om resultatet er riktig.</p>
          <p style={styles.note}>Bronsefinalen gir kun poeng for kampresultat, ingen bonuspoeng.</p>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>🎯 Bonusspørsmål</h3>
        <p style={styles.text}>
          Bonusspørsmål gir varierende antall poeng avhengig av vanskelighetsgrad. Poeng settes av administrator etter at svaret er kjent.
        </p>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Toppscorer VM</span>
            <span style={styles.points}>10 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Beste spiller VM (MVP)</span>
            <span style={styles.points}>8 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Norges/Englands toppscorer</span>
            <span style={styles.points}>6 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Haaland antall mål (eksakt)</span>
            <span style={styles.points}>6 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Norges første målscorer</span>
            <span style={styles.points}>5 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Beste keeper, flest mål, antall mål/kort</span>
            <span style={styles.points}>4-5 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Ja/Nei spørsmål</span>
            <span style={styles.points}>2-3 poeng</span>
          </div>
        </div>
        <p style={styles.note}>For tallspørsmål får du halve poengene hvis du er pluss/minus 1 fra riktig svar.</p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>⏰ Frister</h3>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Gruppespill-tipping</span>
            <span style={styles.points}>10. juni kl. 20:00</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Bonusspørsmål</span>
            <span style={styles.points}>10. juni kl. 20:00</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Sluttspill-tipping</span>
            <span style={styles.points}>Åpnes etter gruppespillet</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  title: { color: 'white', fontSize: '22px', marginBottom: '20px' },
  card: {
    background: 'rgba(255,255,255,0.05)', borderRadius: '12px',
    padding: '20px', border: '1px solid rgba(255,255,255,0.1)',
    marginBottom: '16px',
  },
  sectionTitle: { color: 'white', fontSize: '17px', marginBottom: '12px', marginTop: 0 },
  subTitle: { color: 'white', fontSize: '15px', marginBottom: '10px', marginTop: '16px' },
  text: { color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: '1.6', marginBottom: '12px' },
  highlight: { color: '#e94560' },
  prizeBox: {
    background: 'rgba(255,215,0,0.05)', borderRadius: '8px',
    padding: '16px', border: '1px solid rgba(255,215,0,0.2)', marginTop: '12px',
  },
  prizeTitle: { color: 'gold', fontSize: '15px', marginBottom: '8px', marginTop: 0 },
  prizeInfo: {
    color: 'rgba(255,255,255,0.7)', fontSize: '13px',
    marginBottom: '12px', textAlign: 'center',
  },
  prizeRow: {
    display: 'flex', justifyContent: 'space-between',
    padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)',
    color: 'rgba(255,255,255,0.8)', fontSize: '14px',
  },
  prizeAmount: { color: 'gold', fontWeight: 'bold' },
  roundBox: { display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' },
  round: {
    background: 'rgba(233,69,96,0.1)', borderRadius: '8px',
    padding: '12px', border: '1px solid rgba(233,69,96,0.2)',
  },
  roundTitle: { color: '#e94560', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' },
  roundDesc: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.5' },
  pointsTable: { display: 'flex', flexDirection: 'column', gap: '4px' },
  pointsRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 12px', background: 'rgba(255,255,255,0.03)',
    borderRadius: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '14px',
  },
  points: { color: '#e94560', fontWeight: 'bold', fontSize: '14px' },
  noteBox: { marginTop: '16px' },
  note: {
    color: 'rgba(255,255,255,0.5)', fontSize: '13px',
    marginBottom: '8px', lineHeight: '1.5', fontStyle: 'italic',
  },
}