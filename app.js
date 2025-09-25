const $ = (s) => document.querySelector(s);
const state = {
  data: [],
  favorites: new Set(JSON.parse(localStorage.getItem('fav_ids') || '[]'))
};

const q = $('#q'), cat = $('#cat'), abvLevel = $('#abvLevel'), sortSel = $('#sort');
const tagCloud = $('#tagCloud'), cards = $('#cards'), count = $('#count');
const darkToggle = $('#darkToggle'), resetBtn = $('#resetBtn'), favBtn = $('#favTabBtn');
const detail = $('#detail'), dImg = $('#dImg'), dName = $('#dName'), dSub = $('#dSub'), dBadges = $('#dBadges');
const dBase = $('#dBase'), dIngs = $('#dIngs'), dTags = $('#dTags');

init();
async function init() {
  // ✅ 默认主题改为黑色
  const theme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', theme);

  const res = await fetch('./cocktails_full.json');
  state.data = await res.json();

  const ORDER = ["Gin", "Whiskey", "Vodka", "Rum", "Tequila", "Brandy", "Other", "Mori Bar Originals", "Mr. Kin Originals", "Mocktails"];
  const cats = ["全部", ...ORDER.filter(c => state.data.some(x => x.category === c))];
  cat.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

  renderTagCloud();
  q.addEventListener('input', render);
  cat.addEventListener('change', render);
  abvLevel.addEventListener('change', render);
  sortSel.addEventListener('change', render);
  resetBtn.addEventListener('click', e => { e.preventDefault(); reset(); });
  favBtn.addEventListener('click', () => { favBtn.classList.toggle('active'); render(); });
  darkToggle.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', cur);
    localStorage.setItem('theme', cur);
  });

  render();
}

function reset() {
  q.value = '';
  cat.value = '全部';
  abvLevel.value = 'all';
  sortSel.value = 'id-asc';
  state.favorites.clear();
  localStorage.setItem('fav_ids', '[]');
  favBtn.classList.remove('active');

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

function abvCategory(v) {
  if (v == null || v === '') return 'all';
  const n = parseFloat(String(v).split('~')[0]) || 0;
  if (n <= 15) return 'low';
  if (n <= 28) return 'mid';
  if (n <= 38) return 'high';
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
      const hay = [it.localName, it.name, it.jpName, it.baseSpirit, ...(it.ingredients || []), ...(it.tags || [])]
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

  const sorter = sortSel.value;
  arr.sort((a, b) => {
    switch (sorter) {
      case 'id-asc': return (a.id || 0) - (b.id || 0);
      case 'abv-asc': return (parseFloat(a.abv) || 0) - (parseFloat(b.abv) || 0);
      case 'abv-desc': return (parseFloat(b.abv) || 0) - (parseFloat(a.abv) || 0);
    }
  });

  count.textContent = `共 ${arr.length} 项`;
  cards.innerHTML = '';
  arr.forEach(it => addCard(it));
  if (!arr.length) cards.innerHTML = '<div class="empty">没有匹配的结果</div>';
}

function addCard(it) {
  const tpl = document.getElementById('cardTpl');
  const node = tpl.content.cloneNode(true);
  const el = node.querySelector('.card');
  const img = node.querySelector('.thumb');
  const title = node.querySelector('.title');
  const sub = node.querySelector('.sub');
  const badges = node.querySelector('.badges');

  title.innerHTML = (it.localName || '').replace(/\n/g, '<br>');
  sub.innerHTML = [it.name, it.jpName].filter(Boolean).join('\n');
  img.src = it.image || 'assets/images/placeholder.svg';
  img.onerror = () => img.src = 'assets/images/placeholder.svg';

  badges.innerHTML = '';
  if (it.baseSpirit) badges.innerHTML += `<span class="badge">${it.baseSpirit}</span>`;
  if (it.abv) badges.innerHTML += `<span class="badge">ABV ${it.abv}%</span>`;
  (it.tags || []).forEach(t => badges.innerHTML += `<span class="badge">${t}</span>`);

  // 点击卡片打开详情
  el.addEventListener('click', () => openDetail(it));

  // 收藏按钮 (SVG 图标)
  const favBtnEl = document.createElement('button');
  favBtnEl.className = 'favBtn';
  favBtnEl.innerHTML = `
    <svg viewBox="0 0 24 24" class="icon-heart">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
               2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09
               C13.09 3.81 14.76 3 16.5 3
               19.58 3 22 5.42 22 8.5
               c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>
  `;
  if (state.favorites.has(it.id)) favBtnEl.classList.add('active');
  favBtnEl.addEventListener('click', e => {
    e.stopPropagation();
    if (state.favorites.has(it.id)) {
      state.favorites.delete(it.id);
      favBtnEl.classList.remove('active');
    } else {
      state.favorites.add(it.id);
      favBtnEl.classList.add('active');
    }
    localStorage.setItem('fav_ids', JSON.stringify([...state.favorites]));
    render();
  });
  el.appendChild(favBtnEl);

  cards.appendChild(node);
}


function openDetail(it) {
  window.currentItem = it;
  dName.textContent = it.localName || '';
  dSub.innerHTML = [it.name, it.jpName].filter(Boolean).join('\n');
  dBase.textContent = it.baseSpirit || '—';
  dIngs.textContent = (it.ingredients || []).join('，') || '—';
  dTags.innerHTML = (it.tags || []).map(t => `<span class="badge">${t}</span>`).join(' ') || '—';
  dBadges.innerHTML = '';
  if (it.abv) dBadges.innerHTML += `<span class="badge">ABV ${it.abv}%</span>`;
  if (it.baseSpirit) dBadges.innerHTML += `<span class="badge">${it.baseSpirit}</span>`;
  dImg.src = it.image || 'assets/images/placeholder.svg';
  dImg.onerror = () => dImg.src = 'assets/images/placeholder.svg';
  detail.showModal();
}

$('#closeDetail').addEventListener('click', () => detail.close());
document.addEventListener('click', e => {
  if (e.target && e.target.id === 'openDescBtn') {
    $('#descText').textContent = (window.currentItem && window.currentItem.description) || '暂无介绍';
    $('#descModal').showModal();
  }
});
$('#closeDesc').addEventListener('click', () => $('#descModal').close());
// 回到顶部
const backToTop = $('#backToTop');
if (backToTop) {
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 点击对话框外部关闭
detail.addEventListener('click', e => {
  if (e.target === detail) {
    detail.close();
  }
});
$('#descModal').addEventListener('click', e => {
  if (e.target === $('#descModal')) {
    $('#descModal').close();
  }
});

