async function testUpcoming() {
  const urls = [
    'https://livepocket.jp/top/upcoming_events?date=2026-10-18&area=' + encodeURIComponent('東京'),
    'https://livepocket.jp/event/search?pref=' + encodeURIComponent('東京都'),
    'https://livepocket.jp/event/search?l_cat=' + encodeURIComponent('音楽'),
    'https://livepocket.jp/event/search?l_cat=' + encodeURIComponent('アイドル')
  ];
  for (const u of urls) {
    try {
      const res = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      const html = await res.text();
      console.log(`URL: ${u}`);
      console.log(`  Status: ${res.status}, Length: ${html.length}, Contains ring-1018: ${html.includes('ring-1018')}`);
    } catch(e) {
      console.log('Error', u, e.message);
    }
  }
}
testUpcoming();
