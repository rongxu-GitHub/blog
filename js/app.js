// ===== 页面状态管理 =====
let currentPage = 'home';
let currentTag = 'all';
let currentArticleId = null;
let searchQuery = '';

// ===== 股票数据存储配置 =====
const STOCK_DATA_KEY = 'stock_trading_data';  // localStorage 键名

// 从 localStorage 加载股票数据
function loadStockData() {
  try {
    const saved = localStorage.getItem(STOCK_DATA_KEY);
    if (saved) {
      const data = JSON.parse(saved);
      return data;
    }
  } catch (e) {
    console.warn('加载数据失败:', e);
  }
  return null;
}

// 保存股票数据到 localStorage
function saveStockData(rows) {
  try {
    localStorage.setItem(STOCK_DATA_KEY, JSON.stringify(rows));
    _updateSaveStatus('✓ 已保存');
    return true;
  } catch (e) {
    console.error('保存失败:', e);
    _updateSaveStatus('保存失败');
    return false;
  }
}

let _saveStatus = null;  // 保存状态提示元素

// 更新保存状态提示
function _updateSaveStatus(text) {
  if (!_saveStatus) {
    _saveStatus = document.createElement('div');
    _saveStatus.id = 'save-status';
    _saveStatus.style.cssText = 'position:fixed;bottom:20px;right:20px;padding:8px 16px;background:#1a1a2e;color:#fff;border-radius:8px;font-size:0.82rem;z-index:9999;opacity:0;transition:opacity .3s;';
    document.body.appendChild(_saveStatus);
  }
  _saveStatus.textContent = text;
  _saveStatus.style.opacity = '1';
  if (text !== '保存中...') {
    setTimeout(() => { _saveStatus.style.opacity = '0'; }, 2000);
  }
}

// 导出数据到文件
function exportStockData() {
  const data = JSON.stringify(stockRows, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stock-data-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 导入数据从文件
function importStockData(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      if (Array.isArray(data)) {
        stockRows = data;
        saveStockData(stockRows);
        renderStockTable();
        renderStockSummary();
        refreshChart();
      }
    } catch (err) {
      alert('导入失败：文件格式错误');
    }
  };
  reader.readAsText(file);
}

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderHeroStats();
  renderTagFilter();
  renderArticles();
  setupSearch();
  handleHashChange();
  window.addEventListener('hashchange', handleHashChange);
});

function handleHashChange() {
  const hash = location.hash;
  if (hash.startsWith('#article/')) {
    const id = hash.replace('#article/', '');
    showArticle(id);
  } else if (hash === '#tags') {
    showPage('tags');
  } else if (hash === '#about') {
    showPage('about');
  } else {
    showPage('home');
  }
}

// ===== 导航渲染 =====
function renderNav() {
  document.querySelector('.nav-logo-text').textContent = BLOG_DATA.site.title;
  document.querySelector('.nav-logo-initial').textContent = BLOG_DATA.site.title[0];
  document.title = BLOG_DATA.site.title;
}

// ===== Hero 统计数据 =====
function renderHeroStats() {
  const tagCount = BLOG_DATA.tags.length - 1;
  const articleCount = BLOG_DATA.articles.length;
  document.getElementById('stat-articles').textContent = articleCount;
  document.getElementById('stat-tags').textContent = tagCount;
  document.getElementById('stat-words').textContent = Math.round(
    BLOG_DATA.articles.reduce((sum, a) => sum + a.content.length, 0) / 1000
  ) + 'k';
  document.querySelector('.hero-subtitle').textContent = BLOG_DATA.site.subtitle;
  document.querySelector('.hero-desc').textContent = BLOG_DATA.site.description;
}

// ===== 标签筛选 =====
function renderTagFilter() {
  const container = document.getElementById('tag-filter');
  container.innerHTML = '';
  BLOG_DATA.tags.forEach(tag => {
    const count = tag.id === 'all' ? BLOG_DATA.articles.length : getTagCount(tag.id);
    const btn = document.createElement('button');
    btn.className = 'tag-btn' + (tag.id === currentTag ? ' active' : '');
    btn.dataset.tag = tag.id;
    btn.innerHTML = `${tag.name} <span class="count">${count}</span>`;
    btn.onclick = () => filterByTag(tag.id);
    container.appendChild(btn);
  });
}

function filterByTag(tagId) {
  currentTag = tagId;
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tag === tagId);
  });
  renderArticles();
}

// ===== 文章数据存储 =====
const USER_ARTICLES_KEY = 'user_blog_articles';

// 从 localStorage 加载用户文章
function loadUserArticles() {
  try {
    const saved = localStorage.getItem(USER_ARTICLES_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

// 保存用户文章到 localStorage
function saveUserArticles(articles) {
  localStorage.setItem(USER_ARTICLES_KEY, JSON.stringify(articles));
}

// 生成唯一 ID
function generateArticleId() {
  return 'u' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// ===== 文章列表渲染 =====
function renderArticles() {
  const container = document.getElementById('articles-grid');
  
  // 合并静态文章和用户文章
  const userArticles = loadUserArticles();
  const allArticles = [...BLOG_DATA.articles, ...userArticles];
  let articles = allArticles;

  if (currentTag !== 'all') {
    articles = articles.filter(a => a.tag === currentTag);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    articles = articles.filter(a =>
      a.title.toLowerCase().includes(q) ||
      a.excerpt.toLowerCase().includes(q) ||
      getTagName(a.tag).includes(q)
    );
  }

  // 新建文章按钮 HTML
  const newArticleBtn = `
    <div class="article-card new-article-card" onclick="openNewArticleModal()" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:280px; background:linear-gradient(135deg,#f8f9fc,#eef1f8); border:2px dashed #c4cae8;">
      <div style="font-size:3rem; margin-bottom:12px;">✍️</div>
      <span style="font-size:0.9rem; color:#5f6672; font-weight:500;">新建文章</span>
    </div>
  `;

  container.innerHTML = '';

  if (articles.length === 0) {
    container.innerHTML = newArticleBtn + `
      <div class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>没有找到相关文章</p>
      </div>`;
    return;
  }

  // 渲染新建按钮
  const btnDiv = document.createElement('div');
  btnDiv.innerHTML = newArticleBtn;
  container.appendChild(btnDiv.firstElementChild);

  articles.forEach(article => {
    const isExternal = !!article.externalLink;
    const isUserArticle = article.id.startsWith('u');

    // 外链文章用 <a> 包裹，内部文章用 <div>
    const card = document.createElement(isExternal ? 'a' : 'div');
    card.className = 'article-card' + (isUserArticle ? ' user-article-card' : '');
    if (isExternal) {
      card.href = article.externalLink;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    } else {
      card.onclick = () => { location.hash = '#article/' + article.id; };
    }

    // 用户文章显示编辑按钮
    const editBtn = isUserArticle ? `<button onclick="event.stopPropagation(); openEditArticleModal('${article.id}')" style="position:absolute; top:8px; right:8px; padding:4px 10px; background:rgba(255,255,255,0.9); border:none; border-radius:4px; font-size:0.75rem; cursor:pointer; color:#5f6672;">✏️ 编辑</button>` : '';

    card.innerHTML = `
      <div class="article-cover" style="background: ${article.cover}; position:relative;">
        <span style="font-size: 2.8rem">${article.emoji}</span>
        ${editBtn}
      </div>
      <div class="article-meta">
        <span class="article-date">${formatDate(article.date)}</span>
        <span class="article-tag" style="background: ${getTagColor(article.tag)}22; color: ${getTagColor(article.tag)}">${getTagName(article.tag)}</span>
      </div>
      <h2 class="article-title">${article.title}</h2>
      <p class="article-excerpt">${article.excerpt}</p>
      <div class="article-footer">
        <span class="article-read-time">📖 ${article.readTime} 阅读</span>
        <span class="read-more">${isExternal ? '前往官网 ↗' : '阅读全文 →'}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ===== 搜索 =====
function setupSearch() {
  const input = document.getElementById('search-input');
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      searchQuery = input.value.trim();
      currentTag = 'all';
      document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === 'all');
      });
      renderArticles();
    }, 300);
  });
}

// ===== 页面切换 =====
function showPage(page) {
  currentPage = page;

  document.getElementById('home-page').style.display = page === 'home' ? '' : 'none';
  document.getElementById('article-page').style.display = page === 'article' ? '' : 'none';
  document.getElementById('tags-page').style.display = page === 'tags' ? '' : 'none';
  document.getElementById('about-page').style.display = page === 'about' ? '' : 'none';

  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
  });

  const navMap = { home: 'nav-home', tags: 'nav-tags', about: 'nav-about' };
  if (navMap[page]) {
    const el = document.getElementById(navMap[page]);
    if (el) el.classList.add('active');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'tags') renderTagsPage();
  if (page === 'about') renderAboutPage();
}

// ===== 文章详情 =====
function showArticle(id) {
  // 先查找静态文章，再查找用户文章
  let article = BLOG_DATA.articles.find(a => a.id === id);
  if (!article) {
    article = getUserArticleById(id);
  }
  if (!article) { showPage('home'); return; }

  currentArticleId = id;
  currentPage = 'article';

  document.getElementById('home-page').style.display = 'none';
  document.getElementById('article-page').style.display = '';
  document.getElementById('tags-page').style.display = 'none';
  document.getElementById('about-page').style.display = 'none';

  // 渲染 hero
  document.getElementById('article-hero-title').textContent = article.title;
  document.getElementById('article-hero-date').textContent = formatDate(article.date);
  document.getElementById('article-hero-readtime').textContent = article.readTime + ' 阅读';
  document.getElementById('article-hero-tag').textContent = getTagName(article.tag);
  document.getElementById('article-hero-tag').style.cssText = `
    background: ${getTagColor(article.tag)}33;
    color: ${getTagColor(article.tag)};
    padding: 3px 12px;
    border-radius: 50px;
    font-size: 0.85rem;
    font-weight: 500;
  `;

  // 渲染内容
  const contentEl = document.getElementById('article-content');
  if (article.content === '__STOCK_WIDGET__') {
    contentEl.innerHTML = buildStockWidget();
    document.getElementById('toc-sidebar').style.display = 'none';
    setTimeout(() => initStockWidget(), 0);
  } else if (article.content === '__NEWS_WIDGET__') {
    contentEl.innerHTML = buildNewsWidget();
    document.getElementById('toc-sidebar').style.display = 'none';
    setTimeout(() => initNewsWidget(), 0);
  } else {
    contentEl.innerHTML = parseMarkdown(article.content);
    renderTOC(contentEl);
  }

  window.scrollTo({ top: 0 });

  // 更新导航激活状态
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
}

function renderTOC(contentEl) {
  const tocEl = document.getElementById('toc-list');
  const headings = contentEl.querySelectorAll('h2, h3');
  
  if (headings.length < 2) {
    document.getElementById('toc-sidebar').style.display = 'none';
    return;
  }

  document.getElementById('toc-sidebar').style.display = '';
  tocEl.innerHTML = '';

  headings.forEach((h, i) => {
    const id = 'heading-' + i;
    h.id = id;
    const li = document.createElement('li');
    li.className = h.tagName === 'H3' ? 'toc-h3' : '';
    const a = document.createElement('a');
    a.href = '#' + id;
    a.textContent = h.textContent;
    a.onclick = (e) => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    li.appendChild(a);
    tocEl.appendChild(li);
  });

  // 滚动高亮
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        tocEl.querySelectorAll('a').forEach(a => {
          a.classList.toggle('active', a.getAttribute('href') === '#' + id);
        });
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px' });

  headings.forEach(h => observer.observe(h));
}

// ===== 标签云页面 =====
function renderTagsPage() {
  const tagsCloud = document.getElementById('tags-cloud');
  const tagsArticles = document.getElementById('tags-articles-grid');

  // 渲染标签云
  tagsCloud.innerHTML = '';
  BLOG_DATA.tags.filter(t => t.id !== 'all').forEach(tag => {
    const count = getTagCount(tag.id);
    const item = document.createElement('div');
    item.className = 'tag-cloud-item';
    item.dataset.tag = tag.id;
    item.innerHTML = `
      <span class="tag-name">${tag.name}</span>
      <span class="tag-count">${count} 篇</span>
    `;
    item.onclick = () => filterTagsPage(tag.id, item);
    tagsCloud.appendChild(item);
  });

  // 默认显示全部文章
  renderTagsArticles('all');
}

let activeTagsFilter = 'all';

function filterTagsPage(tagId, clickedItem) {
  activeTagsFilter = tagId;
  document.querySelectorAll('#tags-cloud .tag-cloud-item').forEach(el => {
    el.classList.toggle('active', el === clickedItem);
  });
  renderTagsArticles(tagId);
}

function renderTagsArticles(tagId) {
  const container = document.getElementById('tags-articles-grid');
  const userArticles = loadUserArticles();
  const allArticles = [...BLOG_DATA.articles, ...userArticles];
  const articles = tagId === 'all' 
    ? allArticles 
    : allArticles.filter(a => a.tag === tagId);

  document.getElementById('tags-section-title').textContent = 
    tagId === 'all' ? '全部文章' : `${getTagName(tagId)} · ${articles.length} 篇`;

  if (articles.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <div class="empty-icon">📝</div>
        <p>该分类下暂无文章</p>
      </div>`;
    return;
  }

  articles.forEach(article => {
    const isExternal = !!article.externalLink;
    const isUserArticle = article.id.startsWith('u');

    // 外链文章用 <a> 包裹，内部文章用 <div>
    const card = document.createElement(isExternal ? 'a' : 'div');
    card.className = 'article-card' + (isUserArticle ? ' user-article-card' : '');
    if (isExternal) {
      card.href = article.externalLink;
      card.target = '_blank';
      card.rel = 'noopener noreferrer';
    } else {
      card.onclick = () => { location.hash = '#article/' + article.id; };
    }

    // 用户文章显示编辑按钮
    const editBtn = isUserArticle ? `<button onclick="event.stopPropagation(); openEditArticleModal('${article.id}')" style="position:absolute; top:8px; right:8px; padding:4px 10px; background:rgba(255,255,255,0.9); border:none; border-radius:4px; font-size:0.75rem; cursor:pointer; color:#5f6672;">✏️ 编辑</button>` : '';

    card.innerHTML = `
      <div class="article-cover" style="background: ${article.cover}; position:relative;">
        <span style="font-size: 2.8rem">${article.emoji}</span>
        ${editBtn}
      </div>
      <div class="article-meta">
        <span class="article-date">${formatDate(article.date)}</span>
        <span class="article-tag" style="background: ${getTagColor(article.tag)}22; color: ${getTagColor(article.tag)}">${getTagName(article.tag)}</span>
      </div>
      <h2 class="article-title">${article.title}</h2>
      <p class="article-excerpt">${article.excerpt}</p>
      <div class="article-footer">
        <span class="article-read-time">📖 ${article.readTime} 阅读</span>
        <span class="read-more">${isExternal ? '前往官网 ↗' : '阅读全文 →'}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

// ===== 关于页面 =====
function renderAboutPage() {
  const { site } = BLOG_DATA;
  document.getElementById('about-author-name').textContent = site.author;
  document.getElementById('about-author-bio').textContent = site.authorBio;
  document.getElementById('about-avatar-initial').textContent = site.author[0];

  const skillsEl = document.getElementById('about-skills');
  skillsEl.innerHTML = site.skills.map(s => `<span class="skill-tag">${s}</span>`).join('');

  document.getElementById('about-article-count').textContent = BLOG_DATA.articles.length;
  document.getElementById('about-tag-count').textContent = BLOG_DATA.tags.length - 1;
  const totalWords = Math.round(BLOG_DATA.articles.reduce((s, a) => s + a.content.length, 0) / 1000);
  document.getElementById('about-words-count').textContent = totalWords + 'k';
}

// ===== 全局导航函数 =====
function goHome() {
  location.hash = '';
  showPage('home');
}

function goBack() {
  if (document.referrer && document.referrer.includes(location.hostname)) {
    history.back();
  } else {
    goHome();
  }
}

// ===== 股市交易记录组件 =====
const STOCK_INITIAL_DATA = [
  { date: '4月10日', profit: -1106 },
  { date: '4月13日', profit: -755 },
  { date: '4月14日', profit: 6951 },
  { date: '4月15日', profit: 1048 },
  { date: '4月16日', profit: 5203 },
  { date: '4月17日', profit: 843 },
  { date: '4月20日', profit: -1661 },
  { date: '4月21日', profit: 1381 },
  { date: '4月22日', profit: 3012 },
  { date: '4月23日', profit: 1359 },
  { date: '4月24日', profit: 2962 },
  { date: '4月27日', profit: -2738 },
  { date: '4月28日', profit: -180 },
  { date: '4月30日', profit: 4046 },
  { date: '5月6日',  profit: 2744 },
  { date: '5月7日',  profit: 4423 },
  { date: '5月8日',  profit: -979 },
  { date: '5月11日', profit: 616 },
  { date: '5月12日', profit: 785 },
  { date: '5月13日', profit: 3017 },
  { date: '5月14日', profit: -4571 },
  { date: '5月15日', profit: -2706 },
  { date: '5月18日', profit: 4000 }
];

let stockRows = JSON.parse(JSON.stringify(STOCK_INITIAL_DATA));

function buildStockWidget() {
  return `
<div id="stock-widget" style="font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif;">

  <!-- 汇总卡片 -->
  <div id="stock-summary" style="display:grid; grid-template-columns: repeat(4,1fr); gap:12px; margin-bottom:28px;"></div>

  <!-- 图表区域 -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:20px; margin-bottom:28px;">
    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
      <h3 style="font-size:0.95rem; font-weight:600; color:#1a1a2e; margin:0;">收益走势图</h3>
      <div style="display:flex; gap:8px; align-items:center;">
        <button onclick="switchChart('cumulative')" id="btn-cumulative"
          style="padding:4px 14px; border-radius:50px; font-size:0.8rem; cursor:pointer; border:1px solid #3b5bdb; background:#3b5bdb; color:#fff; transition:all .2s">
          累计收益
        </button>
        <button onclick="switchChart('daily')" id="btn-daily"
          style="padding:4px 14px; border-radius:50px; font-size:0.8rem; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#5f6672; transition:all .2s">
          每日盈亏
        </button>
        <button onclick="resetChartZoom()" id="btn-reset-zoom"
          style="display:none; padding:4px 12px; border-radius:50px; font-size:0.78rem; cursor:pointer; border:1px solid #e5e7eb; background:#fff; color:#5f6672; transition:all .2s">
          ⟲ 重置
        </button>
      </div>
    </div>
    <div style="position:relative; height:300px;">
      <canvas id="stock-chart" style="width:100%;height:100%;display:block; cursor:crosshair;"></canvas>
    </div>
  </div>

  <!-- 数据表格 -->
  <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; margin-bottom:20px;">
    <div style="display:flex; align-items:center; justify-content:space-between; padding:16px 20px; border-bottom:1px solid #e5e7eb;">
      <h3 style="font-size:0.95rem; font-weight:600; color:#1a1a2e; margin:0;">📋 交易记录</h3>
      <button onclick="openAddModal()"
        style="padding:6px 16px; background:#3b5bdb; color:#fff; border:none; border-radius:6px; font-size:0.82rem; cursor:pointer;">
        + 添加记录
      </button>
    </div>
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; font-size:0.88rem; table-layout:fixed;">
        <thead>
          <tr style="background:#f8f9fc;">
            <th style="padding:10px 16px; text-align:center; font-weight:600; color:#5f6672; border-bottom:1px solid #e5e7eb; width:25%">日期</th>
            <th style="padding:10px 16px; text-align:right; font-weight:600; color:#5f6672; border-bottom:1px solid #e5e7eb; width:25%">收益（元）</th>
            <th style="padding:10px 16px; text-align:right; font-weight:600; color:#5f6672; border-bottom:1px solid #e5e7eb; width:25%">累计收益</th>
            <th style="padding:10px 16px; text-align:center; font-weight:600; color:#5f6672; border-bottom:1px solid #e5e7eb; width:25%">操作</th>
          </tr>
        </thead>
        <tbody id="stock-tbody"></tbody>
      </table>
    </div>
  </div>

  <div style="display:flex; align-items:center; justify-content:center; gap:12px; margin-top:16px;">
    <button onclick="exportStockData()" style="padding:6px 16px; background:#fff; color:#3b5bdb; border:1px solid #3b5bdb; border-radius:6px; font-size:0.82rem; cursor:pointer;">
      📥 导出数据
    </button>
    <label style="padding:6px 16px; background:#fff; color:#3b5bdb; border:1px solid #3b5bdb; border-radius:6px; font-size:0.82rem; cursor:pointer;">
      📤 导入数据
      <input type="file" accept=".json" onchange="importStockData(this.files[0])" style="display:none;">
    </label>
  </div>
  <p style="font-size:0.78rem; color:#9ca3af; text-align:center; margin-top:12px;">* 点击操作列「修改」按钮可编辑收益，点击「删除」可移除记录；点击日期可直接编辑。数据自动保存到浏览器。</p>

  <!-- 添加记录弹窗 -->
  <div id="stock-add-modal" style="display:none; position:fixed; inset:0; z-index:9999; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">
    <div style="background:#fff; border-radius:14px; padding:28px 32px; width:360px; box-shadow:0 16px 48px rgba(0,0,0,0.15);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <h3 style="font-size:1rem; font-weight:600; color:#1a1a2e; margin:0;">添加交易记录</h3>
        <button onclick="closeAddModal()" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#9ca3af; padding:4px; line-height:1;">✕</button>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.82rem; color:#5f6672; margin-bottom:6px; font-weight:500;">日期</label>
        <input id="modal-date" type="date" value=""
          style="width:100%; padding:9px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.88rem; outline:none; box-sizing:border-box; color:#1a1a2e;">
      </div>
      <div style="margin-bottom:24px;">
        <label style="display:block; font-size:0.82rem; color:#5f6672; margin-bottom:6px; font-weight:500;">当日盈亏（元）</label>
        <input id="modal-profit" type="number" placeholder="正数=盈利，负数=亏损，如 3000 或 -1500" value=""
          style="width:100%; padding:9px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.88rem; outline:none; box-sizing:border-box; color:#1a1a2e;">
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button onclick="closeAddModal()"
          style="padding:8px 20px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; color:#5f6672; font-size:0.88rem; cursor:pointer;">
          取消
        </button>
        <button onclick="confirmAddRow()"
          style="padding:8px 20px; border:none; border-radius:8px; background:#3b5bdb; color:#fff; font-size:0.88rem; cursor:pointer; font-weight:500;">
          确认添加
        </button>
      </div>
    </div>
  </div>

  <!-- 修改记录弹窗 -->
  <div id="stock-edit-modal" style="display:none; position:fixed; inset:0; z-index:9999; align-items:center; justify-content:center; background:rgba(0,0,0,0.4); font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">
    <div style="background:#fff; border-radius:14px; padding:28px 32px; width:360px; box-shadow:0 16px 48px rgba(0,0,0,0.15);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
        <h3 style="font-size:1rem; font-weight:600; color:#1a1a2e; margin:0;">修改收益</h3>
        <button onclick="closeEditModal()" style="background:none; border:none; font-size:1.2rem; cursor:pointer; color:#9ca3af; padding:4px; line-height:1;">✕</button>
      </div>
      <div style="margin-bottom:16px;">
        <label style="display:block; font-size:0.82rem; color:#5f6672; margin-bottom:6px; font-weight:500;">日期</label>
        <input id="edit-modal-date" type="text" placeholder="例如：5月19日" value=""
          style="width:100%; padding:9px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.88rem; outline:none; box-sizing:border-box; color:#1a1a2e;">
      </div>
      <div style="margin-bottom:24px;">
        <label style="display:block; font-size:0.82rem; color:#5f6672; margin-bottom:6px; font-weight:500;">当日盈亏（元）</label>
        <input id="edit-modal-profit" type="number" placeholder="正数=盈利，负数=亏损，例如：3000 或 -1500" value=""
          style="width:100%; padding:9px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.88rem; outline:none; box-sizing:border-box; color:#1a1a2e;">
      </div>
      <div style="display:flex; gap:10px; justify-content:flex-end;">
        <button onclick="closeEditModal()"
          style="padding:8px 20px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; color:#5f6672; font-size:0.88rem; cursor:pointer;">
          取消
        </button>
        <button onclick="confirmEditRow()"
          style="padding:8px 20px; border:none; border-radius:8px; background:#3b5bdb; color:#fff; font-size:0.88rem; cursor:pointer; font-weight:500;">
          确认修改
        </button>
      </div>
    </div>
  </div>
</div>
`;
}

function initStockWidget() {
  // 从 localStorage 加载数据，如果没有则使用默认数据
  const savedData = loadStockData();
  if (savedData && Array.isArray(savedData)) {
    stockRows = savedData;
  }
  renderStockTable();
  renderStockSummary();
  loadChartJS(() => drawChart('cumulative'));
}

// 加载 Chart.js
function loadChartJS(cb) {
  if (window.Chart) { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.min.js';
  s.onload = cb;
  document.head.appendChild(s);
}

// 计算累计收益
function calcCumulative() {
  let sum = 0;
  return stockRows.map(r => { sum += r.profit; return sum; });
}

// 渲染汇总卡片
function renderStockSummary() {
  const cumArr = calcCumulative();
  const total = cumArr[cumArr.length - 1] || 0;
  const wins = stockRows.filter(r => r.profit > 0).length;
  const losses = stockRows.filter(r => r.profit < 0).length;
  const best = stockRows.reduce((m, r) => r.profit > m ? r.profit : m, -Infinity);
  const worst = stockRows.reduce((m, r) => r.profit < m ? r.profit : m, Infinity);

  const cards = [
    { label: '累计收益', value: formatProfit(total), color: total >= 0 ? '#e8262a' : '#0ea5e9' },
    { label: '交易天数', value: stockRows.length + ' 天', color: '#3b5bdb' },
    { label: '盈利 / 亏损', value: wins + ' / ' + losses, color: '#22c55e' },
    { label: '单日最佳', value: formatProfit(best), color: '#e8262a' }
  ];
  const el = document.getElementById('stock-summary');
  if (!el) return;
  el.innerHTML = cards.map(c => `
    <div style="background:#f8f9fc; border-radius:10px; padding:14px 16px;">
      <div style="font-size:0.75rem; color:#9ca3af; margin-bottom:6px;">${c.label}</div>
      <div style="font-size:1.3rem; font-weight:700; color:${c.color};">${c.value}</div>
    </div>
  `).join('');
}

function formatProfit(v) {
  if (v === -Infinity || v === Infinity) return '-';
  return (v >= 0 ? '+' : '') + v.toLocaleString();
}

// 渲染表格
function renderStockTable() {
  const tbody = document.getElementById('stock-tbody');
  if (!tbody) return;
  const cumArr = calcCumulative();
  tbody.innerHTML = '';
  stockRows.forEach((row, i) => {
    const cum = cumArr[i];
    const isPos = row.profit >= 0;
    const profitColor = isPos ? '#e8262a' : '#0ea5e9';
    const cumColor = cum >= 0 ? '#e8262a' : '#0ea5e9';
    const tr = document.createElement('tr');
    tr.style.cssText = 'border-bottom:1px solid #f3f4f6; transition:background .15s;';
    tr.onmouseenter = () => tr.style.background = '#fafafa';
    tr.onmouseleave = () => tr.style.background = '';
    tr.innerHTML = `
      <td contenteditable="true" data-idx="${i}" data-field="date"
        style="padding:10px 16px; color:#1a1a2e; outline:none; cursor:text;"
        onblur="editCell(this)">${row.date}</td>
      <td style="padding:10px 16px; text-align:right; font-weight:500; color:${profitColor};">${row.profit.toLocaleString()}</td>
      <td style="padding:10px 16px; text-align:right; font-weight:500; color:${cumColor};">${cum.toLocaleString()}</td>
      <td style="padding:10px 16px; text-align:center;">
        <button onclick="openEditModal(${i})"
          style="padding:3px 10px; border:1px solid #bfdbfe; background:#eff6ff; color:#3b5bdb; border-radius:4px; font-size:0.78rem; cursor:pointer;">
          修改
        </button>
        <button onclick="deleteStockRow(${i})"
          style="padding:3px 10px; border:1px solid #fca5a5; background:#fff; color:#e8262a; border-radius:4px; font-size:0.78rem; cursor:pointer; margin-left:4px;">
          删除
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// 编辑日期单元格
function editCell(td) {
  const idx = parseInt(td.dataset.idx);
  const val = td.innerText.trim().replace(/,/g, '');
  if (val) stockRows[idx].date = val;
  // 自动保存到 GitHub
  saveStockData(stockRows);
}

// 修改弹窗 — 打开
let editTargetIdx = -1;
function openEditModal(idx) {
  const modal = document.getElementById('stock-edit-modal');
  if (!modal) return;
  editTargetIdx = idx;
  const row = stockRows[idx];
  document.getElementById('edit-modal-date').value = row.date;
  document.getElementById('edit-modal-profit').value = row.profit;
  modal.style.display = 'flex';
  document.getElementById('edit-modal-profit').focus();
}

function closeEditModal() {
  const modal = document.getElementById('stock-edit-modal');
  if (modal) modal.style.display = 'none';
  editTargetIdx = -1;
}

function confirmEditRow() {
  if (editTargetIdx < 0) return;
  const dateVal = document.getElementById('edit-modal-date').value.trim();
  const profitVal = document.getElementById('edit-modal-profit').value.trim();
  
  // 如果日期为空，聚焦并提示
  if (!dateVal) {
    document.getElementById('edit-modal-date').focus();
    return;
  }
  // 如果收益为空，默认设为0
  const profit = profitVal === '' ? 0 : parseInt(profitVal);
  if (isNaN(profit)) {
    document.getElementById('edit-modal-profit').focus();
    return;
  }
  
  stockRows[editTargetIdx] = { date: dateVal, profit };
  closeEditModal();
  renderStockTable();
  renderStockSummary();
  refreshChart();
  // 自动保存到 GitHub
  saveStockData(stockRows);
}

// 点击遮罩关闭修改弹窗（合并到下方统一监听器）

// 添加行 — 打开弹窗
function openAddModal() {
  const modal = document.getElementById('stock-add-modal');
  if (!modal) return;
  // 默认填今天，格式 YYYY-MM-DD（供 date input 使用）
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  document.getElementById('modal-date').value = `${y}-${m}-${d}`;
  document.getElementById('modal-profit').value = '';
  modal.style.display = 'flex';
  document.getElementById('modal-profit').focus();
}

function closeAddModal() {
  const modal = document.getElementById('stock-add-modal');
  if (modal) modal.style.display = 'none';
}

function confirmAddRow() {
  const dateVal = document.getElementById('modal-date').value.trim();
  const profitVal = document.getElementById('modal-profit').value.trim();
  if (!dateVal) {
    document.getElementById('modal-date').focus();
    return;
  }
  const profit = profitVal === '' ? 0 : parseInt(profitVal);
  if (isNaN(profit)) {
    document.getElementById('modal-profit').focus();
    return;
  }
  const parts = dateVal.split('-');
  const displayDate = parseInt(parts[1]) + '月' + parseInt(parts[2]) + '日';
  stockRows.push({ date: displayDate, profit });
  closeAddModal();
  renderStockTable();
  renderStockSummary();
  refreshChart();
  // 滚动到新行
  setTimeout(() => {
    const rows = document.querySelectorAll('#stock-tbody tr');
    const last = rows[rows.length - 1];
    if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 80);
  // 自动保存到 GitHub
  saveStockData(stockRows);
}

// 点击弹窗遮罩也可关闭
document.addEventListener('click', function(e) {
  const m1 = document.getElementById('stock-add-modal');
  const m2 = document.getElementById('stock-edit-modal');
  if (e.target === m1) closeAddModal();
  if (e.target === m2) closeEditModal();
});

// 删除行
function deleteStockRow(idx) {
  stockRows.splice(idx, 1);
  renderStockTable();
  renderStockSummary();
  refreshChart();
  // 自动保存到 GitHub
  saveStockData(stockRows);
}

// ========== 图表拖拽日期选择 ==========
let _stockDrag = null;      // { canvas, overlay, startX }
let _stockZoomIdx = null;   // { min, max }

function _initChartOverlay(canvas) {
  const wrap = canvas.parentElement;
  let overlay = wrap.querySelector('.chart-drag-overlay');
  if (!overlay) {
    overlay = document.createElement('canvas');
    overlay.className = 'chart-drag-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;width:100%;height:100%;';
    wrap.style.position = 'relative';
    wrap.appendChild(overlay);
  }
  // 同步 overlay 尺寸
  overlay.width = canvas.offsetWidth;
  overlay.height = canvas.offsetHeight;
  return overlay;
}

function _drawDragOverlay(canvas, overlay, startX, endX) {
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (endX === null) return;
  const left = Math.min(startX, endX);
  const right = Math.max(startX, endX);
  ctx.fillStyle = 'rgba(59,91,219,0.13)';
  ctx.strokeStyle = 'rgba(59,91,219,0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.fillRect(left, 0, right - left, overlay.height);
  ctx.strokeRect(left, 0, right - left, overlay.height);
  ctx.setLineDash([]);
  // 端点手柄
  [left, right].forEach(x => {
    ctx.beginPath();
    ctx.arc(x, overlay.height / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#3b5bdb';
    ctx.fill();
  });
}

function _onChartMouseDown(e) {
  const canvas = e.currentTarget;
  const overlay = _initChartOverlay(canvas);
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.offsetWidth / rect.width);
  _stockDrag = { canvas, overlay, startX: x };
  document.body.style.userSelect = 'none';
}

function _onChartMouseMove(e) {
  if (!_stockDrag) return;
  const { canvas, overlay } = _stockDrag;
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.offsetWidth / rect.width);
  _stockDrag.endX = x;
  _drawDragOverlay(canvas, overlay, _stockDrag.startX, x);
}

function _onChartMouseUp(e) {
  if (!_stockDrag) return;
  const { canvas, overlay, startX, endX } = _stockDrag;
  document.body.style.userSelect = '';
  const ctx = overlay.getContext('2d');
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (endX === null) { _stockDrag = null; return; }
  const totalWidth = canvas.offsetWidth;
  const leftRatio = Math.min(startX, endX) / totalWidth;
  const rightRatio = Math.max(startX, endX) / totalWidth;
  if (Math.abs(rightRatio - leftRatio) > 0.03) {
    const labels = stockRows.map(r => r.date);
    const startIdx = Math.max(0, Math.floor(leftRatio * labels.length));
    const endIdx = Math.min(labels.length - 1, Math.ceil(rightRatio * labels.length));
    if (startIdx < endIdx) {
      _stockZoomIdx = { min: startIdx, max: endIdx };
      _applyChartZoom();
    }
  }
  _stockDrag = null;
}

function _applyChartZoom() {
  if (!stockChartInstance || !_stockZoomIdx) return;
  stockChartInstance.options.scales.x.min = _stockZoomIdx.min;
  stockChartInstance.options.scales.x.max = _stockZoomIdx.max;
  stockChartInstance.update('none');
  const btn = document.getElementById('btn-reset-zoom');
  if (btn) btn.style.display = 'inline-flex';
}

function resetChartZoom() {
  _stockZoomIdx = null;
  if (!stockChartInstance) return;
  stockChartInstance.options.scales.x.min = undefined;
  stockChartInstance.options.scales.x.max = undefined;
  stockChartInstance.update();
  const btn = document.getElementById('btn-reset-zoom');
  if (btn) btn.style.display = 'none';
}

// 在图表 canvas 上绑定拖拽事件
function _bindChartDragEvents(canvas) {
  canvas.addEventListener('mousedown', _onChartMouseDown);
  document.addEventListener('mousemove', _onChartMouseMove);
  document.addEventListener('mouseup', _onChartMouseUp);
}


// 图表相关
let stockChartInstance = null;
let currentChartType = 'cumulative';

function resetChartZoom() {
  if (!stockChartInstance) return;
  stockChartInstance.options.scales.x.min = undefined;
  stockChartInstance.options.scales.x.max = undefined;
  stockChartInstance._isZoomed = false;
  stockChartInstance.update();
}

function switchChart(type) {
  currentChartType = type;
  const btnC = document.getElementById('btn-cumulative');
  const btnD = document.getElementById('btn-daily');
  if (!btnC) return;
  resetChartZoom();
  if (type === 'cumulative') {
    btnC.style.background = '#3b5bdb'; btnC.style.color = '#fff'; btnC.style.borderColor = '#3b5bdb';
    btnD.style.background = '#fff';   btnD.style.color = '#5f6672'; btnD.style.borderColor = '#e5e7eb';
  } else {
    btnD.style.background = '#3b5bdb'; btnD.style.color = '#fff'; btnD.style.borderColor = '#3b5bdb';
    btnC.style.background = '#fff';   btnC.style.color = '#5f6672'; btnC.style.borderColor = '#e5e7eb';
  }
  drawChart(type);
}

function refreshChart() {
  if (document.getElementById('stock-chart') && window.Chart) {
    drawChart(currentChartType);
  }
}

function drawChart(type) {
  const canvas = document.getElementById('stock-chart');
  if (!canvas || !window.Chart) return;
  const labels = stockRows.map(r => r.date);
  const cumArr = calcCumulative();
  const dailyArr = stockRows.map(r => r.profit);

  if (stockChartInstance) { stockChartInstance.destroy(); stockChartInstance = null; }

  // 两个独立图表，按传入的 type 渲染
  if (type === 'cumulative') {
    const gradColors = cumArr.map(v => v >= 0 ? '#e8262a' : '#0ea5e9');
    stockChartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: '累计收益（元）',
          data: cumArr,
          borderColor: '#e8262a',
          backgroundColor: 'rgba(232,38,42,0.08)',
          borderWidth: 2,
          pointBackgroundColor: gradColors,
          pointBorderColor: gradColors,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ' 累计：' + ctx.raw.toLocaleString() + ' 元'
            }
          }
        },
        scales: {
          x: { grid: { color: '#f3f4f6' }, ticks: { font: { size: 11 }, maxRotation: 45 } },
          y: {
            grid: { color: '#f3f4f6' },
            ticks: { font: { size: 11 }, callback: v => v.toLocaleString() }
          }
        }
      }
    });
  } else {
    const bgColors = dailyArr.map(v => v >= 0 ? 'rgba(232,38,42,0.85)' : 'rgba(14,165,233,0.85)');
    stockChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '每日盈亏（元）',
          data: dailyArr,
          backgroundColor: bgColors,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => (ctx.raw >= 0 ? ' 盈利：+' : ' 亏损：') + ctx.raw.toLocaleString() + ' 元'
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, maxRotation: 45 } },
          y: {
            grid: { color: '#f3f4f6' },
            ticks: { font: { size: 11 }, callback: v => v.toLocaleString() }
          }
        }
      }
    });
  }
  _bindChartDragEvents(canvas);
}

// ===== 新闻聚合组件 =====

// ===== 财联社 7x24 新闻配置 =====

// 本地代理服务器地址（由 proxy-server.js 提供）
// 如果未运行代理，请先在终端执行: node proxy-server.js
const CLS_PROXY_URL = 'http://localhost:3001';

// 新闻缓存配置
const NEWS_CACHE_KEY = 'cls_news_cache_v2';
const NEWS_CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存（7x24快讯更新频繁）

let _newsArticles = [];

function buildNewsWidget() {
  return `
<div id="news-widget" style="font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">

  <!-- 头部控制栏 -->
  <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:10px;">
    <div style="display:flex; align-items:center; gap:8px;">
      <span style="background:#1a56db; color:#fff; font-size:0.7rem; font-weight:700; padding:3px 8px; border-radius:4px; letter-spacing:0.5px;">7×24</span>
      <span style="font-size:0.88rem; font-weight:600; color:#1e293b;">财联社 A股快讯</span>
      <span style="font-size:0.72rem; color:#16a34a; background:#dcfce7; padding:2px 8px; border-radius:50px; display:flex; align-items:center; gap:3px;">
        <span style="width:6px; height:6px; background:#16a34a; border-radius:50%; display:inline-block;"></span>实时更新
      </span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <span id="news-timer" style="font-size:0.75rem; color:#9ca3af;"></span>
      <button onclick="refreshNews()" id="news-refresh-btn"
        style="display:flex; align-items:center; gap:5px; padding:6px 14px; background:#1a56db; color:#fff; border:none; border-radius:6px; font-size:0.82rem; cursor:pointer; transition:all .2s;">
        <span id="news-refresh-icon">🔄</span> 刷新
      </button>
    </div>
  </div>

  <!-- 加载状态 -->
  <div id="news-loading" style="text-align:center; padding:40px; color:#9ca3af;">
    <div style="font-size:1.5rem; margin-bottom:8px;">📡</div>
    <div style="font-size:0.85rem;">正在连接财联社7x24快讯...</div>
  </div>

  <!-- 新闻网格 -->
  <div id="news-grid" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:16px; display:none;"></div>

  <!-- 空状态 -->
  <div id="news-empty" style="display:none; text-align:center; padding:60px 20px; color:#9ca3af;">
    <div style="font-size:2rem; margin-bottom:12px;">📭</div>
    <div style="font-size:0.9rem;">暂无新闻，请确认代理服务已启动</div>
    <div style="font-size:0.78rem; color:#94a3b8; margin-top:8px;">提示：在博客目录运行 <code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">node proxy-server.js</code> 启动代理</div>
    <button onclick="refreshNews()" style="margin-top:16px; padding:8px 20px; background:#1a56db; color:#fff; border:none; border-radius:6px; cursor:pointer; font-size:0.85rem;">重新加载</button>
  </div>

  <!-- 错误提示 -->
  <div id="news-error" style="display:none; background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:16px 20px; margin-bottom:16px;">
    <div style="color:#dc2626; font-size:0.85rem; margin-bottom:8px;">⚠️ 无法连接财联社，请检查代理服务</div>
    <div id="news-error-detail" style="font-size:0.78rem; color:#f87171;"></div>
    <div style="margin-top:8px; font-size:0.78rem; color:#6b7280;">📌 启动代理：<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">node proxy-server.js</code></div>
  </div>

  <!-- 新闻来源 -->
  <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
    <div style="font-size:0.75rem; color:#9ca3af;">📡 数据来源：<a href="https://www.cls.cn/telegraph" target="_blank" style="color:#1a56db;text-decoration:none;">财联社 7×24小时电报</a></div>
    <div style="font-size:0.72rem; color:#d1d5db;">内容归财联社所有，仅供学习参考</div>
  </div>
</div>`;
}

function initNewsWidget() {
  // 优先从缓存加载
  const cached = _loadNewsCache();
  if (cached && cached.articles && cached.articles.length > 0) {
    _newsArticles = cached.articles;
    _updateTimer(new Date(cached.timestamp));
    renderNews(_newsArticles, true);
  }
  // 发起网络请求获取最新数据
  refreshNews();
}

async function refreshNews() {
  const btn = document.getElementById('news-refresh-btn');
  const icon = document.getElementById('news-refresh-icon');
  const loading = document.getElementById('news-loading');
  const grid = document.getElementById('news-grid');
  const empty = document.getElementById('news-empty');
  const errorBox = document.getElementById('news-error');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.7'; }
  if (icon) icon.style.animation = 'spin 1s linear infinite';
  if (loading) loading.style.display = 'block';
  if (grid) grid.style.display = 'none';
  if (empty) empty.style.display = 'none';
  if (errorBox) errorBox.style.display = 'none';

  try {
    const articles = await _fetchCLSNews();
    _newsArticles = articles;
    _saveNewsCache(articles);

    if (loading) loading.style.display = 'none';
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.background = '#22c55e';
      btn.style.color = '#fff';
      setTimeout(() => {
        if (btn) { btn.style.background = '#1a56db'; btn.style.color = '#fff'; }
      }, 2000);
    }
    if (icon) icon.style.animation = '';

    _updateTimer(new Date());
    renderNews(_newsArticles, false);
  } catch (err) {
    // 显示错误
    if (loading) loading.style.display = 'none';
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.style.background = '#ef4444'; }
    if (icon) icon.style.animation = '';
    const errBox = document.getElementById('news-error');
    const errDetail = document.getElementById('news-error-detail');
    if (errBox) errBox.style.display = 'block';
    if (errDetail) errDetail.textContent = err.message || '连接失败';
    // 尝试回退显示缓存
    const cached = _loadNewsCache();
    if (cached && cached.articles && cached.articles.length > 0) {
      _newsArticles = cached.articles;
      renderNews(_newsArticles, false);
    } else if (empty) {
      empty.style.display = 'block';
    }
  }
}

/**
 * 通过本地代理获取财联社 7x24 快讯
 * 代理抓取财联社网页并解析新闻
 * 需要先运行: node proxy-server.js
 */
function _fetchCLSNews() {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', CLS_PROXY_URL, true);
    xhr.timeout = 15000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const resp = JSON.parse(xhr.responseText);
          if (resp.code === 0 && Array.isArray(resp.data)) {
            resolve(resp.data);
          } else {
            reject(new Error(resp.message || '数据格式错误'));
          }
        } catch (e) {
          reject(new Error('数据解析失败'));
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}：代理服务异常`));
      }
    };

    xhr.onerror = () => reject(new Error('无法连接代理，请确认已运行 node proxy-server.js'));
    xhr.ontimeout = () => reject(new Error('请求超时，请检查网络连接'));
    xhr.send();
  });
}

function _stripTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function _formatRelativeTime(dateStr) {
  try {
    const now = new Date();
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    if (diff < 86400) return Math.floor(diff / 3600) + ' 小时前';
    if (diff < 604800) return Math.floor(diff / 86400) + ' 天前';
    return date.toLocaleDateString('zh-CN');
  } catch { return dateStr; }
}

function _truncateDesc(desc, maxLen = 120) {
  if (!desc) return '';
  if (desc.length <= maxLen) return desc;
  return desc.slice(0, maxLen) + '…';
}

function _saveNewsCache(articles) {
  try {
    localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify({ articles, timestamp: new Date().toISOString() }));
  } catch (e) {}
}

function _loadNewsCache() {
  try {
    const raw = localStorage.getItem(NEWS_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const age = Date.now() - new Date(data.timestamp).getTime();
    if (age > NEWS_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function _updateTimer(date) {
  const el = document.getElementById('news-timer');
  if (!el) return;
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) {
    el.textContent = `刚刚更新`;
  } else if (diff < 3600) {
    el.textContent = `${Math.floor(diff / 60)} 分钟前更新`;
  } else {
    el.textContent = `${date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })} 更新`;
  }
}

// filterNews 不再需要（已移除分类按钮），保留函数避免报错
function filterNews(category) {
  renderNews(_newsArticles, false);
}

function renderNews(articles, fromCache) {
  const loading = document.getElementById('news-loading');
  const grid = document.getElementById('news-grid');
  const empty = document.getElementById('news-empty');
  if (loading) loading.style.display = 'none';

  if (!articles || articles.length === 0) {
    if (grid) grid.style.display = 'none';
    if (empty) empty.style.display = 'block';
    return;
  }

  if (empty) empty.style.display = 'none';
  if (grid) {
    grid.style.display = 'grid';
    grid.innerHTML = articles.map(article => {
      const timeAgo = _formatRelativeTime(article.pubDate);

      // 分类标签颜色
      const catColorMap = {
        '综合': '#1a56db', '重要': '#dc2626', '公司': '#7c3aed',
        '市场': '#0891b2', '港美': '#ea580c', '基金': '#16a34a',
        '科技': '#3b5bdb', '国内': '#e8262a', '国际': '#8b5cf6'
      };
      const catColor = catColorMap[article.category] || '#64748b';

      // 显示时间戳（如果能解析出来）
      let timeDisplay = timeAgo;
      if (article.pubDate) {
        try {
          const d = new Date(article.pubDate);
          if (!isNaN(d.getTime())) {
            timeDisplay = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          }
        } catch {}
      }

      return `
      <a href="${article.link}" target="_blank" rel="noopener noreferrer"
        style="display:flex; flex-direction:column; background:#fff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; text-decoration:none; color:inherit; transition:all .2s; cursor:pointer;">
        <div style="padding:14px 16px 0;">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px;">
            <span style="display:inline-flex; align-items:center; gap:5px; font-size:0.75rem; color:${article.sourceColor}; font-weight:600;">
              <span>${article.sourceIcon || '📰'}</span> ${article.source || '财联社'}
            </span>
            <span style="font-size:0.72rem; color:#d1d5db;">${timeDisplay}</span>
          </div>
          <div style="font-size:0.92rem; font-weight:600; color:#1a1a2e; line-height:1.5; margin-bottom:8px;">${article.title}</div>
        </div>
        ${article.desc ? `<div style="padding:0 16px 14px; font-size:0.8rem; color:#5f6672; line-height:1.6; flex:1;">${_truncateDesc(article.desc, 100)}</div>` : '<div style="flex:1;"></div>'}
        <div style="padding:0 16px 12px; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-size:0.72rem; padding:2px 8px; border-radius:50px; background:${catColor}18; color:${catColor}; font-weight:500;">${article.category}</span>
          <span style="font-size:0.72rem; color:#9ca3af;">↗ 阅读原文</span>
        </div>
      </a>`;
    }).join('');
  }
}

// ===== 文章编辑功能 =====

// 文章编辑弹窗 HTML
function getArticleModalHTML(article = null) {
  const isEdit = !!article;
  const title = isEdit ? '编辑文章' : '新建文章';
  const defaultEmoji = article?.emoji || '📝';
  const defaultCover = article?.cover || 'linear-gradient(135deg, #667eea, #764ba2)';
  
  const tagOptions = BLOG_DATA.tags.filter(t => t.id !== 'all').map(t => 
    `<option value="${t.id}" ${article?.tag === t.id ? 'selected' : ''}>${t.name}</option>`
  ).join('');

  return `
  <div id="article-modal" style="display:none; position:fixed; inset:0; z-index:10000; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); font-family:-apple-system,BlinkMacSystemFont,'PingFang SC',sans-serif;">
    <div style="background:#fff; border-radius:16px; padding:28px 32px; width:90%; max-width:700px; max-height:90vh; overflow-y:auto; box-shadow:0 20px 60px rgba(0,0,0,0.2);">
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:24px;">
        <h2 style="font-size:1.2rem; font-weight:600; color:#1a1a2e; margin:0;">${title}</h2>
        <button onclick="closeArticleModal()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:#9ca3af; padding:4px;">✕</button>
      </div>
      
      <!-- 基本信息 -->
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:0.85rem; color:#5f6672; margin-bottom:8px; font-weight:500;">标题 *</label>
        <input id="article-title" type="text" placeholder="输入文章标题" value="${article?.title || ''}"
          style="width:100%; padding:10px 14px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.95rem; outline:none; box-sizing:border-box;">
      </div>
      
      <div style="margin-bottom:20px;">
        <label style="display:block; font-size:0.85rem; color:#5f6672; margin-bottom:8px; font-weight:500;">摘要</label>
        <textarea id="article-excerpt" placeholder="输入文章摘要（选填）" rows="2"
          style="width:100%; padding:10px 14px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.9rem; outline:none; box-sizing:border-box; resize:vertical;">${article?.excerpt || ''}</textarea>
      </div>
      
      <div style="display:flex; gap:16px; margin-bottom:20px;">
        <div style="flex:1;">
          <label style="display:block; font-size:0.85rem; color:#5f6672; margin-bottom:8px; font-weight:500;">标签</label>
          <select id="article-tag" style="width:100%; padding:10px 14px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.9rem; outline:none; cursor:pointer;">
            ${tagOptions}
          </select>
        </div>
        <div style="flex:1;">
          <label style="display:block; font-size:0.85rem; color:#5f6672; margin-bottom:8px; font-weight:500;">图标</label>
          <div style="display:flex; gap:8px; align-items:center;">
            <input id="article-emoji" type="text" placeholder="如 📝" value="${defaultEmoji}" maxlength="4"
              style="width:60px; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:1.2rem; text-align:center; outline:none;">
            <input id="article-cover" type="text" placeholder="背景渐变" value="${defaultCover}"
              style="flex:1; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.85rem; outline:none;">
          </div>
        </div>
      </div>
      
      <!-- 内容 -->
      <div style="margin-bottom:24px;">
        <label style="display:block; font-size:0.85rem; color:#5f6672; margin-bottom:8px; font-weight:500;">
          内容 <span style="font-size:0.75rem; color:#9ca3af;">（支持 Markdown 格式）</span>
        </label>
        <textarea id="article-content" placeholder="输入文章内容，支持 Markdown 格式：&#10;&#10;# 标题&#10;## 二级标题&#10;&#10;**粗体** *斜体*&#10;&#10;- 列表项&#10;- 列表项" rows="12"
          style="width:100%; padding:12px 14px; border:1px solid #e5e7eb; border-radius:8px; font-size:0.88rem; outline:none; box-sizing:border-box; resize:vertical; font-family:'Monaco','Menlo',monospace;">${article?.content || ''}</textarea>
      </div>
      
      <!-- 按钮 -->
      <div style="display:flex; gap:12px; justify-content:flex-end; border-top:1px solid #e5e7eb; padding-top:20px;">
        ${isEdit ? `<button onclick="deleteArticle('${article.id}')" style="padding:10px 20px; border:1px solid #dc2626; border-radius:8px; background:#fff; color:#dc2626; font-size:0.9rem; cursor:pointer; margin-right:auto;">🗑️ 删除</button>` : ''}
        <button onclick="closeArticleModal()" style="padding:10px 20px; border:1px solid #e5e7eb; border-radius:8px; background:#fff; color:#5f6672; font-size:0.9rem; cursor:pointer;">取消</button>
        <button onclick="${isEdit ? `updateArticle('${article.id}')` : 'publishArticle()'}" style="padding:10px 24px; border:none; border-radius:8px; background:#3b5bdb; color:#fff; font-size:0.9rem; cursor:pointer; font-weight:500;">${isEdit ? '保存修改' : '发布文章'}</button>
      </div>
    </div>
  </div>`;
}

// 打开新建文章弹窗
function openNewArticleModal() {
  const modal = document.getElementById('article-modal');
  if (modal) {
    modal.outerHTML = getArticleModalHTML();
  } else {
    document.body.insertAdjacentHTML('beforeend', getArticleModalHTML());
  }
  document.getElementById('article-modal').style.display = 'flex';
  document.getElementById('article-title').focus();
}

// 打开编辑文章弹窗
function openEditArticleModal(articleId) {
  const userArticles = loadUserArticles();
  const article = userArticles.find(a => a.id === articleId);
  if (!article) {
    alert('文章不存在');
    return;
  }
  const modal = document.getElementById('article-modal');
  if (modal) {
    modal.outerHTML = getArticleModalHTML(article);
  } else {
    document.body.insertAdjacentHTML('beforeend', getArticleModalHTML(article));
  }
  document.getElementById('article-modal').style.display = 'flex';
}

// 关闭弹窗
function closeArticleModal() {
  const modal = document.getElementById('article-modal');
  if (modal) modal.style.display = 'none';
}

// 发布新文章
function publishArticle() {
  const title = document.getElementById('article-title').value.trim();
  const excerpt = document.getElementById('article-excerpt').value.trim();
  const tag = document.getElementById('article-tag').value;
  const emoji = document.getElementById('article-emoji').value.trim() || '📝';
  const cover = document.getElementById('article-cover').value.trim() || 'linear-gradient(135deg, #667eea, #764ba2)';
  const content = document.getElementById('article-content').value.trim();

  if (!title) {
    document.getElementById('article-title').focus();
    return;
  }

  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const wordCount = content.replace(/[#*`\-\n]/g, '').length;
  const readTime = Math.max(1, Math.ceil(wordCount / 500)) + ' 分钟';

  const newArticle = {
    id: generateArticleId(),
    title,
    excerpt: excerpt || content.slice(0, 100) + '...',
    tag,
    date: dateStr,
    readTime,
    emoji,
    cover,
    content: content || excerpt || title
  };

  const userArticles = loadUserArticles();
  userArticles.unshift(newArticle);
  saveUserArticles(userArticles);

  closeArticleModal();
  renderArticles();
  
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 更新文章
function updateArticle(articleId) {
  const title = document.getElementById('article-title').value.trim();
  const excerpt = document.getElementById('article-excerpt').value.trim();
  const tag = document.getElementById('article-tag').value;
  const emoji = document.getElementById('article-emoji').value.trim() || '📝';
  const cover = document.getElementById('article-cover').value.trim() || 'linear-gradient(135deg, #667eea, #764ba2)';
  const content = document.getElementById('article-content').value.trim();

  if (!title) {
    document.getElementById('article-title').focus();
    return;
  }

  const userArticles = loadUserArticles();
  const idx = userArticles.findIndex(a => a.id === articleId);
  if (idx === -1) {
    alert('文章不存在');
    return;
  }

  const wordCount = content.replace(/[#*`\-\n]/g, '').length;
  const readTime = Math.max(1, Math.ceil(wordCount / 500)) + ' 分钟';

  userArticles[idx] = {
    ...userArticles[idx],
    title,
    excerpt: excerpt || content.slice(0, 100) + '...',
    tag,
    emoji,
    cover,
    content: content || excerpt || title,
    readTime,
    updatedAt: new Date().toISOString()
  };

  saveUserArticles(userArticles);
  closeArticleModal();
  renderArticles();
}

// 删除文章
function deleteArticle(articleId) {
  if (!confirm('确定要删除这篇文章吗？此操作不可撤销。')) return;
  
  const userArticles = loadUserArticles();
  const filtered = userArticles.filter(a => a.id !== articleId);
  saveUserArticles(filtered);
  
  closeArticleModal();
  renderArticles();
}

// 显示用户文章（用于文章详情页）
function getUserArticleById(id) {
  const userArticles = loadUserArticles();
  return userArticles.find(a => a.id === id);
}

