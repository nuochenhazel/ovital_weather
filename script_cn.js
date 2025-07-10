const apiKeyOW = "87b9f0d8c0fe84f0b86785b4cbd5b5e8";
const apiKeyWB = "b6b9e464842f485198da77218eba87e1";
const apiKeyVC = "2YAQN3ACCRK2ZPDJVH34J4G84";
const apiKeyWindy = "FtUF5MS0VXCCWzhMrFNEJxjjgm7zCzjn";
const timezoneApiKey = "BPWYS99FQ7VG";

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
let windyHourlyData = [];
let currentTimezone = null;
let owChartInstance = null;
let wbChartInstance = null;
let vcChartInstance = null;
let omChartInstance = null;


async function getLocationTimezone(lat, lon) {
    try {
        const response = await fetch(`https://api.timezonedb.com/v2.1/get-time-zone?key=${timezoneApiKey}&format=json&by=position&lat=${lat}&lng=${lon}`);
        const data = await response.json();
        return data.zoneName || 'UTC';
    } catch (error) {
        return 'UTC';
    }
}

function hideWeatherSections() {
    const weatherSections = document.querySelectorAll('.section:not(.section:first-child):not(.section:nth-child(2))');
    weatherSections.forEach(section => section.classList.add('hidden'));
}

function showWeatherSections() {
    const weatherSections = document.querySelectorAll('.section.hidden');
    weatherSections.forEach(section => section.classList.remove('hidden'));
}

function showNotification(type, message, duration = 2000) {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    const viewportWidth = window.innerWidth;
    const calculatedWidth = Math.min(Math.max(viewportWidth * 0.9, 300), 600);
    notification.style.width = `${calculatedWidth}px`;
    const content = document.createElement("div");
    content.className = "notification-content";
    if (type === 'loading') {
        const spinner = document.createElement("div");
        spinner.className = "spinner";
        content.appendChild(spinner);
    } else if (type === 'success') {
        const icon = document.createElement("span");
        icon.textContent = "✓";
        icon.style.fontSize = "18px";
        content.appendChild(icon);
    } else if (type === 'error') {
        const icon = document.createElement("span");
        icon.textContent = "⚠";
        icon.style.fontSize = "18px";
        content.appendChild(icon);
    }
    const text = document.createElement("span");
    text.innerHTML = message;
    content.appendChild(text);
    notification.appendChild(content);
    document.body.appendChild(notification);
    if (duration > 0) {
        setTimeout(() => {
            if (document.body.contains(notification)) document.body.removeChild(notification);
        }, duration);
    }
    return notification;
}

fetchBtn.addEventListener("click", async () => {
    const lat = document.getElementById("lat").value;
    const lon = document.getElementById("lon").value;
    if (!lat || !lon) return alert("请输入正确的纬度和经度。");

    hideWeatherSections();
    let countdown = 5;
    const loadingNotification = showNotification('loading', `正在获取天气数据... <strong>${countdown}</strong>秒`, 0);
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            const span = loadingNotification.querySelector('span:last-child');
            if (span) span.innerHTML = `正在获取天气数据... <strong>${countdown}</strong>秒`;
        }
    }, 1000);

    const location = `${lat},${lon}`;
    const owCurrentUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKeyOW}&units=metric`;
    const owForecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKeyOW}&units=metric`;
    const wbCurrentUrl = `https://api.weatherbit.io/v2.0/current?lat=${lat}&lon=${lon}&key=${apiKeyWB}`;
    const wbHourlyUrl = `https://api.weatherbit.io/v2.0/forecast/hourly?lat=${lat}&lon=${lon}&key=${apiKeyWB}&hours=48`;
    const wbDailyUrl = `https://api.weatherbit.io/v2.0/forecast/daily?lat=${lat}&lon=${lon}&key=${apiKeyWB}`;
    const vcUrl = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${location}?key=${apiKeyVC}&unitGroup=metric&include=days,current,hours`;
    const omCurrentUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,precipitation,rain,weather_code,pressure_msl,cloud_cover&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,visibility&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto`;

    function fetchWithTimeout(url, options = {}, timeout = 5000) {
        return Promise.race([
            fetch(url, options),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]);
    }

/*     const windyPromise = fetch("https://api.windy.com/api/point-forecast/v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        model: "gfs",
        levels: ["surface"],
        parameters: ["temp", "rh", "wind", "pressure"],
        key: apiKeyWindy
      })
    })
      .then(res => {
        if (!res.ok) throw new Error("Windy request failed");
        return res.json().then(data => {
          console.log("WINDY API RESPONSE", data);
          return data;
        });
      })
      .catch(err => {
        console.error("Windy API error", err);
        return null;
      }); */


    const apiPromises = [ 
        fetchWithTimeout(owCurrentUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(owForecastUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(wbCurrentUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(wbHourlyUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(wbDailyUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(vcUrl).then(res => res.json()).catch(() => null),
        fetchWithTimeout(omCurrentUrl).then(res => res.json()).catch(() => null),
        // windyPromise
    ];

    try {
        currentTimezone = await getLocationTimezone(parseFloat(lat), parseFloat(lon));
        const results = await Promise.allSettled(apiPromises);
        clearInterval(countdownInterval);
        document.body.removeChild(loadingNotification);
        const [owCurrent, owForecast, wbCurrent, wbHourly, wbDaily, vcData, omData, windyData] = results.map(result => result.status === 'fulfilled' ? result.value : null);

        owHourlyData = [];
        wbHourlyData = [];
        vcHourlyData = [];
        omHourlyData = [];
        windyHourlyData = [];

        let owSuccess = false;
        let wbSuccess = false;
        let vcSuccess = false;
        let omSuccess = false
        let windySuccess = false;

        if (owCurrent && owForecast && owForecast.list) {
            displayCurrentWeatherOW(owCurrent);
            owHourlyData = owForecast.list;
            displayDailyForecastOW(owForecast.list);
            owSuccess = true;
        } else {
            currentWeatherEl.innerHTML = '<div class="weather-card red"><p style="color:#888">OpenWeather 数据获取失败</p></div>';
            openWeatherForecastEl.innerHTML = '<p style="color:#888">OpenWeather 预报数据获取失败</p>';
        }

        if (wbCurrent && wbCurrent.data && wbHourly && wbHourly.data && wbDaily && wbDaily.data) {
            displayCurrentWeatherWB(wbCurrent);
            wbHourlyData = wbHourly.data;
            displayDailyForecastWB(wbDaily.data);
            wbSuccess = true;
        } else {
            weatherbitCurrentEl.innerHTML = '<div class="weather-card blue"><p style="color:#888">Weatherbit 数据获取失败</p></div>';
            weatherbitForecastEl.innerHTML = '<p style="color:#888">Weatherbit 预报数据获取失败</p>';
        }

        if (vcData && vcData.currentConditions) {
            displayCurrentWeatherVC(vcData);
            vcHourlyData = [];
            if (vcData.days) {
                vcData.days.forEach(day => {
                    if (day.hours) {
                        day.hours.forEach(hour => {
                            vcHourlyData.push({...hour, fullDatetime: `${day.datetime}T${hour.datetime}`, date: day.datetime});
                        });
                    }
                });
            }
            if (vcData.days && vcData.days.length > 0) displayDailyForecastVC(vcData.days.slice(0, 8));
            vcSuccess = true;
        } else {
            visualCrossingCurrentEl.innerHTML = '<div class="weather-card yellow"><p style="color:#888">Visual Crossing 数据获取失败</p></div>';
            visualCrossingForecastEl.innerHTML = '<p style="color:#888">Visual Crossing 预报数据获取失败</p>';
        }

        if (omData && omData.current) {
            displayCurrentWeatherOM(omData);
            if (omData.hourly) omHourlyData = omData.hourly;
            displayDailyForecastOM(omData);
            omSuccess = true;
        } else {
            openMeteoCurrentEl.innerHTML = '<div class="weather-card brown"><p style="color:#888">Open-Meteo 数据获取失败</p></div>';
            openMeteoForecastEl.innerHTML = '<p style="color:#888">Open-Meteo 预报数据获取失败</p>';
        }

        /* const firstWindyTime = windyData.ts?.[0];
const chartStartTime = firstWindyTime !== undefined
  ? new Date(firstWindyTime + 8 * 60 * 60 * 1000 - 4 * 60 * 60 * 1000)
  : new Date();

        if (windyData && windyData.ts && windyData["temp-surface"]) {
          windyHourlyData = windyData.ts.map((ts, i) => ({
            // dt: new Date(ts + 8 * 60 * 60 * 1000),
            dt: new Date(ts + 8 * 60 * 60 * 1000 + (firstWindyTime !== undefined ? firstWindyTime - chartStartTime.getTime() : 0)),
            temp: windyData["temp-surface"][i] - 273.15,
            rh: windyData["rh-surface"]?.[i] ?? null,
            wind: windyData["wind-surface"]?.[i] ?? null,
            pressure: windyData["pressure-surface"]?.[i] ?? null,
            clouds: windyData["clouds-surface"]?.[i] ?? null,
            precip: windyData["precip-surface"]?.[i] ?? null
          }));
          displayCurrentWeatherWindy(windyHourlyData[0]);
          displayDailyForecastWindy(windyHourlyData);
          windySuccess = true;
        } else {
          document.getElementById("windyCurrent").innerHTML =
            '<div class="weather-card purple"><p style="color:#888">Windy 数据获取失败</p></div>';
        } */

        

        const successCount = [owSuccess, wbSuccess, vcSuccess, omSuccess].filter(Boolean).length;
        document.getElementById("hourlySlider").max = 48;

        if (owHourlyData.length > 0 || wbHourlyData.length > 0 || vcHourlyData.length > 0 || omHourlyData.length > 0) displayHourlyChart(12);
        showWeatherSections();
        
        if (successCount > 0) showNotification('success', `成功获取 ${successCount} 个数据源的天气数据！`);
        else showNotification('error', '所有天气数据源都获取失败', 4000);

    } catch (err) {
        clearInterval(countdownInterval);
        if (document.body.contains(loadingNotification)) document.body.removeChild(loadingNotification);
        console.error(err);
        showNotification('error', '获取天气数据时发生错误');
    }
});

function displayCurrentWeatherWindy(d) {
  const clouds = d.clouds !== null ? d.clouds + '%' : '未知';
  const precip = d.precip !== null ? d.precip.toFixed(1) + ' mm' : '未知';
  const rh = d.rh !== null ? d.rh + '%' : '未知';
  const wind = d.wind !== null ? d.wind.toFixed(1) + ' m/s' : '未知';
  const pressure = d.pressure !== null ? d.pressure.toFixed(0) + ' 百帕' : '未知';

  document.getElementById("windyCurrent").innerHTML = `
  <div class="weather-card purple">
    <div class="weather-date">${new Date(d.dt).toLocaleString()}</div>
    <div class="weather-location">${d.lat}, ${d.lon}</div>
    <div class="weather-main">
      <img src="https://openweathermap.org/img/wn/03d@2x.png" />
      <div class="temperature">${Math.round(d.temp)}°C</div>
    </div>
    <div class="weather-description">云量 ${clouds}，降水 ${precip}</div>
    <div class="weather-details">
      <div><strong>风速</strong>: ${wind}</div>
      <div><strong>气压</strong>: ${pressure}</div>
      <div><strong>湿度</strong>: ${rh}</div>
      <div><strong>能见度</strong>: 暂无数据</div>
      <div><strong>降水量</strong>: ${precip}</div>
    </div>
  </div>`;
}

function displayDailyForecastWindy(data) {
  const groups = {};
  data.forEach(item => {
    const dateStr = new Date(item.dt).toISOString().split("T")[0];
    if (!groups[dateStr]) groups[dateStr] = [];
    groups[dateStr].push(item);
  });

  const container = document.getElementById("windyForecast");
  container.innerHTML = "";
  const dates = Object.keys(groups).slice(0, 8);

  dates.forEach((dateStr, i) => {
    const group = groups[dateStr];
    const temps = group.map(d => d.temp);
    const min = Math.min(...temps);
    const max = Math.max(...temps);
    const clouds = Math.round(group.reduce((a, b) => a + (b.clouds || 0), 0) / group.length);
    const precip = group.reduce((a, b) => a + (b.precip || 0), 0).toFixed(1);
    const toggleId = `details-windy-${i}`;

    container.innerHTML += `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
          <img src="https://openweathermap.org/img/wn/03d.png" class="summary-icon" />
          <span class="summary-text">${dateStr}</span>
          <span class="summary-text">${Math.round(max)} / ${Math.round(min)}°C</span>
          <span class="summary-text">云量${clouds}% 降水${precip}mm</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details purple" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/03d@2x.png" />
            <div class="temperature">${Math.round((min + max) / 2)}°C</div>
          </div>
          <div class="weather-description">云量约 ${clouds}% ，降水 ${precip} mm</div>
          <div class="weather-details">
            <div><strong>风速</strong>: 暂无数据</div>
            <div><strong>气压</strong>: 暂无数据</div>
            <div><strong>湿度</strong>: 暂无数据</div>
            <div><strong>能见度</strong>: 暂无数据</div>
          </div>
        </div>
      </div>`;
  });
}


function displayCurrentWeatherOM(data) {
    const d = data.current;
    const weatherDesc = getWeatherDescription(d.weather_code);
    openMeteoCurrentEl.innerHTML = `
    <div class="weather-card brown">
      <div class="weather-date">${d.time}</div>
      <div class="weather-location"> ${data.latitude}, ${data.longitude}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/03d@2x.png" alt="图标" />
        <div class="temperature">${Math.round(d.temperature_2m)}°C</div>
      </div>
      <div class="weather-description">
        体感温度 ${Math.round(d.apparent_temperature)}°C，${weatherDesc}。
      </div>
      <div class="weather-details">
        <div><strong>风速</strong>: ${d.wind_speed_10m} 公里/小时</div>
        <div><strong>气压</strong>: ${d.pressure_msl} 百帕</div>
        <div><strong>湿度</strong>: ${d.relative_humidity_2m}%</div>
        <div><strong>能见度</strong>: 暂无数据</div>
        <div><strong>降水量</strong>: ${d.precipitation} 毫米</div>
      </div>
    </div>`;
}

function displayDailyForecastOM(omData) {
    const dates = (omData.daily && omData.daily.time) || [];
    const temps = (omData.daily && omData.daily.temperature_2m_max) || [];
    const tempsMin = (omData.daily && omData.daily.temperature_2m_min) || [];
    const weatherCodes = (omData.daily && omData.daily.weather_code) || [];
    const units = omData.hourly_units || {};
    openMeteoForecastEl.innerHTML = "";

    if (dates.length === 0 || temps.length === 0) {
        openMeteoForecastEl.innerHTML = '<p style="color:#888">无每日预报数据。</p>';
        return;
    }

    for (let i = 0; i < Math.min(8, dates.length); i++) {
        const toggleId = `details-om-${i}`;
        const dayHourlyIndexes = omData.hourly.time.map((t, idx) => t.startsWith(dates[i]) ? idx : -1).filter(idx => idx >= 0);
        const wind = omData.hourly.wind_speed_10m ? avg(omData.hourly.wind_speed_10m, dayHourlyIndexes).toFixed(1) : '暂无数据';
        const humidity = omData.hourly.relative_humidity_2m ? avg(omData.hourly.relative_humidity_2m, dayHourlyIndexes).toFixed(0) : '暂无数据';
        const visibilityM = omData.hourly.visibility ? avg(omData.hourly.visibility, dayHourlyIndexes) : null;
        const visibility = visibilityM ? (visibilityM / 1000).toFixed(1) : '暂无数据';
        const weatherDesc = getWeatherDescription(weatherCodes[i]);

        openMeteoForecastEl.innerHTML += `
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
            <img src="https://openweathermap.org/img/wn/03d@2x.png" alt="图标" />
            <div class="temperature">${Math.round((temps[i] + tempsMin[i]) / 2)}°C</div>
          </div>
          <div class="weather-description">
            ${weatherDesc}。
          </div>
          <div class="weather-details">
            <div><strong>风速</strong>: ${wind} ${units.wind_speed_10m || '公里/小时'}</div>
            <div><strong>气压</strong>: 暂无数据</div>
            <div><strong>湿度</strong>: ${humidity}${units.relative_humidity_2m || '%'}</div>
            <div><strong>能见度</strong>: ${visibility} 公里</div>
          </div>
        </div>
      </div>`;
    }
}

function displayCurrentWeatherVC(data) {
    const d = data.currentConditions;
    visualCrossingCurrentEl.innerHTML = `
    <div class="weather-card yellow">
      <div class="weather-date">${data.days[0].datetime}</div>
      <div class="weather-location">${data.resolvedAddress}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/01d@2x.png" alt="图标" />
        <div class="temperature">${Math.round(d.temp)}°C</div>
      </div>
      <div class="weather-description">
        体感温度 ${Math.round(d.feelslike)}°C, ${translateWeatherDescription(capitalize(d.conditions))}。
      </div>
      <div class="weather-details">
        <div><strong>风速</strong>: ${d.windspeed} 公里/小时</div>
        <div><strong>气压</strong>: ${d.pressure} 百帕</div>
        <div><strong>湿度</strong>: ${d.humidity}%</div>
        <div><strong>能见度</strong>: ${d.visibility} 公里</div>
        <div><strong>降水量</strong>: ${d.precip || 0} 毫米</div>
      </div>
    </div>`;
}

function displayDailyForecastVC(dayList) {
    visualCrossingForecastEl.innerHTML = "";
    dayList.forEach((d, idx) => {
        const toggleId = `details-vc-${idx}`;
        visualCrossingForecastEl.innerHTML += `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
        <img src="https://openweathermap.org/img/wn/${mapVCIconToOW(d.icon)}.png" class="summary-icon" />
          <span class="summary-text">${d.datetime}</span>
          <span class="summary-text">${Math.round(d.tempmax)} / ${Math.round(d.tempmin)}°C</span>
          <span class="summary-text">${mapVCIconToCN(d.icon)}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details yellow" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/${mapVCIconToOW(d.icon)}@2x.png" alt="图标" />
            <div class="temperature">${Math.round(d.temp)}°C</div>
          </div>
          <div class="weather-description">
            体感温度 ${Math.round(d.feelslike)}°C，${translateWeatherDescription(d.conditions)}。
          </div>
          <div class="weather-details">
            <div><strong>风速</strong>: ${d.windspeed} 公里/小时</div>
            <div><strong>气压</strong>: ${d.pressure} 百帕</div>
            <div><strong>湿度</strong>: ${d.humidity}%</div>
            <div><strong>能见度</strong>: ${d.visibility} 公里</div>
          </div>
        </div>
      </div>`;
    });
}

function displayCurrentWeatherOW(data) {
    const date = new Date(data.dt * 1000);
    currentWeatherEl.innerHTML = `
    <div class="weather-card red">
      <div class="weather-date">${date.toLocaleString()}</div>
      <div class="weather-location">${data.name}, ${data.sys.country}</div>
      <div class="weather-main">
        <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png" alt="图标" />
        <div class="temperature">${Math.round(data.main.temp)}°C</div>
      </div>
      <div class="weather-description">
        体感温度 ${Math.round(data.main.feels_like)}°C，${translateWeatherDescription(data.weather[0].description)}。
      </div>
      <div class="weather-details">
        <div><strong>风速</strong>: ${data.wind.speed} 米/秒 ${degToCompass(data.wind.deg)}</div>
        <div><strong>气压</strong>: ${data.main.pressure} 百帕</div>
        <div><strong>湿度</strong>: ${data.main.humidity}%</div>
        <div><strong>能见度</strong>: ${(data.visibility / 1000).toFixed(1)} 公里</div>
        <div><strong>降水量</strong>: ${(data.rain && data.rain['1h']) || (data.snow && data.snow['1h']) || 0} 毫米</div>
      </div>
    </div>`;
}

function displayCurrentWeatherWB(data) {
    const d = data.data[0];
    weatherbitCurrentEl.innerHTML = `
    <div class="weather-card blue">
      <div class="weather-date">${d.datetime}</div>
      <div class="weather-location">${d.city_name}, ${d.country_code}</div>
      <div class="weather-main">
        <img src="https://www.weatherbit.io/static/img/icons/${d.weather.icon}.png" alt="图标" />
        <div class="temperature">${Math.round(d.temp)}°C</div>
      </div>
      <div class="weather-description">
        体感温度 ${Math.round(d.app_temp)}°C，${translateWeatherDescription(d.weather.description)}。
      </div>
      <div class="weather-details">
        <div><strong>风速</strong>: ${d.wind_spd.toFixed(1)} 米/秒 ${translateWindDirection(d.wind_cdir)}</div>
        <div><strong>气压</strong>: ${d.pres} 百帕</div>
        <div><strong>湿度</strong>: ${d.rh}%</div>
        <div><strong>能见度</strong>: ${d.vis} 公里</div>
        <div><strong>降水量</strong>: ${d.precip || 0} 毫米</div>
      </div>
    </div>`;
}

function render24hTextForecast(containerId, data, source) {
  const container = document.getElementById(containerId);
  if (!container || !data || data.length === 0) return;
  container.innerHTML = '';

  if (source === 'om' && (!data.time || data.time.length === 0)) {
    container.innerHTML = '<p style="color:#888;padding:10px;">无24小时预报数据</p>';
    return;
  }

  const totalCount = source === 'om'? (data.time ? data.time.length : 0) : data.length;
const now = new Date();
let startIndex = 0;

for (let i = 0; i < totalCount; i++) {
  let dt;

  if (source === 'ow') {
    dt = new Date(data[i].dt * 1000);
  } else if (source === 'wb') {
    dt = new Date(data[i].timestamp_local);
  } else if (source === 'vc') {
    dt = new Date(data[i].fullDatetime || (data[i].date + 'T' + data[i].datetime));
  } else if (source === 'om' && data.time) {
    dt = new Date(data.time[i]);
  } else if (source === 'windy') {
    dt = new Date(data[i].dt);
  }

  if (dt && dt.getTime() >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours()).getTime()) {
    startIndex = i;
    break;
  }
}

for (let i = startIndex; i < Math.min(startIndex + 24, totalCount); i++) {
  let dt, temp, weather, icon;

    if (source === 'ow') {
  const now = new Date();
  const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

  let startIdx = data.findIndex(item => {
    const dt = new Date(item.dt * 1000);
    return dt.getTime() >= currentHour.getTime();
  });

  let count = 0;
  for (let i = 0; i < 24; i++) {
    const targetTime = new Date(currentHour.getTime() + i * 60 * 60 * 1000);
    let matched = null;

    for (let j = 0; j < data.length; j++) {
      const forecastTime = new Date(data[j].dt * 1000);
      const diff = Math.abs(forecastTime.getTime() - targetTime.getTime());
      if (diff < 90 * 60 * 1000) {
        matched = data[j];
        break;
      }
    }

    const dateStr = `${targetTime.getFullYear()}/${(targetTime.getMonth() + 1).toString().padStart(2, '0')}/${targetTime.getDate().toString().padStart(2, '0')}`;
    const hourStr = `${targetTime.getHours().toString().padStart(2, '0')}:00`;

    const block = document.createElement('div');
    block.className = 'day-item hourly-item-small';

    if (matched) {
      const temp = Math.round(matched.main.temp) + '°C';
      const weather = translateWeatherDescription(matched.weather[0].description);
      const icon = `https://openweathermap.org/img/wn/${matched.weather[0].icon}.png`;
      block.innerHTML = `
        <div class="summary small-summary">
          <img src="${icon}" class="summary-icon hourly-icon" />
          <span class="summary-text">${dateStr}</span>
          <span class="summary-text">${hourStr}</span>
          <span class="summary-text">${temp}</span>
          <span class="summary-text">${weather}</span>
        </div>`;
    } else {
      block.innerHTML = `
        <div class="summary small-summary">
          <img src="https://openweathermap.org/img/wn/01d.png" class="summary-icon hourly-icon" />
          <span class="summary-text">${dateStr}</span>
          <span class="summary-text">${hourStr}</span>
          <span class="summary-text">--</span>
          <span class="summary-text">暂无数据</span>
        </div>`;
    }

    container.appendChild(block);
  }
  return;
}
 else if (source === 'wb') {
      dt = new Date(data[i].timestamp_local);
      temp = Math.round(data[i].temp) + '°C';
      weather = translateWeatherDescription(data[i].weather.description);
      icon = `https://www.weatherbit.io/static/img/icons/${data[i].weather.icon}.png`;
    } else if (source === 'vc') {
      dt = new Date(data[i].fullDatetime || (data[i].date + 'T' + data[i].datetime));
      temp = Math.round(data[i].temp) + '°C';
      weather = translateWeatherDescription(data[i].conditions);
      icon = `https://openweathermap.org/img/wn/${mapVCIconToOW(data[i].icon)}.png`;
    } else if (source === 'om' && data.time && data.time.length > i) {
      dt = new Date(data.time[i]);
      temp = Math.round(data.temperature_2m[i]) + '°C';
      weather = getWeatherDescription(data.weather_code[i]);
      icon = `https://openweathermap.org/img/wn/03d.png`;
    } else if (source === 'windy') {
      dt = new Date(data[i].dt);
      temp = Math.round(data[i].temp) + '°C';
      weather = `云量${data[i].clouds || 0}% 降水${data[i].precip?.toFixed(1) || 0}mm`;
      icon = `https://openweathermap.org/img/wn/03d.png`;
    }


    const dateStr = `${dt.getFullYear()}/${(dt.getMonth() + 1).toString().padStart(2, '0')}/${dt.getDate().toString().padStart(2, '0')}`;
    const hourStr = `${dt.getHours().toString().padStart(2, '0')}:00`;

    const block = document.createElement('div');
    block.className = 'day-item hourly-item-small';
    block.innerHTML = `
      <div class="summary small-summary">
        <img src="${icon}" class="summary-icon hourly-icon" />
        <span class="summary-text">${dateStr}</span>
        <span class="summary-text">${hourStr}</span>
        <span class="summary-text">${temp}</span>
        <span class="summary-text">${weather}</span>
      </div>
    `;
    container.appendChild(block);
  }
}

function displayHourlyChart(count) {
    if (!currentTimezone) {
        console.warn('No timezone set, using local time');
        currentTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    if (!owHourlyData || owHourlyData.length === 0) {
        console.warn('No OpenWeather data available');
        return;
    }

    const now = new Date();
    let currentLocalTime;
    if (typeof currentTimezone === 'string') {
        try {
            currentLocalTime = new Date(now.toLocaleString('en-US', { timeZone: currentTimezone }));
        } catch (e) {
            currentLocalTime = now;
        }
    } else {
        currentLocalTime = new Date(now.getTime() + (currentTimezone * 60 * 60 * 1000));
    }

    const currentHour = currentLocalTime.getHours();
    const currentMinute = currentLocalTime.getMinutes();
    const formattedMinute = currentMinute < 10 ? "0" + currentMinute : currentMinute;
    const startTime = new Date(currentLocalTime);
    startTime.setHours(currentHour, 0, 0, 0);

    const labels = [];
    const hourlyTimes = [];

    for (let i = 0; i < count; i++) {
        const targetTime = new Date(startTime.getTime() + (i * 60 * 60 * 1000));
        hourlyTimes.push(targetTime);
        labels.push(targetTime.getHours().toString().padStart(2, '0') + ":00");
    }

    const owTemps = hourlyTimes.map(targetTime => {
        let closest = null;
        let minDiff = Infinity;
        const isNonAsian = typeof currentTimezone === 'string' &&
            !currentTimezone.includes('Asia/') &&
            !currentTimezone.includes('Pacific/') &&
            !currentTimezone.includes('Australia/');
        owHourlyData.forEach(item => {
            let itemTime;
            if (isNonAsian) {
                const utcTime = new Date(item.dt * 1000);
                try {
                    const localTimeString = utcTime.toLocaleString('en-US', {
                        timeZone: currentTimezone,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false
                    });
                    itemTime = new Date(localTimeString);
                } catch (e) {
                    itemTime = utcTime;
                }
            } else {
                itemTime = new Date(item.dt * 1000);
            }
            const diff = Math.abs(targetTime.getTime() - itemTime.getTime());
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        });
        return closest ? closest.main.temp : null;
    });

    const wbTemps = hourlyTimes.map(targetTime => {
        let closest = null;
        let minDiff = Infinity;
        wbHourlyData.forEach(entry => {
            const entryTime = new Date(entry.timestamp_local);
            const diff = Math.abs(targetTime.getTime() - entryTime.getTime());
            if (diff < minDiff && diff < 2 * 60 * 60 * 1000) {
                minDiff = diff;
                closest = entry;
            }
        });
        return closest?.temp ?? null;
    });

    const vcTemps = hourlyTimes.map(targetTime => {
        const targetHour = targetTime.getHours().toString().padStart(2, '0');
        const targetDate = targetTime.getFullYear() + '-' +
            (targetTime.getMonth() + 1).toString().padStart(2, '0') + '-' +
            targetTime.getDate().toString().padStart(2, '0');
        const match = vcHourlyData.find(hour => {
            const hourMatches = hour.datetime === `${targetHour}:00:00`;
            const dateMatches = hour.date === targetDate;
            return hourMatches && dateMatches;
        });
        return match?.temp ?? null;
    });

    const omTemps = hourlyTimes.map(targetTime => {
        const targetIso = targetTime.getFullYear() + '-' +
            (targetTime.getMonth() + 1).toString().padStart(2, '0') + '-' +
            targetTime.getDate().toString().padStart(2, '0') + 'T' +
            targetTime.getHours().toString().padStart(2, '0') + ':00';
        const idx = omHourlyData.time ? omHourlyData.time.findIndex(t => t === targetIso) : -1;
        return idx !== -1 && omHourlyData.temperature_2m ? omHourlyData.temperature_2m[idx] : null;
    });

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
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: "Weatherbit",
                    data: wbTemps,
                    borderColor: "#4287f5",
                    backgroundColor: "rgba(66,135,245,0.1)",
                    fill: true,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: "Visual Crossing",
                    data: vcTemps,
                    borderColor: "#f4c542",
                    backgroundColor: "rgba(244,197,66,0.1)",
                    fill: true,
                    tension: 0.3,
                    spanGaps: true
                },
                {
                    label: "Open-Meteo",
                    data: omTemps,
                    borderColor: "#996633",
                    backgroundColor: "rgba(151, 108, 43, 0.1)",
                    fill: true,
                    tension: 0.3,
                    spanGaps: true
                }
  //               {
  // label: "Windy",
  // data: hourlyTimes.map(targetTime => {
  //   let match = null;
  //   for (let i = 0; i < windyHourlyData.length; i++) {
  //     const baseTime = new Date(windyHourlyData[i].dt).getTime();
  //     const nextTime = baseTime + 3 * 60 * 60 * 1000;
  //     const t = targetTime.getTime();
  //     if (t >= baseTime && t < nextTime) {
  //       match = windyHourlyData[i];
  //       break;
  //     }
  //   }
  //   return match ? match.temp : null;
  // }),
//   borderColor: "#6f42c1",
//   backgroundColor: "rgba(111, 66, 193, 0.1)",
//   fill: true,
//   tension: 0.3,
//   spanGaps: true
// }


            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `小时天气数据（当地时间: ${currentLocalTime.toLocaleDateString('zh-CN')} ${currentHour}:${formattedMinute}）`
                }
            },
            scales: {
                y: {
                    suggestedMin: 0,
                    suggestedMax: 40,
                    title: {
                        display: true,
                        text: '温度 (°C)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '当地时间 (24小时制)'
                    }
                }
            }
        }
    });

  render24hTextForecast('owHourlyForecast', owHourlyData, 'ow');
  render24hTextForecast('wbHourlyForecast', wbHourlyData, 'wb');
  render24hTextForecast('vcHourlyForecast', vcHourlyData, 'vc');
  render24hTextForecast('omHourlyForecast', omHourlyData, 'om');
  // render24hTextForecast('windyHourlyForecast', windyHourlyData, 'windy');

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

        openWeatherForecastEl.innerHTML += `
      <div class="day-item">
        <div class="summary" onclick="toggleDetails('${toggleId}')">
          <img src="https://openweathermap.org/img/wn/${mainWeather.icon}.png" class="summary-icon" />
          <span class="summary-text">${dateStr}</span>
          <span class="summary-text">${Math.round(maxTemp)} / ${Math.round(minTemp)}°C</span>
          <span class="summary-text">${translateWeatherDescription(mainWeather.description)}</span>
          <span class="summary-toggle">&#9660;</span>
        </div>
        <div class="weather-card toggle-details red" id="${toggleId}" style="display: none;">
          <div class="weather-main">
            <img src="https://openweathermap.org/img/wn/${mainWeather.icon}@2x.png" alt="图标" />
            <div class="temperature">${Math.round(entries[0].main.temp)}°C</div>
          </div>
          <div class="weather-description">
            体感温度 ${Math.round(entries[0].main.feels_like)}°C，${translateWeatherDescription(mainWeather.description)}。
          </div>
          <div class="weather-details">
            <div><strong>风速</strong>: ${entries[0].wind.speed} 米/秒 ${degToCompass(entries[0].wind.deg)}</div>
            <div><strong>气压</strong>: ${entries[0].main.pressure} 百帕</div>
            <div><strong>湿度</strong>: ${entries[0].main.humidity}%</div>
            <div><strong>能见度</strong>: ${(entries[0].visibility / 1000).toFixed(1)} 公里</div>
          </div>
        </div>
      </div>`;
    });
}

function displayDailyForecastWB(dataList) {
    weatherbitForecastEl.innerHTML = "";
    dataList.slice(0, 8).forEach((d, idx) => {
        const day = new Date(d.valid_date).toLocaleDateString("zh-CN", { weekday: "short", month: "short", day: "numeric" });
        const icon = d.weather.icon;
        const desc = translateWeatherDescription(d.weather.description);
        const min = Math.round(d.min_temp);
        const max = Math.round(d.max_temp);
        const toggleId = `details-wb-${idx}`;

        weatherbitForecastEl.innerHTML += `
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
            <img src="https://www.weatherbit.io/static/img/icons/${icon}.png" alt="图标" />
            <div class="temperature">${Math.round(d.temp)}°C</div>
          </div>
          <div class="weather-description">
            体感温度 ${Math.round(d.app_max_temp)}°C，${desc}。
          </div>
          <div class="weather-details">
            <div><strong>风速</strong>: ${d.wind_spd.toFixed(1)} 米/秒 ${translateWindDirection(d.wind_cdir)}</div>
            <div><strong>气压</strong>: ${d.pres} 百帕</div>
            <div><strong>湿度</strong>: ${d.rh}%</div>
            <div><strong>能见度</strong>: ${d.vis} 公里</div>
          </div>
        </div>
      </div>`;
    });
}

function toggleDetails(id) {
    const el = document.getElementById(id);
    el.style.display = el.style.display === "none" ? "block" : "none";
}

function degToCompass(deg) {
    const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
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

function mapVCIconToCN(vcIcon) {
    const cnMap = {
        'clear-day': '晴天',
        'clear-night': '晴夜',
        'partly-cloudy-day': '白天局部多云',
        'partly-cloudy-night': '夜间局部多云',
        'cloudy': '多云',
        'fog': '雾',
        'wind': '有风',
        'rain': '下雨',
        'snow': '下雪',
        'sleet': '雨夹雪',
        'showers-day': '白天阵雨',
        'showers-night': '夜间阵雨',
        'thunderstorm': '雷暴'
    };
    return cnMap[vcIcon] || '未知天气';
}

function getWeatherDescription(code) {
    const weatherCodes = {
        0: '晴朗',
        1: '部分晴朗',
        2: '部分多云',
        3: '阴天',
        45: '雾',
        48: '结霜雾',
        51: '轻毛毛雨',
        53: '中等毛毛雨',
        55: '浓密毛毛雨',
        56: '轻冻毛毛雨',
        57: '浓密冻毛毛雨',
        61: '小雨',
        63: '中雨',
        65: '大雨',
        66: '轻冻雨',
        67: '大冻雨',
        71: '小雪',
        73: '中雪',
        75: '大雪',
        77: '雪粒',
        80: '小阵雨',
        81: '中阵雨',
        82: '暴雨',
        85: '小雪阵雨',
        86: '大雪阵雨',
        95: '雷雨',
        96: '雷雨伴小冰雹',
        99: '雷雨伴大冰雹'
    };
    return weatherCodes[code] || '未知';
}

function translateWeatherDescription(desc) {
  const translations = {
    'clear': '晴朗',
    'clear sky': '晴朗',
    'few clouds': '少云',
    'scattered clouds': '疏云',
    'broken clouds': '多云',
    'overcast clouds': '阴天',
    'shower rain': '阵雨',
    'rain': '雨',
    'thunderstorm': '雷雨',
    'snow': '雪',
    'mist': '薄雾',
    'fog': '雾',
    'haze': '霾',
    'dust': '沙尘',
    'sand': '沙',
    'ash': '火山灰',
    'squall': '飑',
    'tornado': '龙卷风',
    'light rain': '小雨',
    'moderate rain': '中雨',
    'heavy rain': '大雨',
    'heavy intensity rain': '大雨',
    'very heavy rain': '暴雨',
    'extreme rain': '大暴雨',
    'freezing rain': '冻雨',
    'light intensity shower rain': '小阵雨',
    'heavy intensity shower rain': '大阵雨',
    'ragged shower rain': '零星阵雨',
    'partly cloudy': '局部多云',
    'partially cloudy': '局部多云',
    'mostly cloudy': '大部分多云',
    'cloudy': '多云',
    'overcast': '阴天',
    'light snow': '小雪',
    'moderate snow': '中雪',
    'heavy snow': '大雪',
    'mix snow/rain': '雨夹雪',
    'thunderstorm with rain': '雷雨',
    'thunderstorm with heavy rain': '雷暴雨',
    'drizzle': '毛毛雨',
    'freezing drizzle': '冻毛毛雨',
    'flurries': '小雪花',
    'light shower rain': '小阵雨',
    'heavy shower rain': '大阵雨'
  };

  if (!desc || typeof desc !== 'string') return desc;

  return desc.split(',').map(d => {
    const normalized = d.trim().toLowerCase();
    return translations[normalized] || d.trim();
  }).join('，');
}


function translateWindDirection(windDir) {
  const windTranslations = {
    'N': '北',
    'NNE': '北东北',
    'NE': '东北', 
    'ENE': '东北东',
    'E': '东',
    'ESE': '东南东',
    'SE': '东南',
    'SSE': '南南东',
    'S': '南',
    'SSW': '南南西',
    'SW': '西南',
    'WSW': '西南西',
    'W': '西',
    'WNW': '西北西',
    'NW': '西北',
    'NNW': '北北西'
  };
  
  return windTranslations[windDir] || windDir;
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
  setTimeout(() => {
    fetchBtn.click();
  }, 100);
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("lat").value = "26.049064"; 
    document.getElementById("lon").value = "119.279749";
    fetchBtn.click();
});

function selectCityWithDefaultHours(lat, lon) {
  document.getElementById('hourlySlider').value = 12;
  document.getElementById('hourlySliderValue').textContent = '12';
  setCity(lat, lon);
}