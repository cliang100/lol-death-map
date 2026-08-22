# lol-death-map

See where you die most on Summoner's Rift, visualized as a heatmap.

## What it does
Search a summoner and see a heatmap of their death locations across recent
ranked games, built from League of Legends match timeline data.

## Setup
1. Clone the repo
2. Run `npm install`
3. Create a `.env` file in the project root with your Riot API key:
RIOT_API_KEY=your_key_here

4. Run `npm start`

## Tech stack
- Node.js + Express
- Riot Games API (account-v1, match-v5)
- Plain HTML/JS + Canvas for the heatmap rendering

## Status
Early development. Currently fetching and validating match data from the
Riot API before building out the heatmap rendering and frontend.

## Notes
Uses a personal Riot developer API key — subject to Riot's standard rate
limits. Not affiliated with or endorsed by Riot Games.