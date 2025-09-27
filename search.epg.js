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
      const title = prog.getElementsByTagName('title')[0]?.textContent || '';
      const desc = prog.getElementsByTagName('desc')[0]?.textContent || '';
      const categoryTag = prog.getElementsByTagName('category')[0]?.textContent || '';
      const startRaw = prog.getAttribute('start');
      const channel = prog.getAttribute('channel');

      const titleLower = title.toLowerCase();
      const descLower = desc.toLowerCase();
      const categoryMatch = category === '' || categoryTag === category;

      const matchText = text === '' || titleLower.includes(text) || descLower.includes(text);
      const matchDate = date === '' || startRaw.startsWith(date.replace(/-/g, ''));
      const matchTime = time === '' || startRaw.includes(time.replace(/:/g, ''));

      if (matchText && matchDate && matchTime && categoryMatch) {
        const startFormatted = formatEPGDate(startRaw);
        results.push(`
          <div style="margin-bottom: 1em; padding: 10px; border-bottom: 1px solid #ccc;">
            <strong>${title}</strong><br>
            <em>${channel}</em> — ${startFormatted}<br>
            <small>${desc}</small><br>
            <span style="color: #888;">Category: ${categoryTag || 'N/A'}</span>
          </div>
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

// 🧠 Helper: Format EPG start time to readable format
function formatEPGDate(epgStart) {
  const match = epgStart.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})/);
  if (!match) return epgStart;

  const [_, year, month, day, hour, minute] = match;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}`);
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

