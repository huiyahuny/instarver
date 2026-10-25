/*
  MOMENTA - 인스타그램형 소셜 사이트 시제품
  이 버전은 localStorage 기반의 단일 브라우저 시연판입니다.
  네트워크 동기화/실제 계정 보안/온라인 관리자 권한 검증 기능은 포함되지 않습니다.
*/
(() => {
'use strict';
const S = window.MOMENTA_SETTINGS || {};
const STORAGE_KEY = 'momenta-inline-demo-v1';
const SESSION_KEY = 'momenta-inline-demo-session-v1';
const icon = (name, cls = '') => `<svg class="${cls}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const compact = (value) => new Intl.NumberFormat('ko-KR').format(value || 0);
const randomId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2,8);
const userKey = name => name.trim().replace(/\s+/g,' ').toLocaleLowerCase('ko-KR');
const adminId = String(S.ADMIN_ID || '').trim();
const adminReady = Boolean(adminId && !adminId.includes('[이곳에') && S.ADMIN_CODE && !String(S.ADMIN_CODE).includes('[이곳에'));
const adminLabel = () => adminReady ? adminId : '운영자';
const gradients = ['linear-gradient(125deg,#7f5f91,#e59c99)','linear-gradient(140deg,#416684,#86b5af)','linear-gradient(120deg,#bb7c74,#eed7ad)','linear-gradient(130deg,#645b9b,#d49cc9)','linear-gradient(135deg,#ad7a5c,#eecb9b)'];
const starter = () => ({
  users:{},
  profiles:{[adminLabel()]:{name:adminLabel(),bio:'사진과 글을 기록하는 운영 계정',avatar:0}},
  posts:S.DEMO_POSTS === false ? [] : [
    {id:'demo-post-1',author:adminLabel(),location:'오후의 정원',image:'assets/orchard.svg',caption:'[예시 게시물] 운영자가 사진과 글을 올리면 이 위치에 표시됩니다. 🌿',time:Date.now()-1000*60*72,likes:[],comments:[]},
    {id:'demo-post-2',author:adminLabel(),location:'조용한 바다',image:'assets/sea.svg',caption:'[예시 게시물] 방문자는 좋아요와 댓글로 참여할 수 있어요.',time:Date.now()-1000*60*260,likes:[],comments:[]},
    {id:'demo-post-3',author:adminLabel(),location:'기억 속의 밤',image:'assets/midnight.svg',caption:'[예시 게시물] 관리자 계정으로 입장해 직접 교체할 수 있습니다.',time:Date.now()-1000*60*520,likes:[],comments:[]}
  ],
  stories:[],saved:{},following:{},notifications:[]
});
function load() {try {let d=JSON.parse(localStorage.getItem(STORAGE_KEY));return d && Array.isArray(d.posts) && d.users && d.profiles ? d : starter();} catch {return starter();}}
let db=load();
let session=(()=>{try{return JSON.parse(sessionStorage.getItem(SESSION_KEY))}catch{return null}})();
let view='home', focusedProfile='', profileTab='posts', currentModal='', postImage='', searchTerm='';
let isSaving=false;
const me = () => session?.name || '';
const isAdmin = () => adminReady && session?.role === 'admin' && userKey(session?.name || '') === userKey(adminId);
const signed = () => Boolean(session?.name);
const canDelete = () => isAdmin();
function store() {try {localStorage.setItem(STORAGE_KEY,JSON.stringify(db));return true;} catch (e) {toast('저장 공간 부족: 이미지 용량을 줄이거나 기존 게시물을 정리해 줘.');return false;}}
function sessionSave(){if(session)sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));else sessionStorage.removeItem(SESSION_KEY);}
function toast(message){const root=document.querySelector('#toastRoot');root.innerHTML=`<div class="toast">${safe(message)}</div>`;setTimeout(()=>{root.innerHTML=''},3600)}
function initials(name){return Array.from(name || '?').slice(0,1).join('')}
function avatar(name,extra=''){const meta=db.profiles[name]||{};const idx=typeof meta.avatar==='number'?meta.avatar:(Array.from(name).reduce((n,c)=>n+c.charCodeAt(0),0)%gradients.length);return `<span class="round-avatar ${extra}" style="background:${gradients[idx%gradients.length]}">${safe(initials(name))}</span>`}
function countTime(ms){const d=Math.max(0,Date.now()-Number(ms));if(d<60000)return '방금';if(d<3600000)return Math.floor(d/60000)+'분';if(d<86400000)return Math.floor(d/3600000)+'시간';return Math.floor(d/86400000)+'일'}
async function digest(input){
 const bytes=new TextEncoder().encode('momenta-inline-demo::'+input);
 if(window.crypto?.subtle){const buffer=await window.crypto.subtle.digest('SHA-256',bytes);return Array.from(new Uint8Array(buffer)).map(b=>b.toString(16).padStart(2,'0')).join('')}
 // file:// 등에서 crypto.subtle이 없는 경우의 데모용 로컬 식별 해시 (보안 인증 아님)
 let n=2166136261;for(const byte of bytes){n^=byte;n=Math.imul(n,16777619)}return 'local-'+(n>>>0).toString(16);
}
function requireLogin(){if(!signed()){openLogin();toast('먼저 이름으로 입장해 주세요.');return false}return true}
const baseNav=[{id:'home',text:'홈',ico:'home'},{id:'search',text:'검색',ico:'search'},{id:'explore',text:'탐색',ico:'compass'}];
function availableNav(){return [...baseNav,...(isAdmin()?[{id:'create',text:'게시물 만들기',ico:'plus'}]:[]),{id:'profile',text:'프로필',ico:'camera'}]}
function renderNav(){
  const items=availableNav();
  document.querySelector('#desktopNav').innerHTML=items.map(it=>`<button class="nav-item ${view===it.id?'active':''}" data-action="nav" data-to="${it.id}">${it.id==='profile'&&signed()?avatar(me(),'nav-avatar'):icon(it.ico)}<span>${safe(it.text)}</span></button>`).join('');
  document.querySelector('.mobile-top').innerHTML=`<span class="mobile-brand">${safe(S.SITE_NAME||'momenta')}</span><button class="top-account-btn" data-action="${signed()?'logout':'login'}">${signed()?safe(me())+' · 나가기':'이름으로 입장'}</button>`;
  document.querySelector('#mobileNav').innerHTML=items.map(it=>`<button class="mobile-link ${view===it.id?'active':''}" data-action="nav" data-to="${it.id}" aria-label="${safe(it.text)}">${it.id==='profile'&&signed()?avatar(me(),'nav-avatar'):icon(it.ico)}</button>`).join('');
}
function go(next,opts={}){
  if(next==='create'){
    if(!isAdmin()){toast('사진과 게시물 작성은 관리자만 가능해요.');if(!signed())openLogin();return}
    openCreate();return;
  }
  if(next==='profile'){if(!opts.keepProfile)focusedProfile=me()||adminLabel();profileTab='posts'}
  if(!['home','search','explore','profile'].includes(next))next='home';
  view=next;render();if(opts.scroll!==false)window.scrollTo({top:0,behavior:'instant'});
}
function render(){
  renderNav();let html='';switch(view){case 'home':html=renderHome();break;case 'explore':html=renderExplore();break;case 'profile':html=renderProfile();break;case 'search':html=renderSearch();break;default:html=renderHome()}
  document.querySelector('#mainView').innerHTML=html;
}
function storyBlock(s){return `<button class="story" data-action="story" data-id="${safe(s.id)}"><span class="story-ring">${avatar(s.author,'avatar-inner')}</span><span class="story-name">${safe(s.author)}</span></button>`}
function postHTML(p){
  const active=signed()&&(p.likes||[]).includes(me());
  const recent=(p.comments||[]).slice(-2).map(c=>`<div class="comment-line"><strong>${safe(c.author)}</strong>${safe(c.text)}</div>`).join('');
  return `<article class="post" data-post="${safe(p.id)}">
    <header class="post-header"><button class="tool-btn" data-action="open-profile" data-name="${safe(p.author)}">${avatar(p.author)}</button>
      <div class="post-meta"><button class="small-blue post-user" style="color:#252525" data-action="open-profile" data-name="${safe(p.author)}">${safe(p.author)}</button><span class="post-dot"> · </span><span class="post-time">${countTime(p.time)} 전</span><span class="post-place">${safe(p.location||'')}</span></div>
      ${isAdmin()?`<button class="post-menu tool-btn" data-action="post-options" data-id="${safe(p.id)}" aria-label="운영자 게시물 관리">${icon('more')}</button>`:''}
    </header><div class="post-media"><img src="${safe(p.image)}" alt="${safe(p.author)}의 사진" loading="lazy" /></div>
    <div class="post-toolbar"><button class="tool-btn ${active?'liked':''}" data-action="like" data-id="${safe(p.id)}" aria-label="좋아요">${icon('heart')}</button>
    <button class="tool-btn" data-action="comments" data-id="${safe(p.id)}" aria-label="댓글 보기">${icon('chat')}</button></div>
    <p class="post-count">좋아요 ${compact((p.likes||[]).length)}개</p>
    <div class="post-caption"><strong>${safe(p.author)}</strong>${safe(p.caption)}</div>
    <button class="show-comments" data-action="comments" data-id="${safe(p.id)}">댓글 ${compact((p.comments||[]).length)}개 모두 보기</button>${recent}
    <form class="comment-compose" data-form="comment" data-id="${safe(p.id)}"><input name="comment" maxlength="250" aria-label="댓글" placeholder="댓글 달기..." autocomplete="off" required/><button type="submit">게시</button></form>
    <div class="post-datestamp">${new Date(p.time).toLocaleDateString('ko-KR')}</div>
  </article>`;
}
function renderHome(){
  const myName=signed()?me():'방문자';
  const stories= (isAdmin()?`<button class="story" data-action="new-story"><span class="story-ring seen">${avatar(me(),'avatar-inner')}</span><span class="stories-plus">+</span><span class="story-name">스토리 올리기</span></button>`:`${!signed()?`<button class="story" data-action="login"><span class="story-ring seen">${avatar('나','avatar-inner')}</span><span class="stories-plus">+</span><span class="story-name">입장하기</span></button>`:''}`)
  +db.stories.map(storyBlock).join('');
  return `<div class="home-layout"><div class="feed-column"><div class="stories">${stories||'<p class="muted">아직 스토리가 없어요.</p>'}</div>
  ${isAdmin()?`<button class="admin-quick-create" data-action="nav" data-to="create">${icon('plus')} <span><strong>새 사진과 글 작성</strong><small>사진을 선택하고 게시글을 입력하세요</small></span></button>`:''}
  ${[...db.posts].sort((a,b)=>b.time-a.time).map(postHTML).join('')}
  ${db.posts.length===0?empty('아직 게시물이 없어요',isAdmin()?'사진과 글을 처음으로 등록해 보세요.':'운영자가 글을 올리면 이곳에 표시됩니다.','camera'):''}</div>
  <aside class="side-panel"><div class="self-card">${avatar(myName)}<div class="side-names"><div class="side-username">${safe(myName)}</div><div class="side-fullname">${isAdmin()?'운영자 · 게시물 작성 가능':signed()?'방문자 · 댓글과 좋아요':'이름을 입력하고 참여해 보세요'}</div></div><button class="small-blue" data-action="${signed()?'logout':'login'}">${signed()?'전환':'입장'}</button></div>
  <div class="suggestions-title"><span>이용 방법</span></div>
  <div class="access-note"><strong>운영자</strong><p>사진과 글 게시 · 수정 · 삭제 · 댓글과 좋아요</p><strong>방문자</strong><p>이름으로 입장 · 댓글과 좋아요만 가능</p></div>
  <div class="side-footer">본 사이트는 인스타그램 공식 서비스가 아닌 UI 시제품입니다.<br/>현재 입력 내용은 각 브라우저에만 저장됩니다.<br/>© 2026 MOMENTA · DEMO</div></aside></div>`;
}
function renderExplore(){const posts=[...db.posts].sort((a,b)=>b.time-a.time);return `<div class="plain-section"><div class="view-head"><div><h1>탐색</h1><p>모두의 사진과 장면을 둘러보세요.</p></div></div><div class="explore-grid">${posts.map(p=>tile(p)).join('')}</div></div>`}
function tile(p){return `<button class="tile" data-action="post-detail" data-id="${safe(p.id)}"><img src="${safe(p.image)}" alt="${safe(p.caption.slice(0,30))}" loading="lazy"/><span class="tile-overlay">${icon('heart')} ${compact(p.likes.length)} ${icon('chat')} ${compact(p.comments?.length||0)}</span></button>`}
function renderProfile(){
  const name=focusedProfile||me()||adminLabel();
  const profile=db.profiles[name]||{name,bio:'게시물을 살펴볼 수 있어요.'};
  const posts=db.posts.filter(p=>p.author===name).sort((a,b)=>b.time-a.time);
  const mine=signed()&&name===me();
  return `<div class="plain-section"><div class="profile-top">${avatar(name,'profile-photo')}<div class="profile-main"><div class="profile-row"><span class="profile-title">${safe(name)}</span>${mine?'<button class="neutral-btn" data-action="logout">계정 전환</button>':''}${name===adminLabel()?'<span class="tag">운영자</span>':''}</div>
  <div class="profile-stats"><span>게시물 <strong>${posts.length}</strong></span></div><div class="profile-bio"><strong>${safe(name)}</strong>${safe(profile.bio||'사진과 글을 둘러보세요.')}</div>
  ${isAdmin()&&mine?'<button class="primary-btn" data-action="nav" data-to="create" style="margin-top:15px">+ 사진과 글 올리기</button>':''}
  </div></div><div class="section-tab"><span>${icon('grid')} 게시물</span></div>
  ${posts.length?`<div class="profile-grid">${posts.map(tile).join('')}</div>`:empty('게시물이 없어요','이 계정은 작성한 게시물이 없습니다.','camera')}</div>`;
}
function renderSearch(){const people=Array.from(new Set([...Object.keys(db.profiles),...db.posts.map(x=>x.author)])).filter(name=>name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));return `<div class="search-wrap"><h1>검색</h1><label class="search-input">${icon('search')}<input id="peopleSearch" aria-label="사람 검색" placeholder="이름 검색" value="${safe(searchTerm)}" autocomplete="off" autofocus/></label><div class="search-section" id="searchResults">${people.length?people.map(name=>`<button class="search-result" data-action="open-profile" data-name="${safe(name)}">${avatar(name)}<span><strong>${safe(name)}</strong><small>${safe(db.profiles[name]?.bio||'Momenta 회원')}</small></span></button>`).join(''):'<p class="muted">검색 결과가 없습니다.</p>'}</div></div>`}
function renderActivity(){const list=(db.notifications||[]).filter(n=>n.target===me()).reverse();return `<div class="plain-section"><div class="view-head"><div><h1>알림</h1><p>내 게시물의 새로운 반응</p></div></div><div class="search-wrap">${list.length?list.map(n=>`<div class="search-result">${avatar(n.actor)}<span><strong>${safe(n.actor)}</strong>님이 ${safe(n.action)}<small>${countTime(n.time)} 전</small></span></div>`).join(''):empty('아직 알림이 없어요','게시물에 새로운 반응이 오면 이곳에 표시돼요.','heart')}</div></div>`}

function empty(title,desc,ico){return `<div class="empty"><div class="empty-icon">${icon(ico)}</div><h3>${safe(title)}</h3><p>${safe(desc)}</p></div>`}
function openModal(title,body,{wide=false}={}){currentModal=title;document.querySelector('#modalRoot').innerHTML=`<div class="modal-mask" data-action="mask-close"><section class="modal ${wide?'wide':''}" role="dialog" aria-modal="true" aria-label="${safe(title)}"><div class="modal-top"><strong>${safe(title)}</strong><button class="modal-close" data-action="close-modal" aria-label="닫기">${icon('close')}</button></div><div class="modal-body">${body}</div></section></div>`;document.body.style.overflow='hidden'}
function closeModal(){document.querySelector('#modalRoot').innerHTML='';currentModal='';document.body.style.overflow=''}
function openLogin(){
  const body=`<div class="modal-intro"><h2>${safe(S.SITE_NAME||'momenta')}</h2><p>한 화면에서 이름으로 입장합니다.<br/>운영자 아이디를 입력하면 운영자 권한으로 구분해요.</p></div>
  <form data-form="account-login">
    <label class="field"><span>이름 / 아이디</span><input id="accountIdentity" name="name" placeholder="방문자: 본인 이름 / 관리자: 설정한 아이디" required maxlength="30" autocomplete="username" /></label>
    <label class="field"><span id="accountSecretLabel">보호 PIN (4자 이상)</span><input id="accountSecret" type="password" name="secret" minlength="4" maxlength="100" placeholder="방문자 PIN 또는 관리자 인증값" required autocomplete="current-password" /></label>
    <p id="loginRoleHint" class="login-role-hint">방문자는 좋아요와 댓글만 남길 수 있어요.</p>
    <button class="primary-btn full" type="submit">입장하기</button>
  </form><div class="soft-alert">사진·글 게시, 수정, 삭제는 운영자 계정만 가능합니다. 이름과 PIN은 현재 브라우저에만 저장되며, 다른 기기와 공유되지 않습니다.</div>`;
  openModal('이름으로 입장',body);
}
function refreshLoginHint(){
 const input=document.querySelector('#accountIdentity');if(!input)return;
 const adminTry=adminReady && userKey(input.value)===userKey(adminId);
 const label=document.querySelector('#accountSecretLabel');const hint=document.querySelector('#loginRoleHint');
 if(label)label.textContent=adminTry?'관리자 인증값':'보호 PIN (4자 이상)';
 if(hint)hint.textContent=adminTry?'운영자 로그인 · 사진과 글 작성이 활성화됩니다.':'방문자 로그인 · 댓글과 좋아요만 가능합니다.';
}
function openCreate(){if(!isAdmin()){toast('관리자만 게시물을 작성할 수 있어요.');return}postImage='';openModal('새 게시물 만들기',`<form data-form="create-post"><label class="upload-zone" id="uploadZone"><input id="postFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;z-index:4"/><span class="upload-hint">${icon('camera')}<br/>이미지를 클릭해서 선택해 주세요<br/><small>PNG · JPG · WEBP · GIF</small></span></label><label class="field"><span>위치 또는 장면명 (선택)</span><input name="location" maxlength="50" placeholder="예: 달빛이 비치는 정원"/></label><label class="field"><span>게시물 내용</span><textarea name="caption" maxlength="1800" required placeholder="오늘의 이야기를 적어보세요..."></textarea></label><button type="submit" class="primary-btn full">게시물 공유하기</button><p class="form-note">이미지는 자동으로 크기를 줄여 브라우저에 저장돼요. 정식 게시를 위한 서버 업로드는 아직 연결되지 않았습니다.</p></form>`)}
function openStoryCreate(){if(!isAdmin()){toast('관리자만 스토리를 작성할 수 있어요.');return}postImage='';openModal('새 스토리 만들기',`<form data-form="create-story"><label class="upload-zone" id="uploadZone"><input id="postFile" type="file" accept="image/png,image/jpeg,image/webp" style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;z-index:4"/><span class="upload-hint">${icon('camera')}<br/>스토리 이미지 선택 (선택)</span></label><label class="field"><span>스토리 한 줄 문구</span><input name="text" maxlength="70" required placeholder="무슨 이야기를 올릴까요?"/></label><button class="primary-btn full">스토리 공유하기</button></form>`)}
function openEditPost(id){
  if(!isAdmin()){toast('관리자만 게시물을 수정할 수 있어요.');return}
  const p=db.posts.find(x=>x.id===id);if(!p)return;
  postImage='';
  openModal('게시물 수정',`<form data-form="edit-post" data-id="${safe(id)}">
  <label class="upload-zone" id="uploadZone"><input id="postFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif" style="position:absolute;opacity:0;width:100%;height:100%;cursor:pointer;z-index:4"/><span class="upload-hint">${icon('camera')}<br/>사진 변경 시 클릭</span><img class="preview-image" src="${safe(p.image)}" alt="현재 사진" /></label>
  <label class="field"><span>위치 또는 장면명 (선택)</span><input name="location" maxlength="50" value="${safe(p.location||'')}" /></label>
  <label class="field"><span>게시물 내용</span><textarea name="caption" maxlength="1800" required>${safe(p.caption)}</textarea></label>
  <button type="submit" class="primary-btn full">수정 저장하기</button></form>`);
}
function showStory(id){const st=db.stories.find(s=>s.id===id);if(!st)return;currentModal='스토리';document.querySelector('#modalRoot').innerHTML=`<div class="modal-mask" data-action="mask-close"><div class="story-modal"><div class="story-backdrop" style="background-image:url('${safe(st.image)}')"></div><div class="story-shade"></div><div class="story-content"><div class="story-top">${avatar(st.author)} <strong>${safe(st.author)}</strong> · ${countTime(st.time)} 전<button class="story-close" data-action="close-modal">${icon('close')}</button></div><div class="story-center">${safe(st.text)}</div></div></div></div>`;document.body.style.overflow='hidden'}
function showPost(id){const p=db.posts.find(x=>x.id===id);if(!p)return;openModal('게시물',postHTML(p),{wide:false})}
function showComments(id){const p=db.posts.find(x=>x.id===id);if(!p)return;const body=`<div class="comment-sheet"><div class="post-header">${avatar(p.author)}<strong>${safe(p.author)}</strong></div><p class="post-caption">${safe(p.caption)}</p><hr style="border:0;border-top:1px solid #eee;margin:18px 0"/>${p.comments.length?p.comments.map(c=>`<div class="comment-line"><strong>${safe(c.author)}</strong>${safe(c.text)} <small style="color:#999">${countTime(c.time)} 전</small></div>`).join(''):'<p class="muted">아직 댓글이 없어요.</p>'}<form data-form="comment" data-id="${safe(id)}" class="comment-compose" style="margin-top:26px"><input name="comment" maxlength="250" placeholder="댓글 달기..." required/><button>게시</button></form></div>`;openModal('댓글',body)}
function editProfile(){const profile=db.profiles[me()]||{};openModal('프로필 편집',`<form data-form="edit-profile"><label class="field"><span>사용자 이름 (아이디)</span><input value="${safe(me())}" disabled/><small class="muted">시제품에서는 기존 아이디를 변경할 수 없어요.</small></label><label class="field"><span>소개 문구</span><textarea name="bio" maxlength="160">${safe(profile.bio||'')}</textarea></label><button class="primary-btn full">프로필 저장</button></form>`)}
function userFollow(name){if(!requireLogin())return;if(name===me()){toast('본인은 팔로우할 수 없어요.');return}const list=db.following[me()]||[];db.following[me()]=list.includes(name)?list.filter(x=>x!==name):[...list,name];store();render()}
function addNotice(target,actor,action){if(target!==actor){db.notifications.push({id:randomId(),target,actor,action,time:Date.now()});if(db.notifications.length>150)db.notifications=db.notifications.slice(-150)}}
async function imageData(file){if(!file)return '';if(!/^image\/(png|jpeg|webp|gif)$/i.test(file.type))throw Error('PNG/JPG/WEBP/GIF 이미지만 업로드할 수 있어요.');if(file.size>12*1024*1024)throw Error('12MB 이하의 이미지를 선택해 주세요.');return new Promise((resolve,reject)=>{const r=new FileReader();r.onerror=()=>reject(Error('이미지를 읽지 못했어요.'));r.onload=()=>{const image=new Image();image.onload=()=>{const max=1100,scale=Math.min(1,max/Math.max(image.width,image.height));const c=document.createElement('canvas');c.width=Math.round(image.width*scale);c.height=Math.round(image.height*scale);const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(image,0,0,c.width,c.height);resolve(c.toDataURL('image/jpeg',.79))};image.onerror=()=>reject(Error('이 이미지 형식은 처리할 수 없어요.'));image.src=String(r.result)};r.readAsDataURL(file)})}
function logout(){session=null;sessionSave();view='home';closeModal();render();toast('로그아웃했어요.')}
function ensureProfile(name){if(!db.profiles[name])db.profiles[name]={name,bio:'나만의 이야기를 기록하고 있어요.',avatar:Math.floor(Math.random()*gradients.length)}}
async function handleSubmit(e){
 const form=e.target.closest('[data-form]');if(!form)return;e.preventDefault();
 const type=form.dataset.form;const fd=new FormData(form);
 if(type==='account-login'){
   const name=String(fd.get('name')||'').trim().replace(/\s+/g,' ');
   const secret=String(fd.get('secret')||'');
   if(name.length<2||name.length>30||secret.length<4){toast('이름은 2~30자, PIN은 4자 이상 입력해 주세요.');return}
   if(adminReady && userKey(name)===userKey(adminId)){
     if(secret!==String(S.ADMIN_CODE)){toast('관리자 인증값이 올바르지 않아요.');return}
     ensureProfile(adminId);session={role:'admin',name:adminId};sessionSave();closeModal();view='home';render();toast('운영자로 입장했습니다. 게시물 작성이 가능합니다.');return;
   }
   if(adminId && !adminId.includes('[이곳에') && userKey(name)===userKey(adminId)){
     toast('관리자 설정값을 먼저 완성해 주세요.');return;
   }
   const id=userKey(name);
   try{
     const hashed=await digest(id+':'+secret);const account=db.users[id];
     if(account && account.hash!==hashed){toast('이름이 이미 사용 중이에요. PIN을 확인해 주세요.');return}
     if(!account){db.users[id]={name,hash:hashed,created:Date.now()};ensureProfile(name);store()}
     session={role:'visitor',name:account?.name||name};sessionSave();closeModal();view='home';render();toast(`${name}님, 댓글과 좋아요를 사용할 수 있어요.`)
   }catch(err){toast(err.message)}
 } else if(type==='create-post'){
   if(!isAdmin()){toast('운영자만 게시물을 작성할 수 있어요.');return}
   const caption=String(fd.get('caption')||'').trim();if(!caption){toast('글을 입력해 주세요.');return}
   if(!postImage){toast('사진을 먼저 선택해 주세요.');return}
   ensureProfile(me());const p={id:randomId(),author:me(),caption,location:String(fd.get('location')||'').trim(),image:postImage,time:Date.now(),likes:[],comments:[]};
   db.posts.unshift(p);if(!store()){db.posts.shift();return}
   closeModal();view='home';render();toast('게시물을 올렸어요. (현재 브라우저에만 저장)');
 } else if(type==='edit-post'){
   if(!isAdmin()){toast('운영자만 게시물을 수정할 수 있어요.');return}
   const p=db.posts.find(x=>x.id===form.dataset.id);if(!p)return;
   const previous={...p};const caption=String(fd.get('caption')||'').trim();if(!caption){toast('글을 입력해 주세요.');return}
   p.caption=caption;p.location=String(fd.get('location')||'').trim();if(postImage)p.image=postImage;
   if(!store()){Object.assign(p,previous);return}
   closeModal();render();toast('게시물 수정을 저장했어요.');
 } else if(type==='create-story'){
   if(!isAdmin()){toast('운영자만 스토리를 만들 수 있어요.');return}
   const content=String(fd.get('text')||'').trim();if(!content)return;
   db.stories.unshift({id:randomId(),author:me(),image:postImage||'assets/dawn.svg',text:content,time:Date.now()});
   if(!store())db.stories.shift();else{closeModal();render();toast('스토리를 올렸어요.')}
 } else if(type==='comment'){
   if(!requireLogin())return;
   const p=db.posts.find(x=>x.id===form.dataset.id);if(!p)return;
   const comment=String(fd.get('comment')||'').trim();if(!comment)return;
   p.comments.push({id:randomId(),author:me(),text:comment,time:Date.now()});
   addNotice(p.author,me(),'회원님의 게시물에 댓글을 남겼어요.');store();
   if(currentModal==='댓글')showComments(p.id);else render();toast('댓글을 등록했어요.')
 }
}
function handleClick(e){
 if(e.target.classList.contains('modal-mask')){closeModal();return}
 const hit=e.target.closest('[data-action]');if(!hit)return;
 const type=hit.dataset.action,id=hit.dataset.id,name=hit.dataset.name;
 switch(type){
 case 'nav':go(hit.dataset.to);break;
 case 'close-modal':closeModal();break;
 case 'login':openLogin();break;
 case 'logout':logout();break;
 case 'new-story':openStoryCreate();break;
 case 'story':showStory(id);break;
 case 'open-profile':focusedProfile=name;go('profile',{keepProfile:true});break;
 case 'like':{
   if(!requireLogin())return;const p=db.posts.find(x=>x.id===id);if(!p)return;
   p.likes=p.likes.includes(me())?p.likes.filter(n=>n!==me()):[...p.likes,me()];
   if(p.likes.includes(me()))addNotice(p.author,me(),'회원님의 게시물을 좋아해요.');store();render();break;
 }
 case 'comments':showComments(id);break;
 case 'post-detail':showPost(id);break;
 case 'post-options':{
   if(!isAdmin()){toast('관리자만 게시물을 관리할 수 있어요.');return}
   const p=db.posts.find(x=>x.id===id);if(!p)return;
   openModal('게시물 관리',`<button class="neutral-btn full" style="padding:15px" data-action="edit-post" data-id="${safe(id)}">사진·글 수정</button><button class="danger-text full" style="padding:16px" data-action="delete-post" data-id="${safe(id)}">게시물 삭제</button><button class="neutral-btn full" data-action="close-modal">닫기</button>`);break;
 }
 case 'edit-post':openEditPost(id);break;
 case 'delete-post':{
   const p=db.posts.find(x=>x.id===id);if(!p||!canDelete()){toast('관리자만 게시물을 삭제할 수 있어요.');return}
   if(!confirm('정말 이 게시물을 삭제할까요?'))return;
   db.posts=db.posts.filter(x=>x.id!==id);store();closeModal();render();toast('게시물을 삭제했어요.');break;
 }
 }
}
function handleSearch(e){if(e.target.id==='accountIdentity'){refreshLoginHint();return}if(e.target.id!=='peopleSearch')return;searchTerm=e.target.value;const target=document.querySelector('#searchResults');const list=Array.from(new Set([...Object.keys(db.profiles),...db.posts.map(x=>x.author)])).filter(name=>name.toLocaleLowerCase().includes(searchTerm.toLocaleLowerCase()));target.innerHTML=list.length?list.map(name=>`<button class="search-result" data-action="open-profile" data-name="${safe(name)}">${avatar(name)}<span><strong>${safe(name)}</strong><small>${safe(db.profiles[name]?.bio||'Momenta 회원')}</small></span></button>`).join(''):'<p class="muted">검색 결과가 없습니다.</p>'}
async function handleFile(e){if(e.target.id!=='postFile')return;const file=e.target.files?.[0];if(!file)return;const hint=document.querySelector('#uploadZone .upload-hint');if(hint)hint.textContent='이미지를 처리하고 있어요...';try{postImage=await imageData(file);const zone=document.querySelector('#uploadZone');if(zone){zone.classList.add('has-image');zone.querySelectorAll('.preview-image').forEach(n=>n.remove());const img=document.createElement('img');img.className='preview-image';img.src=postImage;img.alt='첨부 이미지 미리보기';zone.appendChild(img);if(hint)hint.textContent='클릭해서 이미지 다시 선택'}}catch(err){toast(err.message);if(hint)hint.textContent='클릭해서 이미지 선택'}}
function init(){document.title=`${S.SITE_NAME||'momenta'} · 우리의 장면들`;document.querySelector('.wordmark-text').textContent=S.SITE_NAME||'momenta';document.querySelector('#brand').addEventListener('click',e=>{e.preventDefault();go('home')});document.addEventListener('click',handleClick);document.addEventListener('submit',handleSubmit);document.addEventListener('input',handleSearch);document.addEventListener('change',handleFile);window.addEventListener('keydown',e=>{if(e.key==='Escape'&&currentModal)closeModal()});render();if(location.hash.startsWith('#post=')){const id=location.hash.slice(6);if(db.posts.some(p=>p.id===id))showPost(id)}if(!signed()){setTimeout(()=>openLogin(),500)}}
init();
})();
