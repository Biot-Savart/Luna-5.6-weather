# Luna-5.6-weather

Atmos is a feature-rich weather dashboard built for the `Luna-5.6-weather` repository. It is designed to make live weather data feel calm, useful, and easy to explore.

## What it includes

- Live current conditions for any searched city
- Open-Meteo weather, air-quality, and geocoding data with no API keys
- Browser location detection
- 12-hour temperature and “feels like” chart
- 7-day forecast with precipitation chances
- Sunrise, sunset, daylight, and UV information
- Humidity, wind, visibility, pressure, cloud cover, and AQI details
- Saved places stored locally in the browser
- Celsius/Fahrenheit switching
- Responsive desktop and mobile layouts
- Graceful demo data fallback when a live request is unavailable

## Technology

- Vanilla JavaScript for the interactive weather experience
- CSS for the responsive visual system and chart styling
- Vite/Vinext-compatible Sites runtime
- Open-Meteo for weather data without an API key

## Running locally

```bash
npm install
npm run dev
```

To run the production build:

```bash
npm run build
npm run start
```

## Data source

Weather and air-quality data come from [Open-Meteo](https://open-meteo.com/). Location search uses Open-Meteo geocoding, with OpenStreetMap reverse geocoding used only when the browser location button is selected.

## Model attribution

This site was designed and implemented with OpenAI GPT-5 through Codex.

## Hosting

The original Atmos experience is deployed on Sites and can be used as the reference deployment while this repository serves as the source-code home.
