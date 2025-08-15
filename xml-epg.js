class XMLEPG {
  constructor() {
    this.channels = [];
    this.programs = [];
    this.timelineStart = null;
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

    this.timelineStart = new Date(Math.min(...this.programs.map(p => p.startDate)));

    this.channels.forEach(channel => {
      channel.programList = this.programs
        .filter(p => p.tvgId === channel.tvgId)
        .sort((a, b) => a.startDate - b.startDate);
    });
  }

  parseDate(dateString) {
    const clean = dateString.split(" ")[0];
    const year = clean.substring(0, 4);
    const month = clean.substring(4, 6);
    const day = clean.substring(6, 8);
    const hour = clean.substring(8, 10);
    const minute = clean.substring(10, 12);
    const second = clean.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  renderEPGGrid(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    container.style.position = "relative"; // Needed for needle

    const grid = document.createElement("div");
    grid.className = "epg-grid";

    // Header row: time slots
    const header = document.createElement("div");
    header.className = "epg-header";
    header.innerHTML = `<div class="channel-cell">Channel</div>`;
    for (let i = 0; i < 48; i++) {
      const slotTime = new Date(this.timelineStart.getTime() + i * 3600000);
      const slot = document.createElement("div");
      slot.className = "time-cell";
      slot.textContent = `${slotTime.getHours()}:00`;
      header.appendChild(slot);
    }
    grid.appendChild(header);

    // Channel rows
    this.channels.forEach(channel => {
      const row = document.createElement("div");
      row.className = "epg-row";

      const channelCell = document.createElement("div");
      channelCell.className = "channel-cell";
      channelCell.innerHTML = `<img src="${channel.tvgLogo}" alt="${channel.channelName}" /> ${channel.channelName}`;
      row.appendChild(channelCell);

      for (let i = 0; i < 48; i++) {
        const cell = document.createElement("div");
        cell.className = "time-cell";
        row.appendChild(cell);
channel.programList.forEach(prog => {
    const offset = Math.floor((prog.startDate - this.timelineStart) / 3600000);
    const duration = Math.ceil((prog.stopDate - prog.startDate) / 3600000);
    const programDiv = document.createElement("div");
    programDiv.className = "program-block";
    programDiv.style.gridColumn = `${offset + 2} / span ${duration}`;
    programDiv.title = `${prog.title}\n${prog.desc}`; // Tooltip

    // Click-to-expand
    programDiv.onclick = () => {
      alert(`📺 ${prog.title}\n\n🕒 ${prog.formattedStartTime}\n\n📝 ${prog.desc}`);
    };

    programDiv.innerHTML = `<strong>${prog.title}</strong>`;
    row.appendChild(programDiv);
  });

  grid.appendChild(row);
});

container.appendChild(grid);
this.timelineNeedleRender(); // Add needle after grid


  }

  timelineNeedleRender() {
    const container = document.getElementById("epg-container");
    const needle = document.createElement("div");
    needle.className = "timeline-needle";
const now = new Date();
const offsetHours = (now - this.timelineStart) / 3600000;
needle.style.left = `${200 + offsetHours * 100}px`; // 200px for channel column

container.appendChild(needle);


  }
}

// Initialize and load default EPG
const xmlepg = new XMLEPG();

document.addEventListener('DOMContentLoaded', async () => {
  const defaultEPG = "https://myeth-epg.github.io/public/epg.pw.all.xml";
  await xmlepg.load([defaultEPG]);
  xmlepg.renderEPGGrid('epg-container');
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
