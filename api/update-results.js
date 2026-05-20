const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY
const VM_2026_ID = 1 // VM 2026 tournament ID i API-Football

async function fetchLiveAndFinishedMatches() {
  const response = await fetch(
    `https://v3.football.api-sports.io/fixtures?league=${VM_2026_ID}&season=2026&status=FT`,
    {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY
      }
    }
  )
  const data = await response.json()
  return data.response || []
}

async function updateMatchResult(apiMatch) {
  const homeScore = apiMatch.goals.home
  const awayScore = apiMatch.goals.away
  const apiId = apiMatch.fixture.id

  // Finn kampen i databasen via api_football_id
  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('api_football_id', apiId)
    .single()

  if (!match) return

  // Ikke oppdater hvis allerede ferdig med samme resultat
  if (match.home_score === homeScore && match.away_score === awayScore) return

  // Oppdater resultat
  await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished'
    })
    .eq('id', match.id)

  // Oppdater poeng for alle som tippet denne kampen
  await updateMatchPoints(match.id, homeScore, awayScore)

  console.log(`Updated: ${match.id} - ${homeScore}:${awayScore}`)
}

async function updateMatchPoints(matchId, homeScore, awayScore) {
  const { data: predictions } = await supabase
    .from('match_predictions')
    .select('*')
    .eq('match_id', matchId)

  for (const pred of predictions || []) {
    let points = 0
    if (pred.home_score === homeScore && pred.away_score === awayScore) {
      points = 3
    } else {
      const actualWinner = homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw'
      const predWinner = pred.home_score > pred.away_score ? 'home' : pred.away_score > pred.home_score ? 'away' : 'draw'
      if (actualWinner === predWinner) points = 1
    }

    await supabase
      .from('match_predictions')
      .update({ points_awarded: points })
      .eq('id', pred.id)
  }
}

module.exports = async (req, res) => {
  try {
    const matches = await fetchLiveAndFinishedMatches()
    console.log(`Found ${matches.length} finished matches`)

    for (const match of matches) {
      await updateMatchResult(match)
    }

    res.status(200).json({ success: true, updated: matches.length })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: error.message })
  }
}