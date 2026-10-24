/**
 * IDOL TAITE RADAR - Backend Server & Ticket Crawler
 * Node.js Native HTTP Server (No external npm dependencies required)
 * 
 * Features:
 * 1. Static file hosting (index.html, style.css, app.js)
 * 2. Ticket site scraping proxy (TIGET, TicketDive, LivePocket)
 * 3. Twitter(X) Notice Feed -> Ticket URL auto-crawl pipeline
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 5173;
const PUBLIC_DIR = __dirname;

// MIME types for static hosting
const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper: HTTP GET request with redirect following
function fetchUrl(targetUrl, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = url.parse(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
      }
    };

    const req = client.request(options, (res) => {
      // Handle 301, 302 redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = url.resolve(targetUrl, redirectUrl);
        }
        return resolve(fetchUrl(redirectUrl, maxRedirects - 1));
      }

      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: data, headers: res.headers });
      });
    });

    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.end();
  });
}

// Helper: Strict Idol Group Keyword Matcher (Prevents false positives like FALMENCO for Falench.)
function getGroupKeywords(groupName) {
  const norm = (s) => (s || '').toLowerCase().replace(/[\s\.\*＊!！]/g, '');
  const clean = norm(groupName);

  if (clean.includes('falench') || clean.includes('ファレンチ')) {
    return [/\bFalench\.?\b/i, /ファレンチ/];
  }
  if (clean.includes('jyapon') || clean.includes('ジャポン')) {
    return [/SUPER\s*[\*☆]?\s*JYAPON/i, /スーパージャポン/i, /すーぱーじゃぽん/i];
  }
  if (clean.includes('てるてる')) {
    return [/アイテムはてるてるのみ/, /てるてるのみ/, /てるてる/];
  }
  if (clean.includes('ネコプラ')) {
    return [/ネコプラ/];
  }
  if (clean.includes('カタコト') || clean.includes('katacoto')) {
    return [/KATACOTO[\s\*＊]*BANK/i, /カタコトバンク/];
  }
  if (clean.includes('真骨頂') || clean.includes('しんこっちょう')) {
    return [/にっぽん[！!]\s*真骨頂/, /真骨頂/];
  }
  if (clean.includes('ネクスタリア') || clean.includes('nextaria')) {
    return [/ネクスタリア/, /\bnextaria\b/i];
  }
  if (clean.includes('アオノシグナル') || clean.includes('青のシグナル')) {
    return [/アオノシグナル/, /青のシグナル/];
  }
  if (clean.includes('アオハルブレイブ')) {
    return [/アオハルブレイブ/];
  }
  if (clean.includes('ゆるっと革命団')) {
    return [/ゆるっと革命団/];
  }
  if (clean.includes('びっくえんじぇる')) {
    return [/びっくえんじぇる/, /ビッグエンジェル/i];
  }

  const escaped = groupName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return [new RegExp(escaped, 'i')];
}

// Helper: Strip other/recommended events (e.g. LivePocket "同じ販売元のイベント", recommendations, footer)
function cleanMainHtml(html) {
  if (!html) return '';
  let clean = html;
  const cutMarkers = [
    /<section[^>]*class=["'][^"']*event-detail-other[^"']*["']/i,
    /class=["'][^"']*event-detail-other[^"']*["']/i,
    /<ul[^>]*class=["'][^"']*event-card-list--other[^"']*["']/i,
    /<h\d[^>]*>[^<]*同じ販売元のイベント/i,
    /<footer[\s\S]*$/i
  ];
  for (const marker of cutMarkers) {
    const m = clean.match(marker);
    if (m && m.index !== undefined) {
      clean = clean.substring(0, m.index);
    }
  }
  return clean;
}

function isIdolActuallyPerforming(htmlOrText, groupName) {
  if (!htmlOrText || !groupName) return false;
  const mainOnly = cleanMainHtml(htmlOrText);
  const regexes = getGroupKeywords(groupName);
  return regexes.some(r => r.test(mainOnly));
}

// Helper: Extract performers completely (handles schema.org JSON-LD, meta keywords, and tags)
function extractAllPerformers(html) {
  const list = new Set();

  // 1. Check meta og:description (TicketDive & others frequently list performers here)
  const ogDescMatch = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    const descContent = ogDescMatch[1].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
    const pMatch = descContent.match(/(?:出演(?:者)?|ARTIST[S]?|CAST)[\s:：】]*([^"'\n]+)/i);
    if (pMatch) {
      let cleanText = pMatch[1].replace(/【.*?】/g, ' ').replace(/\[.*?\]/g, ' ');
      cleanText.split(/[\/／,、・\t]/).forEach(s => {
        const c = s.replace(/["'<>]/g, '').trim();
        if (c.length >= 2 && c.length < 35 && !c.includes('チケット') && !c.includes('入場')) list.add(c);
      });
    }
  }

  // 2. Check schema.org JSON-LD (LivePocket standard)
  const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const perf = data.performer?.name || data.performer || '';
      if (typeof perf === 'string' && perf) {
        perf.split(/[\/／,、]/).forEach(s => {
          const c = s.replace(/["'<>]/g, '').trim();
          if (c.length >= 2) list.add(c);
        });
      }
      const desc = data.description || '';
      const colonIdx = desc.lastIndexOf('：');
      if (colonIdx !== -1) {
        desc.slice(colonIdx + 1).split(/[\/／,、]/).forEach(s => {
          const c = s.replace(/["'<>]/g, '').trim();
          if (c.length >= 2) list.add(c);
        });
      }
    } catch (e) {}
  }

  // 3. Check meta keywords
  const metaKw = html.match(/<meta\s+name=["']keywords["']\s+content=["']([^"']+)["']/i);
  if (metaKw) {
    metaKw[1].split(/[,、]/).forEach(s => {
      const c = s.replace(/["'<>]/g, '').trim();
      if (c.length >= 2 && !c.includes('チケット') && !c.includes('ライブポケット')) list.add(c);
    });
  }

  // 4. Check 出演 section in body
  const cleanBody = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const pMatch = cleanBody.match(/(?:出演(?:者)?|ARTIST[S]?|CAST)[\s:：】]*([^\n]{3,400})/i);
  if (pMatch) {
    const rawSection = pMatch[1].replace(/<[^>]+>/g, ' ').replace(/["'].*$/, '');
    rawSection.split(/[\/／,、・\t]/).forEach(s => {
      const c = s.replace(/["'<>【】\[\]]/g, '').trim();
      if (c.length >= 2 && c.length < 35 && !c.includes('チケット') && !c.includes('入場')) list.add(c);
    });
  }

  return [...list];
}

// Helper: HTML parser for Ticket sites (TIGET / TicketDive / LivePocket / General)
function parseTicketHtml(html, ticketUrl) {
  let title = '';
  let date = '';
  let venue = '';
  let openTime = '';
  let startTime = '';

  // Title extraction: avoid generic titles like "販売情報" or "チケット情報"
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1Match) {
    const candidate = h1Match[1].replace(/<[^>]+>/g, '').trim();
    if (!candidate.includes('販売情報') && !candidate.includes('チケット情報') && candidate.length > 2) {
      title = candidate;
    }
  }
  if (!title) {
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                         html.match(/<title>([^<]+)<\/title>/i);
    if (ogTitleMatch) {
      title = ogTitleMatch[1]
        .replace(/\s*[|｜]\s*(TicketDive|TIGET|LivePocket|PayLove|チケット).*$/i, '')
        .replace(/\s*[|｜].*$/, '')
        .replace(/のチケット情報.*$/, '')
        .trim();
    }
  }

  // Check og:description first for structured TicketDive info (【場所】... 【日付】...)
  const ogDescMatch = html.match(/<meta\s+(?:property=["']og:description["']|name=["']description["'])\s+content=["']([^"']+)["']/i);
  if (ogDescMatch) {
    const desc = ogDescMatch[1].replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
    const dMatch = desc.match(/(202[4-9])[年/.-](\d{1,2})[月/.-](\d{1,2})/);
    if (dMatch) {
      date = `${dMatch[1]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[3]).padStart(2, '0')}`;
    }
    const vMatch = desc.match(/(?:【場所】|【会場】|場所[：:]|会場[：:])\s*([^【\n\r<]{2,50})/);
    if (vMatch) {
      venue = vMatch[1].replace(/（.*$/, '').replace(/\(.*$/, '').trim();
    }
  }

  // Date extraction fallback: YYYY-MM-DD or YYYY年MM月DD日
  if (!date) {
    const dateMatch = html.match(/(202[4-9])[年/.-](\d{1,2})[月/.-](\d{1,2})/);
    if (dateMatch) {
      date = `${dateMatch[1]}-${String(dateMatch[2]).padStart(2, '0')}-${String(dateMatch[3]).padStart(2, '0')}`;
    }
  }

  // Venue extraction fallback (safe from <script>)
  if (!venue) {
    const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
    const venueMatch = cleanHtml.match(/(?:会場|場所|VENUE)[\s:：】]*([^\n\r<]{2,40})/i);
    if (venueMatch) {
      venue = venueMatch[1].replace(/（.*$/, '').replace(/\(.*$/, '').replace(/【.*$/, '').replace(/\[.*$/, '').trim();
    }
  }

  // Open / Start times: OPEN19:15 / START19:30 or OPEN 19:15 / START 19:30
  const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const openMatch = cleanHtml.match(/(?:OPEN|開場)[\s:：]*(\d{1,2}:\d{2})/i);
  const startMatch = cleanHtml.match(/(?:START|開演)[\s:：]*(\d{1,2}:\d{2})/i);
  if (openMatch) openTime = openMatch[1];
  if (startMatch) startTime = startMatch[1];

  // Robust performers extraction
  const performers = extractAllPerformers(html);

  return {
    title: title || 'チケットサイト連携ライブ',
    date: date || '2026-10-18',
    venue: venue || '都内ライブハウス',
    openTime: openTime || '12:00',
    startTime: startTime || '12:30',
    performers,
    url: ticketUrl
  };
}

// Helper: Search TIGET by idol group name (sort by play_date, 100% real events)
async function searchTiget(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const params = new URLSearchParams();
  params.set('q[words]', keyword.trim());
  params.set('sort', 'play_date');
  const targetUrl = `https://tiget.net/events?${params.toString()}`;

  try {
    const fetchRes = await fetchUrl(targetUrl);
    const html = fetchRes.body || '';
    const boxes = html.split('<div class="event-box');
    const candidates = [];
    const seenIds = new Set();

    for (let i = 1; i < boxes.length; i++) {
      const box = boxes[i];
      const linkMatch = box.match(/href="(\/events\/(\d+))"/);
      if (!linkMatch) continue;
      const eventId = linkMatch[2];
      if (seenIds.has(eventId)) continue;
      seenIds.add(eventId);

      const titleMatch = box.match(/class="event-title"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
      const dateMatch = box.match(/class="play-date"[^>]*>([^<]+)<\/div>/i);
      const areaMatch = box.match(/class="event-area"[^>]*>([^<]+)<\/div>/i);

      let rawTitle = titleMatch ? titleMatch[1].trim() : 'イベント';
      let rawDate = dateMatch ? dateMatch[1].replace(/開催[：:]\s*/, '').trim() : '';
      let rawArea = areaMatch ? areaMatch[1].replace(/場所[：:]\s*/, '').trim() : '';

      let isoDate = '';
      const dMatch = rawDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (dMatch) {
        isoDate = `${dMatch[1]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[3]).padStart(2, '0')}`;
      }

      candidates.push({
        eventId,
        rawTitle,
        isoDate: isoDate || rawDate,
        rawArea
      });

      if (candidates.length >= 8) break;
    }

    // Verify each event against keyword to eliminate false positives (e.g. bingo "アイテム")
    const cleanStr = (s) => (s || '').toLowerCase().replace(/[\s\.\*＊!！]/g, '');
    const cleanKeyword = cleanStr(keyword);
    const events = [];

    const pagePromises = candidates.map(c =>
      fetchUrl(`https://tiget.net/events/${c.eventId}`)
        .then(res => ({ ...c, html: res.body || '' }))
        .catch(() => ({ ...c, html: '' }))
    );
    const pages = await Promise.all(pagePromises);

    for (const p of pages) {
      const cleanBody = (p.html || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
      const fullText = cleanStr(`${p.rawTitle} ${cleanBody}`);

      let isHit = fullText.includes(cleanKeyword);
      if (!isHit) {
        if (keyword.includes('てるてる') && fullText.includes('てるてる')) isHit = true;
        if (keyword.includes('ネコプラ') && fullText.includes('ネコプラ')) isHit = true;
        if (keyword.includes('ジャポン') && fullText.includes('ジャポン')) isHit = true;
        if (keyword.includes('真骨頂') && fullText.includes('真骨頂')) isHit = true;
        if (keyword.includes('カタコト') && fullText.includes('カタコト')) isHit = true;
      }

      // Discard false positives where keyword is missing!
      if (!isHit) {
        continue;
      }

      const pMatch = cleanBody.match(/出演[：:\s]*([^\n<]+)/i) || cleanBody.match(/ARTIST[S]?[：:\s]*([^\n<]+)/i);
      let performers = [];
      if (pMatch) {
        performers = pMatch[1].split(/[\/／,、\n]/).map(s => s.replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').trim()).filter(Boolean);
      }
      if (performers.length === 0) {
        performers = [keyword.trim()];
      }

      events.push({
        id: `tiget-${p.eventId}`,
        ticketId: p.eventId,
        site: 'TIGET',
        title: p.rawTitle,
        date: p.isoDate,
        venue: p.rawArea || '都内ライブハウス',
        url: `https://tiget.net/events/${p.eventId}`,
        matchedGroup: keyword.trim(),
        performers: performers,
        openTime: '12:00',
        startTime: '12:30'
      });
    }

    return events;
  } catch (err) {
    console.error(`TIGET search error for ${keyword}:`, err.message);
    return [];
  }
}

// Helper 2: Search TicketDive by idol group name (100% real events)
async function searchTicketDive(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const targetUrl = `https://ticketdive.com/search?q=${encodeURIComponent(keyword.trim())}`;

  try {
    const fetchRes = await fetchUrl(targetUrl);
    const html = fetchRes.body || '';
    const cards = [...html.matchAll(/<a[^>]*href="(\/event\/[^"]+)"[^>]*>/g)];
    const seenUrls = new Set();
    const candidates = [];

    for (const card of cards) {
      const eventHref = card[1];
      const eventUrl = `https://ticketdive.com${eventHref}`;
      if (seenUrls.has(eventUrl)) continue;
      seenUrls.add(eventUrl);
      candidates.push({ eventHref, eventUrl });
      if (candidates.length >= 8) break;
    }

    // Fetch individual event pages in parallel to verify performers & get exact details
    const pages = await Promise.all(
      candidates.map(c =>
        fetchUrl(c.eventUrl)
          .then(res => ({ ...c, html: res.body || '' }))
          .catch(() => ({ ...c, html: '' }))
      )
    );

    const events = [];
    for (const p of pages) {
      if (!p.html) continue;

      // Strict validation: Verify idol group is actually performing
      if (!isIdolActuallyPerforming(p.html, keyword)) continue;

      const parsed = parseTicketHtml(p.html, p.eventUrl);
      events.push({
        id: `td-${p.eventHref.replace('/event/', '')}`,
        site: 'TicketDive',
        title: parsed.title,
        date: parsed.date,
        venue: parsed.venue,
        url: p.eventUrl,
        matchedGroup: keyword.trim(),
        performers: parsed.performers.length > 0 ? parsed.performers : [keyword.trim()],
        openTime: parsed.openTime,
        startTime: parsed.startTime
      });
    }

    return events;
  } catch (err) {
    console.error(`TicketDive search error for ${keyword}:`, err.message);
    return [];
  }
}

// Major LivePocket venues & organizers (Promoter pages like 株式会社SCOT / FreeK: i39be)
const MAJOR_LP_VENUES = ['RING', 'O-EAST', 'O-WEST', 'WOMB', 'clubasia', 'ReNY', 'SELENE', 'VAMPKIN', 'Veats', 'DIVE'];
const KNOWN_LP_ORGANIZERS = ['https://livepocket.jp/p/i39be']; // 株式会社SCOT (FreeK-Laboratory: ネコプラ, てるてる, ジャポン, ファレンチ等)

let venueEventsCache = null;
let lastCacheTime = 0;

// Fetch and cache LivePocket events from organizer pages (i39be等) & major venues
async function getLivePocketVenueEvents() {
  const now = Date.now();
  if (venueEventsCache && (now - lastCacheTime < 5 * 60 * 1000)) {
    return venueEventsCache;
  }

  try {
    const eventUrls = new Set();

    // 1. Fetch Organizer Pages directly (SCOT / FreeK etc.)
    const organizerPromises = KNOWN_LP_ORGANIZERS.map(orgUrl =>
      fetchUrl(orgUrl).catch(() => ({ body: '' }))
    );
    const orgResults = await Promise.all(organizerPromises);
    for (const res of orgResults) {
      const orgMatches = [...(res.body || '').matchAll(/href="(\/e\/[^"]+)"/g)].map(m => `https://livepocket.jp${m[1]}`);
      orgMatches.forEach(u => eventUrls.add(u));
    }

    // 2. Fetch Major Venues
    const searchPromises = MAJOR_LP_VENUES.map(v => 
      fetchUrl(`https://livepocket.jp/event/search?word=${encodeURIComponent(v)}`)
        .catch(() => ({ body: '' }))
    );
    const searchResults = await Promise.all(searchPromises);

    for (const res of searchResults) {
      const matches = [...(res.body || '').matchAll(/href="(\/e\/[^"]+)"/g)].map(m => `https://livepocket.jp${m[1]}`);
      matches.slice(0, 4).forEach(u => eventUrls.add(u));
    }

    // 3. Fetch event detail pages in parallel
    const urls = [...eventUrls];
    const pagePromises = urls.map(u => 
      fetchUrl(u)
        .then(res => ({ url: u, html: res.body || '' }))
        .catch(() => ({ url: u, html: '' }))
    );
    const pages = await Promise.all(pagePromises);
    venueEventsCache = pages;
    lastCacheTime = now;
    return pages;
  } catch (err) {
    console.error('getLivePocketVenueEvents error:', err.message);
    return venueEventsCache || [];
  }
}

// Helper 3: Search LivePocket (NEW Official 2026 site: livepocket.jp with deep description & organizer scanner)
async function searchLivePocket(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const cleanKeyword = keyword.trim();
  const events = [];
  const seenUrls = new Set();

  // 1. Official LivePocket Keyword Search
  const searchKeywords = [cleanKeyword];
  if (cleanKeyword.toLowerCase().includes('jyapon') || cleanKeyword.includes('ジャポン')) {
    searchKeywords.push('SUPER☆JYAPON');
    searchKeywords.push('スーパージャポン');
  }

  try {
    const candidateUrls = [];
    for (const kw of searchKeywords) {
      const targetUrl = `https://livepocket.jp/event/search?word=${encodeURIComponent(kw)}`;
      const fetchRes = await fetchUrl(targetUrl).catch(() => ({ body: '' }));
      const html = fetchRes.body || '';
      const items = html.split('<li class="event-card-list__item">');

      for (let i = 1; i < items.length; i++) {
        const item = items[i].split('</li>')[0];
        const linkMatch = item.match(/href="(\/e\/[^"]+)"/);
        if (!linkMatch) continue;
        const eventUrl = `https://livepocket.jp${linkMatch[1]}`;
        if (seenUrls.has(eventUrl)) continue;
        seenUrls.add(eventUrl);
        candidateUrls.push(eventUrl);
        if (candidateUrls.length >= 10) break;
      }
      if (candidateUrls.length >= 10) break;
    }

    // Verify each candidate with strict secondary check
    const verifyPromises = candidateUrls.map(u => 
      fetchUrl(u)
        .then(res => ({ url: u, html: res.body || '' }))
        .catch(() => ({ url: u, html: '' }))
    );
    const verifiedPages = await Promise.all(verifyPromises);

    for (const page of verifiedPages) {
      if (!page.html) continue;

      // STRICT CHECK: Does this event ACTUALLY feature cleanKeyword?
      if (!isIdolActuallyPerforming(page.html, cleanKeyword)) {
        // Discard false positives like FALMENCO for Falench. or SUPER FANTASY for SUPER JYAPON
        continue;
      }

      const parsed = parseTicketHtml(page.html, page.url);
      const eventId = page.url.split('/e/')[1] || `lp-${Date.now()}`;

      events.push({
        id: `lp-${eventId}`,
        site: 'LivePocket',
        title: parsed.title,
        date: parsed.date,
        venue: parsed.venue,
        url: page.url,
        matchedGroup: cleanKeyword,
        performers: parsed.performers.length > 0 ? parsed.performers : [cleanKeyword],
        openTime: parsed.openTime,
        startTime: parsed.startTime
      });

      if (events.length >= 8) break;
    }
  } catch (err) {
    console.error(`LivePocket keyword search error for ${cleanKeyword}:`, err.message);
  }

  // 2. Organizer & Venue Deep Scanner: Check SCOT (i39be) & venue event bodies with strict check
  try {
    const venuePages = await getLivePocketVenueEvents();
    for (const page of venuePages) {
      if (!page.html || seenUrls.has(page.url)) continue;

      // STRICT CHECK: Verify keyword is truly in the page
      if (isIdolActuallyPerforming(page.html, cleanKeyword)) {
        seenUrls.add(page.url);

        const parsed = parseTicketHtml(page.html, page.url);
        const eventId = page.url.split('/e/')[1] || `lp-${Date.now()}`;

        events.push({
          id: `lp-${eventId}`,
          site: 'LivePocket',
          title: parsed.title,
          date: parsed.date,
          venue: parsed.venue,
          url: page.url,
          matchedGroup: cleanKeyword,
          performers: parsed.performers.length > 0 ? parsed.performers : [cleanKeyword],
          openTime: parsed.openTime,
          startTime: parsed.startTime
        });
      }
    }
  } catch (err) {
    console.error(`LivePocket deep venue/organizer scan error for ${cleanKeyword}:`, err.message);
  }

  return events;
}

// Helper 4: Search PayLove (Official API: https://paylove.org/api/events)
async function searchPayLove(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const cleanKeyword = keyword.trim().toLowerCase();

  try {
    const fetchRes = await fetchUrl('https://paylove.org/api/events');
    const json = JSON.parse(fetchRes.body || '{}');
    if (!json.success || !Array.isArray(json.data)) return [];

    const matched = [];
    const today = '2026-10-18';

    for (const item of json.data) {
      const title = item.title || item.name || '';
      const rawPerformers = item.performers || '';
      const textToSearch = `${title} ${rawPerformers}`.toLowerCase();

      if (textToSearch.includes(cleanKeyword)) {
        let rawDate = item.event_datetime || item.start_date || (item.published_rewards?.[0]?.ticket_start_time) || '';
        let isoDate = '';
        if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            isoDate = d.toISOString().slice(0, 10);
          }
        }

        let startTime = '12:30';
        if (item.published_rewards?.[0]?.ticket_start_time) {
          const d = new Date(item.published_rewards[0].ticket_start_time);
          startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
        }

        const eventUrl = `https://paylove.org/events/${item.event_hash}`;
        const performers = rawPerformers ? rawPerformers.split(',').map(s => s.trim()).filter(Boolean) : [keyword.trim()];

        matched.push({
          id: `paylove-${item.id}`,
          site: 'PayLove',
          title: title,
          date: isoDate || today,
          venue: item.venue || 'ライブ会場',
          url: eventUrl,
          matchedGroup: keyword.trim(),
          performers: performers,
          openTime: '12:00',
          startTime: startTime
        });
      }
    }
    return matched;
  } catch (err) {
    console.error(`PayLove search error for ${cleanKeyword}:`, err.message);
    return [];
  }
}

// Combined Search across TIGET + TicketDive + LivePocket + PayLove (Filtered for Today & Upcoming Only)
async function searchAllTicketSites(keyword) {
  const [tigetEvents, ticketDiveEvents, livePocketEvents, payLoveEvents] = await Promise.all([
    searchTiget(keyword).catch(() => []),
    searchTicketDive(keyword).catch(() => []),
    searchLivePocket(keyword).catch(() => []),
    searchPayLove(keyword).catch(() => [])
  ]);

  const combined = [...tigetEvents, ...ticketDiveEvents, ...livePocketEvents, ...payLoveEvents];

  // 動的な日付判定: 前日（昨日）より前の過ぎたイベントは完全除外！
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  // 前日より前（< yesterdayStr）の過ぎたイベントは完全除外！前日（昨日）以降のみ抽出
  const upcomingEvents = combined.filter(e => {
    if (!e.date) return false;
    const dMatch = e.date.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})/);
    if (dMatch) {
      e.date = `${dMatch[1]}-${String(dMatch[2]).padStart(2, '0')}-${String(dMatch[3]).padStart(2, '0')}`;
    }
    return e.date >= yesterdayStr;
  });

  // 開催日が近い順（昇順：本日 ➔ 明日 ➔ 来週 ➔ 来月）で確実にソート
  upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

  return upcomingEvents;
}

// Ticket Site Real Verification & Search Engine (TIGET, TicketDive, LivePocket, PayLove) - Fast Parallel Crawler
async function crawlGroupNotices(groups) {
  const discoveredEvents = [];
  const logs = [];

  logs.push(`[${new Date().toLocaleTimeString()}] 登録推し ${groups.length} 組の4大チケットサイト（TIGET・TicketDive・LivePocket・PayLove）高速並列巡回を開始...`);

  if (!groups || groups.length === 0) {
    logs.push(`❌ 推しグループが登録されていません。「推し設定」タブでグループを登録してください。`);
    return { events: [], logs };
  }

  // Pre-warm LivePocket organizer/venue pages once for all groups to save time
  try {
    await getLivePocketVenueEvents();
  } catch (e) {}

  // Parallel search across all groups (fast, prevents Render 504 timeout)
  const groupResults = await Promise.all(groups.map(async grp => {
    const groupName = grp.name;
    try {
      const events = await searchAllTicketSites(groupName);
      return { groupName, events, success: true };
    } catch (err) {
      return { groupName, events: [], error: err.message };
    }
  }));

  const seenUrls = new Set();
  for (const res of groupResults) {
    if (res.events && res.events.length > 0) {
      const sitesCount = {};
      res.events.forEach(e => { sitesCount[e.site] = (sitesCount[e.site] || 0) + 1; });
      const breakdown = Object.entries(sitesCount).map(([k, v]) => `${k}:${v}件`).join(', ');

      logs.push(`🔍 「${res.groupName}」: 計 ${res.events.length} 件検出！ (${breakdown})`);
      for (const ev of res.events) {
        if (!seenUrls.has(ev.url || ev.id)) {
          seenUrls.add(ev.url || ev.id);
          discoveredEvents.push(ev);
        }
      }
    } else {
      logs.push(`ℹ️ 「${res.groupName}」: 直近のチケット販売予定なし`);
    }
  }

  logs.push(`===============================================`);
  logs.push(`✅ 巡回完了: 4大チケットサイトから合計 ${discoveredEvents.length} 件の実在イベントを検出しました！`);

  return { events: discoveredEvents, logs };
}

// Request Handler
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API 1: Crawl Twitter -> Ticket Sites
  if (pathname === '/api/crawl' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        let payload = {};
        if (body && body.trim()) {
          try {
            payload = JSON.parse(body);
          } catch (pe) {
            console.error('JSON parse error on body:', body);
            payload = {};
          }
        }
        const groups = payload.groups || [];
        const result = await crawlGroupNotices(groups);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, ...result }));
      } catch (err) {
        console.error('Crawl API Error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: err.message, stack: err.stack }));
      }
    });
    return;
  }

  // API 2: Scrape single ticket URL directly
  if (pathname === '/api/scrape-ticket' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const targetUrl = payload.url;
        if (!targetUrl) throw new Error('URL is required');

        // Special handling for PayLove URLs
        if (targetUrl.includes('paylove.org')) {
          try {
            const hashMatch = targetUrl.match(/events\/([A-Za-z0-9]+)/);
            const targetHash = hashMatch ? hashMatch[1] : '';
            const plRes = await fetchUrl('https://paylove.org/api/events');
            const plJson = JSON.parse(plRes.body || '{}');
            const item = (plJson.data || []).find(it => it.event_hash === targetHash || String(it.id) === targetHash);

            if (item) {
              let rawDate = item.event_datetime || item.start_date || (item.published_rewards?.[0]?.ticket_start_time) || '';
              let isoDate = '2026-10-18';
              if (rawDate) {
                const d = new Date(rawDate);
                if (!isNaN(d.getTime())) isoDate = d.toISOString().slice(0, 10);
              }
              let startTime = '12:30';
              if (item.published_rewards?.[0]?.ticket_start_time) {
                const d = new Date(item.published_rewards[0].ticket_start_time);
                startTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
              }

              const performers = (item.performers || '').split(',').map(s => s.trim()).filter(Boolean);

              const parsed = {
                title: item.title || item.name || 'PayLoveイベント',
                date: isoDate,
                venue: item.venue || 'ライブ会場',
                openTime: '12:00',
                startTime: startTime,
                performers,
                url: targetUrl
              };
              res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
              res.end(JSON.stringify({ success: true, data: parsed }));
              return;
            }
          } catch (plErr) {
            console.error('PayLove direct parse error:', plErr.message);
          }
        }

        try {
          const fetchRes = await fetchUrl(targetUrl);
          const parsed = parseTicketHtml(fetchRes.body, targetUrl);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ success: true, data: parsed }));
        } catch (fetchErr) {
          // Fallback parsing from URL string itself if blocked
          const dummy = parseTicketHtml('', targetUrl);
          res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
          res.end(JSON.stringify({ success: true, data: dummy, note: 'Direct fetch failed, template extracted' }));
        }
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

// GitHub Cloud Storage Sync Configuration (configured via Render Environment variable GITHUB_TOKEN)
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_OWNER = 'srapi122';
const GITHUB_REPO = 'idol-schedule';
const GITHUB_FILE = 'current_state.json';

function githubApiRequest(apiPath, method, body = null) {
  return new Promise((resolve, reject) => {
    if (!GITHUB_TOKEN) return reject(new Error('GITHUB_TOKEN not configured'));
    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: apiPath,
      method: method,
      headers: {
        'User-Agent': 'Node-Idol-Cloud-Sync',
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    };
    if (body) options.headers['Content-Type'] = 'application/json';

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          reject(new Error(`GitHub API [${res.statusCode}]: ${typeof parsed === 'object' ? (parsed.message || JSON.stringify(parsed)) : parsed}`));
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Push state to GitHub repo asynchronously
async function pushStateToGitHub(contentJsonStr, commitMsg = 'Update state via cloud sync') {
  try {
    const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
    let sha = undefined;
    try {
      const existing = await githubApiRequest(apiPath, 'GET');
      if (existing && existing.sha) sha = existing.sha;
    } catch (e) {}

    const payload = {
      message: commitMsg,
      content: Buffer.from(contentJsonStr, 'utf8').toString('base64'),
      branch: 'main'
    };
    if (sha) payload.sha = sha;
    await githubApiRequest(apiPath, 'PUT', payload);
    console.log('[GitHub Cloud Sync] current_state.json successfully committed to GitHub!');
  } catch (err) {
    console.error('[GitHub Cloud Sync] Push failed:', err.message);
  }
}

// Load state from local current_state.json (Single Source of Truth), fallback to GitHub if file missing
async function fetchCurrentState() {
  const localPath = path.join(__dirname, 'current_state.json');
  if (fs.existsSync(localPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
      if (data && (Array.isArray(data.groups) || Array.isArray(data.events))) {
        return data;
      }
    } catch (e) {}
  }

  // Fallback to GitHub only if local current_state.json does not exist
  try {
    const apiPath = `/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${GITHUB_FILE}`;
    const fileRes = await githubApiRequest(apiPath, 'GET');
    if (fileRes && fileRes.content) {
      const decoded = Buffer.from(fileRes.content, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      fs.writeFileSync(localPath, decoded, 'utf8');
      return parsed;
    }
  } catch (err) {
    console.log('[GitHub Cloud Sync] GitHub fallback unavailable, using empty state');
  }

  return { groups: [], events: [], totalGroups: 0, totalEvents: 0 };
}

  // API 3: GET /api/state (Load shared cloud state with zero rollback)
  if ((pathname === '/api/state' || pathname === '/api/sync-state') && req.method === 'GET') {
    try {
      const cloudState = await fetchCurrentState();
      res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: true, data: cloudState }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // API 3: POST /api/sync-state (Save and push state immediately across all devices)
  if ((pathname === '/api/sync-state' || pathname === '/api/state') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const state = JSON.parse(body || '{}');
        const statePath = path.join(__dirname, 'current_state.json');
        const formatted = {
          syncedAt: new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' }),
          lastAction: state.lastAction || '画面操作・データ更新',
          totalGroups: (state.groups || []).length,
          totalEvents: (state.events || []).length,
          groups: state.groups || [],
          events: state.events || []
        };
        const jsonStr = JSON.stringify(formatted, null, 2);
        fs.writeFileSync(statePath, jsonStr, 'utf8');

        // Asynchronously commit to GitHub repo as background backup
        pushStateToGitHub(jsonStr, `Sync: ${state.lastAction || 'Device sync'}`).catch(() => {});

        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, message: 'State synced immediately' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // API 4: Search ticket sites directly by group name or keyword
  if (pathname === '/api/search-tickets' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const query = payload.query || '';
        if (!query.trim()) throw new Error('検索キーワードを入力してください');

        const events = await searchAllTicketSites(query.trim());
        res.writeHead(200, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: true, events, count: events.length }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=UTF-8' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`[Idol Taite Radar Server] Running at http://localhost:${PORT}`);
});
