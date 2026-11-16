
const searchForm = document.getElementById("searchForm");
const cityInput = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");
const message = document.getElementById("message");
const weatherContent = document.getElementById("weatherContent");
const emptyState = document.getElementById("emptyState");

let temperatureChart = null;

const weatherConditions = {
    0: { description: "Céu limpo", day: "☀️", night: "🌙" },
    1: { description: "Predominantemente limpo", day: "🌤️", night: "🌙" },
    2: { description: "Parcialmente nublado", day: "⛅", night: "☁️" },
    3: { description: "Nublado", day: "☁️", night: "☁️" },
    45: { description: "Nevoeiro", day: "🌫️", night: "🌫️" },
    48: { description: "Nevoeiro com geada", day: "🌫️", night: "🌫️" },
    51: { description: "Garoa leve", day: "🌦️", night: "🌧️" },
    53: { description: "Garoa moderada", day: "🌦️", night: "🌧️" },
    55: { description: "Garoa intensa", day: "🌧️", night: "🌧️" },
    56: { description: "Garoa congelante leve", day: "🌧️", night: "🌧️" },
    57: { description: "Garoa congelante intensa", day: "🌧️", night: "🌧️" },
    61: { description: "Chuva leve", day: "🌦️", night: "🌧️" },
    63: { description: "Chuva moderada", day: "🌧️", night: "🌧️" },
    65: { description: "Chuva forte", day: "🌧️", night: "🌧️" },
    66: { description: "Chuva congelante leve", day: "🌧️", night: "🌧️" },
    67: { description: "Chuva congelante forte", day: "🌧️", night: "🌧️" },
    71: { description: "Neve leve", day: "🌨️", night: "🌨️" },
    73: { description: "Neve moderada", day: "❄️", night: "❄️" },
    75: { description: "Neve intensa", day: "❄️", night: "❄️" },
    77: { description: "Grãos de neve", day: "🌨️", night: "🌨️" },
    80: { description: "Pancadas de chuva leves", day: "🌦️", night: "🌧️" },
    81: { description: "Pancadas de chuva moderadas", day: "🌧️", night: "🌧️" },
    82: { description: "Pancadas de chuva fortes", day: "⛈️", night: "⛈️" },
    85: { description: "Pancadas de neve leves", day: "🌨️", night: "🌨️" },
    86: { description: "Pancadas de neve fortes", day: "❄️", night: "❄️" },
    95: { description: "Tempestade", day: "⛈️", night: "⛈️" },
    96: { description: "Tempestade com granizo leve", day: "⛈️", night: "⛈️" },
    99: { description: "Tempestade com granizo forte", day: "⛈️", night: "⛈️" }
};

function getWeatherInfo(code, isDay = true) {
    const condition = weatherConditions[code] || {
        description: "Condição não identificada",
        day: "🌤️",
        night: "🌙"
    };

    return {
        description: condition.description,
        icon: isDay ? condition.day : condition.night
    };
}

function showMessage(text, type = "") {
    message.textContent = text;
    message.className = "message " + type;
}

function formatNumber(value, decimals = 0) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) {
        return "--";
    }

    return Number(value).toFixed(decimals);
}

function getLocationName(location) {
    const parts = [
        location.admin2,
        location.admin1,
        location.country
    ].filter(Boolean);

    return [...new Set(parts)].join(", ");
}

function getCurrentHourIndex(times, currentTime) {
    const currentDate = new Date(currentTime).getTime();

    let closestIndex = 0;
    let smallestDifference = Infinity;

    times.forEach((time, index) => {
        const difference = Math.abs(new Date(time).getTime() - currentDate);

        if (difference < smallestDifference) {
            smallestDifference = difference;
            closestIndex = index;
        }
    });

    return closestIndex;
}

async function searchCity(city) {
    const url = new URL("https://geocoding-api.open-meteo.com/v1/search");

    url.search = new URLSearchParams({
        name: city,
        count: "10",
        language: "pt",
        format: "json"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Não foi possível consultar a localização.");
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
        throw new Error("Cidade não encontrada. Verifique o nome e tente novamente.");
    }

    const cityLower = city.trim().toLocaleLowerCase("pt-BR");

    const exactMatch = data.results.find(item =>
        item.name.toLocaleLowerCase("pt-BR") === cityLower
    );

    return exactMatch || data.results[0];
}

async function getWeather(latitude, longitude) {
    const url = new URL("https://api.open-meteo.com/v1/forecast");

    url.search = new URLSearchParams({
        latitude: latitude,
        longitude: longitude,
        current: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "wind_speed_10m"
        ].join(","),
        hourly: [
            "temperature_2m",
            "precipitation_probability"
        ].join(","),
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "precipitation_probability_max"
        ].join(","),
        forecast_days: "5",
        timezone: "auto",
        wind_speed_unit: "kmh"
    });

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Não foi possível obter os dados meteorológicos.");
    }

    return await response.json();
}

function updateCurrentWeather(location, data) {
    const current = data.current;
    const weather = getWeatherInfo(current.weather_code, current.is_day === 1);

    document.getElementById("cityName").textContent = location.name;
    document.getElementById("locationDetails").textContent = getLocationName(location);

    document.getElementById("weatherIcon").textContent = weather.icon;
    document.getElementById("weatherDescription").textContent = weather.description;

    document.getElementById("temperature").textContent =
        formatNumber(current.temperature_2m);

    document.getElementById("feelsLike").textContent =
        formatNumber(current.apparent_temperature) + "°C";

    document.getElementById("humidity").textContent =
        formatNumber(current.relative_humidity_2m) + "%";

    document.getElementById("windSpeed").textContent =
        formatNumber(current.wind_speed_10m, 1) + " km/h";

    document.getElementById("precipitation").textContent =
        formatNumber(current.precipitation, 1) + " mm";

    const hourIndex = getCurrentHourIndex(
        data.hourly.time,
        current.time
    );

    document.getElementById("rainChance").textContent =
        formatNumber(data.hourly.precipitation_probability[hourIndex]) + "%";

    const currentDate = new Date(current.time);

    document.getElementById("updateTime").textContent =
        "Horário local: " +
        currentDate.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC"
        });
}

function createTemperatureChart(data) {
    const hourly = data.hourly;

    const startIndex = getCurrentHourIndex(
        hourly.time,
        data.current.time
    );

    const times = hourly.time.slice(startIndex, startIndex + 24);
    const temperatures = hourly.temperature_2m.slice(startIndex, startIndex + 24);

    const labels = times.map(time => {
        const date = new Date(time);

        return date.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "UTC"
        });
    });

    const canvas = document.getElementById("temperatureChart");

    if (temperatureChart) {
        temperatureChart.destroy();
    }

    temperatureChart = new Chart(canvas, {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Temperatura",
                data: temperatures,
                borderColor: "#55b7ff",
                backgroundColor: "rgba(85,183,255,0.13)",
                borderWidth: 3,
                pointBackgroundColor: "#ffffff",
                pointBorderColor: "#55b7ff",
                pointRadius: 4,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: "#101b35",
                    titleColor: "#ffffff",
                    bodyColor: "#ffffff",
                    padding: 12,
                    callbacks: {
                        label: context => context.parsed.y + " °C"
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: "#9aabc5",
                        maxTicksLimit: 8
                    },
                    border: {
                        display: false
                    }
                },
                y: {
                    grid: {
                        color: "rgba(255,255,255,0.07)"
                    },
                    ticks: {
                        color: "#9aabc5",
                        callback: value => value + "°"
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
}

function createForecast(data) {
    const forecastContainer = document.getElementById("forecastDays");

    forecastContainer.innerHTML = "";

    data.daily.time.forEach((date, index) => {
        const weather = getWeatherInfo(data.daily.weather_code[index]);

        const dateObject = new Date(date + "T12:00:00");

        const dayName = index === 0
            ? "Hoje"
            : dateObject.toLocaleDateString("pt-BR", {
                weekday: "short",
                timeZone: "UTC"
            });

        const max = formatNumber(data.daily.temperature_2m_max[index]);
        const min = formatNumber(data.daily.temperature_2m_min[index]);
        const rain = formatNumber(
            data.daily.precipitation_probability_max[index]
        );

        const card = document.createElement("div");

        card.className = "forecast-card";

        const day = document.createElement("p");
        day.className = "day";
        day.textContent = dayName;

        const icon = document.createElement("div");
        icon.className = "icon";
        icon.textContent = weather.icon;

        const description = document.createElement("p");
        description.className = "description";
        description.textContent = weather.description;

        const maximum = document.createElement("p");
        maximum.className = "max";
        maximum.textContent = max + "°C";

        const minimum = document.createElement("p");
        minimum.className = "min";
        minimum.textContent = min + "°C";

        const rainChance = document.createElement("p");
        rainChance.className = "min";
        rainChance.textContent = "🌧️ " + rain + "%";

        card.append(day, icon, description, maximum, minimum, rainChance);

        forecastContainer.appendChild(card);
    });
}

async function handleSearch(event) {
    event.preventDefault();

    const city = cityInput.value.trim();

    if (!city) {
        showMessage("Por favor, digite o nome de uma cidade.", "error");
        cityInput.focus();
        return;
    }

    searchButton.disabled = true;
    searchButton.textContent = "Buscando...";
    weatherContent.classList.add("hidden");
    emptyState.classList.add("hidden");

    showMessage("Consultando informações meteorológicas...", "loading");

    try {
        const location = await searchCity(city);

        const weatherData = await getWeather(
            location.latitude,
            location.longitude
        );

        updateCurrentWeather(location, weatherData);
        createTemperatureChart(weatherData);
        createForecast(weatherData);

        weatherContent.classList.remove("hidden");
        emptyState.classList.add("hidden");

        showMessage("Informações meteorológicas carregadas com sucesso.");

    } catch (error) {
        weatherContent.classList.add("hidden");
        emptyState.classList.remove("hidden");

        showMessage(error.message, "error");

    } finally {
        searchButton.disabled = false;
        searchButton.innerHTML = 'Buscar <span>→</span>';
    }
}

searchForm.addEventListener("submit", handleSearch);
