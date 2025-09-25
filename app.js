const $=(s)=>document.querySelector(s);
const state={data:[],favorites:new Set(JSON.parse(localStorage.getItem('fav_ids')||'[]'))};

const q=$('#q'),cat=$('#cat'),abvLevel=$('#abvLevel'),sortSel=$('#sort');
const tagCloud=$('#tagCloud'),cards=$('#cards'),count=$('#count');
const darkToggle=$('#darkToggle'),resetBtn=$('#resetBtn'),favBtn=$('#favTabBtn');
const detail=$('#detail'),dImg=$('#dImg'),dName=$('#dName'),dSub=$('#dSub'),dBadges=$('#dBadges');
const dBase=$('#dBase'),dIngs=$('#dIngs'),dTags=$('#dTags');

// 🔥 详情页里简介按钮和简介弹窗
const openDescBtn = document.getElementById('openDescBtn');
const descModal = document.getElementById('descModal');
const descText = document.getElementById('descText');
const closeDesc = document.getElementById('closeDesc');

init();
async function init(){
  const theme=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',theme);
  const res=await fetch('./cocktails_full.json'); state.data=await res.json();
  const ORDER=["Gin","Whiskey","Vodka","Rum","Tequila","Brandy","Other","Mori Bar Originals","Mr. Kin Originals","Mocktails"];
  const cats=["全部",...ORDER.filter(c=>state.data.some(x=>x.category===c))];
  cat.innerHTML=cats.map(c=>`<option value="${c}">${c}</option>`).join('');
  renderTagCloud();
  q.addEventListener('input',render);
  cat.addEventListener('change',render);
  abvLevel.addEventListener('change',render);
  sortSel.addEventListener('change',render);
  resetBtn.addEventListener('click',e=>{e.preventDefault();reset();});
  favBtn.addEventListener('click',()=>{favBtn.classList.toggle('active');render();});
  darkToggle.addEventListener('click',()=>{
    const cur=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',cur);
    localStorage.setItem('theme',cur);
  });

  // 🔥 简介按钮监听
  openDescBtn.addEventListener('click', () => {
    if(window.currentItem){
      descText.textContent = window.currentItem.description || '暂无介绍';
      descModal.showModal();
    }
  });
  closeDesc.addEventListener('click', () => descModal.close());

  render();
}

function reset(){
  q.value = '';
  cat.value = '全部';
  abvLevel.value = 'all';
  sortSel.value = 'id-asc';
  state.favorites.clear();
  localStorage.setItem('fav_ids','[]');
  favBtn.classList.remove('active');

  // 🔥 清除所有已选标签
  document.querySelectorAll('.tag.active').forEach(btn => btn.classList.remove('active'));

  render();
}

function renderTagCloud() {
  tagCloud.replaceChildren();
  const freq = new Map();
  state.data.forEach(x => (x.tags || []).forEach(t => {
    freq.set(t, (freq.get(t) || 0) + 1);
  }));
  const tags = Array.from(freq.keys()).sort();
  tags.forEach(t => {
    const btn = document.createElement("button");
    btn.className = "tag";
    btn.dataset.tag = t;
    btn.textContent = t;
    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      render();
    });
    tagCloud.appendChild(btn);
  });
}

function abvCategory(v){
  if(v==null||v==='')return 'all';
  const n=parseFloat(String(v).split('~')[0])||0;
  if(n<=15)return 'low';
  if(n<=28)return 'mid';
  if(n<=38)return 'high';
  return 'strong';
}

function render() {
  const selectedTags = [...document.querySelectorAll('.tag.active')].map(x => x.dataset.tag);
  let arr = state.data.filter(it => {
    if (favBtn.classList.contains('active') && !state.favorites.has(it.id)) return false;
    if (cat.value !== '全部' && it.category !== cat.value) return false;
    const abvSel = abvLevel.value;
    if (abvSel !== 'all' && abvCategory(it.abv) !== abvSel) return false;
    if (q.value) {
      const kw = q.value.toLowerCase();
      const hay = [it.localName, it.name, it.jpName, it.baseSpirit, ...(it.ingredients||[]), ...(it.tags||[])]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(kw)) return false;
    }
    if (selectedTags.length) {
      const itemTags = new Set(it.tags || []);
      for (let t of selectedTags) {
        if (!itemTags.has(t)) return false;
      }
    }
    return true;
  });

  const sorter=sortSel.value;
  arr.sort((a,b)=>{
    switch(sorter){
      case 'id-asc':return (a.id||0)-(b.id||0);
      case 'abv-asc':return (parseFloat(a.abv)||0)-(parseFloat(b.abv)||0);
      case 'abv-desc':return (parseFloat(b.abv)||0)-(parseFloat(a.abv)||0);
    }
  });
  count.textContent=`共 ${arr.length} 项`;
  cards.innerHTML=''; arr.forEach(it=>addCard(it));
  if(!arr.length)cards.innerHTML='<div class="empty">没有匹配的结果</div>';
}

function addCard(it){
  const tpl=document.getElementById('cardTpl'); 
  const node=tpl.content.cloneNode(true);

  const el=node.querySelector('.card'),
        img=node.querySelector('.thumb'),
        title=node.querySelector('.title'),
        sub=node.querySelector('.sub'),
        badges=node.querySelector('.badges'),
        favBtn=node.querySelector('.favBtn');

  // 设置内容
  if (it.localName && it.localName.includes('（')) {
  const [main, sub] = it.localName.split('（');
  title.innerHTML = main + '<br>（' + sub;   // 手动插入换行
} else {
  title.textContent = it.localName || '';
}

  sub.innerHTML=[it.name,it.jpName].filter(Boolean).join('\n');
  img.src=it.image||'assets/images/placeholder.svg'; 
  img.onerror=()=>img.src='assets/images/placeholder.svg';

  badges.innerHTML='';
  if(it.baseSpirit) badges.innerHTML+=`<span class="badge">${it.baseSpirit}</span>`;
  if(it.abv) badges.innerHTML+=`<span class="badge">ABV ${it.abv}%</span>`;
  (it.tags||[]).forEach(t=>badges.innerHTML+=`<span class="badge">${t}</span>`);

  // 收藏按钮逻辑
  if(state.favorites.has(it.id)){
    favBtn.classList.add('active');
  }
  favBtn.addEventListener('click', e=>{
    e.stopPropagation(); // 避免点收藏时触发详情页
    if(state.favorites.has(it.id)){
      state.favorites.delete(it.id);
      favBtn.classList.remove('active');
    }else{
      state.favorites.add(it.id);
      favBtn.classList.add('active');
    }
    localStorage.setItem('fav_ids', JSON.stringify([...state.favorites]));
    if(favBtn.classList.contains('active') && favBtn.closest('.fav-view')) {
      render(); // 如果在收藏视图中，刷新卡片
    }
  });

  // 打开详情页
  el.addEventListener('click',()=>openDetail(it));

  cards.appendChild(node);
}


function openDetail(it){
  window.currentItem = it;
  dName.textContent=it.localName||'';
  dSub.innerHTML=[it.name,it.jpName].filter(Boolean).join('\n');
  dBase.textContent=it.baseSpirit||'—';
  dIngs.textContent=(it.ingredients||[]).join('，')||'—';
  dTags.innerHTML=(it.tags||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')||'—';
  dBadges.innerHTML='';
  if(it.abv)dBadges.innerHTML+=`<span class="badge">ABV ${it.abv}%</span>`;
  if(it.baseSpirit)dBadges.innerHTML+=`<span class="badge">${it.baseSpirit}</span>`;
  dImg.src=it.image||'assets/images/placeholder.svg';
  dImg.onerror=()=>dImg.src='assets/images/placeholder.svg';
  detail.showModal();
}

$('#closeDetail').addEventListener('click',()=>detail.close());

// 回到顶部按钮
const backToTop = document.getElementById('backToTop');
backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// 详情页 - 点击外部关闭
detail.addEventListener('click', e => {
  if (e.target === detail) {
    detail.close();
  }
});

// 简介页 - 点击外部关闭
descModal.addEventListener('click', e => {
  if (e.target === descModal) {
    descModal.close();
  }
});

