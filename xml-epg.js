class XMLEPG{constructor(){this.xmlDoc=null;this.channels=null;this.programs=null;this.earliestStartDate=null;this.latestStopDate=null;this.timelineLength=null;this.timelineBlockDuration=30;this.oneUnit=5;this.timelineTimer=null;this.epgContainer=null;this.overlayContainer=null;this.playlistChannels=null;this.urls=null;this.selectedGroup='ALL';this.filteredChannels=null}
async setPlaylistChannels(playlistChannels){this.playlistChannels=playlistChannels}
async load(urls){if(urls==null||urls.length==0)
return;this.urls=urls;await this.loadXML(urls);await this.getChannels();await this.getPrograms();await this.sortAndCombine()}
async loadFromText(content){if(content==null||content.length==0)
return;await this.loadXMLFromText(content);await this.getChannels();await this.getPrograms();await this.sortAndCombine()}
async loadXML(urls){const combinedXMLDoc=document.implementation.createDocument(null,'CombinedEPG',null);for(const url of urls){try{const response=await fetch(url);if(!response.ok){console.warn(`Skipping URL due to network issue: ${url}`);continue}
let xmlText;const contentType=response.headers.get('Content-Type');if(contentType.includes('application/gzip')||url.endsWith('.gz')){const arrayBuffer=await response.arrayBuffer();const decompressed=await this.decompressGzip(arrayBuffer);xmlText=new TextDecoder('utf-8').decode(decompressed)}else if(contentType.includes('application/zip')||url.endsWith('.zip')){const arrayBuffer=await response.arrayBuffer();xmlText=await this.extractXMLFromZip(arrayBuffer)}else{xmlText=await response.text()}
if(!xmlText.trim()){console.warn(`Skipping empty XML content from URL: ${url}`);continue}
xmlText=xmlText.replace(/&(?!(?:apos|quot|[gl]t|amp);)/g,'&amp;');const xmlDoc=new DOMParser().parseFromString(xmlText,'application/xml');if(xmlDoc.getElementsByTagName('parsererror').length>0){const serializer=new XMLSerializer();const xmlString=serializer.serializeToString(xmlDoc);console.error('Parsed XML with errors:',xmlString);console.warn(`Skipping malformed XML from URL: ${url}`);continue}
const children=xmlDoc.documentElement.children;for(let i=0;i<children.length;i++){combinedXMLDoc.documentElement.appendChild(combinedXMLDoc.importNode(children[i],!0))}}catch(error){console.warn(`Skipping URL due to error: ${url}`,error);continue}}
this.xmlDoc=combinedXMLDoc}
async loadXMLFromText(content){let xmlDoc;try{let xmlText=content;if(!xmlText.trim()){console.warn(`Skipping empty XML content`)}
xmlText=xmlText.replace(/&(?!(?:apos|quot|[gl]t|amp);)/g,'&amp;');xmlDoc=new DOMParser().parseFromString(xmlText,'application/xml');if(xmlDoc.getElementsByTagName('parsererror').length>0){const serializer=new XMLSerializer();const xmlString=serializer.serializeToString(xmlDoc);console.error('Parsed XML with errors:',xmlString);console.warn(`Skipping malformed XML`)}}catch(error){console.warn(`Malformed EPG`,error)}
this.xmlDoc=xmlDoc}
async decompressGzip(arrayBuffer){return pako.ungzip(new Uint8Array(arrayBuffer))}
async extractXMLFromZip(arrayBuffer){const zip=await JSZip.loadAsync(arrayBuffer);for(const fileName of Object.keys(zip.files)){if(fileName.endsWith('.xml')){return await zip.file(fileName).async('text')}}
console.warn('No XML file found in the ZIP archive')}
async getChannels(){const channels=this.xmlDoc.querySelectorAll('channel');const channelList=[];channels.forEach(channel=>{const tvgId=channel.getAttribute('id');const displayName=channel.querySelector('display-name');const channelName=displayName?displayName.textContent:'No channel name found';const iconElement=channel.querySelector('icon');const tvgLogo=iconElement?iconElement.getAttribute('src'):'default_tvgLogo.png';const groupTitle=channel.getAttribute('group-title')||'Uncategorized';channelList.push({tvgId,channelName,tvgLogo,groupTitle})});this.channels=channelList}
getChanneltvgLogo(tvgId){const channel=this.channels.find(channel=>channel.tvgId===tvgId);return channel?channel.tvgLogo:null}
async getPrograms(){const programs=this.xmlDoc.querySelectorAll('programme');const programList=[];programs.forEach(prog=>{const titleElement=prog.querySelector('title');const title=titleElement?titleElement.textContent:'No title found';const start=prog.getAttribute('start');const stop=prog.getAttribute('stop');const tvgId=prog.getAttribute('channel');const descElement=prog.querySelector('desc');const iconElement=prog.querySelector('icon');const startDate=new Date(this.parseDate(start));const stopDate=new Date(this.parseDate(stop));const formattedStartTime=this.getDayAndTime(startDate);const duration=this.getDurationInMinutes(startDate,stopDate);const desc=descElement?descElement.textContent:'No description';const icon=iconElement?iconElement.getAttribute('src'):this.getChanneltvgLogo(tvgId);programList.push({tvgId,title,desc,icon,startDate,stopDate,formattedStartTime,duration})});this.programs=programList}
async sortAndCombine(){if(this.playlistChannels){this.playlistChannels.forEach(channel=>{let match=this.findBestMatchingChannel(channel);var programs=null;if(match){programs=this.programs.filter(prog=>prog.tvgId===match.tvgId);programs.sort((a,b)=>a.startDate-b.startDate);programs=programs.filter((program,index,self)=>{return index===0||program.startDate!==self[index-1].startDate}); channel.groupTitle = match.groupTitle; }
channel.programList=programs});this.channels=this.playlistChannels;delete this.playlistChannels}else{this.channels.forEach(channel=>{var programs=this.programs.filter(prog=>prog.tvgId===channel.tvgId);if(programs.length==0){programs=null}else{programs.sort((a,b)=>a.startDate-b.startDate);programs=programs.filter((program,index,self)=>{return index===0||program.startDate!==self[index-1].startDate})}
channel.programList=programs})}
let allPrograms=this.channels.map(item=>item.programList).flat();allPrograms=allPrograms.filter(program=>program&&program.startDate);this.earliestStartDate=this.getEarliestDate(allPrograms).startDate;this.latestStopDate=this.getLatestStopDate(allPrograms).stopDate;this.timelineLength=this.getDurationInMinutes(this.earliestStartDate,this.latestStopDate);delete this.programs}
async setTimelineNeedle(){let now=new Date();if(now>this.latestStopDate)now=this.latestStopDate;else if(now<this.earliestStartDate)now=this.earliestStartDate;var currentRedLinePosition=200+(this.getDurationInMinutes(this.earliestStartDate,now)*this.oneUnit);const redLine=document.getElementById('vertical-red-line');if(redLine){redLine.style.left=`${currentRedLinePosition}px`;const fullPageHeight=this.epgContainer.scrollHeight;redLine.style.height=`${fullPageHeight}px`;}const currentTime=new Date();const elements=document.querySelectorAll('.cell');elements.forEach(el=>{el.style.backgroundColor='';el.classList.remove('now')});elements.forEach(el=>{const startDate=new Date(el.getAttribute('start'));const stopDate=new Date(el.getAttribute('stop'));if(currentTime>=startDate&&currentTime<stopDate){el.classList.add('now');el.style.backgroundColor='#5a93a3'}})}
convert24to12(time){let[hours,minutes]=time.split(':');hours=parseInt(hours,10)+8;if(hours>=24){hours-=24}
const period=hours>=12?'PM':'AM';hours=hours%12||12;return'${hours}:${minutes} ${period}'}
getMinutesSinceEarliestStartDate(earliestStartDate,date){if(!date){date=new Date()}
const diffInMs=date-earliestStartDate;const minutes=Math.floor(diffInMs/(1000*60));return minutes}
getDurationInMinutes(date1,date2){let differenceInMs=Math.abs(date2-date1);let differenceInMinutes=Math.floor(differenceInMs/(1000*60));return differenceInMinutes}
parseDate(dateString){const year=dateString.substring(0,4);const month=dateString.substring(4,6)-1;const day=dateString.substring(6,8);const hour=dateString.substring(8,10);const minute=dateString.substring(10,12);const second=dateString.substring(12,14);const timezone=dateString.substring(15,18)+':'+dateString.substring(18,20);const formattedDateString=`${year}-${String(month + 1).padStart(2, '0')}-${day}T${hour}:${minute}:${second}${timezone}`;return new Date(formattedDateString)}
getEarliestDate(programs){return programs.reduce((earliest,current)=>{const currentStartDate=new Date(current.startDate);const earliestStartDate=new Date(earliest.startDate);return currentStartDate<earliestStartDate?current:earliest})}
getLatestStopDate(programs){return programs.reduce((latest,current)=>{const currentStopDate=new Date(current.stopDate);const latestStopDate=new Date(latest.stopDate);return currentStopDate>latestStopDate?current:latest})}
displayDetails(event,channelIndex,programIndex){const program=this.filteredChannels[channelIndex].programList[programIndex];const title=program.title;const desc=program.desc;const formattedStartTime=program.formattedStartTime;tooltip.querySelector('h2').textContent=title;tooltip.querySelector('p').textContent=desc;tooltip.querySelector('div:nth-child(2)').textContent=formattedStartTime;const scrollLeft=this.epgContainer.scrollLeft;const scrollTop=this.epgContainer.scrollTop;tooltip.style.display='block';
    let leftPos = scrollLeft + event.pageX + 10;
    if (event.clientX > window.innerWidth - 320) { leftPos = scrollLeft + event.pageX - 330; }
    let topPos = scrollTop + event.pageY + 10;
    if (event.clientY > window.innerHeight - 200) { topPos = scrollTop + event.pageY - 210; }
    tooltip.style.left=`${leftPos}px`;
    tooltip.style.top=`${topPos}px`;
}
hideTooltip(){const tooltip=document.getElementById('tooltip');if(tooltip){tooltip.style.display='none'}}
  toggleTooltip(event,channelIndex,programIndex){
    const tooltip=document.getElementById('tooltip');
    if(tooltip && tooltip.style.display==='block'){
      this.hideTooltip();
    }else{
      this.displayDetails(event,channelIndex,programIndex);
    }
  }

setOneUnit(oneUnit){if(oneUnit>0){this.oneUnit=oneUnit}}
normalizeChannelName(channelName){return channelName.toLowerCase().replace(/\s*\(?4k\)?\s*|\s*\(?hd\)?\s*/g,'')}
findBestMatchingChannel(playlistChannel){let match=this.channels.find(channel=>channel.tvgId==playlistChannel.tvgId);const normalizedPlaylistName=this.normalizeChannelName(playlistChannel.channelName);if(!match){match=this.channels.find(channel=>this.normalizeChannelName(channel.channelName).includes(normalizedPlaylistName));if(!match){match=this.channels.find(channel=>{const normalizedChannelName=this.normalizeChannelName(channel.channelName);return normalizedPlaylistName.replace('channel','ch').includes(normalizedChannelName.replace('channel','ch'))})}}
return match||null}
filterByGroup(group) { this.selectedGroup = group; this.displayAllPrograms(this.epgContainer.id, 'xmlepg'); }
toggleEpgView() {
    const userControls = document.getElementById('user-controls');
    const epgContainer = document.getElementById('epg-container');

    if (epgContainer.style.display === 'none') {
      epgContainer.style.display = 'block';
      userControls.style.display = 'none';
    } else {
      epgContainer.style.display = 'none';
      userControls.style.display = 'block';
    }
  }
getDayAndTime(date){const daysOfWeek=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dayOfWeek=daysOfWeek[date.getDay()];const options={hour:'2-digit',minute:'2-digit',hour12:!0};const formattedTime=date.toLocaleTimeString([],options);return `${dayOfWeek} ${formattedTime}`}
getDayAndTimeOfNextBlock(date,num){let mydate=new Date(date);mydate.setMinutes(mydate.getMinutes()+(this.timelineBlockDuration*num));const daysOfWeek=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];const dayOfWeek=daysOfWeek[mydate.getDay()];const options={hour:'2-digit',minute:'2-digit',hour12:!0};const formattedTime=mydate.toLocaleTimeString([],options);const monthNames=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];const formattedDate=monthNames[mydate.getMonth()]+' '+mydate.getDate();return {day:dayOfWeek,time:formattedTime,date:formattedDate}}getTimeshiftLink(channel,prog){let sb=new StringBuilder();sb.append(channel.manifestUrl);switch(!0){case channel.manifestUrl.includes("/out/v1/"):sb.append(this.getOption1(prog));break;case channel.manifestUrl.includes("/vxfmt=dp/"):sb.append(this.getOption2(prog));break;case channel.manifestUrl.includes("/bpk-tv/"):sb.append(this.getOption3(prog));break;default:sb.append(this.getDefaultOption(channel.manifestUrl,prog));break}
return sb.toString()}
getOption1(prog){let sb=new StringBuilder();sb.append('?start=');sb.append(this.convertToEpochWithTimezone(prog.startDate));sb.append('&end=');sb.append(this.convertToEpochWithTimezone(prog.stopDate));return sb.toString()}
getOption2(prog){let sb=new StringBuilder();sb.append('&start_time=');sb.append(this.getISODateStringWithoutMilliseconds(prog.startDate));sb.append('&end_time=');sb.append(this.getISODateStringWithoutMilliseconds(prog.stopDate));return sb.toString()}
getOption3(prog){let sb=new StringBuilder();sb.append('?begin=');sb.append(this.getCompactISODateString(prog.startDate));sb.append('&end=');sb.append(this.getCompactISODateString(prog.stopDate));return sb.toString()}
getDefaultOption(manifestUrl,prog){let sb=new StringBuilder();if(manifestUrl.includes("?")){sb.append("&")}else{sb.append("?")}
sb.append('start=');sb.append(this.convertToEpochWithTimezone(prog.startDate));sb.append('&end=');sb.append(this.convertToEpochWithTimezone(prog.stopDate));return sb.toString()}
convertToEpochWithTimezone(date){const epochTime=date.getTime();return Math.floor(epochTime/1000)}
getISODateStringWithoutMilliseconds(date){return date.toISOString().split('.')[0]+"Z"}
getCompactISODateString(date){const year=date.getUTCFullYear();const month=String(date.getUTCMonth()+1).padStart(2,'0');const day=String(date.getUTCDate()).padStart(2,'0');const hours=String(date.getUTCHours()).padStart(2,'0');const minutes=String(date.getUTCMinutes()).padStart(2,'0');const seconds=String(date.getUTCSeconds()).padStart(2,'0');return `${year}${month}${day}T${hours}${minutes}${seconds}Z`}
getDownloadCommand(timeshiftLink,prog,licenseKey){let sb=new StringBuilder();sb.append("N_m3u8DL-RE --check-segments-count false \"");sb.append(timeshiftLink);sb.append("\" -M format=mkv --save-name \"");sb.append(prog.title.replace(/[^a-zA-Z0-9 _]/g,'').trim());sb.append("\" ");sb.append(licenseKey&&licenseKey.length>0?licenseKey.map(item=>`--key ${item.keyId}:${item.key}`).join(' '):'');return sb.toString()}
getSchtasksCommand(downloadCommand,prog){let programName=prog.title.replace(/[^a-zA-Z0-9 _]/g,'').trim();let fileName='download_'+programName.replace(/ /g,'_')+'.bat';let sb=new StringBuilder();sb.append('echo ');sb.append(downloadCommand);sb.append(" -sv best -sa all --save-dir \"%USERPROFILE%\\Videos\"");sb.append(" > ");sb.append("\"%USERPROFILE%\\Videos\\");sb.append(fileName);sb.append("\" & ");sb.append('schtasks /create /sc once ');sb.append(this.schtasksDateTime(prog.stopDate,5));sb.append(" /tn \"Download ");sb.append(programName);sb.append("\" /tr \"cmd /c cd %USERPROFILE%\\Videos & %USERPROFILE%\\Videos\\");sb.append(fileName);sb.append("\"");return sb.toString()}
getCronjobCommand(downloadCommand,prog){let programName=prog.title.replace(/[^a-zA-Z0-9 _]/g,'').trim();let fileName='download_'+programName.replace(/ /g,'_')+'.sh';let sb=new StringBuilder();sb.append("echo x123x");sb.append(downloadCommand);sb.append(" -sv best -sa all --save-dir \"~/Videos\"x123x");sb.append(" > ");sb.append("~/Videos/");sb.append(fileName);sb.append(" &&  chmod +x ~/Videos/");sb.append(fileName);sb.append(" && (crontab -l 2>/dev/null; echo \"");sb.append(this.cronjobDateTime(prog.stopDate,5));sb.append(" cd ~/Videos && ~/Videos/");sb.append(fileName);sb.append("\") | crontab -");return sb.toString()}
copyToClipboard(text,name){navigator.clipboard.writeText(text).then(()=>{console.log(name+' command successfully copied to clipboard')}).catch(err=>{console.error('Failed to copy '+name+' command: ',err)})}
schtasksDateTime(date,minutesToAdd){const newDate=new Date(date.getTime());newDate.setMinutes(newDate.getMinutes()+minutesToAdd);const month=(newDate.getMonth()+1).toString().padStart(2,"0");const day=newDate.getDate().toString().padStart(2,"0");const year=newDate.getFullYear();const hours=newDate.getHours().toString().padStart(2,"0");const minutes=newDate.getMinutes().toString().padStart(2,"0");const sd=`/sd ${day}/${month}/${year}`;const st=`/st ${hours}:${minutes}`;return `${sd} ${st}`}
cronjobDateTime(date,minutesToAdd){const newDate=new Date(date.getTime());newDate.setMinutes(newDate.getMinutes()+minutesToAdd);const minutes=newDate.getMinutes();const hours=newDate.getHours();const dayOfMonth=date.getDate();const month=date.getMonth()+1;const dayOfWeek=date.getDay();const cronExpression=`${minutes} ${hours} ${dayOfMonth} ${month} ${dayOfWeek}`;return cronExpression}
async displayAllPrograms(containerId,xmlepgInstanceName){if(this.urls==null||this.urls.length==0){if(this.playlistChannels&&this.channels==null){this.channels=this.playlistChannels;delete this.playlistChannels}
return}
this.epgContainer=document.getElementById(containerId);const container=this.epgContainer;let sb=new StringBuilder();
this.filteredChannels=this.selectedGroup==='ALL'?this.channels:this.channels.filter(c=>c.groupTitle===this.selectedGroup);
if(!this.filteredChannels)return;
let groups=new Set();
this.channels.forEach(c=>{if(c.groupTitle)groups.add(c.groupTitle)});
let selectHtml=`<select id="group-filter" onchange="${xmlepgInstanceName}.filterByGroup(this.value)" style="width: 250px; height: 40px; margin: auto; padding: 5px 10px; background: #5a93a3; color: #fff; border: 1px solid #fff; border-radius: 4px; font-size: 15px; cursor: pointer; font-weight: bold;"><option value="ALL">All Groups</option>`;
Array.from(groups).sort().forEach(g=>{selectHtml+=`<option value="${g}" ${this.selectedGroup===g?'selected':''}>${g}</option>`});
selectHtml+=`</select>`;
let allPrograms=this.channels.map(item=>item.programList).flat();
var earliestStartDate=this.earliestStartDate;var latestStopDate=this.latestStopDate;const timelineLength=this.timelineLength;const oneUnitWidth=this.oneUnit*this.timelineBlockDuration;
sb.append('<div id="vertical-red-line-container">');
sb.append(`<div class="table"><div class="thead" style="position: sticky; top: 0; z-index: 1005;"><div class="row"><div class="cell channelBox pinned-timeline" style="z-index: 1006; justify-content: center; align-items: center; overflow: visible !important; position: sticky; left: 0; top: 0; background: #000; box-shadow: 2px 2px 5px rgba(0,0,0,0.5);">${selectHtml}</div>`);const numOfBlocks=timelineLength/this.timelineBlockDuration;for(let i=0;i<numOfBlocks;++i){let daytimeInfo=this.getDayAndTimeOfNextBlock(earliestStartDate,i);let day=daytimeInfo.day;let time=daytimeInfo.time;let date=daytimeInfo.date;sb.append(`<div class="cell pinned-timeline" style="width:${this.oneUnit * this.timelineBlockDuration}px;"><div class="timelineDay">${date}, ${day}</div><div class="timelineTime">${time}</div></div>`)}
sb.append(`</div></div>`);var channelIndex=0;this.filteredChannels.forEach(channel=>{sb.append('<div class="row"><div class="cell pinned-channel-box channelBox">');sb.append('<span><img src="'+channel.tvgLogo+'" alt="'+channel.channelName+' tvgLogo" class="channelBoxImage" /></span>');sb.append('<br/>');sb.append('<span class="channelBoxName">'+channel.channelName+'</span>');sb.append('</div>');let programs=channel.programList;if(programs){try{let lastStopDate = earliestStartDate;
var programIndex=0;programs.forEach(program=>{var gap=this.getDurationInMinutes(lastStopDate,program.startDate);if(program.startDate>lastStopDate&&gap>0){sb.append(`<div class="cell" style="width: ${this.oneUnit*gap}px"></div>`)}
var width=this.oneUnit*program.duration;const startDate=program.startDate.toISOString();const stopDate=program.stopDate.toISOString();if(width>0){let icon=program.icon.replace(/'/g,"\\'").replace(/"/g,'&quot;');let title=program.title.replace(/'/g,"\\'").replace(/"/g,'&quot;');let desc=program.desc.replace(/'/g,"\\'").replace(/"/g,'&quot;');let formattedStartTime=program.formattedStartTime.replace(/'/g,"\\'").replace(/"/g,'&quot;');sb.append(`<div class="cell" style="width: ${width}px" onmouseover="${xmlepgInstanceName}.displayDetails(event, ${channelIndex}, '${programIndex}')" onclick="${xmlepgInstanceName}.toggleTooltip(event, ${channelIndex}, '${programIndex}')" onmouseout="${xmlepgInstanceName}.hideTooltip()" start="${startDate}" stop="${stopDate}">`);sb.append('<div class="start-time">');sb.append(program.formattedStartTime.split(' ').slice(1).join(' '));sb.append('</div>');sb.append('<div class="program-title">‎ ');sb.append(program.title);sb.append(' </div>');sb.append('</div>')}
lastStopDate=program.stopDate;++programIndex})}catch(error){console.warn(`Assigned tvg-id ${channel.tvgId} for ${channel.channelName} has empty programme list`)}}
sb.append('</div>');++channelIndex});sb.append('</div>');sb.append('<div id="tooltip" style="display:none;position: absolute; color: #FFFFFF; background-color: #333333; padding: 10px; width: 40%; flex-direction: column; z-index: 2000"><div><h2></h2> <p></p> </div> <div style="float:right; white-space: nowrap;"></div> </div>');sb.append('<div id="vertical-red-line"></div>');sb.append('</div>');sb.append(`<button id="close-button" onclick="${xmlepgInstanceName}.toggleEpgView()">Enter Favourite</button>`);container.innerHTML=sb.toString()}
async timelineNeedleRender(){this.setTimelineNeedle();const redLine=document.getElementById('vertical-red-line');redLine.scrollIntoView({behavior:'smooth',block:'start',inline:'center'});this.timelineTimer=setInterval(()=>{this.setTimelineNeedle()},30000)}
async clearTimelineNeedle(){clearInterval(this.timelineTimer)}
async displayPrograms(containerId,tvgId){const hasManifestUrl=this.channels.some(channel=>channel.manifestUrl);this.overlayContainer=document.getElementById(containerId);const container=this.overlayContainer;container.style.display = 'flex';const channel=this.channels.filter(channel=>channel.tvgId===tvgId)[0];const programs=channel.programList;if(!programs){container.innerHTML=`
				<div class="program" style="background-color: '#282c34';" id="''">
				  <img src="${channel.tvgLogo}" alt="${channel.channelName} logo">
				  <div class="program-details">
					<h2>No EPG data available</h2>
					<p>No EPG data available</p>
				  </div>
				  <div id="startTime">
				  
				  </div>
				</div>
				`;return}container.innerHTML=programs.map(prog=>{var timeshiftLink=hasManifestUrl?this.getTimeshiftLink(channel,prog):null;var downloadCommand=hasManifestUrl?this.getDownloadCommand(timeshiftLink,prog,channel.licenseKey):null;var cronjobCommand=hasManifestUrl?this.getCronjobCommand(downloadCommand,prog):null;var schTasksCommand=hasManifestUrl?this.getSchtasksCommand(downloadCommand,prog):null;const now=new Date();const isCurrentProgram=now>=prog.startDate&&now<=prog.stopDate;const fullStartTime = `${prog.startDate.toLocaleDateString()} ${prog.formattedStartTime}`;
return `
        <div class="program" style="background-color: ${isCurrentProgram ? '#5a93a3' : '#282c34'};" id="${isCurrentProgram ? 'now' : ''}">
          <div class="program-details">
            <h3>${channel.channelName}</h3>
            <p>${fullStartTime}</p>
            <h2>${prog.title}</h2>
            <p>${prog.desc}</p>
          </div>
		  <div id="startTime">
		  ${prog.formattedStartTime}
		  				  ${hasManifestUrl ? `<br><br><div style="border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease;"
onmouseover="this.style.backgroundColor='#61dafb'; this.style.transform='scale(1.05)';"
onmouseout="this.style.backgroundColor=''; this.style.transform='';"
class="timeshiftBtn"
onclick="loadVideo('${timeshiftLink}', '${encodeURIComponent(JSON.stringify(channel.licenseKey))}'); document.getElementById('overlay').style.display = 'none'; document.getElementById('video-container').style.display = 'flex';">🕒Timeshift</div><div style="border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease;"
onmouseover="this.style.backgroundColor='#61dafb'; this.style.transform='scale(1.05)';"
onmouseout="this.style.backgroundColor=''; this.style.transform='';"
class="timeshiftBtn"
onclick="copyToClipboard('${encodeURIComponent(downloadCommand)}', 'Download')">💾Download</div><div style="border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease;"
onmouseover="this.style.backgroundColor='#61dafb'; this.style.transform='scale(1.05)';"
onmouseout="this.style.backgroundColor=''; this.style.transform='';"
class="timeshiftBtn"
onclick="copyToClipboard('${encodeURIComponent(cronjobCommand)}', 'Cronjob')">📅Cronjob</div><div style="border-radius: 5px; cursor: pointer; transition: background-color 0.3s ease, transform 0.2s ease;"
class="timeshiftBtn"
onclick="copyToClipboard('${encodeURIComponent(schTasksCommand)}', 'Schtasks')">📅Schtasks</div>` : ''}
		  </div>
        </div>
      `}).join('');setTimeout(()=>{const nowElement=document.getElementById('now');if(nowElement){nowElement.scrollIntoView({behavior:'auto'})}},500)}}
class StringBuilder{constructor(){this.parts=[]}
append(text){this.parts.push(text);return this}
toString(){return this.parts.join('')}
clear(){this.parts=[]}}

// --- Floating Region Selector UI ---
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  if (currentPath === 'index-all.html') return;
  
  const regions = [
    { name: 'Main a', url: 'index.html' },
    { name: 'Main b', url: 'index-b.html' },
    { name: 'Main t', url: 'index-t.html' },
    { name: 'Main 2t', url: 'index-2t.html' },
    { name: 'Adult', url: 'index-x.html' }
  ];



  const menu = document.createElement('div');
  menu.style.position = 'fixed';
  menu.style.bottom = '30px';
  menu.style.right = '30px';
  menu.style.backgroundColor = 'rgba(30, 34, 39, 0.85)';
  menu.style.backdropFilter = 'blur(10px)';
  menu.style.border = '1px solid rgba(255,255,255,0.1)';
  menu.style.borderRadius = '12px';
  menu.style.padding = '10px 15px';
  menu.style.zIndex = '9999';
  menu.style.boxShadow = '0 8px 32px rgba(0,0,0,0.5)';
  menu.style.display = 'flex';
  menu.style.flexDirection = 'column';
  menu.style.maxHeight = '42px'; 
  menu.style.overflow = 'hidden';
  menu.style.transition = 'max-height 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
  menu.style.fontFamily = 'Arial, sans-serif';

  const header = document.createElement('div');
  header.innerHTML = '🌍 <span style="margin-left:8px;">Switch Region</span>';
  header.style.color = '#61dafb';
  header.style.fontWeight = 'bold';
  header.style.cursor = 'pointer';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.justifyContent = 'space-between';
  header.style.height = '22px';
  header.style.userSelect = 'none';
  
  const arrow = document.createElement('span');
  arrow.textContent = '⏶';
  arrow.style.marginLeft = '15px';
  arrow.style.transition = 'transform 0.3s ease';
  header.appendChild(arrow);

  header.onclick = () => {
    if (menu.style.maxHeight === '42px') {
      menu.style.maxHeight = '500px';
      arrow.style.transform = 'rotate(180deg)';
    } else {
      menu.style.maxHeight = '42px';
      arrow.style.transform = 'rotate(0deg)';
    }
  };
  menu.appendChild(header);

  const linksContainer = document.createElement('div');
  linksContainer.style.display = 'flex';
  linksContainer.style.flexDirection = 'column';
  linksContainer.style.gap = '6px';
  linksContainer.style.marginTop = '15px';
  linksContainer.style.paddingBottom = '10px';
  linksContainer.style.overflowY = 'auto';

  regions.forEach(r => {
    const link = document.createElement('a');
    link.href = r.url;
    link.textContent = r.name;
    link.style.color = '#fff';
    link.style.textDecoration = 'none';
    link.style.padding = '8px 12px';
    link.style.borderRadius = '6px';
    link.style.fontSize = '0.9em';
    link.style.transition = 'all 0.2s ease';
    link.style.display = 'block';
    
    const isCurrent = (currentPath === r.url) || (currentPath === '' && r.url === 'index.html');
    
    if (isCurrent) {
      link.style.backgroundColor = '#61dafb';
      link.style.color = '#000';
      link.style.fontWeight = 'bold';
    } else {
      link.addEventListener('mouseover', () => {
        link.style.backgroundColor = 'rgba(97, 218, 251, 0.2)';
        link.style.transform = 'translateX(5px)';
      });
      link.addEventListener('mouseout', () => {
        link.style.backgroundColor = 'transparent';
        link.style.transform = 'translateX(0)';
      });
    }
    linksContainer.appendChild(link);
  });

  menu.appendChild(linksContainer);
  document.body.appendChild(menu);
});
