async function testRingSource() {
  const query = 'livepocket.jp/e/ring-1018';
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();
  console.log('Results snippet:');
  const results = html.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/gi) || html.match(/class="result__snippet"[\s\S]*?<\/div>/gi);
  console.log('Results count:', results ? results.length : 0);
  if (results) {
    results.slice(0, 3).forEach(r => console.log('Snippet:', r.replace(/<[^>]+>/g, '').trim()));
  }
}
testRingSource();
