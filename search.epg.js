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
    let results = [];

    for (let prog of programmes) {
      const title = prog.getElementsByTagName('title')[0]?.textContent.toLowerCase() || '';
      const desc = prog.getElementsByTagName('desc')[0]?.textContent.toLowerCase() || '';
      const channel = prog.getAttribute('channel');
      const start = prog.getAttribute('start');

      const match = text === '' || title.includes(text) || desc.includes(text);

      if (match) {
        results.push(`
          <div class="result">
            <strong>${title}</strong><br>
            Channel: ${channel}<br>
            Start: ${start}<br>
            ${desc}
          </div>
        `);
      }
    }

    resultsDiv.innerHTML = results.length
      ? `<p>Found ${results.length} result(s):</p>` + results.join('')
      : '<p>No results found.</p>';
  } catch (error) {
    resultsDiv.innerHTML = '<p>Error loading EPG data.</p>';
    console.error(error);
  }
}

