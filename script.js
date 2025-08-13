const XML_URL = "https://myeth-epg.github.io/public/epg.pw.all.xml";
const timelineEl = document.getElementById("timeline");
const channelsEl = document.getElementById("channels");

async function loadEPG() {
  const res = await fetch(XML_URL);
  const text = await res.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "application/xml");

  const programs = [...xml.querySelectorAll("programme")];
  const channels = [...xml.querySelectorAll("channel")];

  const channelMap = {};
  channels.forEach(channel => {
    const id = channel.getAttribute("id");
    const name = channel.querySelector("display-name")?.textContent || id;
    const icon = channel.querySelector("icon")?.getAttribute("src") || "";
    channelMap[id] = { name, icon };
  });

  // Build timeline (48 hours from now)
  const startTime = new Date();
  for (let i = 0; i < 48; i++) {
    const slotTime = new Date(startTime.getTime() + i * 3600000);
    const label = slotTime.toLocaleString("en-US", {
      weekday: "short",
      hour: "2-digit",
      day: "2-digit",
      month: "short",
    });
    const slot = document.createElement("div");
    slot.className = "time-slot";
    slot.textContent = label;
    timelineEl.appendChild(slot);
  }

  // Group programs by channel
  const grouped = {};
  programs.forEach(p => {
    const cid = p.getAttribute("channel");
    if (!grouped[cid]) grouped[cid] = [];
    grouped[cid].push(p);
  });

  // Render each channel row
  Object.entries(grouped).forEach(([cid, progs]) => {
    const row = document.createElement("div");
    row.className = "channel-row";

    const info = document.createElement("div");
    info.className = "channel-info";
    const img = document.createElement("img");
    img.src = channelMap[cid]?.icon || "";
    const span = document.createElement("span");
span.textContent = channelMap[cid]?.name || cid;
    info.appendChild(img);
    info.appendChild(span);
    row.appendChild(info);
// Render programs
progs.forEach(p => {
  const start = new Date(p.getAttribute("start").slice(0, 14).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5"));
  const stop = new Date(p.getAttribute("stop").slice(0, 14).replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1-$2-$3T$4:$5"));
  const duration = (stop - start) / 3600000; // in hours
  const offset = (start - startTime) / 3600000;

  if (offset >= 0 && offset < 48) {
    const progEl = document.createElement("div");
    progEl.className = "program";
    progEl.style.minWidth = `${duration * 120}px`;
    progEl.style.marginLeft = `${offset * 120}px`;
    progEl.textContent = p.querySelector("title")?.textContent || "Untitled";
    row.appendChild(progEl);
  }
});

channelsEl.appendChild(row);
  });
}

loadEPG();
