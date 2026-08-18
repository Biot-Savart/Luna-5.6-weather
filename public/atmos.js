const WEATHER = {
  0: ['Clear sky', 'clear'], 1: ['Mainly clear', 'clear'], 2: ['Partly cloudy', 'partly'], 3: ['Overcast', 'cloudy'],
  45: ['Fog', 'fog'], 48: ['Rime fog', 'fog'], 51: ['Light drizzle', 'drizzle'], 53: ['Drizzle', 'drizzle'], 55: ['Heavy drizzle', 'drizzle'],
  56: ['Freezing drizzle', 'drizzle'], 57: ['Heavy freezing drizzle', 'drizzle'], 61: ['Light rain', 'rain'], 63: ['Rain', 'rain'], 65: ['Heavy rain', 'rain'],
  66: ['Freezing rain', 'rain'], 67: ['Heavy freezing rain', 'rain'], 71: ['Light snow', 'snow'], 73: ['Snow', 'snow'], 75: ['Heavy snow', 'snow'],
  77: ['Snow grains', 'snow'], 80: ['Rain showers', 'showers'], 81: ['Rain showers', 'showers'], 82: ['Heavy rain showers', 'showers'],
  85: ['Snow showers', 'snow'], 86: ['Heavy snow showers', 'snow'], 95: ['Thunderstorm', 'storm'], 96: ['Storm + hail', 'storm'], 99: ['Storm + hail', 'storm']
};

const DEFAULT_PLACE = { name: 'Cape Town', admin1: 'Western Cape', country: 'South Africa', latitude: -33.9258, longitude: 18.4232, timezone: 'Africa/Johannesburg' };
const savedKey = 'atmos-saved-places';
const settingsKey = 'atmos-settings';
const state = {
  place: JSON.parse(localStorage.getItem('atmos-place') || 'null') || DEFAULT_PLACE,
  weather: null,
  air: null,
  saved: JSON.parse(localStorage.getItem(savedKey) || '[]'),
  unit: localStorage.getItem(settingsKey) || 'c',
  activeDay: 0,
  activeHourRange: 0,
  loading: true,
  error: null,
  query: '',
  searchResults: [],
  usingDemo: false
};

const app = document.querySelector('#app');

function icon(type = 'partly', size = 34, className = '') {
  const common = `width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" aria-hidden="true" class="weather-icon ${className}"`;
  const sun = `<circle cx="24" cy="24" r="8" fill="currentColor"/><g stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M36.7 11.3l-3.5 3.5M14.8 33.2l-3.5 3.5"/></g>`;
  const cloud = `<path d="M11.5 34.5h25.1a7.4 7.4 0 0 0 .4-14.8 13.2 13.2 0 0 0-25.4 2.8 6 6 0 0 0-.1 12Z" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="2.4"/>`;
  const rain = `<g stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="m18 38-2 5M26 38l-2 5M34 38l-2 5"/></g>`;
  const snow = `<g stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M17 38v7M13.5 41.5h7M14.5 39l5 5M19.5 39l-5 5M27 38v7M23.5 41.5h7M24.5 39l5 5M29.5 39l-5 5"/></g>`;
  let inner = type === 'clear' ? sun : type === 'partly' ? `${sun}<path d="M13 37h23.6a6.8 6.8 0 0 0 .4-13.6 11 11 0 0 0-18.5 3A5.5 5.5 0 0 0 13 37Z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="2.3"/>` : `${cloud}${type === 'rain' || type === 'drizzle' || type === 'showers' ? rain : type === 'snow' ? snow : ''}`;
  if (type === 'storm') inner = `${cloud}<path d="m25 30-5 8h5l-3 7 8-10h-5l5-8" fill="currentColor"/>`;
  if (type === 'fog') inner = `<path d="M10 22h28M7 29h34M11 36h26" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>`;
  if (type === 'cloudy') inner = cloud;
  return `<svg ${common}>${inner}</svg>`;
}

function weatherMeta(code) { return WEATHER[code] || ['Unknown', 'partly']; }
function cToF(c) { return c * 9 / 5 + 32; }
function temp(value, compact = false) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  const n = state.unit === 'f' ? cToF(Number(value)) : Number(value);
  return `${Math.round(n)}°${state.unit.toUpperCase()}`;
}
function speed(value) { return state.unit === 'f' ? `${Math.round(value * 0.621371)} mph` : `${Math.round(value)} km/h`; }
function formatTime(iso, options = { hour: 'numeric', minute: '2-digit' }) {
  const timeZone = state.weather?.timezone || state.place.timezone;
  return new Intl.DateTimeFormat([], timeZone ? { ...options, timeZone } : options).format(new Date(iso));
}
function formatHour(iso) { return new Intl.DateTimeFormat([], { hour: 'numeric' }).format(new Date(iso)); }
function dayName(iso, index) { return index === 0 ? 'Today' : new Intl.DateTimeFormat([], { weekday: 'short' }).format(new Date(iso)); }
function pct(value) { return `${Math.round(value ?? 0)}%`; }
function direction(degrees = 0) { return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(degrees / 45) % 8]; }
function clamp(value, min, max) { return Math.min(Math.max(value, min), max); }

function fakeWeather() {
  const now = new Date();
  const hours = Array.from({ length: 49 }, (_, i) => new Date(now.getTime() + i * 3600000).toISOString());
  const daily = Array.from({ length: 7 }, (_, i) => new Date(now.getTime() + i * 86400000).toISOString().slice(0, 10));
  return {
    current: { time: now.toISOString(), temperature_2m: 18, relative_humidity_2m: 67, apparent_temperature: 17, is_day: 1, precipitation: 0, rain: 0, weather_code: 2, cloud_cover: 38, wind_speed_10m: 19, wind_direction_10m: 230, pressure_msl: 1014, visibility: 24000, uv_index: 4.3 },
    hourly: { time: hours, temperature_2m: hours.map((_, i) => 18 + Math.sin(i / 4) * 4), apparent_temperature: hours.map((_, i) => 17 + Math.sin(i / 4) * 4), precipitation_probability: hours.map((_, i) => i > 20 && i < 27 ? 54 : 8), precipitation: hours.map(() => 0), weather_code: hours.map((_, i) => i > 20 && i < 27 ? 61 : 2), wind_speed_10m: hours.map(() => 19), relative_humidity_2m: hours.map(() => 67), uv_index: hours.map((_, i) => i > 5 && i < 17 ? 4 : 0), visibility: hours.map(() => 24000) },
    daily: { time: daily, weather_code: [2, 1, 61, 3, 2, 80, 1], temperature_2m_max: [21, 23, 19, 20, 22, 18, 21], temperature_2m_min: [13, 14, 12, 11, 13, 12, 14], apparent_temperature_max: [21, 23, 18, 19, 22, 17, 21], apparent_temperature_min: [12, 14, 11, 10, 12, 11, 14], sunrise: daily.map(d => `${d}T06:45`), sunset: daily.map(d => `${d}T18:10`), uv_index_max: [5, 6, 3, 4, 5, 2, 5], precipitation_sum: [0, 0, 4.2, 0.2, 0, 7.1, 0], precipitation_probability_max: [8, 9, 58, 22, 11, 62, 8], wind_speed_10m_max: [22, 19, 25, 18, 16, 28, 20] }
  };
}

async function fetchWeather(place) {
  state.loading = true; state.error = null; state.usingDemo = false; render();
  const params = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'auto', forecast_days: '7', current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,pressure_msl,surface_pressure,visibility,uv_index', hourly: 'temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,uv_index,visibility', daily: 'weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max' });
  const airParams = new URLSearchParams({ latitude: place.latitude, longitude: place.longitude, timezone: 'auto', current: 'us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide' });
  try {
    const [weatherRes, airRes] = await Promise.all([fetch(`https://api.open-meteo.com/v1/forecast?${params}`), fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${airParams}`)]);
    if (!weatherRes.ok) throw new Error('Weather service unavailable');
    state.weather = await weatherRes.json(); state.air = airRes.ok ? await airRes.json() : null;
    localStorage.setItem('atmos-place', JSON.stringify(place));
  } catch (error) {
    state.weather = fakeWeather(); state.air = { current: { us_aqi: 24, pm2_5: 5.2, pm10: 9.4, ozone: 78, nitrogen_dioxide: 12 } }; state.usingDemo = true; state.error = 'Live data is taking a moment — showing a realistic preview.';
  } finally { state.loading = false; render(); }
}

async function searchPlaces(query) {
  if (query.trim().length < 2) { state.searchResults = []; render(); return; }
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
    const data = await res.json(); state.searchResults = data.results || []; render();
  } catch { state.searchResults = []; render(); }
}

function current() { return state.weather?.current || {}; }
function hourly() { return state.weather?.hourly || {}; }
function daily() { return state.weather?.daily || {}; }
function hourlyIndices() {
  const h = hourly(); if (!h.time) return [];
  const now = Date.now(); const start = h.time.findIndex(time => new Date(time).getTime() >= now - 3600000);
  return Array.from({ length: 12 }, (_, i) => Math.max(0, start + i));
}

function header() {
  const isSaved = state.saved.some(place => place.latitude === state.place.latitude && place.longitude === state.place.longitude);
  return `<header class="topbar"><a class="brand" href="#" aria-label="Atmos home"><span class="brand-mark">a</span><span>atmos</span></a><div class="topbar-actions"><button class="location-btn" data-action="locate"><span class="pulse-dot"></span><span>Use my location</span></button><button class="icon-btn" data-action="toggle-save" aria-label="${isSaved ? 'Remove from saved places' : 'Save place'}">${isSaved ? '★' : '☆'}</button><button class="unit-toggle" data-action="toggle-unit"><span class="${state.unit === 'c' ? 'active' : ''}">°C</span><span class="${state.unit === 'f' ? 'active' : ''}">°F</span></button></div></header>`;
}

function searchPanel() {
  return `<div class="search-wrap"><div class="search-box"><span class="search-icon">⌕</span><input id="place-search" type="search" autocomplete="off" placeholder="Search any city…" value="${state.query}"/><kbd>⌘ K</kbd></div>${state.searchResults.length ? `<div class="search-results">${state.searchResults.map((p, i) => `<button data-search-index="${i}" class="search-result"><span class="result-icon">${icon('partly', 22)}</span><span><strong>${p.name}</strong><small>${[p.admin1, p.country].filter(Boolean).join(', ')}</small></span><span class="result-arrow">↗</span></button>`).join('')}</div>` : ''}</div>`;
}

function hero() {
  const c = current(); const [label, type] = weatherMeta(c.weather_code);
  return `<section class="hero-card"><div class="hero-main"><div class="eyebrow"><span class="live-dot"></span>Live conditions <span class="divider">/</span> ${formatTime(c.time || new Date().toISOString(), { hour: 'numeric', minute: '2-digit' })}</div><div class="place-title"><div><h1>${state.place.name}</h1><p>${[state.place.admin1, state.place.country].filter(Boolean).join(', ')}</p></div><span class="big-icon">${icon(type, 92)}</span></div><div class="hero-temp">${temp(c.temperature_2m)}</div><div class="hero-status"><span>${label}</span><span class="status-sep">·</span><span>Feels like ${temp(c.apparent_temperature)}</span></div></div><div class="hero-side"><div class="mini-stat"><span>High / low</span><strong>${temp(daily().temperature_2m_max?.[0])} <em>/</em> ${temp(daily().temperature_2m_min?.[0])}</strong></div><div class="mini-stat"><span>Precipitation</span><strong>${pct(daily().precipitation_probability_max?.[0])}<small> chance</small></strong></div><div class="mini-stat"><span>Wind</span><strong>${speed(c.wind_speed_10m)} <small>${direction(c.wind_direction_10m)}</small></strong></div></div></section>`;
}

function metricCard(label, value, meta, iconText, accent = '') { return `<div class="metric-card ${accent}"><div class="metric-top"><span>${iconText}</span><span>${label}</span></div><strong>${value}</strong><small>${meta}</small></div>`; }

function metrics() {
  const c = current(); const a = state.air?.current || {}; const uv = Number(c.uv_index || 0); const uvLabel = uv < 3 ? 'Low' : uv < 6 ? 'Moderate' : 'High'; const visibility = c.visibility ? `${Math.round(c.visibility / 1000)} km` : '—'; const aqLabel = (a.us_aqi || 0) < 50 ? 'Good' : (a.us_aqi || 0) < 100 ? 'Moderate' : 'Poor';
  return `<section class="metrics-grid">${metricCard('Humidity', pct(c.relative_humidity_2m), 'Comfortable', '◌')} ${metricCard('Wind', speed(c.wind_speed_10m), `${direction(c.wind_direction_10m)} direction`, '↗', 'blue')} ${metricCard('UV index', `${Math.round(uv * 10) / 10}`, uvLabel, '◒', 'yellow')} ${metricCard('Air quality', a.us_aqi ? `${Math.round(a.us_aqi)} AQI` : '—', aqLabel, '✦', 'green')} ${metricCard('Visibility', visibility, 'Clear horizon', '⊙')} ${metricCard('Pressure', c.pressure_msl ? `${Math.round(c.pressure_msl)} hPa` : '—', 'Steady', '⌁', 'purple')}</section>`;
}

function chart() {
  const h = hourly(); const indices = hourlyIndices(); const values = indices.map(i => h.temperature_2m?.[i] ?? 0); const feels = indices.map(i => h.apparent_temperature?.[i] ?? 0); if (!values.length) return '';
  const all = [...values, ...feels]; const min = Math.min(...all) - 2; const max = Math.max(...all) + 2; const W = 760; const H = 190; const padX = 26; const padY = 18; const x = i => padX + i * ((W - padX * 2) / (values.length - 1 || 1)); const y = v => H - padY - ((v - min) / (max - min || 1)) * (H - padY * 2); const line = arr => arr.map((v, i) => `${i ? 'L' : 'M'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' '); const area = `${line(values)} L ${x(values.length - 1)} ${H - padY} L ${x(0)} ${H - padY} Z`;
  return `<div class="chart-wrap"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Temperature trend for the next twelve hours"><defs><linearGradient id="temp-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#ef8354" stop-opacity=".23"/><stop offset="1" stop-color="#ef8354" stop-opacity="0"/></linearGradient></defs><path d="${area}" fill="url(#temp-fill)"/><path class="chart-line warm" d="${line(values)}"/><path class="chart-line cool" d="${line(feels)}"/>${values.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.2" class="chart-point"/>`).join('')}</svg><div class="chart-labels">${indices.map(i => `<span>${formatHour(h.time[i])}</span>`).join('')}</div></div>`;
}

function hourlyCard() {
  const h = hourly(); const indices = hourlyIndices(); return `<section class="panel hourly-panel"><div class="panel-heading"><div><span class="section-kicker">LOOK AHEAD</span><h2>Next 12 hours</h2></div><div class="legend"><span><i class="legend-dot warm"></i>Temperature</span><span><i class="legend-dot cool"></i>Feels like</span></div></div><div class="hour-strip">${indices.map(i => { const [label, type] = weatherMeta(h.weather_code?.[i]); return `<div class="hour-item"><span class="hour-time">${formatHour(h.time[i])}</span>${icon(type, 31)}<strong>${temp(h.temperature_2m?.[i])}</strong><span class="rain-chance">${pct(h.precipitation_probability?.[i])}</span></div>`; }).join('')}</div>${chart()}</section>`;
}

function forecastCard() {
  const d = daily(); return `<section class="panel forecast-panel"><div class="panel-heading"><div><span class="section-kicker">THE WEEK AHEAD</span><h2>7-day forecast</h2></div><button class="text-btn" data-action="toggle-unit">Switch to °${state.unit === 'c' ? 'F' : 'C'} <span>↗</span></button></div><div class="forecast-list">${(d.time || []).map((date, i) => { const [label, type] = weatherMeta(d.weather_code?.[i]); const rain = d.precipitation_probability_max?.[i] || 0; return `<button class="forecast-row ${state.activeDay === i ? 'selected' : ''}" data-day="${i}"><span class="day-name">${dayName(date, i)}<small>${new Intl.DateTimeFormat([], { month: 'short', day: 'numeric' }).format(new Date(date))}</small></span><span class="forecast-weather">${icon(type, 29)}<span>${label}</span></span><span class="rain-pill ${rain > 40 ? 'wet' : ''}">⌁ ${rain}%</span><span class="day-temps"><b>${temp(d.temperature_2m_max?.[i])}</b><span>${temp(d.temperature_2m_min?.[i])}</span></span></button>`; }).join('')}</div></section>`;
}

function sunCard() {
  const d = daily(); const index = state.activeDay; const sunrise = d.sunrise?.[index]; const sunset = d.sunset?.[index]; const now = new Date(); const start = new Date(sunrise || now); const end = new Date(sunset || now); const progress = clamp((now - start) / (end - start) * 100, 4, 96); return `<section class="panel sun-panel"><div class="panel-heading"><div><span class="section-kicker">DAYLIGHT</span><h2>Sunrise & sunset</h2></div><span class="day-context">${dayName(d.time?.[index], index)}</span></div><div class="sun-times"><div><span>Sunrise</span><strong>${sunrise ? formatTime(sunrise) : '—'}</strong></div><span class="sun-orbit"><i style="left:${progress}%"></i><b>☼</b></span><div class="sunset"><span>Sunset</span><strong>${sunset ? formatTime(sunset) : '—'}</strong></div></div><div class="daylight-meta"><span>${sunrise && sunset ? `${Math.floor((end - start) / 3600000)}h ${Math.floor(((end - start) / 60000) % 60)}m of daylight` : 'Daylight data'}</span><span>UV peak <b>${Math.round((d.uv_index_max?.[index] || 0) * 10) / 10}</b></span></div></section>`;
}

function detailsCard() {
  const c = current(); const h = hourly(); const i = hourlyIndices()[0] || 0; return `<section class="panel details-panel"><div class="panel-heading"><div><span class="section-kicker">AT A GLANCE</span><h2>More details</h2></div></div><div class="details-grid"><div><span>Feels like</span><strong>${temp(c.apparent_temperature)}</strong><small>${Number(c.apparent_temperature) < Number(c.temperature_2m) ? 'A little cooler' : 'A little warmer'}</small></div><div><span>Cloud cover</span><strong>${pct(c.cloud_cover)}</strong><small>${c.cloud_cover > 60 ? 'Mostly cloudy' : 'Mostly clear'}</small></div><div><span>Rain next hour</span><strong>${pct(h.precipitation_probability?.[i])}</strong><small>${h.precipitation?.[i] || 0} mm expected</small></div><div><span>Humidity trend</span><strong>${pct(h.relative_humidity_2m?.[i])}</strong><small>Feels comfortable</small></div></div></section>`;
}

function savedPlaces() {
  if (!state.saved.length) return `<section class="saved-empty"><span>☆</span><p>Save cities you care about<br/><small>for instant weather switching</small></p></section>`;
  return `<section class="saved-places"><div class="saved-label">SAVED PLACES</div><div class="saved-list">${state.saved.map((p, i) => `<button data-saved-index="${i}" class="saved-place ${p.latitude === state.place.latitude ? 'active' : ''}"><span>${p.name}</span><small>${p.country || p.admin1 || ''}</small><b>→</b></button>`).join('')}</div></section>`;
}

function loading() { return `<div class="loading-state"><div class="loader"></div><p>Reading the sky over ${state.place.name}…</p></div>`; }

function render() {
  if (state.loading && !state.weather) { app.innerHTML = `${header()}<main class="shell"><div class="loading-state initial"><div class="loader"></div><p>Reading the sky over ${state.place.name}…</p></div></main>`; return; }
  app.innerHTML = `${header()}<main class="shell">${searchPanel()}${state.error ? `<div class="notice">${state.error}<button data-action="dismiss-notice">×</button></div>` : ''}<div class="layout"><aside class="sidebar">${savedPlaces()}<div class="sidebar-note"><span>◌</span><p>Weather without the clutter.<br/><small>Open-Meteo data, updated live.</small></p></div></aside><div class="content">${hero()}${metrics()}${hourlyCard()}<div class="two-col">${forecastCard()}<div class="right-stack">${sunCard()}${detailsCard()}</div></div><footer>Atmos <span>·</span> Built for a calmer forecast <span>·</span> Data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a></footer></div></div></main>`;
}

let searchTimer;
document.addEventListener('input', event => { if (event.target.id === 'place-search') { state.query = event.target.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => searchPlaces(state.query), 260); } });
document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#place-search')?.focus(); } if (event.key === 'Escape') { state.searchResults = []; render(); } });
document.addEventListener('click', async event => {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action === 'toggle-unit') { state.unit = state.unit === 'c' ? 'f' : 'c'; localStorage.setItem(settingsKey, state.unit); render(); return; }
  if (action === 'dismiss-notice') { state.error = null; render(); return; }
  if (action === 'toggle-save') { const exists = state.saved.findIndex(p => p.latitude === state.place.latitude && p.longitude === state.place.longitude); if (exists >= 0) state.saved.splice(exists, 1); else state.saved.unshift(state.place); localStorage.setItem(savedKey, JSON.stringify(state.saved)); render(); return; }
  if (action === 'locate') { if (!navigator.geolocation) { state.error = 'Location is not available in this browser.'; render(); return; } navigator.geolocation.getCurrentPosition(async pos => { let locationName = 'Your location'; let locationAdmin = ''; let locationCountry = ''; try { const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`); const data = await res.json(); locationName = data.address?.city || data.address?.town || data.address?.village || locationName; locationAdmin = data.address?.state || ''; locationCountry = data.address?.country || ''; } catch { /* Coordinates still provide a useful forecast if reverse lookup is unavailable. */ } state.place = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, timezone: undefined, name: locationName, admin1: locationAdmin, country: locationCountry }; await fetchWeather(state.place); }, () => { state.error = 'Location permission was not granted. You can search for a city above.'; render(); }); return; }
  const result = event.target.closest('[data-search-index]'); if (result) { const p = state.searchResults[Number(result.dataset.searchIndex)]; if (p) { state.place = p; state.query = ''; state.searchResults = []; state.activeDay = 0; await fetchWeather(p); } return; }
  const saved = event.target.closest('[data-saved-index]'); if (saved) { state.place = state.saved[Number(saved.dataset.savedIndex)]; state.activeDay = 0; await fetchWeather(state.place); return; }
  const day = event.target.closest('[data-day]'); if (day) { state.activeDay = Number(day.dataset.day); render(); }
});

fetchWeather(state.place);
