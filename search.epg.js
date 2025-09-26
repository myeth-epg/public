async function searchEPG() {
  const text = document.getElementById('searchText').value.trim();
  const date = document.getElementById('searchDate').value;
  const resultsDiv = document.getElementById('results');

  const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
  const xmlText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const programmes = xmlDoc.getElementsByTagName('programme');
  let results = [];

  const converterToCN = OpenCC.Converter({ from: 'tw', to: 'cn' });
  const converterToTW = OpenCC.Converter({ from: 'cn', to: 'tw' });
  const normalizedInputCN = converterToCN(text.toLowerCase());
  const normalizedInputTW = converterToTW(text.toLowerCase());

  for (let prog of programmes) {
    const titleRaw = prog.getElementsByTagName('title')[0]?.textContent || '';
    const descRaw = prog.getElementsByTagName('desc')[0]?.textContent || '';
    const start = prog.getAttribute('start') || '';
    const channel = prog.getAttribute('channel') || '';

    const titleCN = converterToCN(titleRaw.toLowerCase());
    const descCN = converterToCN(descRaw.toLowerCase());
    const titleTW = converterToTW(titleRaw.toLowerCase());
    const descTW = converterToTW(descRaw.toLowerCase());

    const matchText =
      normalizedInputCN === '' ||
      titleCN.includes(normalizedInputCN) ||
      descCN.includes(normalizedInputCN) ||
      titleTW.includes(normalizedInputTW) ||
      descTW.includes(normalizedInputTW);

    const matchDate = date === '' || start.startsWith(date.replace(/-/g, ''));

    if (matchText && matchDate) {
      const datePart = start.slice(0, 8);
      const timePart = `${start.slice(8, 10)}:${start.slice(10, 12)}:${start.slice(12, 14)}`;
      const zonePart = start.slice(15);
      results.push(`<p>[${channel}] ${titleRaw}<br>${datePart}  ${timePart}  ${zonePart}<br>${descRaw}</p>`);
    }
  }

  resultsDiv.innerHTML = results.length ? results.join('') : '<p>No results found.</p>';
}



