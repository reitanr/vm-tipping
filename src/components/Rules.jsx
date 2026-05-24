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
            <div style={styles.roundDesc}>Tipp eksakt resultat på alle 72 gruppespillkamper. Frist: før VM starter 11. juni.</div>
          </div>
          <div style={styles.round}>
            <div style={styles.roundTitle}>Runde 2 – Sluttspill</div>
            <div style={styles.roundDesc}>Etter at gruppespillet er ferdig legges sluttspillkampene ut. Da kan alle tippe på 16-delsfinale, 8-delsfinale, kvartfinale, semifinale, bronsefinale og finale.</div>
          </div>
        </div>

        <h4 style={styles.subTitle}>Poeng per kamp – Gruppespill:</h4>
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

        <h4 style={styles.subTitle}>Poeng per kamp – Sluttspill:</h4>
        <div style={styles.pointsTable}>
          <div style={styles.pointsRow}>
            <span>✅ Eksakt riktig resultat</span>
            <span style={styles.points}>3 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>☑️ Riktig utfall</span>
            <span style={styles.points}>1 poeng</span>
          </div>
          <div style={styles.pointsRow}>
            <span>❌ Feil lag i kampen</span>
            <span style={styles.points}>0 poeng</span>
          </div>
        </div>

        <h4 style={styles.subTitle}>🌟 Bonuspoeng for å tippe riktig lag videre:</h4>
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
          <p style={styles.note}>⚠️ I sluttspillet gjelder kun resultat etter 90 minutter. Ved uavgjort må du også tippe hvem som går videre.</p>
          <p style={styles.note}>⚠️ Tipper du feil lag videre i sluttspillet, får du 0 poeng for den kampen selv om resultatet er riktig.</p>
          <p style={styles.note}>⚠️ Bronsefinalen gir kun poeng for kampresultat, ingen bonuspoeng.</p>
        </div>
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
            <span style={styles.points}>Før 11. juni kl. 21:00</span>
          </div>
          <div style={styles.pointsRow}>
            <span>Bonusspørsmål</span>
            <span style={styles.points}>Før 11. juni kl. 21:00</span>
          </div>
          <div style={styles