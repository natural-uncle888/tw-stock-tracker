/**
 * Netlify Function: yahoo
 * CORS-safe proxy for Yahoo Finance endpoints used by the app.
 *
 * Usage:
 *   /.netlify/functions/yahoo?u=<ENCODED_URL>
 *
 * Security:
 * - Allow-listed hosts only.
 */
const ALLOWED_HOSTS = new Set([
  "query1.finance.yahoo.com",
  "query2.finance.yahoo.com",
  "tw.stock.yahoo.com",
  "finance.yahoo.com",
]);

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Cache-Control": "no-store",
    ...extra,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders(), body: "" };
  }

  const u = (event.queryStringParameters && (event.queryStringParameters.u || event.queryStringParameters.url)) || "";
  if (!u) {
    return { statusCode: 400, headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }), body: "Missing query parameter: u" };
  }

  let target;
  try { target = decodeURIComponent(u); } catch { target = u; }

  let url;
  try { url = new URL(target); }
  catch { return { statusCode: 400, headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }), body: "Invalid URL" }; }

  if (!/^https?:$/.test(url.protocol)) {
    return { statusCode: 400, headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }), body: "Invalid protocol" };
  }
  if (!ALLOWED_HOSTS.has(url.host)) {
    return { statusCode: 403, headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }), body: "Host not allowed" };
  }

  try {
    const upstream = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        "Accept": event.headers?.accept || "*/*",
        "Accept-Language": event.headers?.["accept-language"] || "zh-TW,zh;q=0.9,en;q=0.8",
        "Referer": "https://tw.stock.yahoo.com/",
      },
    });

    const contentType = upstream.headers.get("content-type") || "text/plain; charset=utf-8";
    const body = await upstream.text();

    return {
      statusCode: upstream.status,
      headers: corsHeaders({ "Content-Type": contentType }),
      body,
    };
  } catch (e) {
    return { statusCode: 502, headers: corsHeaders({ "Content-Type": "text/plain; charset=utf-8" }), body: "Upstream fetch failed" };
  }
};
