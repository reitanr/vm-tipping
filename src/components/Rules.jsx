export default function Rules() {
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
          <div style={styles.prizeRow}>
            <span>🥇 1. plass</span>
            <span style={styles.prizeAmount}>70% av potten</span>
          </div>
          <div style={styles.prizeRow}>
            <span>🥈 2. plass</span>
            <span style={styles.prizeAmount}>20% av potten</span>
          </div>
          <div style={styles.prizeRow}>
            <span>🥉 3. plass</span>
            <span style={styles.prizeAmount}>10% av potten</span>
          </div>
        </div>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>⚽ Kampresultater</h3>
        <p style={styles.text}>
          Det er to runder med tipping av kampresultater:
        </p>
        <div style={styles.roundBox}>
          <div style={styles.round}>
            <div style={styles.roundTitle}>Runde 1 – Gruppespill</div>
            <div style={styles.roundDesc}>Tippe eksakt resultat på alle 72 gruppespillkamper. Frist: før VM starter 11. juni.</div>
          </div>
          <div style={styles.round}>
            <div style={styles.roundTitle}>Runde 2 – Sluttspill</div>
            <div style={styles.roundDesc}>Etter at gruppespillet er ferdig legges sluttspillkampene ut. Da kan alle tippe på 16-delsfinale, kvartfinale, semifinale og finale.</div>
          </div>
        </div>

        <h4 style={styles.subTitle}>Poeng per kamp:</h4>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>✅ Eksakt riktig resultat</span>
            <span style={styles.points}>3 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>☑️ Riktig utfall (seier/uavgjort/tap)</span>
            <span style={styles.points}>1 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>❌ Feil utfall</span>
            <span style={styles.points}>0 poeng</span>
          </div>
        </div>

        <p style={styles.note}>
          ⚠️ I sluttspillet gjelder kun resultat etter 90 minutter. Ved uavgjort må du også tippe hvem som går videre – dette gir ekstrapoeng.
        </p>
        <p style={styles.note}>
          ⚠️ Tipper du feil lag videre i sluttspillet, får du 0 poeng for den kampen selv om resultatet er riktig.
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>🎯 Bonusspørsmål</h3>
        <p style={styles.text}>
          I tillegg til kampresultater er det en rekke bonusspørsmål. Disse gir varierende antall poeng avhengig av vanskelighetsgrad. Poeng for bonusspørsmål settes av administrator etter at svaret er kjent.
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
        <p style={styles.note}>
          💡 For tallspørsmål (f.eks. antall mål) får du halve poengene hvis du er ±1 fra riktig svar.
        </p>
      </div>

      <div style={styles.card}>
        <h3 style={styles.sectionTitle}>⏰ Frister</h3>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>Gruppespill-tipping</span>
            <span style={styles.points}>Før 11. juni</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Bonusspørsmål</span>
            <span style={styles.points}>Før 11. juni</span>
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
  prizeTitle: { color: 'gold', fontSize: '15px', marginBottom: '12px', marginTop: 0 },
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
  note: {
    color: 'rgba(255,255,255,0.5)', fontSize: '13px',
    marginTop: '12px', lineHeight: '1.5', fontStyle: 'italic',
  },
}