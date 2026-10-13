import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/sign-in", "/sign-up", "/my-requests", "/cart", "/request"],
      },
    ],
    sitemap: `${process.env.NEXTAUTH_URL ?? "https://parrotrehome.com"}/sitemap.xml`,
    host: process.env.NEXTAUTH_URL ?? "https://parrotrehome.com",
  };
}
