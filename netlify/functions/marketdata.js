exports.handler = async function(event) {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  try {
    const raw = event.queryStringParameters && event.queryStringParameters.u;
    if (!raw) return { statusCode: 400, headers: cors, body: 'Missing u' };
    let target;
    try { target = decodeURIComponent(raw); } catch (_) { target = raw; }
    const url = new URL(target);
    const host = url.hostname.toLowerCase();
    const allowed = host === 'www.twse.com.tw' || host === 'twse.com.tw' || host === 'openapi.twse.com.tw' || host === 'www.tpex.org.tw' || host === 'tpex.org.tw' || host.endsWith('.tpex.org.tw');
    if (!allowed) return { statusCode: 403, headers: cors, body: 'Host not allowed' };
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 stock-tracker marketdata proxy',
        'Accept': 'application/json,text/plain,*/*',
      },
    });
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: Object.assign({}, cors, {
        'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      }),
      body,
    };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: String(e && e.message ? e.message : e) };
  }
};
