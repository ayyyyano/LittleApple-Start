export type WeatherCondition = "clear" | "partlyCloudy" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface NormalizedWeather {
  temperature: number;
  condition: WeatherCondition;
  icon: string;
  code: number;
  location: string;
  updatedAt: string;
}
