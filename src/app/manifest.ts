import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "YTK Lucky Draw",
    short_name: "Lucky Draw",
    start_url: "/",
    display: "fullscreen",
    orientation: "any",
    background_color: "#141a26",
    theme_color: "#141a26",
  };
}
