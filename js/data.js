// ===== 博客数据 =====
const BLOG_DATA = {
  site: {
    title: "六心居",
    subtitle: "记录思考，分享生活",
    description: "这里是我的个人博客，专注于技术、生活与思考的记录",
    author: "晨光",
    authorBio: "热爱编程与写作的独立开发者，专注于 Web 技术与产品思维。用代码构建世界，用文字表达自我。",
    email: "hello@blog.dev",
    github: "github.com/chenguang",
    skills: ["JavaScript", "React", "Vue", "Node.js", "Python", "UI/UX", "技术写作", "产品设计"]
  },
  tags: [
    { id: "all", name: "全部", color: "#3b5bdb" },
    { id: "stock", name: "股市", color: "#e8262a" },
    { id: "news", name: "新闻", color: "#1a56db" }
  ],
  articles: [
    {
      id: "07",
      title: "2026 年 A 股交易记录追踪",
      excerpt: "实时记录每日 A 股交易盈亏，包含可编辑数据表格与可视化图表分析，支持添加新数据行、修改历史数据，图表自动同步更新。",
      tag: "stock",
      date: "2026-05-18",
      readTime: "互动",
      emoji: "📈",
      cover: "linear-gradient(135deg, #e8262a, #ff6b35)",
      content: `__STOCK_WIDGET__`
    },
    {
      id: "08",
      title: "财联社 7×24 快讯",
      excerpt: "实时聚合财联社A股电报快讯，覆盖公司公告、市场动态、港美股资讯，7×24小时持续更新。",
      tag: "news",
      date: "2026-05-18",
      readTime: "实时",
      emoji: "📰",
      cover: "linear-gradient(135deg, #1a56db, #6366f1)",
      externalLink: "https://www.cls.cn/telegraph",
      content: `__NEWS_WIDGET__`
    }
  ]
};

// ===== 简易 Markdown 解析器 =====
function parseMarkdown(text) {
  // 转义 HTML 特殊字符（在代码块外）
  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let html = text;

  // 代码块（必须先处理，防止内部内容被其他规则处理）
  const codeBlocks = [];
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const idx = codeBlocks.length;
    const escapedCode = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    codeBlocks.push(`<pre><code class="language-${lang}">${escapedCode.trimEnd()}</code></pre>`);
    return `%%CODEBLOCK_${idx}%%`;
  });

  // 行内代码
  const inlineCodes = [];
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `%%INLINECODE_${idx}%%`;
  });

  // 水平分割线
  html = html.replace(/^(---|\*\*\*|___)\s*$/gm, '<hr>');

  // 标题
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 引用块
  html = html.replace(/(^> .+\n?)+/gm, (match) => {
    const content = match.replace(/^> /gm, '').trim();
    return `<blockquote>${content}</blockquote>`;
  });

  // 表格
  html = html.replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g, (match, header, body) => {
    const headers = header.split('|').filter(s => s.trim()).map(s => `<th>${s.trim()}</th>`).join('');
    const rows = body.trim().split('\n').map(row => {
      const cells = row.split('|').filter(s => s.trim()).map(s => `<td>${s.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
  });

  // 无序列表
  html = html.replace(/(^[-*+] .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      return `<li>${line.replace(/^[-*+] /, '')}</li>`;
    }).join('');
    return `<ul>${items}</ul>`;
  });

  // 有序列表
  html = html.replace(/(^\d+\. .+\n?)+/gm, (match) => {
    const items = match.trim().split('\n').map(line => {
      return `<li>${line.replace(/^\d+\. /, '')}</li>`;
    }).join('');
    return `<ol>${items}</ol>`;
  });

  // 段落（非标签行）
  const lines = html.split('\n');
  const processed = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === '' || line.startsWith('<') || line.startsWith('%%')) {
      processed.push(line);
    } else {
      processed.push(`<p>${line}</p>`);
    }
    i++;
  }
  html = processed.join('\n');

  // 粗体、斜体、链接、图片
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/!\[(.+?)\]\((.+?)\)/g, '<img src="$2" alt="$1">');
  html = html.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');

  // 还原代码块
  codeBlocks.forEach((block, idx) => {
    html = html.replace(`%%CODEBLOCK_${idx}%%`, block);
  });
  inlineCodes.forEach((code, idx) => {
    html = html.replace(`%%INLINECODE_${idx}%%`, code);
  });

  return html;
}

// ===== 工具函数 =====
function getTagName(tagId) {
  const tag = BLOG_DATA.tags.find(t => t.id === tagId);
  return tag ? tag.name : tagId;
}

function getTagColor(tagId) {
  const tag = BLOG_DATA.tags.find(t => t.id === tagId);
  return tag ? tag.color : '#888';
}

function getTagCount(tagId) {
  const userArticles = (typeof loadUserArticles === 'function') ? loadUserArticles() : [];
  const allArticles = [...BLOG_DATA.articles, ...userArticles];
  return allArticles.filter(a => a.tag === tagId).length;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()} 年 ${d.getMonth()+1} 月 ${d.getDate()} 日`;
}

function estimateReadTime(content) {
  const words = content.length;
  const minutes = Math.ceil(words / 300);
  return `${minutes} 分钟`;
}
