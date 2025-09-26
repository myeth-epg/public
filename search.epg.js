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
      const title = prog.getElementsByTagName('title')[0]?.textContent.toLowerCase() || '';
      const desc = prog.getElementsByTagName('desc')[0]?.textContent.toLowerCase() || '';
      const start = prog.getAttribute('start') || '';
      const channelId = prog.getAttribute('channel') || '';
      const displayName = channelMap[channelId] || channelId;

      const match = text === '' || title.includes(text) || desc.includes(text);

      if (match) {
        results.push(`${displayName}\n${start}\n${title}\n${desc}\n`);
      }
    }

    resultsDiv.innerHTML = results.length
      ? `<p>Found ${results.length} result(s):</p><pre>${results.join('\n')}</pre>`
      : '<p>No results found.</p>';
  } catch (error) {
    resultsDiv.innerHTML = '<p>Error loading EPG data.</p>';
    console.error(error);
  }
}
