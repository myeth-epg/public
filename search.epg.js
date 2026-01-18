let xmlDoc = null; // Global variable to hold the parsed XML document
let s2t, t2s; // Converters for Chinese scripts

// 0. Live Clock
function updateClock() {
  const now = new Date();
  const timeString = now.toLocaleString(undefined, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  const zoneName = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const el = document.getElementById('userTime');
  if (el) {
    el.textContent = `Your Local Time: ${timeString} (${zoneName})`;
  }
}

// 1. Fetch and parse XML on page load
document.addEventListener('DOMContentLoaded', async () => {
  // Start the clock immediately when DOM is ready
  updateClock();
  setInterval(updateClock, 1000);

  try {
    // Initialize converters
    s2t = OpenCC.Converter({ from: 'cn', to: 'tw' });
    t2s = OpenCC.Converter({ from: 'tw', to: 'cn' });

    const response = await fetch('https://myeth-epg.github.io/public/epg.pw.all-2.xml');
    const xmlText = await response.text();
    const parser = new DOMParser();
    xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    console.log('EPG data loaded.');

    // 2. Populate the category dropdown
    populateCategoryDropdown();

  } catch (error) {
    console.error('❌ Failed to load initial EPG data:', error);
    document.getElementById('results').innerHTML = '<p>Error loading EPG data.</p>';
  }
});

// 3. Function to populate the dropdown
function populateCategoryDropdown() {
  if (!xmlDoc) return;

  const channels = xmlDoc.getElementsByTagName('channel');
  const categorySelect = document.getElementById('categorySelect');
  const displayNames = new Set(); // Use a Set to store unique names

  for (let channel of channels) {
    const displayName = channel.querySelector('display-name')?.textContent;
    if (displayName) {
      displayNames.add(displayName);
    }
  }

  // Sort names alphabetically and add them to the dropdown
  const sortedNames = Array.from(displayNames).sort();
  sortedNames.forEach(name => {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  });
}

// 4. Modified search function
function searchEPG() {
  console.clear(); // Clear console for new search
  console.log('--- New Search ---');
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = '<p>Searching...</p>';

  try {
    if (!xmlDoc) {
      resultsDiv.innerHTML = '<p>EPG data is not loaded yet. Please wait.</p>';
      return;
    }

    const text = document.getElementById('searchText').value;
    const date = document.getElementById('searchDate').value;
    const time = document.getElementById('searchTime').value;
    const selectedDisplayName = document.getElementById('categorySelect').value; // Get selected display name

    console.log(`Original Keyword: "${text}"`);

    // Create both simplified and traditional versions of the search text
    const textSimplified = t2s(text.toLowerCase());
    const textTraditional = s2t(text.toLowerCase());
    console.log(`Searching for Simplified: "${textSimplified}" OR Traditional: "${textTraditional}"`);


    const programmes = xmlDoc.getElementsByTagName('programme');
    const results = [];

    // Find the channel ID for the selected display name
    let targetChannelId = null;
    if (selectedDisplayName) {
      const allChannels = xmlDoc.getElementsByTagName('channel');
      for (let channel of allChannels) {
        if (channel.querySelector('display-name')?.textContent === selectedDisplayName) {
          targetChannelId = channel.getAttribute('id');
          break;
        }
      }
    }

    for (let prog of programmes) {
      const titleRaw = prog.querySelector('title')?.textContent || '';
      const descRaw = prog.querySelector('desc')?.textContent || '';
      const start = prog.getAttribute('start');
      const channelId = prog.getAttribute('channel');

      const titleLower = titleRaw.toLowerCase();
      const descLower = descRaw.toLowerCase();

      // Check for matches using both simplified and traditional versions
      const matchText = text === '' || 
                        titleLower.includes(textSimplified) || descLower.includes(textSimplified) ||
                        titleLower.includes(textTraditional) || descLower.includes(textTraditional);

      // Filtering logic
      const matchDisplayName = !selectedDisplayName || channelId === targetChannelId;
      const matchDate = date === '' || start.startsWith(date.replace(/-/g, ''));
      const matchTime = time === '' || start.includes(time.replace(/:/g, ''));

      if (matchDisplayName && matchText && matchDate && matchTime) {
        const displayName = getDisplayName(xmlDoc, channelId);
        const formattedStart = formatStartTime(start);

        results.push(`
<pre style="margin-bottom: 1em; font-family: inherit; max-width: 600px;">
${displayName}
${formattedStart}
${titleRaw}
${descRaw}
</pre>
        `);
      }
    }

    resultsDiv.innerHTML = results.length
      ? results.join('<hr>')
      : '<p>No results found.</p>';
  } catch (error) {
    resultsDiv.innerHTML = '<p>An error occurred during the search. Check the console.</p>';
    console.error('❌ Failed to search EPG:', error);
  }
}

function getDisplayName(xmlDoc, channelId) {
  const channel = xmlDoc.querySelector(`channel[id="${channelId}"]`);
  return channel?.querySelector('display-name')?.textContent || channelId;
}

function formatStartTime(raw) {
  if (!raw) return '';
  // Parse YYYYMMDDHHmmss or YYYYMMDDHHmmss +0000
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
  if (!match) return raw;

  const [_, y, m, d, h, min, s] = match;
  
  // Construct UTC Date object. 
  // IMPORTANT: The XML is assumed to be in UTC (or have an explicit offset we are normalizing to UTC here).
  // If the input 'raw' has a timezone offset (e.g. +0800), simple extraction like this works 
  // IF we assume the input raw string digits are ALREADY in UTC or we strictly follow the 'raw' digits as UTC.
  // XMLTV standard: YYYYMMDDHHMMSS +/-HHMM. 
  // If your XML file ALREADY has UTC digits (e.g. 20251003003000 +0000), this works perfect.
  
  const utcDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s)));
  
  // Return user's local time string
  return utcDate.toLocaleString(undefined, { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
}
