function formatStartTime(raw) {
  const datePart = raw.slice(0, 8);
  const timePart = raw.slice(8, 14);
  const zonePart = raw.slice(15);

  const formattedTime = `${timePart.slice(0,2)}:${timePart.slice(2,4)}:${timePart.slice(4,6)}`;
  return `${datePart} ${formattedTime} ${zonePart}`;
}

function highlightKeyword(text, keyword) {
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedKeyword, 'gi');
  return text.replace(regex, match => `<span class="highlight">${match}</span>`);
}

async function searchEPG() {
  const text = document.getElementById('searchText').value.trim();
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = 'Searching...';

  try {
    const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const programmes = xmlDoc.getElementsByTagName('programme');
    const channels = xmlDoc.getElementsByTagName('channel');

    const channelMap = {};
    for (let ch of channels) {
      const id = ch.getAttribute('id');
      const name = ch.getElementsByTagName('display-name')[0]?.textContent || id;
      channelMap[id] = name;
    }

    const converter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    const normalizedInput = converter(text.toLowerCase());

    let results = [];

    for (let prog of programmes) {
      const titleRaw = prog.getElementsByTagName('title')[0]?.textContent || '';
      const descRaw = prog.getElementsByTagName('desc')[0]?.textContent || '';
      const start = prog.getAttribute('start') || '';
      const channelId = prog.getAttribute('channel') || '';
      const displayName = channelMap[channelId] || channelId;

      const titleNorm = converter(titleRaw.toLowerCase());
      const descNorm = converter(descRaw.toLowerCase());

      const match = normalizedInput === '' || titleNorm.includes(normalizedInput) || descNorm.includes(normalizedInput);

      if (match) {
        const formattedStart = formatStartTime(start);
        const highlightedTitle = highlightKeyword(titleRaw, text);
        const highlightedDesc = highlightKeyword(descRaw, text);

        results.push(`<p><strong>${displayName}</strong><br>${formattedStart}<br>${highlightedTitle}<br>${highlightedDesc}</p>`);
      }
    }

    resultsDiv.innerHTML = results.length
      ? results.join('')
      : '<p>No results found.</p>';

  } catch (error) {
    resultsDiv.innerHTML = '<p>Error loading EPG data.</p>';
    console.error(error);
  }
}


