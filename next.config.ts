import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: false, // двойной mount в dev дублирует подключение к комнате
  poweredByHeader: false,
};

export default config;
