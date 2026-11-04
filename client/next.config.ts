import type { NextConfig } from "next";
const config: NextConfig = {
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
};
export default config;
