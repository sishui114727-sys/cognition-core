const CATEGORY = {
  read: '阅读与学习',
  expression: '表达与低风险',
  social: '社交与打扰控制',
  public: '公开资料',
  publish: '评价与发布',
  device: '设备与高风险',
};

function h(tag, cls, text) {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text !== undefined) el.textContent = text;
  return el;
}

function fmtWindow(w) {
  return w ? `${w.start}–${w.end}` : '不限';
}

function fmtLimit(n) {
  return n === null || n === undefined ? '—' : n === 0 ? '不限' : String(n);
}

function fmtCooldown(n) {
  return n === null || n === undefined ? '—' : n === 0 ? '无' : `${n} 分钟`;
}

function normalize(data) {
  if (data?.snapshot) return data.snapshot;
  if (data?.features) return data;
  return null;
}

/**
 * 快照里的 features 有两种形状：宿主 storage 写的是对象（键=功能名），
 * 示例文件写的是数组。以前只认数组，对象直接让 render 抛错、被 catch 吞掉，
 * 于是面板永远回落到示例数据——线上表现为"面板显示的是 10/28 的示例"。
 */
function featureList(features) {
  if (Array.isArray(features)) return features;
  if (features && typeof features === 'object') {
    return Object.entries(features).map(([key, value]) => ({ key, ...value }));
  }
  return [];
}

function card(feature) {
  const el = h('article', feature.enabled ? 'card' : 'card off');
  const head = h('div', 'card-head');
  head.append(h('h3', '', feature.label));
  const pill = h('span', feature.enabled ? 'pill on' : 'pill off', feature.enabled ? '已开启' : '已关闭');
  head.append(pill);
  el.append(head);
  el.append(h('p', 'desc', feature.description || ''));

  const metrics = h('div', 'metrics');
  const add = (label, value) => {
    const box = h('div', 'metric');
    box.append(h('span', '', label));
    box.append(h('strong', '', value));
    metrics.append(box);
  };

  if (feature.limited) {
    add('时间窗', fmtWindow(feature.window));
    add('冷却', fmtCooldown(feature.cooldownMin));
    add('每日上限', fmtLimit(feature.dailyLimit));
    add('每周上限', fmtLimit(feature.weeklyLimit));
  } else {
    add('时间窗', '不限');
    add('频率限制', '无');
    add('硬性等级', `L${feature.hardLevel}`);
    add('类型', feature.category || '—');
  }
  el.append(metrics);

  if (feature.enabled && feature.limited && feature.dailyLimit === 0 && feature.weeklyLimit === 0) {
    el.append(h('p', 'warn', '当前为不限次数；发布/评价类建议设置上限。'));
  }
  if (feature.enabled && feature.hardLevel > 2) {
    el.append(h('p', 'warn', `硬性等级 L${feature.hardLevel}，需要最高权限至少 L${feature.hardLevel} 才会实际放行。`));
  }
  return el;
}

/**
 * 记忆健康：只读统计，来自 snapshot.injectionStats（插件每次注入/未命中都会记账）。
 * 没有数据时整块不渲染，避免面板显示一堆 0 让人误以为坏了。
 * 布局用"一行一个指标"，因为长数字串塞进三列卡片会折行折得很难看。
 */
function memorySection(stats) {
  const section = h('section', 'group');
  section.append(h('h2', '', '记忆健康（注入遥测）'));
  const list = h('div', 'mem');

  const row = (label, value) => {
    const el = h('div', 'mem-row');
    el.append(h('span', '', label));
    el.append(h('strong', '', value));
    list.append(el);
  };

  const rounds = Number(stats.rounds) || 0;
  const injections = Number(stats.injections) || 0;
  const rate = rounds ? Math.round((injections / rounds) * 100) : 0;
  const misses = stats.misses ?? {};
  const byType = stats.byType ?? {};

  row('注入轮数', `${injections} / ${rounds} 轮（覆盖 ${rate}%）`);
  row('平均 token', `${stats.averageTokens ?? 0}（累计 ${stats.tokensEst ?? 0}）`);
  row('条目类型', `认知 ${byType.cognition ?? 0} · 事件 ${byType.event ?? 0}`);
  row('去重挡掉', `${stats.suppressedItems ?? 0} 条 · 重复命中 ${stats.repeatHits ?? 0} 轮`);
  row(
    '未命中',
    `低覆盖 ${misses.lowCoverage ?? 0} · 无匹配 ${misses.noMatch ?? 0}`
    + ` · 阈值 ${misses.belowThreshold ?? 0} · 去重 ${misses.deduped ?? 0}`
    + (misses.other ? ` · 其他 ${misses.other}` : ''),
  );
  row(
    '回复回声（代理）',
    `${stats.echoRounds ?? 0} / ${stats.echoChecks ?? 0} 次检查`
    + (stats.echoSkipped ? `（${stats.echoSkipped} 轮拿不到回复）` : ''),
  );
  if (Number(stats.injections) > 0 && Number(stats.echoChecks ?? 0) === 0) {
    row('提示', '回声检查一次都没跑成——先看"拿不到回复"的计数，这是链路问题，不是复现率低');
  }

  section.append(list);
  section.append(h(
    'p',
    'mem-note',
    '回声是代理指标：回复复现了注入词块，不等于真的用上了。旧触发未命中计 0 表示没有过期查询。',
  ));
  return section;
}

/**
 * 关系与约定：C/D 两类记忆的只读展示。
 * 没有内容时整块不渲染——面板一直空着比"什么都没有"更让人怀疑坏了。
 */
function termsSection(terms) {
  const relationships = Array.isArray(terms?.relationships) ? terms.relationships : [];
  const agreements = Array.isArray(terms?.agreements) ? terms.agreements : [];
  if (!relationships.length && !agreements.length) return null;

  const section = h('section', 'group');
  section.append(h('h2', '', '关系与约定'));

  const list = h('div', 'terms');
  const addGroup = (title, rows) => {
    if (!rows.length) return;
    list.append(h('div', 'terms-head', title));
    for (const row of rows) {
      const el = h('div', 'term');
      el.append(h('div', 'term-text', row.statement));
      const meta = [];
      if (row.role) meta.push(`角色 ${row.role}`);
      if (row.scenario) meta.push(`场景 ${row.scenario}`);
      if (row.expiresAt) meta.push(`到期 ${String(row.expiresAt).slice(0, 10)}`);
      meta.push(`证据 ${row.evidence ?? 0}`);
      if (row.status !== 'stable') meta.push(`状态 ${row.status}`);
      el.append(h('div', 'term-meta', meta.join(' · ')));
      list.append(el);
    }
  };

  addGroup(`关系（${relationships.length}）`, relationships);
  addGroup(`约定（${agreements.length}）`, agreements);
  section.append(list);
  section.append(h('p', 'mem-note', '关系和约定只按本轮话题是否相关参与注入，不做全局人设注入；已撤销的不显示。'));
  return section;
}

function render(snapshot, source = 'live') {
  document.querySelector('#level').textContent = snapshot.permissionLabel || `L${snapshot.permissionLevel}`;
  const descriptions = {
    0: '只读：不主动社交、不发布。',
    1: '低风险：表情、音乐、学习阅读。',
    2: '社交：私聊、群内接话，受时间窗和频率限制。',
    3: '公共表达：评论、空间、头像，默认关闭。',
    4: '高影响：视频、桌面，默认关闭。',
  };
  document.querySelector('#levelDesc').textContent = descriptions[snapshot.permissionLevel] || '';
  document.querySelector('#timezone').textContent = snapshot.timeZone || '—';
  document.querySelector('#enabled').textContent = snapshot.enabled === false ? '已关闭' : '运行中';
  document.querySelector('#updated').textContent = snapshot.updatedAt
    ? new Date(snapshot.updatedAt).toLocaleString()
    : '示例快照';

  const groups = document.querySelector('#groups');
  groups.replaceChildren();
  const stats = snapshot.injectionStats;
  if (stats && Number(stats.rounds) >= 0 && Number.isFinite(Number(stats.injections))) {
    groups.append(memorySection(stats));
  }
  const terms = termsSection(snapshot.terms);
  if (terms) groups.append(terms);
  const order = ['social', 'publish', 'public', 'expression', 'read', 'device'];
  const features = featureList(snapshot.features);
  for (const key of order) {
    const items = features.filter((f) => f.category === key);
    if (!items.length) continue;
    const section = h('section', 'group');
    section.append(h('h2', '', CATEGORY[key] || key));
    const grid = h('div', 'grid');
    for (const item of items) grid.append(card(item));
    section.append(grid);
    groups.append(section);
  }
  document.querySelector('#state').textContent = source === 'example' ? '示例数据（未接实时快照）' : '实时快照';
  if (source === 'example') {
    groups.prepend(h('p', 'warn', '当前显示的是打包内附的示例快照，不是运行中的真实配置。启用插件并产生一次会话后重新打开面板。'));
  }
}

async function load() {
  // 顺序有讲究：插件自己写到同目录的 live-snapshot.json 是唯一实时数据；
  // ../@data/storage.json 是这个宿主没有映射的路径（线上实测一直 404）；
  // 示例文件只能当兜底，并且必须在界面上说明"这是示例"，不能让人误当真数据。
  const candidates = [
    ['./live-snapshot.json', 'live'],
    ['../@data/storage.json', 'live'],
    ['./storage.example.json', 'example'],
  ];
  for (const [url, kind] of candidates) {
    let snapshot = null;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      snapshot = normalize(await res.json());
    } catch {
      // 读不到就换下一个源；但不能把 render 的错误也吞掉，否则会静默显示示例数据。
      continue;
    }
    if (snapshot) {
      try {
        render(snapshot, kind);
      } catch (error) {
        // 渲染失败必须看得见：之前错误被 catch 吞掉，页面静默显示示例数据，查了很久。
        document.querySelector('#state').textContent = '渲染失败';
        document.querySelector('#groups').prepend(h(
          'p',
          'warn',
          `快照已读到但渲染出错：${error && error.message ? error.message : error}`,
        ));
      }
      return;
    }
  }
  document.querySelector('#state').textContent = '无快照';
  document.querySelector('#groups').append(h('p', 'notice', '尚未接入运行快照。启用插件并保存设置后，这里会显示当前权限与限制。'));
}

load();
