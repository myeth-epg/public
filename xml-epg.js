class XMLEPG {
  constructor() {
    this.channels = [];
    this.programs = [];
  }

  async load(urls) {
    const response = await fetch(urls[0]);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "application/xml");
    this.parseChannels(xml);
    this.parsePrograms(xml);
  }

  parseChannels(xml) {
    const channelNodes = xml.querySelectorAll("channel");
    this.channels = Array.from(channelNodes).map(channel => {
      const id = channel.getAttribute("id");
      const name = channel.querySelector("display-name")?.textContent || id;
      const logo = channel.querySelector("icon")?.getAttribute("src") || "";
      return { tvgId: id, channelName: name, tvgLogo: logo, programList: [] };
    });
  }

  parsePrograms(xml) {
    const programNodes = xml.querySelectorAll("programme");
    this.programs = Array.from(programNodes).map(prog => {
      const title = prog.querySelector("title")?.textContent || "Untitled";
      const desc = prog.querySelector("desc")?.textContent || "";
      const icon = prog.querySelector("icon")?.getAttribute("src") || "";
      const start = this.parseDate(prog.getAttribute("start"));
      const stop = this.parseDate(prog.getAttribute("stop"));
      const channelId = prog.getAttribute("channel");
      return {
        title,
        desc,
        icon,
        startDate: start,
        stopDate: stop,
        formattedStartTime: start.toLocaleString(),
        tvgId: channelId
      };
    });

    // Assign programs to channels
    this.channels.forEach(channel => {
      channel.programList = this.programs.filter(p => p.tvgId === channel.tvgId);
    });
  }

  parseDate(dateString) {
    const year = dateString.substring(0, 4);
    const month = dateString.substring(4, 6);
    const day = dateString.substring(6, 8);
    const hour = dateString.substring(8, 10);
    const minute = dateString.substring(10, 12);
    const second = dateString.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  async displayAllPrograms(containerId, instanceName) {
    const container = document.getElementById(containerId);
    container.innerHTML = this.channels.map(channel => {
      return channel.programList.map(prog => {
        return `
          <div class="program">
            <img src="${prog.icon}" alt="${prog.title} thumbnail">
            <div class="program-details">
              <h2>${prog.title}</h2>
              <p>${prog.desc}</p>
              <div>${prog.formattedStartTime}</div>
            </div>
          </div>
        `;
      }).join("");
    }).join("");
  }

  async displayPrograms(containerId, tvgId) {
    const container = document.getElementById(containerId);
    const channel = this.channels.find(c => c.tvgId === tvgId);
    if (!channel || !channel.programList.length) {
      container.innerHTML = `<h2>No EPG data available</h2>`;
      return;
    }

    container.innerHTML = channel.programList.map(prog => {
      return `
        <div class="program">
          <img src="${prog.icon}" alt="${prog.title} thumbnail">
          <div class="program-details">
            <h2>${prog.title}</h2>
            <p>${prog.desc}</p>
            <div>${prog.formattedStartTime}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  timelineNeedleRender() {
    // Optional: Add red line or current time indicator
  }
}

// Initialize and load default EPG
const xmlepg = new XMLEPG();

document.addEventListener('DOMContentLoaded', async () => {
const defaultEPG = "https://myeth-epg.github.io/public/epg.pw.all.xml";
  await xmlepg.load([defaultEPG]);
  await xmlepg.displayAllPrograms('epg-container', 'xmlepg');
  document.getElementById('epg-button').style.display = 'block';

  // Render channel list
  const videoList = document.getElementById('video-list');
  xmlepg.channels.forEach(channel => {
    const li = document.createElement('li');
    li.innerHTML = <img src="${channel.tvgLogo}" alt="${channel.channelName} logo"> ${channel.channelName}`;
    li.onclick = () => {
      xmlepg.displayPrograms('overlay', channel.tvgId);
      document.getElementById('overlay').style.display = 'flex';
    };
    videoList.appendChild(li);
  });
});

// Open full EPG view
function openEPG() {
  document.getElementById('epg-container').style.display = 'block';
  xmlepg.timelineNeedleRender();
}
