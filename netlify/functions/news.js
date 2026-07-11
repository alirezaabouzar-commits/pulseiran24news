// ==========================================================
// Netlify Function: خواندن آخرین پست‌های کانال تلگرام
// ==========================================================

const CHANNEL = "pulseiran24";

function cleanText(raw) {
  return raw
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parsePosts(html) {
  const posts = [];
  const blocks = html.split("tgme_widget_message_wrap").slice(1);
  for (const block of blocks) {
    const linkM = block.match(/class="tgme_widget_message_date"[^>]*href="([^"]+)"/);
    const timeM = block.match(/<time[^>]*datetime="([^"]+)"/);
    const textM = block.match(/js-message_text[^>]*>([\s\S]*?)<\/div>/);
    if (!textM) continue;
    const text = cleanText(textM[1]);
    if (!text) continue;
    let link = linkM ? linkM[1] : "https://t.me/" + CHANNEL;
    if (!/^https:\/\/t\.me\//.test(link)) link = "https://t.me/" + CHANNEL;
    posts.push({
      text: text,
      link: link,
      published: timeM ? timeM[1] : null
    });
  }
  return posts.slice(-8).reverse();
}

exports.handler = async () => {
  try {
    const res = await fetch("https://t.me/s/" + CHANNEL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept-Language": "fa,en;q=0.8"
      }
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const html = await res.text();
    const posts = parsePosts(html);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=120"
      },
      body: JSON.stringify({ ok: posts.length > 0, channel: CHANNEL, posts: posts })
    };
  } catch (e) {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ ok: false, error: String(e), posts: [] })
    };
  }
};
