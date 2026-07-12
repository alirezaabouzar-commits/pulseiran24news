// ==========================================================
// Netlify Function: تیترهای رسانه‌های بین‌المللی فارسی‌زبان
// ==========================================================

const FEEDS = [
  {
    name: "ایران اینترنشنال",
    urls: [
      "https://www.iranintl.com/fa/rss.xml",
      "https://www.iranintl.com/rss.xml",
      "https://old.iranintl.com/fa/rss.xml"
    ]
  },
  {
    name: "بی‌بی‌سی فارسی",
    urls: ["https://feeds.bbci.co.uk/persian/rss.xml"]
  },
  {
    name: "دویچه‌وله فارسی",
    urls: ["https://rss.dw.com/rdf/rss-per-all"]
  }
];

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300"
};

function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseFeed(xml, sourceName, limit) {
  const out = [];
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/g) || [];
  for (const block of items) {
    const tM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/);
    const lM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/);
    const title = decode(tM && tM[1]);
    const link = decode(lM && lM[1]);
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    out.push({ t: title.slice(0, 160), l: link, s: sourceName });
    if (out.length >= limit) break;
  }
  return out;
}

async function fetchFeed(feed, limit) {
  for (const url of feed.urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; PulseIran24/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*"
        }
      });
      if (!res.ok) continue;
      const xml = await res.text();
      const items = parseFeed(xml, feed.name, limit);
      if (items.length) return items;
    } catch (e) { /* آدرس بعدی */ }
  }
  return [];
}

exports.handler = async () => {
  try {
    const results = await Promise.all(FEEDS.map(f => fetchFeed(f, 5)));
    const merged = [];
    for (let i = 0; i < 5; i++) {
      for (const list of results) {
        if (list[i]) merged.push(list[i]);
      }
    }
    const items = merged.slice(0, 15);
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: items.length > 0, items: items })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, error: String(e), items: [] })
    };
  }
};
