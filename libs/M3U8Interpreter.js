class M3U8Interpreter{constructor(m3u8Content){this.m3u8Content=m3u8Content;this.channels=[];this.urlTvg=null;this.refresh=null}
parse(){const lines=this.m3u8Content.replace('\r','').replace(/(\n{2,})/g,'\n\n').split('\n');let currentChannel=null;let firstLine=lines[0].trim();if(firstLine.startsWith('#EXTM3U')){this.parseEPGInfo(firstLine)}
lines.forEach(line=>{line=line.trim();if(line.startsWith('#EXTINF:')){const channelInfo=this.parseChannelInfo(line);currentChannel={...channelInfo,licenseType:null,licenseKey:null,manifestUrl:null}}else if(line.startsWith('#KODIPROP:')){this.parseKodiprop(line,currentChannel)}else if(/^[A-Za-z0-9]+:\/\//.test(line)&&currentChannel){currentChannel.manifestUrl=line;this.channels.push(currentChannel);currentChannel=null}});if(currentChannel&&currentChannel.manifestUrl){this.channels.push(currentChannel)}}
extractUrls(myString){if(myString===null||myString.trim()===''){return[]}
return myString.split(',').map(url=>url.trim()).filter(url=>url.length>0)}
parseEPGInfo(line){const regexUrlTvg=/url-tvg="([^"]+)"/
const regexRefresh=/refresh="([^"]+)"/
this.urlTvg=regexUrlTvg.exec(line)?regexUrlTvg.exec(line)[1]:null;this.urlTvg=this.extractUrls(this.urlTvg);this.refresh=regexRefresh.exec(line)?regexRefresh.exec(line)[1]:null}
parseChannelInfo(line){const regex=/tvg-id="([^"]+)"\s+group-title="([^"]+)"\s+group-logo="([^"]+)"\s+tvg-logo="([^"]+)"/;const regexTvgId=/tvg-id="([^"]+)"/
const regexGroupTitle=/group-title="([^"]+)"/
const regexGroupLogo=/group-logo="([^"]+)"/
const regexTvgLogo=/tvg-logo="([^"]+)"/
const channelName=line.split(',').pop().trim();try{return{tvgId:regexTvgId.exec(line)?regexTvgId.exec(line)[1]:null,tvgLogo:regexTvgLogo.exec(line)?regexTvgLogo.exec(line)[1]:null,groupTitle:regexGroupTitle.exec(line)?regexGroupTitle.exec(line)[1]:null,groupLogo:regexGroupLogo.exec(line)?regexGroupLogo.exec(line)[1]:null,channelName:channelName}}catch{}
return{tvgId:null,tvgLogo:null,groupTitle:null,groupLogo:null,channelName:channelName}}
parseKodiprop(line,currentChannel){if(!currentChannel)return;if(line.startsWith('#KODIPROP:inputstream.adaptive.license_type=')){currentChannel.licenseType=line.split('=')[1].trim()}else if(line.startsWith('#KODIPROP:inputstream.adaptive.license_key=')){const licenseKey=this.parseLicenseKey(line);currentChannel.licenseKey=licenseKey}}
extractKeysFromJSON(inputString){const jsonKeyPattern=/#KODIPROP:inputstream\.adaptive\.license_key=\s*(\{.*\})/;const match=inputString.match(jsonKeyPattern);if(match){let jsonString=match[1].trim();try{const jsonObj=JSON.parse(jsonString);if(Array.isArray(jsonObj.keys)){const resultArray=[];jsonObj.keys.forEach(item=>{if(item.k&&item.kid){resultArray.push({keyId:this.base64ToHex(item.kid),key:this.base64ToHex(item.k)})}});return resultArray}else{return null}}catch(error){console.error('Error parsing JSON:',error);return null}}
return null}
parseLicenseKey(line){const regexLegacy=/#KODIPROP:inputstream.adaptive.license_key=([A-Fa-f0-9]+):([A-Fa-f0-9]+)/;let match;if(match=regexLegacy.exec(line)){return[{keyId:match[1],key:match[2]}]}else{return this.extractKeysFromJSON(line)}
return null}
base64ToHex(base64){const standardBase64=base64
.replace(/-/g,'+').replace(/_/g,'/');const paddedBase64=standardBase64.padEnd(Math.ceil(standardBase64.length/4)*4,'=');try{const binaryString=window.atob(paddedBase64);const hexString=Array.from(binaryString).map(char=>{const hex=char.charCodeAt(0).toString(16);return hex.padStart(2,'0')}).join('');if(hexString.length>32){return hexString.slice(0,32)}else if(hexString.length<32){return hexString.padStart(32,'0')}
return hexString}catch(error){console.error('Error decoding Base64:',error);return null}}
getChannels(){return this.channels}
getUrlTvg(){return this.urlTvg}
getRefresh(){return this.Refresh}}