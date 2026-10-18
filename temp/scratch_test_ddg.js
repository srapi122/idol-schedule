async function testDuckDuckGo() {
  const query = '"ネコプラ" site:livepocket.jp/e/';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  console.log('Fetching DDG:', url);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    console.log('Status:', res.status);
    const html = await res.text();
    console.log('DDG HTML Length:', html.length);
    const links = [...html.matchAll(/livepocket\.jp\/e\/[a-zA-Z0-9_-]+/g)].map(m => m[0]);
    console.log('Found LivePocket links:', [...new Set(links)]);
  } catch(e) {
    console.error('Error:', e);
  }
}
testDuckDuckGo();
