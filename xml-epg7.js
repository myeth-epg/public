  class XMLEPG {
    constructor() {
      this.xmlDoc = null;
      this.channels = null;
      this.programs = null;
      this.urls = null;
    }

    // 🌐 Load EPG from multiple URLs (.xml, .xml.gz, .zip)
    async load(urls) {
      if (!urls || urls.length === 0) return;
      this.urls = urls;
      await this.loadXML(urls);
      await this.getChannels();
      await this.getPrograms();
      await this.sortAndCombine();
    }

    // 🌐 Load EPG from the default URL
    async loadDefault() {
      const defaultUrl = 'https://raw.githubusercontent.com/myeth-epg/public/main/epg.pw.all-7.xml.gz';
      await this.load([defaultUrl]);
    }

    // 📄 Load EPG from raw XML text
    async loadFromText(content) {
      if (!content || content.length === 0) return;
      await this.loadXMLFromText(content);
      await this.getChannels();
      await this.getPrograms();
      await this.sortAndCombine();
    }

    // 📦 Load and combine XML from multiple sources
    async loadXML(urls) {
      const combinedXMLDoc = document.implementation.createDocument(null, 'CombinedEPG', null);

      for (const url of urls) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
             console.warn(\Skipping URL due to network issue: \${url}\);

            continue;
          }

          let xmlText;
          const contentType = response.headers.get('Content-Type');

          if (contentType.includes('application/gzip') || url.endsWith('.gz')) {
            const arrayBuffer = await response.arrayBuffer();
            const decompressed = await this.decompressGzip(arrayBuffer);
            xmlText = new TextDecoder('utf-8').decode(decompressed);
          } else if (contentType.includes('application/zip') || url.endsWith('.zip')) {
            const arrayBuffer = await response.arrayBuffer();
            xmlText = await this.extractXMLFromZip(arrayBuffer);
          } else {
            xmlText = await response.text();
          }

          if (!xmlText.trim()) {
            console.warn(Skipping empty XML content from URL: ${url});
            continue;
          }

          xmlText = xmlText.replace(/&(?!(?:apos|quot|[gl]t|amp);)/g, '&amp;');
          const xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');

          if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
            const serializer = new XMLSerializer();
            const xmlString = serializer.serializeToString(xmlDoc);
            console.error('Parsed XML with errors:', xmlString);
            console.warn(Skipping malformed XML from URL: ${url});
            continue;
          }

          const children = xmlDoc.documentElement.children;
          for (let i = 0; i < children.length; i++) {
            combinedXMLDoc.documentElement.appendChild(combinedXMLDoc.importNode(children[i], true));
          }
        } catch (error) {
          console.warn(Skipping URL due to error: ${url}, error);
          continue;
        }
      }

      this.xmlDoc = combinedXMLDoc;
    }

    // 📄 Load XML from raw text
    async loadXMLFromText(content) {
      let xmlDoc;
      try {
        let xmlText = content;
        if (!xmlText.trim()) {
          console.warn('Skipping empty XML content');
          return;
        }
        xmlText = xmlText.replace(/&(?!(?:apos|quot|[gl]t|amp);)/g, '&amp;');
        xmlDoc = new DOMParser().parseFromString(xmlText, 'application/xml');

        if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
          const serializer = new XMLSerializer();
          const xmlString = serializer.serializeToString(xmlDoc);

  console.error('Parsed XML with errors:', xmlString);
          console.warn('Skipping malformed XML');
          return;
        }
      } catch (error) {
        console.warn('Malformed EPG', error);
      }
  this.xmlDoc = xmlDoc;


    }

    // 🔓 Decompress GZIP
    async decompressGzip(arrayBuffer) {
      return pako.ungzip(new Uint8Array(arrayBuffer));
    }

    // 📦 Extract XML from ZIP
    async extractXMLFromZip(arrayBuffer) {
      const zip = await JSZip.loadAsync(arrayBuffer);
      for (const fileName of Object.keys(zip.files)) {
        if (fileName.endsWith('.xml')) {
          return await zip.file(fileName).async('text');
        }
      }
      console.warn('No XML file found in the ZIP archive');
    }

    // 📺 Extract channel info
    async getChannels() {
      const channels = this.xmlDoc.querySelectorAll('channel');
      const channelList = [];
      channels.forEach(channel => {
        const tvgId = channel.getAttribute('id');
        const displayName = channel.querySelector('display-name');
        const channelName = displayName ? displayName.textContent : 'No channel name found';
        const iconElement = channel.querySelector('icon');
        const tvgLogo = iconElement ? iconElement.getAttribute('src') : 'default_tvgLogo.png';
        channelList.push({ tvgId, channelName, tvgLogo });
      });
      this.channels = channelList;
    }

    // 🖼 Get logo for a channel
    getChanneltvgLogo(tvgId) {
      const channel = this.channels.find(channel => channel.tvgId === tvgId);
      return channel ? channel.tvgLogo : null;
    }

    // 📅 Extract programme info
    async getPrograms() {
      const programs = this.xmlDoc.querySelectorAll('programme');
      const programList = [];
      programs.forEach(prog => {
        const titleElement = prog.querySelector('title');
        const title = titleElement ? titleElement.textContent : 'No title found';
        const start = prog.getAttribute('start');
        const stop = prog.getAttribute('stop');
        const channel = prog.getAttribute('channel');
        const descElement = prog.querySelector('desc');
        const description = descElement ? descElement.textContent : '';
        const dateLabel = this.formatDateWithWeekday(start);
        programList.push({ title, start, stop, channel, description, dateLabel });
      });
      this.programs = programList;
    }

    // 🗓 Format date with weekday (e.g., "2025-09-23 Tue")
    formatDateWithWeekday(dateString) {
      const date = new Date(dateString);
      const options = { weekday: 'short' };
      const weekday = date.toLocaleDateString('en-US', options);
      const formattedDate = date.toISOString().split('T')[0];
      return `${formattedDate} ${weekday}`;
    }

    // 🔄 Placeholder for sorting and combining logic
    async sortAndCombine() {
      // Implement your sorting logic here if needed
    }
  }
