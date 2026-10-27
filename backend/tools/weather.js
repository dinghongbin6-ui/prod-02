import "../config.js";

export async function getWeather(city) {
  const cityMap = {
    北京: "beijing",
    上海: "shanghai",
    广州: "guangzhou",
    深圳: "shenzhen",
    大连: "dalian",
    杭州: "hangzhou",
    南京: "nanjing",
    成都: "chengdu",
    武汉: "wuhan",
    西安: "xian",
    重庆: "chongqing",
    天津: "tianjin",
    苏州: "suzhou",
    青岛: "qingdao",
    厦门: "xiamen"
  };

  const apiKey = process.env.OPENWEATHER_KEY;

  if (!apiKey) {
    return {
      success: false,
      error: "OPENWEATHER_KEY未配置"
    };
  }

  const targetCity = cityMap[city] || city;
  const params = new URLSearchParams({
    q: targetCity,
    appid: apiKey,
    units: "metric",
    lang: "zh_cn"
  });
  const url = `https://api.openweathermap.org/data/2.5/weather?${params}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return {
        success: false,
        error: `天气接口请求失败(${response.status})`
      };
    }

    const data = await response.json();

    if (!data.main) {
      return {
        success: false,
        error: data.message || "获取天气失败"
      };
    }

    return {
      success: true,
      data: {
        city: data.name,
        temperature: data.main.temp,
        humidity: data.main.humidity,
        feels_like: data.main.feels_like,
        weather: data.weather?.[0]?.main,
        description: data.weather?.[0]?.description,
        update_time: new Date().toISOString()
      },
      error: null
    };
  } catch (err) {
    return {
      success: false,
      error: err.name === "AbortError" ? "天气查询超时，请稍后重试" : err.message || "天气查询异常"
    };
  } finally {
    clearTimeout(timeout);
  }
}
