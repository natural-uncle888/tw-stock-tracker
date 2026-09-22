(function(window) {
  'use strict';

  const n = (v) => Number.isFinite(Number(v)) ? Number(v) : null;
  const round2 = (v) => Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) / 100 : null;
  const avg = (arr) => {
    const xs = (arr || []).map(Number).filter(Number.isFinite);
    return xs.length ? xs.reduce((a,b)=>a+b,0) / xs.length : null;
  };
  const pct = (a,b) => (Number.isFinite(a) && Number.isFinite(b) && b !== 0) ? ((a-b)/b)*100 : null;
  const smaAt = (rows, period, idx) => {
    if (!Array.isArray(rows) || idx < period - 1) return null;
    return avg(rows.slice(idx-period+1, idx+1).map(r => r.close));
  };

  function normalizeYahoo(result) {
    const ts = result?.timestamp || [];
    const q = result?.indicators?.quote?.[0] || {};
    const rows = [];
    for (let i=0;i<ts.length;i++) {
      const open=n(q.open?.[i]), high=n(q.high?.[i]), low=n(q.low?.[i]), close=n(q.close?.[i]), volume=n(q.volume?.[i]);
      if (![open,high,low,close].every(Number.isFinite)) continue;
      rows.push({
        date: new Date(ts[i]*1000).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' }),
        open, high, low, close, volume: Number.isFinite(volume) ? volume : 0
      });
    }
    return rows;
  }

  function candleMetrics(c) {
    const range = Math.max(0.000001, c.high - c.low);
    const body = Math.abs(c.close - c.open);
    const upper = c.high - Math.max(c.open,c.close);
    const lower = Math.min(c.open,c.close) - c.low;
    return { range, body, upper, lower, bodyRatio: body/range, bullish: c.close > c.open, bearish: c.close < c.open };
  }

  function detectLatestPattern(rows) {
    const i = rows.length - 1;
    if (i < 0) return { name: '資料不足', bias: 'neutral', description: '沒有足夠的 K 棒資料。' };
    const c = rows[i], m = candleMetrics(c), p = i>0 ? rows[i-1] : null, pm = p ? candleMetrics(p) : null;
    const prior5 = rows.slice(Math.max(0,i-5), i).map(x=>x.close);
    const priorTrend = prior5.length >= 3 ? (prior5[prior5.length-1] < prior5[0] ? 'down' : (prior5[prior5.length-1] > prior5[0] ? 'up' : 'flat')) : 'flat';
    if (m.bodyRatio <= 0.1) return { name:'十字線 Doji', bias:'neutral', description:'開收盤接近，代表多空暫時拉鋸；要搭配下一根 K 棒確認方向。' };
    if (p && pm) {
      if (pm.bearish && m.bullish && c.open <= p.close && c.close >= p.open && m.body > pm.body*0.8) return { name:'多頭吞噬', bias:'bullish', description:'紅 K 實體包覆前一根黑 K，常被視為短線買盤反攻訊號；若出現在跌勢末端且放量，意義較強。' };
      if (pm.bullish && m.bearish && c.open >= p.close && c.close <= p.open && m.body > pm.body*0.8) return { name:'空頭吞噬', bias:'bearish', description:'黑 K 實體包覆前一根紅 K，常代表短線賣壓轉強；若位於高檔且放量，需提高警覺。' };
    }
    if (m.lower >= m.body*2 && m.upper <= Math.max(m.body*0.7, m.range*0.15) && m.bodyRatio <= 0.45) {
      if (priorTrend === 'down') return { name:'錘子線', bias:'bullish', description:'下影線明顯，低檔曾遭賣壓但被買盤拉回；需搭配隔日續強或量能確認。' };
      if (priorTrend === 'up') return { name:'高檔吊人', bias:'bearish', description:'上升後出現長下影小實體，代表盤中賣壓曾放大；若隔日轉弱，反轉風險提高。' };
    }
    if (m.upper >= m.body*2 && m.lower <= Math.max(m.body*0.7, m.range*0.15) && m.bodyRatio <= 0.45) {
      if (priorTrend === 'up') return { name:'射擊之星', bias:'bearish', description:'上影線明顯、收盤未能守住高位；若位於高檔並放量，代表上檔賣壓偏重。' };
      return { name:'倒錘子線', bias:'neutral', description:'長上影、小實體，低檔可能出現試圖反攻的買盤，但仍需下一根 K 棒確認。' };
    }
    if (m.bodyRatio >= 0.7) return m.bullish
      ? { name:'長紅 K', bias:'bullish', description:'實體占當日振幅比高，買盤主導明顯；若同步放量並站上關鍵均線，訊號較強。' }
      : { name:'長黑 K', bias:'bearish', description:'實體占當日振幅比高，賣盤主導明顯；若跌破關鍵均線並放量，轉弱訊號較明顯。' };
    return { name: m.bullish ? '紅 K' : (m.bearish ? '黑 K' : '平盤 K'), bias: m.bullish ? 'bullish' : (m.bearish ? 'bearish' : 'neutral'), description:'單根 K 棒訊號有限，需搭配均線、量能與前後位置一起判讀。' };
  }

  function detectRecentPatterns(rows, count=8) {
    const start = Math.max(0, rows.length-count);
    const out = [];
    for (let i=start;i<rows.length;i++) {
      const p = detectLatestPattern(rows.slice(0,i+1));
      out.push({ ...rows[i], pattern: p.name, bias: p.bias });
    }
    return out.reverse();
  }

  function supportResistance(rows, current) {
    const last = rows.slice(-60);
    if (!last.length) return { support:null, resistance:null };
    const lows = last.map(r=>r.low).filter(Number.isFinite).sort((a,b)=>a-b);
    const highs = last.map(r=>r.high).filter(Number.isFinite).sort((a,b)=>a-b);
    const nearbySupports = lows.filter(v=>v < current).sort((a,b)=>b-a);
    const nearbyRes = highs.filter(v=>v > current).sort((a,b)=>a-b);
    const cluster = (arr, fallback) => {
      if (!arr.length) return fallback;
      const first=arr[0], near=arr.filter(v=>Math.abs(v-first)/Math.max(first,0.0001)<0.015).slice(0,6);
      return avg(near.length?near:[first]);
    };
    return { support: cluster(nearbySupports, lows[0]||null), resistance: cluster(nearbyRes, highs[highs.length-1]||null) };
  }

  function scoreAnalysis(rows) {
    const i=rows.length-1, last=rows[i];
    const ma5=smaAt(rows,5,i), ma10=smaAt(rows,10,i), ma20=smaAt(rows,20,i), ma60=smaAt(rows,60,i);
    const prev20=smaAt(rows,20,Math.max(0,i-5));
    const vol5=avg(rows.slice(-5).map(r=>r.volume)), vol20=avg(rows.slice(-20).map(r=>r.volume));
    const volRatio = vol20 ? last.volume/vol20 : null;
    const dayChange = i>0 ? pct(last.close, rows[i-1].close) : null;
    const pat=detectLatestPattern(rows);
    let score=0;
    [ma5,ma10,ma20,ma60].forEach(ma=>{ if(Number.isFinite(ma)) score += last.close>=ma ? 1 : -1; });
    if (Number.isFinite(ma5)&&Number.isFinite(ma20)) score += ma5>=ma20 ? 1 : -1;
    if (Number.isFinite(ma20)&&Number.isFinite(prev20)) score += ma20>=prev20 ? 1 : -1;
    if (pat.bias==='bullish') score += 1; else if (pat.bias==='bearish') score -= 1;
    if (Number.isFinite(volRatio) && volRatio>=1.3 && Number.isFinite(dayChange)) score += dayChange>0 ? 1 : (dayChange<0 ? -1 : 0);
    let stance='盤整／訊號混合', tone='neutral';
    if (score>=4) { stance='偏多／短中期結構較強'; tone='bullish'; }
    else if (score<=-4) { stance='偏空／短中期結構較弱'; tone='bearish'; }
    else if (score>=2) { stance='略偏多，但仍需確認'; tone='bullish'; }
    else if (score<=-2) { stance='略偏空，宜留意轉弱'; tone='bearish'; }
    const positions = [
      {key:'ma5',label:'5日線',value:ma5}, {key:'ma10',label:'10日線',value:ma10}, {key:'ma20',label:'月線(20日)',value:ma20}, {key:'ma60',label:'季線(60日)',value:ma60}
    ].map(x=>({...x, above:Number.isFinite(x.value)?last.close>=x.value:null, distance:Number.isFinite(x.value)?pct(last.close,x.value):null}));
    const sr=supportResistance(rows,last.close);
    let volumeText='量能資料不足';
    if (Number.isFinite(volRatio)) {
      if (volRatio>=1.5) volumeText = dayChange>0 ? '明顯放量上漲，買方力道較積極' : (dayChange<0 ? '明顯放量下跌，賣方力道較重' : '明顯放量但價格變化有限，多空換手劇烈');
      else if (volRatio>=1.1) volumeText = dayChange>0 ? '溫和量增價漲' : (dayChange<0 ? '溫和量增價跌' : '量能略高於均量');
      else if (volRatio<=0.7) volumeText = dayChange>0 ? '量縮上漲，追價力道仍需觀察' : (dayChange<0 ? '量縮下跌，賣壓未明顯擴大' : '量縮整理');
      else volumeText='量能接近20日均量，屬一般水準';
    }
    const trendParts=[];
    if (Number.isFinite(ma20)) trendParts.push(last.close>=ma20?'股價位於月線之上':'股價位於月線之下');
    if (Number.isFinite(ma60)) trendParts.push(last.close>=ma60?'仍守在季線上方':'位於季線下方');
    if (Number.isFinite(ma20)&&Number.isFinite(prev20)) trendParts.push(ma20>prev20?'月線走升':'月線走平或下彎');
    const caution=[];
    if (Number.isFinite(sr.resistance) && pct(sr.resistance,last.close) < 3 && sr.resistance>last.close) caution.push(`距近端壓力約 ${round2(pct(sr.resistance,last.close))}%`);
    if (Number.isFinite(sr.support) && pct(last.close,sr.support) < 3 && last.close>sr.support) caution.push(`距近端支撐約 ${round2(pct(last.close,sr.support))}%`);
    if (pat.bias==='bearish') caution.push(`最新 K 棒為「${pat.name}」`);
    return {
      score, stance, tone, latest:last, dayChange:round2(dayChange), pattern:pat, positions,
      volume:{today:last.volume, avg5:vol5, avg20:vol20, ratio20:round2(volRatio), text:volumeText},
      trendText:trendParts.join('；') || '趨勢資料不足', support:round2(sr.support), resistance:round2(sr.resistance),
      caution, recent:detectRecentPatterns(rows,10)
    };
  }

  async function fetchSymbol(code) {
    const proxyBase = (location.protocol === 'file:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'https://corsproxy.io/?' : '/.netlify/functions/yahoo?u=';
    const trySymbol = async (symbol) => {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1y&interval=1d&includePrePost=false&events=div%2Csplits`;
      const res = await fetch(proxyBase + encodeURIComponent(url));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const result = data?.chart?.result?.[0];
      if (!result) throw new Error(data?.chart?.error?.description || '查無歷史行情');
      const rows=normalizeYahoo(result);
      if (rows.length<20) throw new Error('歷史行情筆數不足');
      return { symbol, result, rows };
    };
    try { return await trySymbol(`${code}.TW`); }
    catch (e1) { return await trySymbol(`${code}.TWO`); }
  }

  window.StockTechnicalAnalysisService = {
    async analyzeStock(code) {
      const c=String(code||'').trim().toUpperCase();
      if (!c) throw new Error('請輸入股票代號');
      const fetched=await fetchSymbol(c);
      const analysis=scoreAnalysis(fetched.rows);
      const meta=fetched.result?.meta||{};
      return {
        code:c,
        symbol:fetched.symbol,
        name: meta.longName || meta.shortName || '',
        currency: meta.currency || 'TWD',
        exchange: meta.exchangeName || '',
        dataCount:fetched.rows.length,
        ...analysis
      };
    }
  };
})(window);
