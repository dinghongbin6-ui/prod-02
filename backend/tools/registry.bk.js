import { getWeather } from "./weather.js";
import { getTime } from "./time.js";

export const toolRegistry = {
  get_weather: {
    definition: {
      type: "function",
      function: {
        name: "get_weather",
        description: "查询城市实时天气",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "城市名称"
            }
          },
          required: ["city"]
        }
      }
    },

    execute: async (args) => {
      return await getWeather(args.city);
    }
  },

  get_time: {
    definition: {
      type: "function",
      function: {
        name: "get_time",
        description:
          "获取当前日期时间和星期",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },

    execute: async () => {
      return await getTime();
    }
  }
};