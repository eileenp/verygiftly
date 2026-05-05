import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";

function getMeta(html: string, property: string): string {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtmlEntities(m[1].trim());
  }
  return "";
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractJsonLd(html: string): { name?: string; price?: string; image?: string } {
  const scriptRe = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) {
    try {
      const raw = JSON.parse(match[1]);
      const candidates = Array.isArray(raw) ? raw : [raw];
      for (const node of candidates) {
        if (node["@type"] === "Product") {
          const name = node.name ?? undefined;
          const image = Array.isArray(node.image) ? node.image[0] : node.image ?? undefined;
          let price: string | undefined;
          if (node.offers) {
            const offers = Array.isArray(node.offers) ? node.offers : [node.offers];
            const first = offers[0];
            if (first?.price != null) price = String(first.price);
          }
          return { name, price, image };
        }
      }
    } catch {
      // malformed JSON-LD — skip
    }
  }
  return {};
}

function getTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m?.[1] ? decodeHtmlEntities(m[1].trim()) : "";
}

function isSafeUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    // Block private/internal IP ranges
    if (
      host === "localhost" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      host === "0.0.0.0" ||
      host.endsWith(".internal") ||
      host.endsWith(".local")
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export const scrapeRouter = createRouter({
  scrapeUrl: authedQuery
    .input(z.object({ url: z.string().url().max(2048) }))
    .mutation(async ({ input }) => {
      if (!isSafeUrl(input.url)) {
        throw new Error("URL not allowed");
      }

      let html: string;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const resp = await fetch(input.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (compatible; Gifsto/1.0; +https://gifsto.pages.dev)",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        clearTimeout(timeout);

        const contentType = resp.headers.get("content-type") ?? "";
        if (!contentType.includes("text/html")) {
          throw new Error("URL did not return an HTML page");
        }
        // Read at most 500 KB to avoid huge pages stalling the worker
        const reader = resp.body?.getReader();
        if (!reader) throw new Error("No response body");
        const chunks: Uint8Array[] = [];
        let totalBytes = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done || !value) break;
          chunks.push(value);
          totalBytes += value.byteLength;
          if (totalBytes >= 512 * 1024) { reader.cancel(); break; }
        }
        html = new TextDecoder().decode(
          chunks.reduce((acc, c) => {
            const merged = new Uint8Array(acc.length + c.length);
            merged.set(acc);
            merged.set(c, acc.length);
            return merged;
          }, new Uint8Array(0)),
        );
      } catch (err: any) {
        if (err?.name === "AbortError") throw new Error("Request timed out");
        throw new Error("Failed to fetch URL");
      }

      const jsonLd = extractJsonLd(html);

      const name =
        jsonLd.name ||
        getMeta(html, "og:title") ||
        getMeta(html, "twitter:title") ||
        getTitle(html) ||
        "";

      const imageUrl =
        jsonLd.image ||
        getMeta(html, "og:image") ||
        getMeta(html, "twitter:image") ||
        "";

      const price =
        jsonLd.price ||
        getMeta(html, "og:price:amount") ||
        getMeta(html, "product:price:amount") ||
        "";

      const purchaseUrl =
        getMeta(html, "og:url") || input.url;

      return {
        name: name.slice(0, 255),
        imageUrl: imageUrl.slice(0, 2048),
        price: price ? parseFloat(price) || undefined : undefined,
        purchaseUrl: purchaseUrl.slice(0, 2048),
      };
    }),
});
