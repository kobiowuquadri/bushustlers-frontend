import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bushustlers",
    short_name: "Bushustlers",
    description: "Payment links that confirm your sales.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#08281F",
    theme_color: "#08281F",
    icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
  };
}
