async function searchEPG() {
  const text = document.getElementById('searchText').value.toLowerCase();
  const date = document.getElementById('searchDate').value;
  const time = document.getElementById('searchTime').value;
  const category = document.getElementById('searchCategory').value;
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
      const categoryMatch = category === '' || categoryTag === category;
      const matchText = text === '' || titleLower.includes(text) || descLower.includes(text);
      const matchDate = date === '' || start.startsWith(date.replace(/-/g, ''));
      const matchTime = time === '' || start.includes(time.replace(/:/g, ''));

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

// 🧠 Helper: Get display name from channel ID
function getDisplayName(xmlDoc, channelId) {
  const channel = xmlDoc.querySelector(`channel[id="${channelId}"]`);
  return channel?.querySelector('display-name')?.textContent || channelId;
}

// 🕒 Helper: Format start time like "20250926  19:00:00  +0800"
function formatStartTime(raw) {
  if (!raw) return '';
  const datePart = raw.slice(0, 8); // "20250926"
  const timePart = raw.slice(8, 14); // "190000"
  const zonePart = raw.slice(15); // "+0800" (optional)

  const formattedTime = `${timePart.slice(0, 2)}:${timePart.slice(2, 4)}:${timePart.slice(4, 6)}`;
  return `${datePart}  ${formattedTime}  ${zonePart || ''}`.trim();
}
