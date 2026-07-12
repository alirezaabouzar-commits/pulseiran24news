// ==========================================================
// Netlify Function: آمار سایت (بازدید + لایک)
// ==========================================================

const { getStore } = require("@netlify/blobs");

const HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "no-store"
};

function clean(id) {
  return String(id || "").replace(/[^0-9A-Za-z_-]/g, "").slice(0, 30);
}

exports.handler = async (event) => {
  try {
    const store = getStore("pulse-stats");
    const p = (event && event.queryStringParameters) || {};
    const action = p.action || "get";

    if (action === "visit") {
      const v = parseInt((await store.get("visits")) || "0", 10) + 1;
      await store.set("visits", String(v));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ visits: v }) };
    }

    if (action === "get") {
      const v = parseInt((await store.get("visits")) || "0", 10);
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ visits: v }) };
    }

    if (action === "like") {
      const id = clean(p.id);
      if (!id) throw new Error("no id");
      const key = "like:" + id;
      const n = parseInt((await store.get(key)) || "0", 10) + 1;
      await store.set(key, String(n));
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ id: id, likes: n }) };
    }

    if (action === "likes") {
      const ids = String(p.ids || "").split(",").map(clean).filter(Boolean).slice(0, 20);
      const likes = {};
      for (const id of ids) {
        likes[id] = parseInt((await store.get("like:" + id)) || "0", 10);
      }
      return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ likes: likes }) };
    }

    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ error: "unknown action" }) };
  } catch (e) {
    return { statusCode: 200, headers: HEADERS, body: JSON.stringify({ error: String(e) }) };
  }
};
