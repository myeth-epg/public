async function searchEPG() {
  const rawText = document.getElementById('searchText').value.toLowerCase();
  const date = document.getElementById('searchDate').value;
  const time = document.getElementById('searchTime').value;
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = '<p>Searching...</p>';

  // ✅ Initialize OpenCC converters
  const converterS2T = OpenCC.Converter({ from: 'cn', to: 'tw' }); // Simplified to Traditional
  const converterT2S = OpenCC.Converter({ from: 'tw', to: 'cn' }); // Traditional to Simplified

  // ✅ Generate all variants of the input text
  const text = rawText;
  const textS2T = converterS2T(text);
  const textT2S = converterT2S(text);

  try {
    const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const programmes = xmlDoc.getElementsByTagName('programme');
    const results = [];

    for (let prog of programmes) {
      const titleRaw = prog.querySelector('title')?.textContent || '';
      const descRaw = prog.querySelector('desc')?.textContent || '';
      const start = prog.getAttribute('start');
      const channelId = prog.getAttribute('channel');

      const titleLower = titleRaw.toLowerCase();
      const descLower = descRaw.toLowerCase();

      // ✅ Match against all variants of the input
      const matchText =
        text === '' ||
        titleLower.includes(text) ||
        descLower.includes(text) ||
        titleLower.includes(textS2T) ||
        descLower.includes(textS2T) ||
        titleLower.includes(textT2S) ||
        descLower.includes(textT2S);

      const matchDate = date === '' || start.startsWith(date.replace(/-/g, ''));
      const matchTime = time === '' || start.includes(time.replace(/:/g, ''));

      if (matchText && matchDate && matchTime) {
        const displayName = getDisplayName(xmlDoc, channelId);
        const formattedStart = formatStartTime(start);

        results.push(`
<pre style="margin-bottom: 1em; font-family: inherit;">
${displayName}
${formattedStart}
${titleRaw}
${descRaw}
</pre>
        `);
      }
    }

    resultsDiv.innerHTML = results.length
      ? results.join('')
      : '<p>No results found.</p>';
  } catch (error) {
    resultsDiv.innerHTML = '<p>Error loading EPG data.</p>';
    console.error('❌ Failed to search EPG:', error);
  }
}

// 🧠 Helper: Get display name from channel ID
function getDisplayName(xmlDoc, channelId) {
  const channel = xmlDoc.querySelector(`channel[id="${channelId}"]`);
  return channel?.querySelector('display-name')?.textContent || channelId;
}

// 🕒 Helper: Format start time like "20250926  19:00:00  +0800"
function formatStartTime(raw) {
  if (!raw) return '';
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (!match) return raw;

  const [_, y, m, d, h, min, s] = match;
  const zone = raw.slice(15); // "+0800" or empty
  return `${y}${m}${d}  ${h}:${min}:${s}  ${zone}`.trim();
}
