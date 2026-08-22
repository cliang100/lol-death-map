require('dotenv').config(); // loads .env into process.env

const apiKey = process.env.RIOT_API_KEY;
const gameName = 'Senyuuto';
const tagLine = 'FAKER'; // swap for your real tag

async function testFetch() {
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}?api_key=${apiKey}`;

    const response = await fetch(url); // Node 18+ has fetch built in, no import needed
    const data = await response.json();

    console.log(data); // should print { puuid, gameName, tagLine }
}

testFetch();