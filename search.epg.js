async function searchEPG() {
  const text = document.getElementById('searchText').value.toLowerCase();
  const date = document.getElementById('searchDate').value;
  const time = document.getElementById('searchTime').value;
  const resultsDiv = document.getElementById('results');

  const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const programmes = xmlDoc.getElementsByTagName('programme');
  let results = [];

  for (let prog of programmes) {
    const title = prog.getElementsByTagName('title')[0]?.textContent.toLowerCase()  '';
    const desc = prog.getElementsByTagName('desc')[0]?.textContent.toLowerCase()  '';
    const start = prog.getAttribute('start');
    const channel = prog.getAttribute('channel');

    const matchText = text === ''  title.includes(text)  desc.includes(text);
    const matchDate = date === ''  start.startsWith(date.replace(/-/g, ''));
    const matchTime = time === ''  start.includes(time.replace(/:/g, ''));

    if (matchText && matchDate && matchTime) {
      results.push(<p><strong>${title}</strong> on ${channel} at ${start}<br>${desc}</p>);
    }
  }

  resultsDiv.innerHTML = results.length ? results.join('') : '<p>No results found.</p>';
}




