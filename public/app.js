const searchBtn = document.getElementById('searchBtn');
const canvas = document.getElementById('heatmapCanvas');
const ctx = canvas.getContext('2d');
let lastDeaths = []
let currentMode = 'heatmap';

function gameToCanvas(x, y, canvasSize = 512) {
    const minX = -120, maxX = 14870;
    const minY = -120, maxY = 14980;

    const canvasX = ((x - minX) / (maxX - minX)) * canvasSize;
    const canvasY = canvasSize - ((y - minY) / (maxY - minY)) * canvasSize; // flip Y

    return { canvasX, canvasY };
}

function renderHeatmap(deaths) {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // wipe any dots from a previous search
    ctx.globalCompositeOperation = 'lighter';

    for (const death of deaths) {
        const { canvasX, canvasY } = gameToCanvas(death.x, death.y);

        const RADIUS = 20;
        const gradient = ctx.createRadialGradient(canvasX, canvasY, 0, canvasX, canvasY, RADIUS);
        gradient.addColorStop(0, 'rgba(255,255,255,0.4)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(canvasX - RADIUS, canvasY - RADIUS, RADIUS * 2, RADIUS * 2);
    }

    ctx.globalCompositeOperation = 'source-over';
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
        const alpha = pixels[i + 3];

        if (alpha === 0) continue;

        const [r, g, b] = intensityToColor(alpha);
        pixels[i] = r;
        pixels[i + 1] = g;
        pixels[i + 2] = b;
    }

    ctx.putImageData(imageData, 0, 0);
}

// TODO: Revisit what data dots should surface - currently just time + killer.
// Consider: per-game grouping/filtering (like u.gg's match-by-match breakdown),
// possibly alongside the map rather than only via tooltip. May need a UI rework,
// not just a styling pass.
function renderDots(deaths, hoveredDeath = null) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const death of deaths) {
        const { canvasX, canvasY } = gameToCanvas(death.x, death.y);
        const isHovered = death === hoveredDeath;

        ctx.beginPath();
        ctx.arc(canvasX, canvasY, isHovered ? 8 : 5, 0, Math.PI * 2);

        if (isHovered) {
            ctx.shadowColor = '#E8B34C';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#F5D48A';
        } else {
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(207, 201, 188, 0.85)'; // soft cream, matches your text color
        }

        ctx.strokeStyle = '#12100D';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
    }

    ctx.shadowBlur = 0; // reset so it doesn't leak into other draws
}

function intensityToColor(alpha) {
    const stops = [
        [0, [0, 0, 255]],   // blue
        [85, [0, 255, 0]],  // green
        [170, [255, 255, 0]],   // yellow
        [255, [255, 0, 0]], // red
    ];

    for (let i = 0; i < stops.length - 1; i ++) {
        const [t1, c1] = stops[i];
        const [t2, c2] = stops[i + 1];

        if (alpha >= t1 && alpha <= t2) {
            const ratio = (alpha - t1) / (t2 - t1);
            return [
                Math.round(c1[0] + (c2[0] - c1[0]) * ratio),
                Math.round(c1[1] + (c2[1] - c1[1]) * ratio),
                Math.round(c1[2] + (c2[2] - c1[2]) * ratio),
            ];
        }
    }
    return stops[stops.length - 1][1];
}

searchBtn.addEventListener('click', async () => {
    const raw = document.getElementById('riotId').value;
    const [gameName, tagLine] = raw.split('#').map(s => s.trim());

    if (!gameName || !tagLine) {
        const deathListEl = document.getElementById('deathList');
        deathListEl.textContent = 'Enter a Riot ID like Name#Tag';
        deathListEl.style.display = 'block';
        return;
    }

    searchBtn.disabled = true;
    searchBtn.textContent = 'Loading...';
    
    const loadingOverlay = document.getElementById("loading-overlay");
    loadingOverlay.style.display = 'block'

    const region = document.getElementById('region').value;
    const res = await fetch(`/api/deaths/${region}/${gameName}/${tagLine}`);

    if (!res.ok) {
        document.getElementById('deathList').textContent = 'Could not find that summoner. Check the name and tag.';
        searchBtn.disabled = false;
        searchBtn.textContent = 'Search';
        loadingOverlay.style.display = 'none';
        return;
    }

    const deaths = await res.json();
    const matchCount = new Set(deaths.map(d => d.matchId)).size;

    const killerCounts = {};
    for (const death of deaths) {
        killerCounts[death.killedBy] = (killerCounts[death.killedBy] || 0) + 1;
    }
    let topKiller = '--';
    let topCount = 0;
    for (const killer in killerCounts) {
        if (killerCounts[killer] > topCount) {
            topKiller = killer;
            topCount = killerCounts[killer];
        }
    }

    document.getElementById('totalDeathsStat').textContent = deaths.length;
    document.getElementById('gamesAnalyzedStat').textContent = matchCount;
    document.getElementById('mostCommonKillerStat').textContent = topKiller;

    lastDeaths = deaths;
    renderHeatmap(deaths);

    const deathListEl = document.getElementById('deathList');

    if (deaths.length === 0) {
        deathListEl.textContent = 'No deaths found in recent Summoner\'s Rift games';
        deathListEl.style.display = 'block';
    } else {
        deathListEl.style.display = 'none';
    }
    searchBtn.disabled = false;
    searchBtn.textContent = 'Search';
    loadingOverlay.style.display = 'none'
});

canvas.addEventListener('mousemove', (e) => {
    if (currentMode !== 'dots') return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    let closest = null;
    let closestDist = Infinity;

    for (const death of lastDeaths) {
        const { canvasX, canvasY } = gameToCanvas(death.x, death.y);
        const dist = Math.hypot(mouseX - canvasX, mouseY - canvasY);
        if (dist < closestDist) {
            closestDist = dist;
            closest = death;
        }
    }

    const tooltip = document.getElementById('dotTooltip');
    const hovered = closest && closestDist < 10 ? closest : null;

    renderDots(lastDeaths, hovered);

    if (hovered) {
        tooltip.textContent = `${hovered.time} - killed by ${hovered.killedBy}`;
        tooltip.style.display = 'block';

        const tooltipWidth = tooltip.offsetWidth;
        const tooltipHeight = tooltip.offsetHeight;

        let left = mouseX + 10;
        let top = mouseY + 10;

        if (left + tooltipWidth > canvas.width) left = mouseX - tooltipWidth - 10;
        if (top + tooltipHeight > canvas.height) top = mouseY - tooltipHeight - 10;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
    } else {
        tooltip.style.display = 'none';
    }
});

document.getElementById('riotId').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

document.getElementById('heatmapModeBtn').addEventListener('click', () => {
    currentMode = 'heatmap';
    document.getElementById('heatmapModeBtn').classList.add('active');
    document.getElementById('dotsModeBtn').classList.remove('active');
    document.getElementById('dotTooltip').style.display = 'none';
    renderHeatmap(lastDeaths);
});

document.getElementById('dotsModeBtn').addEventListener('click', () => {
    currentMode = 'dots';
    document.getElementById('dotsModeBtn').classList.add('active');
    document.getElementById('heatmapModeBtn').classList.remove('active');
    renderDots(lastDeaths);
});