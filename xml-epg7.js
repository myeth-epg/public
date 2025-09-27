const xmlepg = new XMLEPG();
    let channels = [];
    const videoList = document.getElementById('video-list');
    const searchInput = document.getElementById('search-input');
    const epgContainer = document.getElementById('epg-container');
    let lastActiveChannel = null;

    async function loadGzippedXML(url) {
      try {
        const response = await fetch(url);
        const compressed = await response.arrayBuffer();
        const decompressed = pako.ungzip(new Uint8Array(compressed), { to: 'string' });

        await xmlepg.loadFromText(decompressed);
        console.log('✅ EPG loaded from gzipped XML');
      } catch (err) {

     console.error('❌ Failed to load gzipped XML:', err);
      }
    }
document.addEventListener('DOMContentLoaded', async () => {
  const gzippedEPG = "https://myeth-epg.github.io/public/epg.pw.all-7.xml.gz";
  try {
    await loadGzippedXML(gzippedEPG);
    await xmlepg.displayAllPrograms('epg-container', 'xmlepg');
    epgContainer.style.display = 'block';
    xmlepg.timelineNeedleRender();
    channels = xmlepg.channels;
    updatePlaylist(channels);
    searchInput.style.display = 'block';
  } catch (error) {
    console.error('Error loading gzipped EPG:', error);
  }
});

function updatePlaylist(channels) {
  videoList.innerHTML = '';
  channels.forEach(channel => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      <img src="${channel.tvgLogo}" alt="${channel.channelName} logo">
      <span>${channel.channelName}</span>
    `;
    listItem.onclick = () => {
      xmlepg.displayPrograms('overlay', channel.tvgId);
      const children = videoList.getElementsByTagName('li');
      for (let i = 0; i < children.length; i++) {
        children[i].classList.remove('active');
      }
      listItem.classList.add('active');
      lastActiveChannel = listItem.innerHTML;
    };
    videoList.appendChild(listItem);
  });
}

function filterPlaylist(searchTerm) {
  const filteredChannels = channels.filter(channel =>
    channel.channelName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  updatePlaylist(filteredChannels);
}

searchInput.addEventListener('input', (event) => {
  const searchTerm = event.target.value;
  filterPlaylist(searchTerm);
});

function openEPG() {
  epgContainer.style.display = 'block';
  xmlepg.timelineNeedleRender();
}
