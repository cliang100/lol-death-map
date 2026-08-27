require('dotenv').config();

const apiKey = process.env.RIOT_API_KEY;

function msToClock(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

async function getDeathData(gameName, tagLine) {
    // Get puuid
    const accountUrl = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`;
    const accountRes = await fetch(accountUrl);
    const account = await accountRes.json();
    console.log(account);
    const puuid = account.puuid;

    // Get matchIds
    const idsUrl = `https://americas.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=20&api_key=${apiKey}`;
    const idsRes = await fetch(idsUrl);
    const matchIds = await idsRes.json();

    // Get all deaths
    const allDeaths = [];

    for (const matchId of matchIds) {
        const matchRes = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${apiKey}`);
        const match = await matchRes.json();
        
        if (match.info.mapId !== 11) continue;  // only show SR games

        const timelineRes = await fetch(`https://americas.api.riotgames.com/lol/match/v5/matches/${matchId}/timeline?api_key=${apiKey}`);
        const timeline = await timelineRes.json();
        
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