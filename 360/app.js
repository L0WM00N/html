import { icon } from './icons.js';
import { createMinecraftBridge } from './minecraft-bridge.js';
import { createAchievementPopup } from './achievement-popup.js';

const $ = (s) => document.querySelector(s);
const stage = $('#stage');
const tabNames = ['home','social','games','tv & movies','music','apps','settings'];
let tab = 0, selected = 0, screen = null, screenStack = [], modal = null, guide = false, guideIndex = 0, poweredOff = false;
let trayOpen = false, audioUnlocked = false, welcomePending = false, launched = false, menuTransitioning = false, actionPending = false, modalActionPending = false, gamesOpen = false, gamesSelected = 0, viewTransitioning = false;
const saved = (key, fallback) => { try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; } };
const save = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
let profile = saved('metro-profile',''), consoleName = saved('metro-console','Xbox 360'), soundEnabled = saved('metro-sound','on') === 'on';
let minecraftBridge = null;
const sounds = {
 select: new Audio('./uploads/10._Select_A.mp3'),
 selectAlt: new Audio('./uploads/11._Select_A__Alt_.mp3'),
 selectB: new Audio('./uploads/12._Select_B.mp3'),
 move: new Audio('./uploads/Change_Panel.wav'),
 page: new Audio('./uploads/08._Page_Left.mp3'),
 pageRight: new Audio('./uploads/09._Page_Right.mp3'),
 back: new Audio('./uploads/14._Back.mp3'),
 backAlt: new Audio('./uploads/15._Back_2.mp3'),
 welcome: new Audio('./uploads/Welcome.wav'),
 notification: new Audio('./uploads/Notification.mp3'),
 guideClick: new Audio('./sfx/guide-click.wav')
};
function sound(name) { if (!soundEnabled || !audioUnlocked) return; const a=sounds[name].cloneNode(); a.volume=name==='welcome'?.5:name==='notification'?.55:name==='guideClick'?.32:.24; a.play().catch(()=>{}); }
function guideClick(){sound('guideClick');}
function backSound(staysInSubmenu){if(staysInSubmenu){sound('selectB');sound('backAlt');}else sound('back');}
function playWelcome(){if(!welcomePending)return;welcomePending=false;if(!soundEnabled)return;const a=sounds.welcome.cloneNode();a.volume=.5;a.play().catch(()=>{welcomePending=true;});}
function unlock(){audioUnlocked=true;if(bootActive){const video=$('#boot-video');if(video.muted){video.muted=false;video.play().catch(()=>{video.muted=true;});}}else playWelcome();}
window.addEventListener('pointerdown',unlock,{once:true});
window.addEventListener('keydown',unlock,{once:true});
function resize(){const {width,height}=$('#dashboard').getBoundingClientRect();document.documentElement.style.setProperty('--scale',Math.min(width/1280,height/720));}
window.addEventListener('resize',resize);
window.visualViewport?.addEventListener('resize',resize);
resize();
const logo = `<img class="live-logo" src="uploads/Xbox_Live__trsp_.png" alt="Xbox LIVE">`;
const hero = `<button class="hero" data-index="3" aria-label="Connect to Xbox Live">${logo}<div class="entertainment-icons">${icon('games','hero-gamepad')}${['tv','film','music'].map(icon).join('')}</div><span class="connect-copy">Connect your Xbox 360 to the Internet to explore games,<br>entertainment, and more</span></button>`;
const localProfile = `<section class="local-profile" aria-label="Player profile"><h2 id="local-profile-name"></h2><p class="local-gamerscore" aria-label="Gamerscore: 0">0 <span aria-hidden="true">G</span></p><img class="local-profile-picture" src="uploads/profilePicture.png" alt=""><img class="local-avatar" src="uploads/avatar-body.png" alt="Placeholder player avatar"></section>`;
const panels = [
 [['Play Minecraft','minecraft','minecraft'],['Recent','clock','recent'],['My Pins','pin','pins',true]],
 [['Friends','friends','friends'],['Social Apps','apps','apps'],['Sign In or Out','signin','signin']],
 [['My Games','games','games'],['Browse Games','bag','store',true],['Search Games','search','search',true]],
 [['My Video Apps','apps','video'],['Browse TV & Movies','bag','store',true],['Search TV & Movies','search','search',true]],
 [['My Music Apps','apps','music'],['Browse Music','bag','store',true],['Search Music','search','search',true]],
 [['My Apps','apps','apps'],['Browse Apps','bag','store',true],['Search Apps','search','search',true]],
 [['System','system','system'],['Profile','profile','profile',true],['Preferences','list','preferences'],['Kinect','kinect','kinect',true],['Account','account','account',true],['Privacy','lock','privacy',true],['Family','family','family'],['Turn Off','power','off']]
];
function tileMarkup(t,i){const minecraft=t[1]==='minecraft';const multiline=t[0].endsWith('TV & Movies');return `<button class="tile ${minecraft?'game-tile':''} ${multiline?'multiline-label':''}" data-index="${i}" aria-label="${t[0]}">${minecraft?'<img class="tile-cover" src="uploads/Minecraft-360_2222940b.webp" alt="">':icon(t[1])}<span class="label">${t[0]}</span></button>`;}
$('#tabs').innerHTML=tabNames.map((n,i)=>`<button data-tab="${i}" class="${i===0?'active':''}" aria-current="${i===0?'page':'false'}">${n}</button>`).join('');
$('#rail').innerHTML=panels.map((items,i)=>`<section class="panel ${i===0?'current':''}" data-panel="${i}" aria-label="${tabNames[i]}">${i===6?`<div class="settings-grid">${items.map(tileMarkup).join('')}</div>`:`<div class="quick-tiles">${items.map(tileMarkup).join('')}</div>${i===1?`<div class="social-feature">${localProfile}<div class="social-copy"><img class="social-logo" src="uploads/xboxlivelogo2.png" alt="Xbox LIVE"><p>Go online to discover games, movies, apps, and find your friends.</p><button data-join="true">➜ &nbsp; Join the Fun</button></div></div>`:hero}`}</section>`).join('');
function updateSelection(){document.querySelectorAll('.panel .selected').forEach(e=>e.classList.remove('selected'));const panel=document.querySelector(`[data-panel="${tab}"]`);panel.querySelector(`[data-index="${selected}"]`)?.classList.add('selected');}
function switchTab(i){if(screen||modal||guide||gamesOpen||viewTransitioning||actionPending)return; const next=Math.max(0,Math.min(6,i));if(next===tab)return;const pageSound=next>tab?'pageRight':'page';tab=next;selected=0;sound(pageSound);$('#rail').style.transform=`translateX(${-976*tab}px)`;document.querySelectorAll('[data-tab]').forEach((b,i)=>{b.classList.toggle('active',i===tab);b.setAttribute('aria-current',i===tab?'page':'false');});document.querySelectorAll('.panel').forEach((p,i)=>p.classList.toggle('current',i===tab));updateSelection();}
$('#tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b)switchTab(+b.dataset.tab);});
document.querySelectorAll('.panel').forEach(panel=>{panel.addEventListener('click',e=>{if(actionPending||menuTransitioning)return;const p=+panel.dataset.panel;if(p!==tab)switchTab(p);if(e.target.closest('[data-join]')){sound('selectAlt');connect();return;}const b=e.target.closest('[data-index]');if(b){selected=+b.dataset.index;updateSelection();activate();}});});
updateSelection();
const pulseDurationMs=320;
const pulseTimers=new WeakMap();
function pulseButton(button){if(!button)return;clearTimeout(pulseTimers.get(button));button.classList.remove('pulse-once');void button.offsetWidth;button.classList.add('pulse-once');pulseTimers.set(button,setTimeout(()=>button.classList.remove('pulse-once'),pulseDurationMs+40));}
document.addEventListener('click',e=>{const button=e.target.closest('button');if(button&&!button.matches('.panel [data-index],.dialog .actions button,.error-confirm,.owned-game,#games-back'))pulseButton(button);},true);
const errorMessages={
  live:{title:'Xbox Live',message:'Sorry, this action can’t be performed at this time. Try again later. Visit www.xbox.com/support for more information.',code:'8015402B'},
  network:{title:'Xbox Live',message:'Can’t connect to Xbox LIVE. The Internet connection test failed. Check your network settings and try again.'},
  marketplace:{title:'Xbox Live',message:'The Xbox LIVE Marketplace isn’t available right now. Try again later.'},
  friends:{title:'Xbox Live',message:'Can’t display your friends because there is no network connection. Connect to Xbox LIVE and try again.'},
  signin:{title:'Xbox Live',message:'Can’t sign in or out of Xbox LIVE because there is no network connection. Check your network settings and try again. Your local profile is still signed in.'},
  account:{title:'Xbox Live',message:'Can’t get your account information right now. Try again later.'},
  privacy:{title:'Xbox Live',message:'Can’t open online privacy settings right now. Connect to Xbox LIVE and try again.'},
  profileNeeded:{title:'Xbox Live',message:'You need to sign in to a profile before you can see your friends.'},
  recent:{title:'Recent',message:'No recently played games or apps were found.'},
  pins:{title:'My Pins',message:'No pinned games or apps were found.'},
  computers:{title:'Xbox 360',message:'No computers were found on your network. Check your connection and try again.'},
  notifications:{title:'Xbox Live',message:'Notifications aren’t available while you’re offline. Connect to Xbox LIVE and try again.'},
  profileDownload:{title:'Xbox Live',message:'Your profile can’t be downloaded right now. Check your Xbox LIVE connection and try again.'},
  kinect:{title:'Xbox 360',message:'No Kinect sensor was found. Connect a Kinect sensor and try again.'},
  storage:{title:'Xbox 360',message:'No storage device was found. Connect a storage device and try again.'},
  noDisc:{title:'Forza Horizon',message:'No disc is inserted. Insert the Forza Horizon game disc and try again.'},
  vision:{title:'Xbox Live',message:'No Xbox LIVE Vision camera was found. Connect a camera and try again.'}
};
function showError(kind='live', overrides={}){
  const error={...(errorMessages[kind]||errorMessages.live),...overrides};
  modal={...error,error:true,readyAt:performance.now()+1000,actions:[{label:'OK',run:closeDialog}],index:0};
  renderDialog();
}
function connect(){showError('live');}
function showDialog(title,message,actions=[{label:'OK',run:closeDialog}],inputValue){modal={title,message,actions,index:0,inputValue};renderDialog();}
function runModalAction(i){if(modalActionPending||modal?.error&&performance.now()<modal.readyAt)return;const action=modal.actions[i];modalActionPending=true;if(guide)guideClick();else if(/^(Cancel|Back)$/.test(action.label))backSound(!!(screen||gamesOpen));else sound('select');pulseButton(modal.error?$('.error-confirm'):$$('.dialog .actions button')[i]);setTimeout(()=>{modalActionPending=false;action.run();},pulseDurationMs);}
function renderDialog(){
  const o=$('#overlay');
  o.hidden=false;
  if(modal.achievementList){
    const state=minecraftBridge.snapshot();
    o.innerHTML='<section class="dialog achievements-dialog" role="dialog" aria-modal="true" aria-label="Minecraft Achievements"><header><h2>Achievements</h2><img src="uploads/profilePicture.png" alt=""><time></time></header><div class="achievement-detail"><div class="achievement-game">Minecraft: Xbox 360 Edition</div><div class="achievement-name"></div><div class="achievement-description"></div><div class="achievement-value"></div></div><div class="actions achievement-grid" role="group" aria-label="Minecraft achievements"></div><div class="achievement-summary"></div><div class="achievement-controls"><span><i class="key a">A</i> Select</span><button type="button"><i class="key b">B</i> Back</button></div></section>';
    o.querySelector('time').textContent=new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
    o.querySelector('.achievement-summary').textContent=`${state.unlockedCount} of ${state.totalCount} unlocked · ${state.gamerscore} / ${state.totalGamerscore} G`;
    state.achievements.forEach((item,i)=>{
      const b=document.createElement('button');
      b.type='button';
      b.className=`achievement-tile${item.unlocked?' unlocked':''}${i===modal.index?' selected':''}`;
      const image=document.createElement('img');
      image.className='achievement-tile-icon';
      image.src=item.icon;
      image.alt='';
      b.append(image);
      b.setAttribute('aria-label',`${item.name}, ${item.gamerscore} gamerscore, ${item.unlocked?'unlocked':'locked'}. ${item.description}`);
      b.setAttribute('aria-pressed',String(i===modal.index));
      b.onclick=()=>runModalAction(i);
      b.onpointerenter=()=>{modal.index=i;highlightModal();};
      o.querySelector('.achievement-grid').append(b);
    });
    updateAchievementDetail();
    o.querySelector('.achievement-controls button').onclick=back;
    updateFooter();
    o.querySelector('.achievement-tile.selected')?.focus({preventScroll:true});
    return;
  }
  if(modal.error){
    o.innerHTML='<section class="error-shell" role="alertdialog" aria-modal="true" aria-labelledby="error-title" aria-describedby="error-message"><div class="error-dialog"><div class="error-header"><span class="error-mark" aria-hidden="true"></span><h2 id="error-title"></h2></div><div class="error-body"><p id="error-message" class="error-late"></p><p class="error-code error-late"></p></div><button class="error-confirm error-late" type="button">OK</button></div><div class="error-controls error-late"><span><i class="error-pad a">A</i> Select</span><span><i class="error-pad b">B</i> Back</span></div></section>';
    $('#error-title').textContent=modal.title;
    $('#error-message').textContent=modal.message;
    const code=$('.error-code');
    code.textContent=modal.code||'';
    code.hidden=!modal.code;
    $('.error-confirm').onclick=()=>runModalAction(0);
    updateFooter();
    return;
  }
  o.innerHTML='<section class="dialog" role="dialog" aria-modal="true"><h2></h2><p></p><div class="actions"></div></section>';
  o.querySelector('h2').textContent=modal.title;
  const message=o.querySelector('p');
  message.textContent=modal.message;
  message.hidden=!modal.message;
  if(modal.inputValue!==undefined){const input=document.createElement('input');input.value=modal.inputValue;input.maxLength=20;input.setAttribute('aria-label',modal.title);o.querySelector('.actions').before(input);setTimeout(()=>input.focus(),50);}
  modal.actions.forEach((a,i)=>{const b=document.createElement('button');b.textContent=a.label;b.classList.toggle('selected',i===modal.index);b.onclick=()=>runModalAction(i);o.querySelector('.actions').append(b);});
  updateFooter();
}
function updateAchievementDetail(){
  if(!modal?.achievementList)return;
  const item=minecraftBridge.snapshot().achievements[modal.index];
  if(!item)return;
  $('.achievement-name').textContent=item.name;
  $('.achievement-description').textContent=item.description;
  $('.achievement-value').textContent=`${item.gamerscore} G · ${item.unlocked?'Unlocked':'Locked'}`;
}
function highlightModal(){$$('.dialog .actions button').forEach((b,i)=>{b.classList.toggle('selected',i===modal.index);if(modal?.achievementList)b.setAttribute('aria-pressed',String(i===modal.index));if(i===modal.index)b.scrollIntoView({block:'nearest'});});updateAchievementDetail();}
function $$(s){return [...document.querySelectorAll(s)];}
function closeDialog(){modal=null;if(guide)renderGuide();else{$('#overlay').hidden=true;$('#overlay').innerHTML='';}updateFooter();}
function updateFooter(){$('#back-hint').hidden=!(screen||modal||guide);const extra=$('#settings-extra-hint');extra.hidden=!!modal||!['test','storage'].includes(screen?.id);if(!extra.hidden)extra.innerHTML=`<i class="key y">Y</i> ${screen.id==='test'?'Status':'Device Options'}`;}
const viewTransitionMs=1050;
function openGamesScreen(){if(viewTransitioning)return;gamesOpen=true;gamesSelected=0;updateGamesSelection();viewTransitioning=true;const dashboard=$('#dashboard-view'),games=$('#games-screen');games.hidden=false;dashboard.classList.add('view-zoom-out');games.classList.add('view-grow-in');setTimeout(()=>{dashboard.hidden=true;dashboard.classList.remove('view-zoom-out');games.classList.remove('view-grow-in');viewTransitioning=false;},viewTransitionMs);}
function closeGamesScreen(animate=true){if(!gamesOpen)return;const dashboard=$('#dashboard-view'),games=$('#games-screen');gamesOpen=false;if(!animate){games.hidden=true;games.classList.remove('view-shrink-out','view-grow-in');dashboard.hidden=false;dashboard.classList.remove('view-zoom-in','view-zoom-out');viewTransitioning=false;return;}viewTransitioning=true;dashboard.hidden=false;games.classList.add('view-shrink-out');dashboard.classList.add('view-zoom-in');setTimeout(()=>{games.hidden=true;games.classList.remove('view-shrink-out');dashboard.classList.remove('view-zoom-in');viewTransitioning=false;},viewTransitionMs);}
const ownedGames=$$('.owned-game');
function updateGamesSelection(){ownedGames.forEach((game,i)=>game.classList.toggle('selected',gamesSelected===i));$('#games-achievements').hidden=gamesSelected!==0;}
ownedGames.forEach((game,i)=>game.addEventListener('click',()=>{
  if(menuTransitioning||viewTransitioning)return;
  gamesSelected=i;updateGamesSelection();sound('select');pulseButton(game);
  if(i===0)launchMinecraft();
  else if(i===1)showError('noDisc');
  else showError('noDisc',{title:game.getAttribute('aria-label'),message:'No disc is inserted. Insert the game disc and try again.'});
}));
$('#games-back').addEventListener('click',back);
$('#games-achievements').addEventListener('click',()=>{if(gamesSelected===0&&!viewTransitioning){sound('select');showAchievements();}});
function profileDialog(){showDialog(profile?'Edit Profile':'Create Profile','Choose a gamertag for this dashboard.',[{label:'Save Profile',run:()=>{const value=$('.dialog input').value.trim();if(!value){$('.dialog input').focus();return;}profile=value;save('metro-profile',profile);updateLocalProfile();closeDialog();}},{label:'Cancel',run:closeDialog}],profile);}
function toggleTray(){trayOpen=!trayOpen;}
function activate(){if(menuTransitioning||actionPending)return;const action=panels[tab][selected]?.[2];sound('selectAlt');pulseButton(document.querySelector(`[data-panel="${tab}"] [data-index="${selected}"]`));if(action==='minecraft'){launchMinecraft();return;}actionPending=true;setTimeout(()=>{actionPending=false;if(selected===3&&tab!==6){connect();return;}switch(action){
case 'minecraft':launchMinecraft();break;
case 'tray':toggleTray();break;
case 'system':openScreen('system');break;
case 'preferences':openScreen('preferences');break;
case 'profile':profileDialog();break;
case 'signin':showError('signin');break;
case 'off':showDialog('Turn Off Console','Are you sure you want to turn off the console?',[{label:'Turn Off Console',run:powerOff},{label:'Cancel',run:closeDialog}]);break;
case 'recent':showError('recent');break;
case 'pins':showError('pins');break;
case 'games':openGamesScreen();break;
case 'apps':case 'video':case 'music':showError('marketplace');break;
case 'store':showError('marketplace');break;
case 'friends':showError('friends');break;
case 'family':openScreen('family');break;
case 'kinect':showError('kinect');break;
case 'privacy':case 'account':showError(action);break;
case 'search':showDialog(panels[tab][selected][0],'Search Xbox LIVE',[{label:'Search',run:()=>showError('marketplace')},{label:'Cancel',run:closeDialog}],'');break;
default:connect();}},pulseDurationMs);}
const systemItems=[['Console Settings','system','console','Change your Xbox 360 console settings, including display, audio, language, and remote control.'],['Kinect Settings','kinect','kinect','Change settings for your Kinect sensor.'],['Storage','storage','storage','View storage devices and available space.'],['Network Settings','network','network','Configure your connection to the Internet and Xbox LIVE.'],['Computers','computer','computers','Connect to a computer to share media.'],['TV','tv','tv','Change your television settings.'],['Xbox LIVE Vision','vision','vision','Set up your Xbox LIVE Vision camera.'],['Initial Setup','setup','setup','Review the initial setup of your Xbox 360.']];
const consoleItems=[['Display','','display','Choose your display settings.'],['Audio','','audio','Change your console’s sound settings.'],['Language and Locale','','language','Current Setting\nEnglish'],['Clock','','clock','Set the time and date.'],['Startup and Shutdown','','startup','Current Setting\nXbox Dashboard'],['Auto-Play','','autoplay','Current Setting\nDisable'],['Remote Control','','remote','Current Setting\nBoth Remotes'],['Connected Devices','','devices','Manage devices connected to your console.'],['System Info','','info','Current Setting\nDashboard: 2.0.16154.0\n\nView your console’s system information.'],['Console Name','','name','Change the name of your console.']];
const networkItems=[['Configure Network','network','configure','View basic and additional network settings.'],['Test Xbox Live Connection','network','test','Check the network, Internet, and Xbox LIVE connection.']];
const testItems=[['Configure Network','','configure','Review network settings.'],['Restart Test','','restart-test','Test the connection again.'],['Show Suggestions','','suggestions','Visit Xbox.com/networkhelp for more help.'],['Continue','','continue-test','Return to Network Settings.']];
const storageItems=[['Hard Drive','storage','hard-drive','449 GB free'],['Cloud Saved Games','storage','cloud','2.0 GB free'],['USB Storage Device','storage','usb-1','1862 GB free'],['USB Storage Device','storage','usb-2','1862 GB free']];
const configureTabs=[
  [['Wireless Settings','','wireless','Wireless Mode\n802.11g\nNetwork Name (SSID)\nWiFi\nNetwork Type\nInfrastructure\nWireless Security\nWPA2'],['IP Settings','','ip','Automatic'],['DNS Settings','','dns','Automatic']],
  [['PPPoE Settings','','pppoe','Not configured'],['Advanced Settings','','advanced','Automatic'],['Alternate MAC Address','','mac','Not configured']]
];
function screenData(id){if(id==='system')return {title:'System Settings',items:systemItems};if(id==='console')return {title:'Console Settings',items:consoleItems};if(id==='network')return {title:'Network Settings',items:networkItems};if(id==='test')return {title:'Test Xbox Live Connection',items:testItems,index:2};if(id==='configure')return {title:'Configure Network',items:configureTabs[0],tab:0};if(id==='storage')return {title:'Storage Devices',items:storageItems,index:0};if(id==='preferences')return {title:'Preferences',items:[['Notifications','','notifications','Current Setting\nOff'],['Dashboard Sounds','','audio','Turn dashboard sound effects on or off.'],['Profile','','profile','Change your local gamertag.']]};if(id==='family')return {title:'Family Settings',items:[['Console Safety','','safety','Manage console safety settings.'],['Privacy & Online Settings','','privacy','Online privacy settings require Xbox LIVE.']]};return {title:id,items:[]};}
function openScreen(id){if(screen)screenStack.push(screen);const data=screenData(id);screen={...data,id,index:data.index??0};renderScreen();}
function renderSpecialScreen(e){
  e.className=`special-settings ${screen.id}-settings`;
  e.innerHTML='<h1></h1><div class="special-content"></div>';
  e.querySelector('h1').textContent=screen.title;
  const content=e.querySelector('.special-content');
  if(screen.id==='test'){
    content.innerHTML='<div class="test-left"><div class="special-list"></div><p>Visit Xbox.com/networkhelp for more help.</p></div><div class="test-status"><h2>Test Status</h2><div><span>✖</span> Network: <strong>Failed</strong></div><div><span>✖</span> Internet: <strong>Blocked</strong></div><div><span>✖</span> Xbox Live: <strong>Blocked</strong></div></div><div class="test-path"><span>▣<small>Xbox 360</small></span><b>✖</b><span>▂▄▆█<small>Network</small></span><span>◉<small>Internet</small></span><span>◉<small>Xbox Live</small></span></div>';
    screen.items.forEach((item,i)=>{const b=document.createElement('button');b.textContent=item[0];b.onclick=()=>{screen.index=i;updateScreen();settingsAction(item);};$('.special-list').append(b);});
  }else if(screen.id==='storage'){
    content.innerHTML='<div class="storage-list"></div><div class="storage-bottom">⌃</div>';
    const symbols=['▰','☁','▰','▰'];
    screen.items.forEach((item,i)=>{const b=document.createElement('button');b.innerHTML=`<span class="device-icon">${symbols[i]}</span><span class="device-copy"><span></span><small></small></span>${i===0?'<em>Microsoft</em>':''}`;b.querySelector('.device-copy span').textContent=item[0];b.querySelector('small').textContent=item[3];b.onclick=()=>{screen.index=i;updateScreen();settingsAction(item);};$('.storage-list').append(b);});
  }else{
    content.innerHTML='<div class="configure-tabs"><button type="button">Basic Settings</button><button type="button">Additional Settings</button></div><div class="configure-list"></div>';
    $$('.configure-tabs button').forEach((b,i)=>b.onclick=()=>selectConfigureTab(i));
    screen.items.forEach((item,i)=>{const b=document.createElement('button');b.className='configure-row';b.onclick=()=>{screen.index=i;updateScreen();settingsAction(item);};$('.configure-list').append(b);});
  }
  updateScreen();
}
function selectConfigureTab(tabIndex){if(screen?.id!=='configure'||screen.tab===tabIndex)return;screen.tab=tabIndex;screen.items=configureTabs[tabIndex];screen.index=0;sound('page');renderScreen();}
function renderScreen(){
  $('#tabs').hidden=true;
  $('#rail').hidden=true;
  const e=$('#settings-screen');
  e.hidden=false;
  e.className='';
  if(['test','configure','storage'].includes(screen.id)){renderSpecialScreen(e);updateFooter();return;}
  e.innerHTML='<h1></h1><div class="settings-content"><div class="settings-menu"><div class="settings-list"></div><div class="settings-scroll-hint" aria-hidden="true">⌃</div></div><div class="settings-description" aria-live="polite"></div></div>';
  e.querySelector('h1').textContent=screen.title;
  screen.items.forEach((item,i)=>{
    const b=document.createElement('button');
    b.innerHTML=(item[1]?icon(item[1]):'')+'<span></span>';
    if(!item[1])b.classList.add('no-icon');
    b.querySelector('span').textContent=item[0];
    b.onclick=()=>{screen.index=i;updateScreen(true);settingsAction(item);};
    e.querySelector('.settings-list').append(b);
  });
  $('.settings-scroll-hint').hidden=$('.settings-list').scrollHeight<=$('.settings-list').clientHeight;
  updateScreen(true);
  updateFooter();
}
function updateScreen(scroll=false){
  if(screen.id==='test'){$$('.special-list button').forEach((b,i)=>b.classList.toggle('selected',i===screen.index));return;}
  if(screen.id==='storage'){$$('.storage-list button').forEach((b,i)=>b.classList.toggle('selected',i===screen.index));return;}
  if(screen.id==='configure'){
    $$('.configure-tabs button').forEach((b,i)=>b.classList.toggle('active',i===screen.tab));
    $$('.configure-row').forEach((b,i)=>{const item=screen.items[i];b.classList.toggle('selected',i===screen.index);if(screen.tab===0&&i===0){b.innerHTML='<div class="wireless-data"><span>Wireless Mode <strong>802.11g</strong></span><span>Network Name (SSID) <strong>WiFi</strong></span><span>Network Type <strong>Infrastructure</strong></span><span>Wireless Security <strong>WPA2</strong></span></div>';}else if(screen.tab===0){b.innerHTML=i===1?'<span>IP Settings <strong>Automatic</strong></span><small>IP Address <strong>0.0.0.0</strong></small><small>Subnet Mask <strong>0.0.0.0</strong></small><small>Gateway <strong>0.0.0.0</strong></small>':'<span>DNS Settings <strong>Automatic</strong></span><small>Primary DNS Server <strong>0.0.0.0</strong></small><small>Secondary DNS Server <strong>0.0.0.0</strong></small>';}else b.innerHTML=`<span>${item[0]} <strong>${item[3]}</strong></span>`;});
    return;
  }
  $$('.settings-list button').forEach((b,i)=>{
    b.classList.toggle('selected',i===screen.index);
    if(scroll&&i===screen.index)b.scrollIntoView({block:'nearest'});
  });
  if(scroll&&screen.id==='console'&&screen.index>=8)$('.settings-list').scrollTop=47;
  let text=screen.items[screen.index][3];
  const action=screen.items[screen.index][2];
  if(action==='name')text=`Current Setting\n${consoleName}\n\nChange the name of your console.`;
  if(action==='clock')text=`Current Setting\n${new Date().toLocaleString()}\n\nTime is synchronized with your device.`;
  if(action==='audio')text=`Current Setting\nDashboard Sounds: ${soundEnabled?'On':'Off'}`;
  const description=$('.settings-description');
  description.replaceChildren();
  if(text.startsWith('Current Setting\n')){
    const [status,help]=text.split('\n\n');
    const heading=document.createElement('div');
    heading.className='settings-status';
    heading.textContent=status;
    description.append(heading);
    if(help){const detail=document.createElement('p');detail.className='settings-help';detail.textContent=help;description.append(detail);}
  }else{description.textContent=text;}
}
function settingsAction(item,playSelection=true){if(playSelection)sound('select');const action=item[2];if(['console','network','storage','configure','test'].includes(action)){openScreen(action);return;}if(action==='continue-test'){back();return;}if(action==='restart-test'){const status=$('.test-status');status.classList.add('testing');setTimeout(()=>{if(screen?.id==='test')status.classList.remove('testing');},800);return;}if(action==='suggestions'){showDialog('Connection Suggestions','Check your network cable or wireless connection, then restart the test. Visit Xbox.com/networkhelp for more help.');return;}if(['hard-drive','cloud','usb-1','usb-2'].includes(action)){showDialog(item[0],`${item[3]}\nChoose Device Options to view more information.`);return;}if(['wireless','ip','dns','pppoe','advanced','mac'].includes(action)){showDialog(item[0],action==='wireless'?'Wireless Mode: 802.11g\nNetwork Name (SSID): WiFi\nWireless Security: WPA2':`${item[3]}\nNetwork settings are shown for this dashboard.`);return;}if(['vision','kinect','computers','privacy','notifications'].includes(action)){showError(action);return;}if(action==='profile'){profileDialog();return;}if(action==='audio'){showDialog('Dashboard Sounds','Play sound effects while navigating the dashboard.',[{label:'On',run:()=>{soundEnabled=true;save('metro-sound','on');closeDialog();if(screen)updateScreen();}},{label:'Off',run:()=>{soundEnabled=false;save('metro-sound','off');closeDialog();if(screen)updateScreen();}}]);return;}if(action==='name'){showDialog('Console Name','Enter a name for your console.',[{label:'Done',run:()=>{consoleName=$('.dialog input').value.trim()||'Xbox 360';save('metro-console',consoleName);closeDialog();if(screen)updateScreen();}},{label:'Cancel',run:closeDialog}],consoleName);return;}const messages={display:`Current display: ${innerWidth} × ${innerHeight}\nThe dashboard automatically fits your screen.`,info:'Xbox 360 Dashboard\nDashboard: 2.0.16154.0\n\nMetro dashboard recreation.',clock:new Date().toLocaleString(),language:'Language: English\nLocale: United States',devices:'Keyboard, mouse, and Xbox style controllers supported.\nA selects, B goes back, the left stick or D-pad moves, bumpers change tabs, and the Xbox button opens the Guide.',startup:'The console starts at the Xbox Dashboard.',autoplay:'Auto-Play is disabled.',remote:'Both media and Xbox 360 remote controls.',setup:'Your dashboard is ready. Select Profile to set up a local gamertag.',tv:'Your display is managed by your browser.',safety:'No console restrictions are set in this recreation.'};showDialog(item[0],messages[action]||item[3]);}
function back(){if(viewTransitioning)return;if(modal){if(guide)guideClick();else backSound(!!(screen||gamesOpen));closeDialog();return;}if(guide){closeGuide();return;}if(gamesOpen){backSound(false);viewTransitioning=true;pulseButton($('#games-back'));setTimeout(()=>{viewTransitioning=false;closeGamesScreen();},pulseDurationMs);return;}if(screen){backSound(screenStack.length>0);if(screenStack.length){screen=screenStack.pop();renderScreen();}else{screen=null;$('#settings-screen').hidden=true;$('#tabs').hidden=false;$('#rail').hidden=false;updateFooter();}return;}backSound(false);}
$('#back-hint').onclick=back;
$('#settings-extra-hint').onclick=()=>{if(screen?.id==='test')showDialog('Connection Status','Network: Failed\nInternet: Blocked\nXbox Live: Blocked');else if(screen?.id==='storage')showDialog('Device Options',`${screen.items[screen.index][0]}\n${screen.items[screen.index][3]}`);};
let guideTab=1;
const guideTabs=['Games & Apps','Home','Media','Settings'];
function gameRunning(){return !$('#minecraft-screen').hidden;}
function showAchievements(index=0){
  const achievements=minecraftBridge.snapshot().achievements;
  modal={achievementList:true,index,actions:achievements.map((item,i)=>({label:item.name,run:()=>showDialog(item.name,`${item.description}\n\n${item.gamerscore} G · ${item.unlocked?'Unlocked':'Locked'}`,[{label:'Back to Achievements',run:()=>showAchievements(i)}])}))};
  renderDialog();
}
function guideOptions(){
  const home={label:'Xbox Home',run:requestXboxHome};
  if(guideTab===0)return [home,{label:'Achievements',run:showAchievements},{label:'Recent',run:()=>showError('recent')}];
  if(guideTab===2)return [{label:'Music Player',run:()=>showDialog('Music Player','No music is playing.')},{label:'Select Music',run:()=>showDialog('Select Music','No music devices are connected.')}];
  if(guideTab===3)return [{label:'Dashboard Sounds',run:()=>settingsAction(['Dashboard Sounds','', 'audio'],false)},{label:'System Information',run:()=>settingsAction(['System Information','', 'info'],false)},{label:'Turn Off Console',run:()=>showDialog('Turn Off Console','Turn off the console?'+(gameRunning()?' Any unsaved game progress may be lost.':''),[{label:'Turn Off Console',run:powerOff},{label:'Cancel',run:closeDialog}])}];
  return [home,
    {label:'Friends',count:'0',icon:'friends',run:()=>showError('friends')},
    {label:'Party',count:'0',icon:'party',run:()=>showError('live',{message:'Party chat is unavailable while you’re offline.'})},
    {label:'Messages',count:'0',icon:'messages',run:()=>showError('live',{message:'Messages are unavailable while you’re offline.'})},
    {label:'Beacons & Activity',icon:'activity',run:()=>showError('live',{message:'Beacons and activity are unavailable while you’re offline.'})},
    {label:'Chat',icon:'chat',run:()=>showError('live',{message:'Chat is unavailable while you’re offline.'})},
    {label:trayOpen?'Close Tray':'Open Tray',icon:'disc',run:()=>{toggleTray();renderGuide();}}];
}
function closeGuide(){guideClick();modal=null;guide=false;$('#overlay').hidden=true;updateFooter();}
function toggleGuide(){
  if(!launched||poweredOff||bootActive||menuTransitioning||viewTransitioning)return;
  if(guide){closeGuide();return;}
  guideClick();
  document.exitPointerLock?.();
  modal=null;guide=true;guideTab=1;guideIndex=0;renderGuide();
}
function changeGuideTab(index){guideTab=(index+guideTabs.length)%guideTabs.length;guideIndex=0;guideClick();renderGuide();}
function guideRowIcon(name){
  if(name==='messages')return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 7h28v19H2zM2 8l14 12L30 8"/></svg>';
  if(name==='chat')return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 5h26v19H12l-7 5v-5H3z"/></svg>';
  if(name==='activity')return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M3 22h7l5-8 5 9 4-6h5M16 4v5M5 10l4 4M27 10l-4 4"/></svg>';
  return icon(name==='party'?'family':name);
}
function renderGuide(){
  const o=$('#overlay');o.hidden=false;
  o.innerHTML=`<section class="guide console-guide" role="dialog" aria-modal="true" aria-label="Xbox Guide">
    <header class="guide-head"><span>Xbox Guide</span><img src="uploads/profilePicture.png" alt=""><span class="guide-status" aria-hidden="true">▰▰▰▰ ◉</span><time>${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'})}</time></header>
    <div class="guide-body"><nav class="guide-blades guide-blades-left" aria-label="Guide sections"></nav><div class="guide-menu"></div><nav class="guide-blades guide-blades-right" aria-label="Guide sections"></nav></div>
    <div class="guide-foot"><button data-guide-control="select"><i class="key a">A</i> Select</button><button data-guide-control="back"><i class="key b">B</i> Back</button><button data-guide-control="signout"><i class="key x">X</i> Sign Out</button><button data-guide-control="home"><i class="key y">Y</i> Xbox Home</button></div></section>`;
  guideTabs.forEach((label,i)=>{const button=document.createElement('button');button.textContent=i===1?localProfileName():label;button.classList.toggle('active',i===guideTab);button.setAttribute('aria-current',i===guideTab?'page':'false');button.onclick=()=>changeGuideTab(i);(i<2?$('.guide-blades-left'):$('.guide-blades-right')).append(button);});
  guideOptions().forEach((item,i)=>{const button=document.createElement('button');button.classList.toggle('selected',i===guideIndex);button.innerHTML=`<span class="guide-row-label"></span><span class="guide-row-meta">${item.count?`<span>${item.count}</span>`:''}${item.icon?guideRowIcon(item.icon):''}</span>`;button.querySelector('.guide-row-label').textContent=item.label;button.onclick=()=>guideAction(i);button.onpointerenter=()=>{guideIndex=i;highlightGuide();};$('.guide-menu').append(button);});
  $('[data-guide-control="select"]').onclick=()=>guideAction(guideIndex);
  $('[data-guide-control="back"]').onclick=closeGuide;
  $('[data-guide-control="signout"]').onclick=()=>{guideClick();showError('signin');};
  $('[data-guide-control="home"]').onclick=()=>{guideClick();requestXboxHome();};
  updateFooter();
  $('.guide-menu .selected')?.focus({preventScroll:true});
}
function highlightGuide(){$$('.guide-menu button').forEach((b,i)=>b.classList.toggle('selected',i===guideIndex));}
function requestXboxHome(){
  if(!gameRunning()){goHome();return;}
  showDialog('Xbox Home','Exit Minecraft and return to Xbox Home? Any unsaved progress may be lost.',[{label:'Yes',run:goHome},{label:'Cancel',run:closeDialog}]);
}
function finishGoHome(){closeMinecraft();modal=null;guide=false;screen=null;screenStack=[];if(gamesOpen)closeGamesScreen(false);$('#overlay').hidden=true;$('#settings-screen').hidden=true;$('#tabs').hidden=false;$('#rail').hidden=false;switchTab(0);selected=0;updateSelection();updateFooter();}
function gameFadeMs(){return matchMedia('(prefers-reduced-motion: reduce)').matches?0:500;}
function showGameBlack(){
  const black=$('#black-screen');
  black.classList.remove('reveal','show');
  black.classList.add('game-transition-black');
  black.hidden=false;
  void black.offsetWidth;
  black.classList.add('show');
  return black;
}
function hideGameBlack(black,done){
  black.classList.remove('show');
  setTimeout(()=>{black.hidden=true;black.classList.remove('game-transition-black');done?.();},gameFadeMs());
}
function goHome(){
  if(!gameRunning()){finishGoHome();return;}
  if(menuTransitioning)return;
  menuTransitioning=true;
  modal=null;guide=false;
  $('#overlay').hidden=true;
  $('#system-guide-button').hidden=true;
  const black=showGameBlack();
  setTimeout(()=>{
    finishGoHome();
    stage.classList.add('dashboard-returning');
    hideGameBlack(black,()=>{menuTransitioning=false;$('#system-guide-button').hidden=false;});
    setTimeout(()=>stage.classList.remove('dashboard-returning'),650);
  },gameFadeMs());
}
function guideAction(i){const item=guideOptions()[i];if(!item)return;guideIndex=i;guideClick();item.run();}
$('#system-guide-button').onclick=toggleGuide;
const systemOverlay=$('#overlay');
new MutationObserver(()=>{
  const active=!systemOverlay.hidden;
  $('#system-layer').hidden=!active;
  stage.inert=active;
  $('#minecraft-frame').inert=active;
  $('#system-guide-button').setAttribute('aria-expanded',String(active&&guide));
  if(active){(systemOverlay.querySelector('input')||systemOverlay.querySelector('button.selected')||systemOverlay.querySelector('button'))?.focus({preventScroll:true});}
  else if(gameRunning())$('#minecraft-frame').focus();
  else if(launched&&!bootActive&&!poweredOff)$('#system-guide-button').focus({preventScroll:true});
}).observe(systemOverlay,{attributes:true,attributeFilter:['hidden']});
function powerOff(){achievementPopup.clear();closeMinecraft();$('#system-guide-button').hidden=true;hideBootToast();modal=null;guide=false;poweredOff=true;$('#overlay').hidden=true;const off=document.createElement('div');off.className='powered-off';off.innerHTML=`<button aria-label="Turn on Xbox 360">${icon('power')}</button>`;off.querySelector('button').onclick=powerOn;stage.append(off);}
function powerOn(){poweredOff=false;$('.powered-off')?.remove();goHome();startBoot();}
let bootActive=false;
const bootVideo=$('#boot-video');
const bootToast=$('#boot-toast');
$('.toast-face').insertAdjacentHTML('beforeend', icon('system', 'toast-console'));
let websimUsername='', toastShowTimer, toastHideTimer, toastIconTimer, toastRun=0, toastAnimations=[];
function localProfileName(){return profile || websimUsername || 'Local User';}
function updateToastText(){ $('#boot-toast-text').textContent=`${localProfileName()} signed\nin as a local user`; }
function updateLocalProfile(){
  $('#local-profile-name').textContent=localProfileName();
  $('#player-badge-name').textContent=localProfileName();
  updateToastText();
  minecraftBridge?.sendProfile();
}
updateLocalProfile();
$('#player-badge').onclick=profileDialog;
Promise.resolve(window.websim?.getUser?.()).then(user=>{if(user?.username){websimUsername=user.username;updateLocalProfile();}}).catch(()=>{});
function hideBootToast(){
  ++toastRun;
  clearTimeout(toastShowTimer);
  clearTimeout(toastHideTimer);
  clearInterval(toastIconTimer);
  toastAnimations.forEach(animation=>animation.cancel());
  toastAnimations=[];
  bootToast.hidden=true;
  bootToast.classList.remove('alt-icon');
}
function animateToast(tracks){
  const start=document.timeline.currentTime;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animations=tracks.map(([selector,keyframes,duration,delay=0,easing='cubic-bezier(.2,.7,.2,1)'])=>{
    const animation=bootToast.querySelector(selector).animate(keyframes,{duration:reduced?1:duration,delay:reduced?0:delay,easing,fill:'both'});
    animation.startTime=start;
    return animation;
  });
  toastAnimations.push(...animations);
  return Promise.all(animations.map(animation=>animation.finished));
}
async function dismissBootToast(){
  clearInterval(toastIconTimer);
  const run=toastRun;
  try{
    await animateToast([
      ['#boot-toast-text',[{opacity:1},{opacity:0}],150],
      ['.toast-window',[{width:'352px',opacity:1},{width:'74px',opacity:1,offset:.8},{width:'74px',opacity:0}],450,70,'cubic-bezier(.55,0,.35,1)'],
      ['.toast-symbol',[{opacity:1,transform:'scale(1)'},{opacity:1,transform:'scale(1.08)',offset:.35},{opacity:0,transform:'scale(.72)'}],380,370],
      ['.toast-halo',[{opacity:0,transform:'scale(.8)'},{opacity:.5,transform:'scale(1)',offset:.35},{opacity:0,transform:'scale(1.3)'}],380,370]
    ]);
    if(run===toastRun)hideBootToast();
  }catch{} // A new boot or power-off cancels the active animation.
}
async function showBootToast(){
  if(poweredOff||bootActive)return;
  hideBootToast();
  const run=toastRun;
  updateToastText();
  bootToast.hidden=false;
  sound('notification');
  try{
    await animateToast([
      ['.toast-symbol',[{opacity:0,transform:'scale(.78)'},{opacity:1,transform:'scale(1.035)',offset:.65},{opacity:1,transform:'scale(1)'}],360],
      ['.toast-halo',[{opacity:0,transform:'scale(.7)'},{opacity:.55,transform:'scale(.95)',offset:.35},{opacity:0,transform:'scale(1.3)'}],430],
      ['.toast-ring',[{opacity:0},{opacity:1}],280,100],
      ['.toast-window',[{width:'74px',opacity:0},{width:'130px',opacity:1,offset:.3},{width:'352px',opacity:1}],560,170],
      ['#boot-toast-text',[{opacity:0},{opacity:1}],280,570]
    ]);
    if(run!==toastRun)return;
    toastIconTimer=setInterval(()=>bootToast.classList.toggle('alt-icon'),2000);
    toastHideTimer=setTimeout(dismissBootToast,5000);
  }catch{}
}
function revealDashboard(){const black=$('#black-screen');black.classList.remove('reveal');black.hidden=false;setTimeout(()=>{requestAnimationFrame(()=>{black.classList.add('reveal');setTimeout(()=>{stage.classList.remove('prelaunch');stage.classList.add('menu-enter');welcomePending=true;playWelcome();setTimeout(()=>{black.hidden=true;},400);setTimeout(()=>{stage.classList.remove('menu-enter','menu-locked');menuTransitioning=false;$('#system-guide-button').hidden=false;},1650);},300);});},320);}
function finishBoot(){if(!bootActive)return;bootActive=false;bootVideo.pause();$('#boot-screen').hidden=true;revealDashboard();toastShowTimer=setTimeout(showBootToast,720);}
const minecraftScreen=$('#minecraft-screen');
const minecraftFrame=$('#minecraft-frame');
const achievementPopup=createAchievementPopup({onShow:()=>sound('notification')});
function updateMinecraftAchievementProgress(state){
  const progress=$('#minecraft-achievement-progress');
  progress.querySelector('.achievement-count').textContent=`${state.unlockedCount}/${state.totalCount}`;
  progress.querySelector('.gamerscore-count').textContent=`${state.gamerscore}/${state.totalGamerscore}`;
  progress.setAttribute('aria-label',`${state.unlockedCount} of ${state.totalCount} achievements, ${state.gamerscore} of ${state.totalGamerscore} Gamerscore`);
  $('#owned-minecraft').setAttribute('aria-description',`${state.unlockedCount} of ${state.totalCount} achievements unlocked. Press X to view achievements.`);
}
minecraftBridge=createMinecraftBridge(minecraftFrame,{
  getGamertag:localProfileName,
  onChange:state=>{
    const score=$('#rail .local-gamerscore');
    score.firstChild.textContent=`${state.gamerscore} `;
    score.setAttribute('aria-label',`Gamerscore: ${state.gamerscore}`);
    updateMinecraftAchievementProgress(state);
    if(modal?.achievementList)showAchievements(modal.index);
  },
  onUnlock:achievement=>achievementPopup.show(achievement)
});
// Apply the creator's requested wipe once in each browser that holds their local progress.
const achievementWipeKey='metro-minecraft-achievements.creator-wipe-2026-10-31';
Promise.all([window.websim?.getUser(),window.websim?.getCreator()]).then(([user,creator])=>{
  if(!user||!creator||user.id!==creator.id||saved(achievementWipeKey,'')==='done')return;
  minecraftBridge.reset();
  achievementPopup.clear();
  save(achievementWipeKey,'done');
}).catch(error=>console.error('Could not apply achievement wipe:',error));
const initialScore=minecraftBridge.snapshot().gamerscore;
updateMinecraftAchievementProgress(minecraftBridge.snapshot());
$('#rail .local-gamerscore').firstChild.textContent=`${initialScore} `;
$('#rail .local-gamerscore').setAttribute('aria-label',`Gamerscore: ${initialScore}`);
minecraftFrame.addEventListener('load',()=>{minecraftBridge.request();if(gameRunning()&&!guide&&!modal&&!menuTransitioning)minecraftFrame.focus();});
function launchMinecraft(){
  if(menuTransitioning||gameRunning())return;
  menuTransitioning=true;
  stage.classList.add('menu-locked');
  $('#system-guide-button').hidden=true;
  hideBootToast();
  setTimeout(()=>{
    const black=showGameBlack();
    setTimeout(()=>{
      minecraftFrame.src='https://kv2m72rtgsie4rwk2r3y.c.websim.com/?__websim_origin=https%3A%2F%2Fwebsim.com';
      minecraftScreen.hidden=false;
      setTimeout(()=>hideGameBlack(black,()=>{
        stage.classList.remove('menu-locked');
        menuTransitioning=false;
        $('#system-guide-button').hidden=false;
        minecraftFrame.focus();
      }),3000);
    },gameFadeMs());
  },1000);
}
function closeMinecraft(){
  achievementPopup.clear();
  if(!gameRunning())return;
  minecraftScreen.hidden=true;
  minecraftFrame.removeAttribute('src');
}
function startBoot(){$('#system-guide-button').hidden=true;hideBootToast();bootActive=true;menuTransitioning=true;welcomePending=false;stage.classList.add('prelaunch','menu-locked');stage.classList.remove('menu-enter');$('#black-screen').hidden=true;$('#boot-screen').hidden=false;bootVideo.currentTime=0;bootVideo.muted=false;bootVideo.play().catch(()=>{bootVideo.muted=true;bootVideo.play().catch(finishBoot);});}
bootVideo.addEventListener('ended',finishBoot);
bootVideo.addEventListener('error',finishBoot);
function navigate(key){
  if(!launched||bootActive||menuTransitioning||viewTransitioning||actionPending||modalActionPending)return;
  if(poweredOff){if(key==='Enter')powerOn();return;}
  if(key==='Guide'){toggleGuide();return;}
  if(gameRunning()&&!guide&&!modal)return;
  if(key==='Escape'||key==='Backspace'){back();return;}
  if(modal){
    if(modal.achievementList&&['ArrowLeft','ArrowRight'].includes(key)){
      const next=Math.max(0,Math.min(modal.actions.length-1,modal.index+(key==='ArrowRight'?1:-1)));
      if(next!==modal.index){modal.index=next;highlightModal();sound('move');}
      return;
    }
    if(key==='ArrowDown'||key==='ArrowUp'){
      modal.index=modal.achievementList?Math.max(0,Math.min(modal.actions.length-1,modal.index+(key==='ArrowDown'?8:-8))):(modal.index+(key==='ArrowDown'?1:-1)+modal.actions.length)%modal.actions.length;
      highlightModal();if(guide)guideClick();else sound('move');
    }
    if(key==='Enter')runModalAction(modal.index);
    return;
  }
  if(guide){
    if(key==='ArrowDown'||key==='ArrowUp'){
      guideIndex=(guideIndex+(key==='ArrowDown'?1:-1)+guideOptions().length)%guideOptions().length;
      highlightGuide();guideClick();
    }
    if(key==='Enter')guideAction(guideIndex);
    if(key==='x'){guideClick();showError('signin');}
    if(['ArrowLeft','PageUp','q'].includes(key))changeGuideTab(guideTab-1);
    if(['ArrowRight','PageDown','e'].includes(key))changeGuideTab(guideTab+1);
    if(key==='y'){guideClick();requestXboxHome();}
    return;
  }
  if(gamesOpen){
    if(key==='x'&&gamesSelected===0){$('#games-achievements').click();return;}
    if(key==='ArrowLeft'||key==='ArrowRight'){
      const next=Math.max(0,Math.min(ownedGames.length-1,gamesSelected+(key==='ArrowRight'?1:-1)));
      if(next!==gamesSelected){gamesSelected=next;updateGamesSelection();sound('move');}
    }
    if(key==='Enter')ownedGames[gamesSelected].click();
    return;
  }
  if(screen){
    if(key==='y'&&['test','storage'].includes(screen.id)){$('#settings-extra-hint').click();return;}
    if(screen.id==='configure'&&(key==='ArrowLeft'||key==='ArrowRight')){selectConfigureTab(key==='ArrowRight'?1:0);return;}
    if(key==='ArrowDown'||key==='ArrowUp'){
      screen.index=Math.max(0,Math.min(screen.items.length-1,screen.index+(key==='ArrowDown'?1:-1)));
      updateScreen(true);sound('move');
    }
    if(key==='Enter')settingsAction(screen.items[screen.index]);
    return;
  }
  if(['q','PageUp'].includes(key)){switchTab(tab-1);return;}
  if(['e','PageDown'].includes(key)){switchTab(tab+1);return;}
  if(key==='Enter'){activate();return;}
  let next=selected;
  if(tab===6){
    if(key==='ArrowDown'&&selected<4)next+=4;
    if(key==='ArrowUp'&&selected>=4)next-=4;
    if(key==='ArrowLeft'){if(selected%4===0){switchTab(tab-1);return;}next--;}
    if(key==='ArrowRight'&&selected%4<3)next++;
  }else{
    if(key==='ArrowDown'&&selected<2)next++;
    if(key==='ArrowUp'&&selected>0&&selected<3)next--;
    if(key==='ArrowLeft'){if(selected===3)next=0;else{switchTab(tab-1);return;}}
    if(key==='ArrowRight'){if(selected===3||tab===1){switchTab(tab+1);return;}next=3;}
  }
  if(next!==selected){selected=next;updateSelection();sound('move');}
}
window.addEventListener('keydown',e=>{
  if(gameRunning()&&!guide&&!modal&&e.key!=='Home')return;
  if(!systemOverlay.hidden&&e.key==='Tab'){
    const buttons=[...systemOverlay.querySelectorAll('button,input')].filter(el=>!el.disabled);
    const current=buttons.indexOf(document.activeElement);
    e.preventDefault();buttons[(current+(e.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();return;
  }
  if(e.target.matches('input')){
    if(e.key==='Enter'){e.preventDefault();if(modal)runModalAction(0);}
    if(e.key==='Escape'){e.preventDefault();back();}
    return;
  }
  const key=e.key.length===1?e.key.toLowerCase():e.key;
  if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter','Escape','Backspace','PageUp','PageDown','Home','q','e','x','y'].includes(key)){
    e.preventDefault();if(!e.repeat)navigate(key==='Home'?'Guide':key);
  }
});
const gamepadButtons={0:'Enter',1:'Escape',2:'x',3:'y',4:'PageUp',5:'PageDown',6:'PageUp',7:'PageDown',8:'Escape',16:'Guide'};
const gamepadStates=new Map();
let gamepadAccessError=null;
window.addEventListener('gamepadconnected',event=>gamepadStates.delete(event.gamepad.index));
window.addEventListener('gamepaddisconnected',event=>gamepadStates.delete(event.gamepad.index));
function showGamepadAccessError(error){
  const status=$('#controller-status');
  if(!status||gamepadAccessError===error)return;
  gamepadAccessError=error;
  status.textContent=error==='blocked'?'Controller access is blocked in this view. ':'This browser does not provide controller input.';
  if(error==='blocked'){
    const link=document.createElement('a');
    link.href=location.href;
    link.target='_blank';
    link.rel='noopener';
    link.textContent='Open in a new tab';
    status.append(link);
  }
  status.hidden=false;
}
function readGamepads(){
  if(typeof navigator.getGamepads!=='function'){
    showGamepadAccessError('unavailable');
    return [];
  }
  try{
    const pads=Array.from(navigator.getGamepads()||[]).filter(pad=>pad&&pad.connected!==false);
    if(gamepadAccessError){$('#controller-status').hidden=true;gamepadAccessError=null;}
    return pads;
  }catch(error){
    showGamepadAccessError(error?.name==='SecurityError'?'blocked':'unavailable');
    return [];
  }
}
function buttonPressed(button){return !!button&&(button===true||button.pressed===true||button.value>.65);}
function controllerDirections(pad){
  const dpad=[12,13,14,15].map(index=>buttonPressed(pad.buttons?.[index]));
  const dpadDirection=dpad[0]?'ArrowUp':dpad[1]?'ArrowDown':dpad[2]?'ArrowLeft':dpad[3]?'ArrowRight':null;
  const x=pad.axes?.[0]||0,y=pad.axes?.[1]||0;
  const stickDirection=Math.max(Math.abs(x),Math.abs(y))>.65
    ?(Math.abs(x)>Math.abs(y)?(x>0?'ArrowRight':'ArrowLeft'):(y>0?'ArrowDown':'ArrowUp'))
    :null;
  return {dpadDirection,stickDirection};
}
function pollGamepad(){
  try{
    const pads=readGamepads();
    const seen=new Set();
    const now=performance.now();
    for(const pad of pads){
      seen.add(pad.index);
      let state=gamepadStates.get(pad.index);
      if(!state){state={buttons:{},direction:null,source:null,repeatAt:0,dpadArmed:false,stickArmed:false};gamepadStates.set(pad.index,state);}
      for(const [index,key] of Object.entries(gamepadButtons)){
        const pressed=buttonPressed(pad.buttons?.[index]);
        if(!launched){
          // Keep a held A or Xbox button press alive while the dashboard finishes loading.
          if(pressed&&(index==='0'||index==='16')&&!launchButton.disabled)launchButton.click();
        }else if(pressed&&!state.buttons[index]&&!bootActive&&(minecraftScreen.hidden||guide||modal||key==='Guide')){
          unlock();navigate(key);
        }
        state.buttons[index]=pressed;
      }
      const {dpadDirection,stickDirection}=controllerDirections(pad);
      if(!dpadDirection)state.dpadArmed=true;
      if(!stickDirection)state.stickArmed=true;
      const useDpad=!!dpadDirection&&state.dpadArmed;
      const direction=useDpad?dpadDirection:state.stickArmed?stickDirection:null;
      const source=useDpad?'dpad':direction?'stick':null;
      if(!launched||bootActive||menuTransitioning||(gameRunning()&&!guide&&!modal)){
        state.repeatAt=now+350;
      }else if(direction){
        if(direction!==state.direction||source!==state.source){unlock();navigate(direction);state.repeatAt=now+350;}
        else if(source==='dpad'&&now>=state.repeatAt){unlock();navigate(direction);state.repeatAt=now+115;}
      }
      state.direction=direction;
      state.source=source;
    }
    for(const index of gamepadStates.keys())if(!seen.has(index))gamepadStates.delete(index);
  }finally{
    requestAnimationFrame(pollGamepad);
  }
}
requestAnimationFrame(pollGamepad);
const launchButton=$('#launch-button');
let assetsReady=false;
const imageAssets=$$('img');
const mediaAssets=[bootVideo,...Object.values(sounds)].map(element=>({element,source:element.getAttribute('src')}));
const assetUrls=[...new Set([...imageAssets.map(img=>img.getAttribute('src')),...mediaAssets.map(asset=>asset.source),$('link[rel="icon"]')?.getAttribute('href')].filter(Boolean))];
let preloadedObjectUrls=[];
function waitForMedia(element){return new Promise((resolve,reject)=>{if(element.readyState>=2){resolve();return;}const cleanup=()=>{element.removeEventListener('loadeddata',ready);element.removeEventListener('error',fail);};const ready=()=>{cleanup();resolve();};const fail=()=>{cleanup();reject(new Error(`Could not load ${element.currentSrc}`));};element.addEventListener('loadeddata',ready);element.addEventListener('error',fail);element.load();});}
function portraitTouchDevice(){return matchMedia('(pointer: coarse) and (orientation: portrait)').matches;}
function requestDashboardFullscreen(){
  if(document.fullscreenElement||!document.fullscreenEnabled)return;
  document.documentElement.requestFullscreen({navigationUI:'hide'})
    .then(()=>window.screen.orientation?.lock?.('landscape')?.catch(()=>{}))
    .catch(()=>{});
}
window.addEventListener('pointerdown',()=>{if(launched)requestDashboardFullscreen();},{capture:true});
window.addEventListener('keydown',e=>{if(launched&&e.key!=='Escape')requestDashboardFullscreen();},{capture:true});
function updateLaunchButton(){if(!assetsReady)return;launchButton.disabled=portraitTouchDevice();launchButton.textContent=document.documentElement.requestFullscreen?'Enter fullscreen':'Start dashboard';}
window.addEventListener('orientationchange',updateLaunchButton);
window.addEventListener('resize',updateLaunchButton);
async function preloadAssets(){assetsReady=false;launchButton.disabled=true;launchButton.textContent=`Loading assets 0/${assetUrls.length}…`;preloadedObjectUrls.forEach(url=>URL.revokeObjectURL(url));preloadedObjectUrls=[];try{let loaded=0;const results=await Promise.allSettled(assetUrls.map(async url=>{const response=await fetch(url,{cache:'force-cache'});if(!response.ok)throw new Error(url);const blob=await response.blob();launchButton.textContent=`Loading assets ${++loaded}/${assetUrls.length}…`;return [url,blob];}));const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;const blobs=new Map(results.map(result=>result.value));launchButton.textContent='Preparing media…';await Promise.all(imageAssets.map(img=>img.decode()));for(const {element,source} of mediaAssets){const objectUrl=URL.createObjectURL(blobs.get(source));preloadedObjectUrls.push(objectUrl);element.src=objectUrl;element.preload='auto';}await Promise.all(mediaAssets.map(({element})=>waitForMedia(element)));assetsReady=true;updateLaunchButton();}catch(error){console.error('Asset preload failed:',error);launchButton.disabled=false;launchButton.textContent='Retry loading';}}
launchButton.onclick=()=>{if(!assetsReady){preloadAssets();return;}if(portraitTouchDevice())return;launched=true;$('#launch-screen').hidden=true;requestDashboardFullscreen();startBoot();};
preloadAssets();
let touchStart=null;stage.addEventListener('touchstart',e=>{touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});stage.addEventListener('touchend',e=>{if(!touchStart||screen||modal||guide)return;const dx=e.changedTouches[0].clientX-touchStart.x,dy=e.changedTouches[0].clientY-touchStart.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)switchTab(tab+(dx<0?1:-1));touchStart=null;},{passive:true});
