let xmlDoc = null; // Global variable to hold the parsed XML document

// 1. Fetch and parse XML on page load
document.addEventListener('DOMContentLoaded', async () => {
  try {
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
  if (!xmlDoc) {
    document.getElementById('results').innerHTML = '<p>EPG data is not loaded yet. Please wait.</p>';
    return;
  }

  const text = document.getElementById('searchText').value.toLowerCase();
  const date = document.getElementById('searchDate').value;
  const time = document.getElementById('searchTime').value;
  const selectedDisplayName = document.getElementById('categorySelect').value; // Get selected display name
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = '<p>Searching...</p>';

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

    // Filtering logic
    const matchDisplayName = !selectedDisplayName || channelId === targetChannelId;
    const matchText = text === '' || titleRaw.toLowerCase().includes(text) || descRaw.toLowerCase().includes(text);
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
              `);    }
  }

      resultsDiv.innerHTML = results.length
        ? results.join('<hr>')
        : '<p>No results found.</p>';}

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
