const apiKeyOW = "87b9f0d8c0fe84f0b86785b4cbd5b5e8";
const apiKeyWB = "b6b9e464842f485198da77218eba87e1";
const apiKeyVC = "2YAQN3ACCRK2ZPDJVH34J4G84";

const fetchBtn = document.getElementById("fetchBtn");
const currentWeatherEl = document.getElementById("currentWeather");
const openWeatherForecastEl = document.getElementById("openWeatherForecast");
const weatherbitCurrentEl = document.getElementById("weatherbitCurrent");
const weatherbitForecastEl = document.getElementById("weatherbitForecast");
const visualCrossingCurrentEl = document.getElementById("visualCrossingCurrent");
const visualCrossingForecastEl = document.getElementById("visualCrossingForecast");
const openMeteoCurrentEl = document.getElementById("openMeteoCurrent");
const openMeteoForecastEl = document.getElementById("openMeteoForecast");
const hourlyChartCtx = document.getElementById("hourlyChart").getContext("2d");

let hourlyChart;
let owHourlyData = [];
let wbHourlyData = [];
let vcHourlyData = [];
let omHourlyData = [];

fetchBtn.addEventListener("click", async () => {
  const lat = document.getElementById("lat").value;
  const lon = document.getElementById("lon").value;
  if (!lat || !lon) return alert("Enter both latitude and longitude.");

  const location = `${lat},${lon}`;
  const owCurrentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKeyOW}&units=metric`;
  const owForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKeyOW}&units=metric`;

  const wbCurrentUrl = `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${apiKeyWB}`;
  const wbHourlyUrl = `https://api.weatherbit.io/v2.0/forecast/hourly?lat=${lat}&lon=${lon}&key=${apiKeyWB}&hours=24`;
  const wbDailyUrl = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${apiKeyWB}`;

  const vcUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?key=${apiKeyVC}&unitGroup=metric&include=days,current,hours`;

    const omCurrentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation,rain,weather_code,pressure_msl,cloud_cover&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code`;

  try {
    const [owCurrentRes, owForecastRes, wbCurrentRes, wbHourlyRes, wbDailyRes, vcRes, omCurrentRes] = await Promise.all([
      fetch(owCurrentUrl),
      fetch(owForecastUrl),
      fetch(wbCurrentUrl),
      fetch(wbHourlyUrl),
      fetch(wbDailyUrl),
      fetch(vcUrl),
      fetch(omCurrentUrl)
    ]);

    const owCurrent = await owCurrentRes.json();
    const owForecast = await owForecastRes.json();
    const wbCurrent = await wbCurrentRes.json();
    const wbHourly = await wbHourlyRes.json();
    const wbDaily = await wbDailyRes.json();
    const vcData = await vcRes.json();
    const omData = await omCurrentRes.json();

    owHourlyData = owForecast.list;
    wbHourlyData = wbHourly.data;
    
    vcHourlyData = [];
    vcData.days.forEach(day => {
      if (day.hours) {
        day.hours.forEach(hour => {
          vcHourlyData.push({
            ...hour,
            fullDatetime: `${day.datetime}T${hour.datetime}`,
            date: day.datetime
          });
        });
      }
    });
    
    omHourlyData = omData.hourly;
    console.log("Sample VC hour:", vcHourlyData[0]);
    console.log("VC hourly data length:", vcHourlyData.length);

    document.getElementById("hourlySlider").max = Math.min(
        owHourlyData.length,
        wbHourlyData.length,
        vcHourlyData.length,
        omHourlyData.temperature_2m?.length || 24
    );

    displayCurrentWeatherOW(owCurrent);
    displayCurrentWeatherWB(wbCurrent);
    displayCurrentWeatherVC(vcData);
    displayCurrentWeatherOM(omData);

    displayHourlyChart(9);

    displayDailyForecastOW(owForecast.list);
    displayDailyForecastWB(wbDaily.data);
    displayDailyForecastVC(vcData.days.slice(0, 8));
    displayDailyForecastOM(omData);

  } catch (err) {
    console.error(err);
    alert("Failed to fetch weather data.");
  }
});

function displayCurrentWeatherOM(data) {
  const d = data.current;
  const weatherDesc = getWeatherDescription(d.weather_code);
  const card = `
    <div class="weather-card brown">
      <div class="weather-date">${d.time}</div>
      <div class="weather-location"> ${data.latitude}, ${data.longitude}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/03d@2x.png" alt="icon" />
        <div class="temperature">${Math.round(d.temperature_2m)}°C</div>
      </div>
      <div class="weather-description">
        Feels like ${Math.round(d.apparent_temperature)}°C. ${weatherDesc}.
      </div>
      <div class="weather-details">
        <div><strong>Wind Speed</strong>: ${d.wind_speed_10m} km/h</div>
        <div><strong>Pressure</strong>: ${d.pressure_msl} hPa</div>
        <div><strong>Humidity</strong>: ${d.relative_humidity_2m}%</div>
        <div><strong>Visibility</strong>: N/A</div>
        <div><strong>Precipitation</strong>: ${d.precipitation} mm</div>
      </div>
    </div>
  `;
  openMeteoCurrentEl.innerHTML = card;
}

function displayDailyForecastOM(omData) {
  const dates = (omData.daily && omData.daily.time) || [];
  const temps = (omData.daily && omData.daily.temperature_2m_max) || [];
  const tempsMin = (omData.daily && omData.daily.temperature_2m_min) || [];
  const weatherCodes = (omData.daily && omData.daily.weather_code) || [];

  const units = omData.hourly_units || {};

  openMeteoForecastEl.innerHTML = "";

  if (dates.length === 0 || temps.length === 0) {
    openMeteoForecastEl.innerHTML = '<p style="color:#888">No daily forecast data available.</p>';
    return;
  }

  for (let i = 0; i < Math.min(8, dates.length); i++) {
    const toggleId = `details-om-${i}`;
    const dayHourlyIndexes = omData.hourly.time.map((t, idx) => t.startsWith(dates[i]) ? idx : -1).filter(idx => idx >= 0);
    
    const wind = omData.hourly.wind_speed_10m ? avg(omData.hourly.wind_speed_10m, dayHourlyIndexes).toFixed(1) : 'N/A';
    const humidity = omData.hourly.relative_humidity_2m ? avg(omData.hourly.relative_humidity_2m, dayHourlyIndexes).toFixed(0) : 'N/A';
    const visibilityM = omData.hourly.visibility ? avg(omData.hourly.visibility, dayHourlyIndexes) : null;
    const visibility = visibilityM ? (visibilityM / 1000).toFixed(1) : 'N/A';
    
    const weatherDesc = getWeatherDescription(weatherCodes[i]);

    const html = `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
          <img src="https://openweathermap.org/img/wn/03d.png" class="summary-icon" />
          <span class="summary-text">${dates[i]}</span>
          <span class="summary-text">${Math.round(temps[i])} / ${Math.round(tempsMin[i])}°C</span>
          <span class="summary-text">${weatherDesc}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details brown" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/03d@2x.png" alt="icon" />
            <div class="temperature">${Math.round((temps[i] + tempsMin[i]) / 2)}°C</div>
          </div>
          <div class="weather-description">
            Approximate daily average. ${weatherDesc}.
          </div>
          <div class="weather-details">
            <div><strong>Wind Speed</strong>: ${wind} ${units.wind_speed_10m || 'km/h'}</div>
            <div><strong>Pressure</strong>: N/A</div>
            <div><strong>Humidity</strong>: ${humidity}${units.relative_humidity_2m || '%'}</div>
            <div><strong>Visibility</strong>: ${visibility} km</div>
          </div>
        </div>
      </div>
    `;
    openMeteoForecastEl.innerHTML += html;
  }
}

function displayCurrentWeatherVC(data) {
  const d = data.currentConditions;
  const card = `
    <div class="weather-card yellow">
      <div class="weather-date">${data.days[0].datetime}</div>
      <div class="weather-location">${data.resolvedAddress}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/01d@2x.png" alt="icon" />
        <div class="temperature">${Math.round(d.temp)}°C</div>
      </div>
      <div class="weather-description">
        Feels like ${Math.round(d.feelslike)}°C. ${capitalize(d.conditions)}.
      </div>
      <div class="weather-details">
        <div><strong>Wind Speed</strong>: ${d.windspeed} km/h</div>
        <div><strong>Pressure</strong>: ${d.pressure} hPa</div>
        <div><strong>Humidity</strong>: ${d.humidity}%</div>
        <div><strong>Visibility</strong>: ${d.visibility} km</div>
        <div><strong>Precipitation</strong>: ${d.precip || 0} mm</div>
      </div>
    </div>
  `;
  visualCrossingCurrentEl.innerHTML = card;
}

function displayDailyForecastVC(dayList) {
  visualCrossingForecastEl.innerHTML = "";
  dayList.forEach((d, idx) => {
    const toggleId = `details-vc-${idx}`;
    const html = `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
        <img src="https://openweathermap.org/img/wn/${mapVCIconToOW(d.icon)}.png" class="summary-icon" />
          <span class="summary-text">${d.datetime}</span>
          <span class="summary-text">${Math.round(d.tempmax)} / ${Math.round(d.tempmin)}°C</span>
          <span class="summary-text">${d.conditions}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details yellow" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/${mapVCIconToOW(d.icon)}@2x.png" alt="icon" />
            <div class="temperature">${Math.round(d.temp)}°C</div>
          </div>
          <div class="weather-description">
            Feels like ${Math.round(d.feelslike)}°C. ${capitalize(d.conditions)}.
          </div>
          <div class="weather-details">
            <div><strong>Wind Speed</strong>: ${d.windspeed} km/h</div>
            <div><strong>Pressure</strong>: ${d.pressure} hPa</div>
            <div><strong>Humidity</strong>: ${d.humidity}%</div>
            <div><strong>Visibility</strong>: ${d.visibility} km</div>
          </div>
        </div>
      </div>
    `;
    visualCrossingForecastEl.innerHTML += html;
  });
}

function displayCurrentWeatherOW(data) {
  const date = new Date(data.dt * 1000);
  const card = `
    <div class="weather-card red">
      <div class="weather-date">${date.toLocaleString()}</div>
      <div class="weather-location">${data.name}, ${data.sys.country}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="icon" />
        <div class="temperature">${Math.round(data.main.temp)}°C</div>
      </div>
      <div class="weather-description">
        Feels like ${Math.round(data.main.feels_like)}°C. ${capitalize(data.weather[0].description)}.
      </div>
      <div class="weather-details">
        <div><strong>Wind Speed</strong>: ${data.wind.speed} m/s ${degToCompass(data.wind.deg)}</div>
        <div><strong>Pressure</strong>: ${data.main.pressure} hPa</div>
        <div><strong>Humidity</strong>: ${data.main.humidity}%</div>
        <div><strong>Visibility</strong>: ${(data.visibility / 1000).toFixed(1)} km</div>
        <div><strong>Precipitation</strong>: ${(data.rain && data.rain['1h']) || (data.snow && data.snow['1h']) || 0} mm</div>
      </div>
    </div>
  `;
  currentWeatherEl.innerHTML = card;
}

function displayCurrentWeatherWB(data) {
  const d = data.data[0];
  const card = `
    <div class="weather-card blue">
      <div class="weather-date">${d.datetime}</div>
      <div class="weather-location">${d.city_name}, ${d.country_code}</div>
      <div class="weather-main">
        <img src="https://www.weatherbit.io/static/img/icons/${d.weather.icon}.png" alt="icon" />
        <div class="temperature">${Math.round(d.temp)}°C</div>
      </div>
      <div class="weather-description">
        Feels like ${Math.round(d.app_temp)}°C. ${capitalize(d.weather.description)}.
      </div>
      <div class="weather-details">
        <div><strong>Wind Speed</strong>: ${d.wind_spd.toFixed(1)} m/s ${d.wind_cdir}</div>
        <div><strong>Pressure</strong>: ${d.pres} hPa</div>
        <div><strong>Humidity</strong>: ${d.rh}%</div>
        <div><strong>Visibility</strong>: ${d.vis} km</div>
        <div><strong>Precipitation</strong>: ${d.precip || 0} mm</div>
      </div>
    </div>
  `;
  weatherbitCurrentEl.innerHTML = card;
}

function displayHourlyChart(count = 9) {
    const owTimes = owHourlyData.slice(0, count).map(item => new Date(item.dt * 1000));
    const labels = owTimes.map(d => d.getHours() + ":00");
    const owTemps = owHourlyData.slice(0, count).map(item => item.main.temp);

    const wbTemps = owTimes.map(time => {
        const match = wbHourlyData.find(entry => {
            const entryTime = new Date(entry.timestamp_local);
            return entryTime.getHours() === time.getHours() && entryTime.getDate() === time.getDate();
        });
        return match?.temp ?? null;
    });

    const vcTemps = owTimes.map(time => {
        const targetHour = time.getHours().toString().padStart(2, '0');
        const targetTime = `${targetHour}:00:00`;
        
        const targetDate = time.toISOString().split('T')[0];
        
        console.log(`Looking for VC data: date=${targetDate}, time=${targetTime}`);
        
        const match = vcHourlyData.find(hour => {
            const hourMatches = hour.datetime === targetTime;
            const dateMatches = hour.date === targetDate;
            if (hourMatches && dateMatches) {
                console.log(`Found VC match:`, hour);
            }
            return hourMatches && dateMatches;
        });
        
        return match?.temp ?? null;
    });

    const omTemps = owTimes.map(time => {
        const isoHour = time.toISOString().slice(0, 13);
        const idx = omHourlyData.time.findIndex(t => t.slice(0, 13) === isoHour);
        return idx !== -1 ? omHourlyData.temperature_2m[idx] : null;
    });

    console.log("Chart data:", { owTemps, wbTemps, vcTemps, omTemps });

    if (hourlyChart) hourlyChart.destroy();

    hourlyChart = new Chart(hourlyChartCtx, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "OpenWeather",
                    data: owTemps,
                    borderColor: "#f45c42",
                    backgroundColor: "rgba(244,92,66,0.1)",
                    fill: true,
                    tension: 0.3
                },
                {
                    label: "Weatherbit",
                    data: wbTemps,
                    borderColor: "#4287f5",
                    backgroundColor: "rgba(66,135,245,0.1)",
                    fill: true,
                    tension: 0.3
                },
                {
                    label: "Visual Crossing",
                    data: vcTemps,
                    borderColor: "#f4c542",
                    backgroundColor: "rgba(244,197,66,0.1)",
                    fill: true,
                    tension: 0.3
                },
                {
                    label: "Open-Meteo",
                    data: omTemps,
                    borderColor: "#996633",
                    backgroundColor: "rgba(151, 108, 43, 0.1)",
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { suggestedMin: 0, suggestedMax: 40 }
            }
        }
    });
}

function displayDailyForecastOW(list) {
  const dailyMap = {};
  list.forEach(item => {
    const date = item.dt_txt.split(" ")[0];
    if (!dailyMap[date]) dailyMap[date] = [];
    dailyMap[date].push(item);
  });

  const days = Object.keys(dailyMap).slice(0, 15);
  openWeatherForecastEl.innerHTML = "";

  days.forEach((dateStr, idx) => {
    const entries = dailyMap[dateStr];
    const temps = entries.map(e => e.main.temp);
    const minTemp = Math.min(...temps);
    const maxTemp = Math.max(...temps);
    const mainWeather = entries[Math.floor(entries.length / 2)].weather[0];
    const toggleId = `details-ow-${idx}`;

    const html = `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
          <img src="https://openweathermap.org/img/wn/${mainWeather.icon}.png" class="summary-icon" />
          <span class="summary-text">${dateStr}</span>
          <span class="summary-text">${Math.round(maxTemp)} / ${Math.round(minTemp)}°C</span>
          <span class="summary-text">${mainWeather.description}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details red" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/${mainWeather.icon}@2x.png" alt="icon" />
            <div class="temperature">${Math.round(entries[0].main.temp)}°C</div>
          </div>
          <div class="weather-description">
            Feels like ${Math.round(entries[0].main.feels_like)}°C. ${capitalize(mainWeather.description)}.
          </div>
          <div class="weather-details">
            <div><strong>Wind Speed</strong>: ${entries[0].wind.speed} m/s ${degToCompass(entries[0].wind.deg)}</div>
            <div><strong>Pressure</strong>: ${entries[0].main.pressure} hPa</div>
            <div><strong>Humidity</strong>: ${entries[0].main.humidity}%</div>
            <div><strong>Visibility</strong>: ${(entries[0].visibility / 1000).toFixed(1)} km</div>
          </div>
        </div>
      </div>
    `;
    openWeatherForecastEl.innerHTML += html;
  });
}

function displayDailyForecastWB(dataList) {
  weatherbitForecastEl.innerHTML = "";
  dataList.slice(0, 8).forEach((d, idx) => {
    const day = new Date(d.valid_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const icon = d.weather.icon;
    const desc = d.weather.description;
    const min = Math.round(d.min_temp);
    const max = Math.round(d.max_temp);
    const toggleId = `details-wb-${idx}`;

    const html = `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
          <img src="https://www.weatherbit.io/static/img/icons/${icon}.png" class="summary-icon" />
          <span class="summary-text">${day}</span>
          <span class="summary-text">${max} / ${min}°C</span>
          <span class="summary-text">${desc}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details blue" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://www.weatherbit.io/static/img/icons/${icon}.png" alt="icon" />
            <div class="temperature">${Math.round(d.temp)}°C</div>
          </div>
          <div class="weather-description">
            Feels like ${Math.round(d.app_max_temp)}°C. ${capitalize(desc)}.
          </div>
          <div class="weather-details">
            <div><strong>Wind Speed</strong>: ${d.wind_spd.toFixed(1)} m/s ${d.wind_cdir}</div>
            <div><strong>Pressure</strong>: ${d.pres} hPa</div>
            <div><strong>Humidity</strong>: ${d.rh}%</div>
            <div><strong>Visibility</strong>: ${d.vis} km</div>
          </div>
        </div>
      </div>
    `;
    weatherbitForecastEl.innerHTML += html;
  });
}

function toggleDetails(id) {
  const el = document.getElementById(id);
  el.style.display = el.style.display === "none" ? "block" : "none";
}

function degToCompass(deg) {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function mapVCIconToOW(vcIcon) {
  const map = {
    'clear-day': '01d',
    'clear-night': '01n',
    'partly-cloudy-day': '02d',
    'partly-cloudy-night': '02n',
    'cloudy': '03d',
    'fog': '50d',
    'wind': '50d',
    'rain': '10d',
    'snow': '13d',
    'sleet': '13d',
    'showers-day': '09d',
    'showers-night': '09n',
    'thunderstorm': '11d'
  };
  return map[vcIcon] || '01d';
}

function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return weatherCodes[code] || 'Unknown';
}

function avg(arr, indexes) {
  const vals = indexes.map(i => arr[i]).filter(v => typeof v === 'number');
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

document.getElementById("hourlySlider").addEventListener("input", (e) => {
  const hours = parseInt(e.target.value);
  document.getElementById("hourlySliderValue").textContent = hours;
  displayHourlyChart(hours);
});

function setCity(lat, lon) {
  document.getElementById("lat").value = lat;
  document.getElementById("lon").value = lon;
  fetchBtn.click(); 
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("lat").value = "26.049064"; 
    document.getElementById("lon").value = "119.279749";
    fetchBtn.click();
});