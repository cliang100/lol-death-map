require('dotenv').config();
const Bottleneck = require('bottleneck');

const apiKey = process.env.RIOT_API_KEY;

// Riot dev key limits: 20 req/sec, 100 req/2min
const limiter = new Bottleneck({
    reservoir: 95, // slightly under 100 for safety margin
    reservoirRefreshAmount: 95,
    reservoirRefreshInterval: 120 * 1000, // 2 minutes
    maxConcurrent: 15, // slightly under 20/sec burst limit
    minTime: 55, // ~18 req/sec spacing as a floor
});

function limitedFetch(url) {
    return limiter.schedule(() => fetch(url));
}

function msToClock(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function getDeathData(gameName, tagLine) {
    const accountUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`;
    const accountRes = await limitedFetch(accountUrl);
    const account = await accountRes.json();
    const puuid = account.puuid;

    const idsUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${apiKey}`;
    const idsRes = await limitedFetch(idsUrl);
    const matchIds = await idsRes.json();

    if (!idsRes.ok) {
        console.log('MatchIds fetch failed:', idsRes.status, matchIds);
        throw new Error(`Failed to fetch match list for ${gameName}#${tagLine}`);
    }

    const matchResults = await Promise.all(
        matchIds.map(async matchId => {
            const matchRes = await limitedFetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`);
            const match = await matchRes.json();

            if (!matchRes.ok) {
                console.log('Match fetch failed:', matchId, matchRes.status, match);
                return null;
            }

            return { matchId, match };
        })
    );

    const srMatches = matchResults
        .filter(result => result !== null)
        .filter(({ match }) => match.info.mapId === 11);

    const timelineResults = await Promise.all(
        srMatches.map(async ({ matchId, match }) => {
            const timelineRes = await limitedFetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline?api_key=${apiKey}`);
            const timeline = await timelineRes.json();

            if (!timelineRes.ok) {
                console.log('Timeline fetch failed:', matchId, timelineRes.status, timeline);
                return null;
            }

            return { matchId, match, timeline };
        })
    );

    const validResults = timelineResults.filter(result => result !== null);
    const allDeaths = [];

    for (const { matchId, match, timeline } of validResults) {
        const me = match.info.participants.find(p => p.puuid === puuid);
        const myId = me.participantId;

        const idToChamp = {};
        match.info.participants.forEach(p => {
            idToChamp[p.participantId] = p.championName;
        });

        const kills = timeline.info.frames
            .flatMap(frame => frame.events)
            .filter(event => event.type === 'CHAMPION_KILL');

        const myDeaths = kills.filter(k => k.victimId === myId);

        myDeaths.forEach(d => {
            allDeaths.push({
                time: msToClock(d.timestamp),
                x: d.position.x,
                y: d.position.y,
                killedBy: idToChamp[d.killerId],
                matchId: matchId,
            });
        });
    }

    return allDeaths;
}

module.exports = { getDeathData };

if (require.main === module) {
    console.time('getDeathData');
    getDeathData('Senyuuto', 'FAKER').then(deaths => {
        console.log(deaths);
        console.timeEnd('getDeathData');
    });
}