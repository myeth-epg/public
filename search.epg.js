function formatStartTime(raw) {
  // Example: "20250926190000 +0800"
  const datePart = raw.slice(0, 8); // "20250926"
  const timePart = raw.slice(8, 14); // "190000"
  const zonePart = raw.slice(15); // "+0800"

  const formatted = `${datePart}  ${timePart.slice(0,2)}:${timePart.slice(2,4)}:${timePart.slice(4,6)}  ${zonePart}`;
  return formatted;
}




async function searchEPG() {
  const text = document.getElementById('searchText').value.toLowerCase().trim();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = 'Searching...';

  try {
    const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const programmes = xmlDoc.getElementsByTagName('programme');
    const channels = xmlDoc.getElementsByTagName('channel');

    // Build a map of channel ID to display-name
    const channelMap = {};
    for (let ch of channels) {
      const id = ch.getAttribute('id');
      const name = ch.getElementsByTagName('display-name')[0]?.textContent || id;
      channelMap[id] = name;
    }

    let results = [];

    for (let prog of programmes) {
      const titleRaw = prog.getElementsByTagName('title')[0]?.textContent || '';
      const descRaw = prog.getElementsByTagName('desc')[0]?.textContent || '';
      const title = titleRaw.toLowerCase();
      const desc = descRaw.toLowerCase();
      const start = prog.getAttribute('start') || '';
      const channelId = prog.getAttribute('channel') || '';
      const displayName = channelMap[channelId] || channelId;

      const match = text === '' || title.includes(text) || desc.includes(text);

      if (match) {
        const formattedStart = formatStartTime(start);
results.push(`${displayName}\n${formattedStart}\n${titleRaw}\n${descRaw}\n`);

      }
    }

    resultsDiv.innerHTML = results.length
      ? `<pre>${results.join('\n')}</pre>`
      : '<p>No results found.</p>';
  } catch (error) {
    resultsDiv.innerHTML = '<p>Error loading EPG data.</p>';
    console.error(error);
  }
}

