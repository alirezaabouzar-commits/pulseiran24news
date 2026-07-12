// نسخه ۲ — تیترهای رسانه‌های بین‌المللی فارسی‌زبان

const RSS_FEEDS = [
  { name: "بی‌بی‌سی فارسی", urls: ["https://feeds.bbci.co.uk/persian/rss.xml"] },
  { name: "دویچه‌وله فارسی", urls: ["https://rss.dw.com/rdf/rss-per-all"] }
];

const TG_SOURCES = [
  { name: "ایران اینترنشنال", channels: ["iranintltv"] }
];

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300"
};

function decode(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
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

function parseTelegram(html, sourceName, channel, limit) {
  const out = [];
  const blocks = html.split("tgme_widget_message_wrap").slice(1);
  for (const block of blocks.reverse()) {
    const linkM = block.match(/class="tgme_widget_message_date"[^>]*href="([^"]+)"/);
    const textM = block.match(/js-message_text[^>]*>([\s\S]*?)<\/div>/);
    if (!textM) continue;
    const text = decode(textM[1]);
    if (!text) continue;
    const title = (text.split("\n").map(l => l.trim()).filter(Boolean)[0] || "").slice(0, 160);
    if (!title || title.length < 15) continue;
    let link = linkM ? linkM[1] : "https://t.me/" + channel;
    if (!/^https:\/\/t\.me\//.test(link)) link = "https://t.me/" + channel;
    out.push({ t: title, l: link, s: sourceName });
    if (out.length >= limit) break;
  }
  return out;
}

const UA = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
  "Accept-Language": "fa,en;q=0.8"
};

async function fetchRss(feed, limit) {
  for (const url of feed.urls) {
    try {
      const res = await fetch(url, { headers: UA });
      if (!res.ok) continue;
      const items = parseFeed(await res.text(), feed.name, limit);
      if (items.length) return items;
    } catch (e) { /* بعدی */ }
  }
  return [];
}

async function fetchTg(src, limit) {
  for (const ch of src.channels) {
    try {
      const res = await fetch("https://t.me/s/" + ch, { headers: UA });
      if (!res.ok) continue;
      const items = parseTelegram(await res.text(), src.name, ch, limit);
      if (items.length) return items;
    } catch (e) { /* بعدی */ }
  }
  return [];
}

exports.handler = async () => {
  try {
    const jobs = [
      ...TG_SOURCES.map(s => fetchTg(s, 5)),
      ...RSS_FEEDS.map(f => fetchRss(f, 5))
    ];
    const results = await Promise.all(jobs);
    const counts = {};
    results.forEach(list => {
      if (list.length) counts[list[0].s] = list.length;
    });
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
      body: JSON.stringify({ ok: items.length > 0, v: 2, sources: counts, items: items })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: HEADERS,
      body: JSON.stringify({ ok: false, v: 2, error: String(e), items: [] })
    };
  }
};
