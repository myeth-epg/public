async function searchEPG() {
  const text = document.getElementById('searchText').value.toLowerCase();
  const date = document.getElementById('searchDate').value;
  const time = document.getElementById('searchTime').value;
  const category = document.getElementById('searchCategory')?.value || '';
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = '<p>Searching...</p>';

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
      const categoryTag = prog.querySelector('category')?.textContent || '';
      const start = prog.getAttribute('start');
      const channelId = prog.getAttribute('channel');

      const titleLower = titleRaw.toLowerCase();
      const descLower = descRaw.toLowerCase();

      const matchText = text === '' || titleLower.includes(text) || descLower.includes(text);
      const matchDate = date === '' || start.startsWith(date.replace(/-/g, ''));
      const matchTime = time === '' || start.includes(time.replace(/:/g, ''));
      const categoryMatch = category === '' || categoryTag === category;

      if (matchText && matchDate && matchTime && categoryMatch) {
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

function getDisplayName(xmlDoc, channelId) {
  const channel = xmlDoc.querySelector(`channel[id="${channelId}"]`);
  return channel?.querySelector('display-name')?.textContent || channelId;
}

function formatStartTime(raw) {
  if (!raw) return '';
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (!match) return raw;

  const [_, y, m, d, h, min, s] = match;
  const zone = raw.slice(15); // "+0800" or empty
  return `${y}${m}${d}  ${h}:${min}:${s}  ${zone}`.trim();
}

