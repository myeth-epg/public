class XMLEPG {
  constructor() {
    this.channels = [];
    this.programs = [];
  }

  async loadFromText(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    const channelNodes = xmlDoc.getElementsByTagName('channel');
    for (let channel of channelNodes) {
      const id = channel.getAttribute('id');
      const name = channel.querySelector('display-name')?.textContent ?? id;
      const logo = channel.querySelector('icon')?.getAttribute('src') ?? '';
      this.channels.push({ tvgId: id, channelName: name, tvgLogo: logo });
    }

    const programmeNodes = xmlDoc.getElementsByTagName('programme');
    for (let prog of programmeNodes) {
      this.programs.push({
        channel: prog.getAttribute('channel'),
        start: prog.getAttribute('start'),
        title: prog.querySelector('title')?.textContent ?? '',
        desc: prog.querySelector('desc')?.textContent ?? '',
      });
    }
  }

  displayAllPrograms(containerId, className) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    this.programs.forEach(prog => {
      const channel = this.channels.find(c => c.tvgId === prog.channel);
      const div = document.createElement('div');
      div.className = className;
      div.innerHTML = `
        <strong>${channel?.channelName ?? prog.channel}</strong><br>
        ${this.formatStartTime(prog.start)}<br>
        ${prog.title}<br>
        ${prog.desc}<br><br>
      `;
      container.appendChild(div);
    });
  }

  displayPrograms(containerId, channelId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    const filtered = this.programs.filter(p => p.channel === channelId);
    filtered.forEach(prog => {
      const div = document.createElement('div');
      div.innerHTML = `
        <strong>${prog.title}</strong><br>
        ${this.formatStartTime(prog.start)}<br>
        ${prog.desc}<br><br>
      `;
      container.appendChild(div);
    });
  }

  timelineNeedleRender() {
    console.log('🕒 Timeline needle rendered (placeholder)');
    // You can add actual timeline logic here later
  }

  formatStartTime(raw) {
    const match = raw.match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})/);
    if (!match) return raw;
    const [_, y, m, d, h, min, s] = match;
    const zone = raw.slice(15); // "+0800" or empty
    return `${y}-${m}-${d} ${h}:${min}:${s} ${zone}`.trim();
  }
}
