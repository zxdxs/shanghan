/* ============================================================
   桂林古本《傷寒雜病論》讀書訓練站
   純靜態、零依賴、可離線；進度存 localStorage。
   資料由 scripts/build_reader_site.py 生成（window.SH）。
   ============================================================ */
(function () {
"use strict";

var SH = window.SH || {};
var $ = function (s, r) { return (r || document).querySelector(s); };
var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

/* ---------------- 小工具 ---------------- */
function el(tag, cls, txt) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt != null) e.textContent = txt;
  return e;
}
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
// 極簡行內標記：資料裡的 **粗體** → <b>，其餘一律轉義。
// 全站只認這一種標記，不做半套 markdown 解析器。
function mdInline(s) {
  return esc(s).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
}
// 在原文中標出模態詞（閱讀輔助）
// 只標「證據強度詞」。刻意排除「當」「為」「愈」等常用虛詞——全標等於沒標。
var MODS = ["主之", "可與", "不可", "不當", "難治", "不治", "宜", "屬", "死"];
function decorate(text) {
  var out = esc(text);
  MODS.forEach(function (m) {
    out = out.split(m).join('<mark class="hl">' + m + "</mark>");
  });
  return out;
}
function pct(a, b) { return b ? Math.round((a / b) * 100) : 0; }

/* ---------------- 進度（localStorage） ---------------- */
var KEY = "shanghan.reader.v1";
var STATE = load();
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
  catch (e) { return {}; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(STATE)); } catch (e) {}
}
function markRead(id) { STATE.read = STATE.read || {}; STATE.read[id] = 1; save(); }
function isRead(id) { return !!(STATE.read && STATE.read[id]); }
function markRecite(id) { STATE.rec = STATE.rec || {}; STATE.rec[id] = 1; save(); }
function logDrill(kind, ok) {
  STATE.log = STATE.log || [];
  STATE.log.push({ k: kind, ok: ok ? 1 : 0, t: Date.now() });
  if (STATE.log.length > 3000) STATE.log = STATE.log.slice(-3000);
  save();
}

/* ---------------- SVG 圖譜（零依賴） ---------------- */
function svgChart(spec) {
  var W = 680, out = [], h = 0;
  function box(x, y, w, hh, cls) {
    return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + hh + '" rx="8" class="' + cls + '"/>';
  }
  function txt(cx, cy, t, cls) {
    return '<text x="' + cx + '" y="' + cy + '" class="ch-t' + (cls ? " " + cls : "") +
      '" text-anchor="middle">' + esc(t) + "</text>";
  }
  if (spec.type === "pairs") {
    var rh = 44, pad = 8;
    h = spec.rows.length * rh + 6;
    var w1 = Math.min(230, W * 0.34);
    spec.rows.forEach(function (r, i) {
      var y = i * rh + 3, cols = r.length;
      out.push(box(0, y, w1, rh - pad, "ch-a"));
      out.push(txt(w1 / 2, y + (rh - pad) / 2 + 5, r[0], "on-brand"));
      var sw = (W - w1 - 24) / Math.max(cols - 1, 1);
      for (var j = 1; j < cols; j++) {
        var x = w1 + 24 + (j - 1) * sw;
        out.push('<line x1="' + w1 + '" y1="' + (y + (rh - pad) / 2) + '" x2="' + x +
          '" y2="' + (y + (rh - pad) / 2) + '" class="ch-line"/>');
        out.push(box(x, y, sw - 6, rh - pad, "ch-b"));
        out.push(txt(x + (sw - 6) / 2, y + (rh - pad) / 2 + 5, r[j], ""));
      }
    });
  } else if (spec.type === "chain") {
    var ih = 38, gap = 18;
    h = spec.items.length * (ih + gap) + 2;
    spec.items.forEach(function (t, i) {
      var y = i * (ih + gap) + 2;
      out.push(box(70, y, W - 140, ih, "ch-b"));
      out.push(txt(W / 2, y + ih / 2 + 5, t, ""));
      if (i < spec.items.length - 1) {
        var ay = y + ih, by = y + ih + gap;
        out.push('<line x1="' + (W / 2) + '" y1="' + ay + '" x2="' + (W / 2) + '" y2="' + (by - 5) + '" class="ch-line"/>');
        out.push('<path d="M' + (W / 2 - 5) + ' ' + (by - 7) + ' L' + (W / 2 + 5) + ' ' + (by - 7) +
          ' L' + (W / 2) + ' ' + by + ' Z" class="ch-arrow"/>');
      }
    });
  } else if (spec.type === "flow") {
    var shh = 62, sgap = 12, wLab = 116;
    spec.stages.forEach(function (st, i) {
      var y = h + 4;
      out.push(box(0, y, wLab, shh, "ch-a"));
      out.push(txt(wLab / 2, y + 24, st.s, "on-brand"));
      out.push(txt(wLab / 2, y + 44, st.d || "", ""));
      out.push(box(wLab + 10, y, W - wLab - 10, shh, "ch-b"));
      out.push(txt(wLab + 20 + (W - wLab - 30) / 2, y + 21, st.p || "", ""));
      out.push(txt(wLab + 20 + (W - wLab - 30) / 2, y + 41, st.x || "", ""));
      if (st.f) out.push(txt(W - 74, y + 21, "→ " + st.f, "on-brand"));
      h += shh + sgap;
      var g = (spec.gates || []).filter(function (x) { return x.after === i; });
      g.forEach(function (x) {
        out.push('<rect x="0" y="' + h + '" width="' + W + '" height="34" rx="6" class="ch-gate"/>');
        out.push('<text x="14" y="' + (h + 22) + '" class="ch-t gate">✂ 截斷窗口　' +
          esc(x.t) + "（【" + esc(x.src) + "】）</text>");
        h += 34 + sgap;
      });
      if (i < spec.stages.length - 1 && !g.length) {
        out.push('<line x1="58" y1="' + (h - sgap) + '" x2="58" y2="' + h + '" class="ch-line"/>');
        out.push('<path d="M53 ' + h + ' L63 ' + h + ' L58 ' + (h + 8) + ' Z" class="ch-arrow"/>');
      }
    });
  } else {
    var per = 3, bw = (W - 40) / per, bh = 36, rgap = 20;
    var rowsN = Math.ceil(spec.branches.length / per);
    h = 44 + 30 + rowsN * (bh + rgap);
    out.push(box(W / 2 - 160, 4, 320, 40, "ch-root"));
    out.push(txt(W / 2, 29, spec.root, "root"));
    spec.branches.forEach(function (b, i) {
      var rr = Math.floor(i / per), cc = i % per;
      var x = 20 + cc * bw, y = 74 + rr * (bh + rgap);
      out.push('<line x1="' + (W / 2) + '" y1="44" x2="' + (x + (bw - 20) / 2) +
        '" y2="' + y + '" class="ch-line faint"/>');
      out.push(box(x, y, bw - 20, bh, "ch-b"));
      out.push(txt(x + (bw - 20) / 2, y + bh / 2 + 5, b, ""));
    });
  }
  return '<svg viewBox="0 0 ' + W + " " + h + '" class="chart" role="img">' + out.join("") + "</svg>";
}

/* ---------------- 模組清單 ---------------- */
var MODULES = [
  { id: "prereq",  icon: "🧱", title: "準備",   desc: "讀之前要知道什麼；先備自測。" },
  { id: "idea",    icon: "🧭", title: "理念",   desc: "為什麼讀桂林古本；五步讀書法。" },
  { id: "text",    icon: "📖", title: "全書",   desc: "十六卷通讀；標出模態、六氣、信心。" },
  { id: "recite",  icon: "🗣", title: "記誦",   desc: "" + (SH.recite || []).length + " 條應背；抽背模式。" },
  { id: "method",  icon: "🧩", title: "方法",   desc: "條號、模態、以方統證、分歧地圖。" },
  { id: "graph",   icon: "🕸", title: "圖譜",   desc: "病因→發展→截斷→誤診→治癒。" },
  { id: "fang",    icon: "🧪", title: "方藥",   desc: (SH.recipes || []).length + " 方；組成與漢制換算。" },
  { id: "four",    icon: "⚖️", title: "四診",   desc: "切・聞・嗅・問・色。" },
  { id: "drills",  icon: "🎯", title: "題庫",   desc: (SH.drills || []).length + " 題；七型。" },
  { id: "mastery", icon: "📈", title: "自測",   desc: "掌握度定位。" },
  { id: "progress",icon: "🗂", title: "進度",   desc: "已讀與記誦紀錄。" },
  { id: "source",  icon: "📜", title: "出處",   desc: "底本、校勘、對齊信心、未決問題。" },
  { id: "contact", icon: "✉️", title: "聯絡",   desc: "指正與聯絡；識人訓練站。" },
  { id: "teacher", icon: "📖", title: "給教學者", desc: "課孫用法與紅線。" },
  { id: "disclaimer", icon: "⚠️", title: "聲明", desc: "使用限制與免責；非有師傳，不可自行使用。" }
];

/* ---------------- 共用片段 ---------------- */
function navBar() {
  var n = $("#nav");
  n.innerHTML = "";
  MODULES.forEach(function (m) {
    var a = el("a", "", m.icon + " " + m.title);
    a.href = "#/" + m.id;
    n.appendChild(a);
  });
}
function crumbs(title, sub) {
  var d = el("div");
  d.appendChild(el("h1", "", title));
  if (sub) d.appendChild(el("p", "muted", sub));
  return d;
}
function tiaoPills(t) {
  var d = el("div", "meta");
  (t.m || []).forEach(function (m) { d.appendChild(el("span", "pill b", m)); });
  (t.q || []).forEach(function (q) { d.appendChild(el("span", "pill", q)); });
  d.appendChild(el("span", "pill " + (t.cf === "high" ? "g" : "y"),
    t.cf === "high" ? "對齊 high" : "對齊 provisional"));
  if (t.pv === true) d.appendChild(el("span", "pill g", "頁碼已證"));
  if (t.dc) d.appendChild(el("span", "pill r", "分歧 " + t.dc));
  return d;
}
function tiaoBlock(t, opts) {
  opts = opts || {};
  var w = el("div", "tiao");
  var head = el("div");
  head.innerHTML = '<span class="no">【' + esc(t.id) + "】</span>" +
    '<span class="muted small">' + esc(t.c || "") + "</span>";
  w.appendChild(head);
  w.appendChild(el("div", "orig")).innerHTML = decorate(t.t);
  w.appendChild(tiaoPills(t));
  var r = el("div", "row");
  (t.r || []).forEach(function (rid) {
    var rec = (SH.recipes || []).filter(function (x) { return x.id === rid; })[0];
    if (rec) {
      var a = el("a", "pill", "方・" + rec.n);
      a.href = "#/fang?q=" + encodeURIComponent(rec.n);
      r.appendChild(a);
    }
  });
  if (opts.progress !== false) {
    var b = el("button", "btn ghost small", isRead(t.id) ? "✓ 已讀" : "標為已讀");
    b.onclick = function () { markRead(t.id); b.textContent = "✓ 已讀"; };
    r.appendChild(b);
  }
  if (r.childNodes.length) { r.style.marginTop = "8px"; w.appendChild(r); }
  return w;
}

/* ============================================================
   視圖
   ============================================================ */
var VIEWS = {};


/* ---------- 準備性知識 ---------- */
VIEWS.prereq = function (box) {
  var Q = SH.prereq;
  if (!Q) { box.appendChild(el("p", "muted", "尚無準備性知識資料，請先執行 scripts/build_prereq.py。")); return; }
  box.appendChild(crumbs("準備性知識", Q.lead));
  var c0 = el("div", "card");
  c0.innerHTML = "<h3>⚠ 起點不是卷第一</h3><p>" + esc(Q.start.warn) + "</p>" +
    "<table><tr><th>時間</th><th>做什麼</th><th>為什麼</th></tr>" +
    Q.start.plan.map(function (p) {
      return "<tr><td>" + esc(p.step) + "</td><td>" + esc(p.do) + "</td><td class='small muted'>" +
        esc(p.why) + "</td></tr>";
    }).join("") + "</table><p class='small muted'>" + esc(Q.start.note) + "</p>";
  box.appendChild(c0);

  Q.cats.forEach(function (c) {
    var d = el("div", "card");
    d.innerHTML = "<h3>" + esc(c.name) + "</h3><p class='small muted'>" + esc(c.why) + "</p>" +
      "<table><tr><th>要知道</th><th>內容</th><th>出處</th></tr>" +
      c.items.map(function (it) {
        return "<tr><td><b>" + esc(it.k) + "</b></td><td>" + esc(it.v) +
          "</td><td class='small'>" + esc(it.src) + "</td></tr>";
      }).join("") + "</table>";
    box.appendChild(d);
  });

  var cq = el("div", "card");
  cq.innerHTML = "<h3>先備自測（" + Q.quiz.length + " 題）</h3>" +
    "<p class='small muted'>先自己想，再點「看答案」。答不出來的，回上面對應的段落補。</p>";
  Q.quiz.forEach(function (q, i) {
    var box2 = el("div", "tiao");
    var head = el("div");
    head.innerHTML = "<span class='no'>" + (i + 1) + ".</span>" + esc(q.q);
    var ans = el("div", "small");
    ans.style.display = "none";
    ans.innerHTML = "<b>答</b>：" + esc(q.a) + "　<span class='muted'>→ " +
      esc(q.to) + "（" + esc(q.src) + "）</span>";
    var b = el("button", "btn ghost small", "看答案");
    b.onclick = function () {
      var on = ans.style.display !== "none";
      ans.style.display = on ? "none" : "block";
      b.textContent = on ? "看答案" : "收起";
    };
    box2.appendChild(head); box2.appendChild(b); box2.appendChild(ans);
    cq.appendChild(box2);
  });
  box.appendChild(cq);

  var G = SH.glossary;
  if (G) {
    var g1 = el("div", "card");
    g1.innerHTML = "<h3>六、破音字（讀錯即誤義）</h3>" +
      "<p class='small muted'>" + esc(G.caveat) + "</p>" +
      "<table><tr><th>字</th><th>讀音</th><th>何時這樣讀</th><th>例</th></tr>" +
      G.polyphone.map(function (x) {
        return x.readings.map(function (r, i) {
          return "<tr><td>" + (i === 0 ? "<b>" + esc(x.c) + "</b>" : "") + "</td><td>" +
            esc(r.p) + "</td><td>" + esc(r.when) + "</td><td class='small'>" + esc(r.src) + "</td></tr>";
        }).join("");
      }).join("") + "</table>";
    box.appendChild(g1);

    var g2 = el("div", "card");
    g2.innerHTML = "<h3>七、難詞（" + G.terms.length + "）</h3>" +
      "<table><tr><th>詞</th><th>音</th><th>義</th><th>出處</th></tr>" +
      G.terms.map(function (x) {
        return "<tr><td><b>" + esc(x.t) + "</b></td><td>" + esc(x.p) + "</td><td>" +
          esc(x.def) + "</td><td class='small'>" + esc(x.src) + "</td></tr>";
      }).join("") + "</table>";
    box.appendChild(g2);

    var g3 = el("div", "card");
    g3.innerHTML = "<h3>八、六氣辨異（最容易混的五對）</h3>" +
      svgChart({ type: "pairs", title: "六氣所傷：脈與所傷之處",
        rows: G.sixqi.map(function (x) { return [x.qi, x.pulse, x.where]; }) }) +
      G.sixqiDiff.map(function (d) {
        return "<div class='tiao'><div><span class='no'>" + esc(d.pair) + "</span>" +
          "<span class='pill'>" + esc(d.src) + "</span></div>" +
          "<div class='orig'>" + esc(d.rule) + "</div>" +
          "<div class='small muted'>" + d.note + "</div></div>";
      }).join("");
    box.appendChild(g3);

    var g4 = el("div", "card");
    var noted = G.chars.filter(function (c) { return c.note; });
    var rest = G.chars.filter(function (c) { return !c.note; });
    g4.innerHTML = "<h3>九、難字表（" + G.chars.length + " 字；已注 " + noted.length +
      "，其餘為藥名或可自上下文推知）</h3>" +
      "<table><tr><th>字</th><th>音</th><th>次數</th><th>類</th><th>釋義</th><th>首見</th></tr>" +
      noted.map(function (c) {
        return "<tr><td><b>" + esc(c.c) + "</b></td><td>" + esc(c.p) + "</td><td class='num'>" +
          c.n + "</td><td>" + (c.herb ? "藥名" : "—") + "</td><td>" + esc(c.note) +
          "</td><td class='small'>【" + esc(c.first) + "】</td></tr>";
      }).join("") + "</table>" +
      "<details><summary class='small muted'>展開其餘 " + rest.length +
      " 字（藥名用字與未注者，僅列音）</summary><p class='small'>" +
      rest.map(function (c) { return c.c + "(" + c.p + ")×" + c.n; }).join("　") +
      "</p></details>";
    box.appendChild(g4);
  }
};

/* ---------- 理念 ---------- */
VIEWS.idea = function (box) {
  box.appendChild(crumbs("為什麼讀桂林古本",
    "這一頁講清楚：這本書是什麼、為什麼值得通讀、以及用什麼方法讀。"));
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>一、它不是宋本《傷寒論》</h3>" +
    "<p>桂林古本是十六卷<b>傷寒雜病一體</b>的本子：傷寒與雜病不分家，" +
    "卷三先立理論綱（六氣主客、傷寒例、雜病例），卷四至五依<b>六氣立篇</b>（溫、暑、熱、濕、燥、風、寒），" +
    "卷六至十一才是六經辨證，卷十二至十六為雜病。<b>在宋本系統裡，傷寒與雜病是兩本書。</b></p>" +
    "<p>文獻學上，桂林古本可視為偽書，但具旁證價值。本訓練站的處理是<b>分級</b>，不是二值判斷。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>二、通讀的價值：以方統證</h3>" +
    "<p>同一首方在十六卷中反覆出現，每次都是一個不同的方證。" +
    "實測：小柴胡湯跨 9 卷出現 10 次。這種<b>跨卷重出</b>正是「傷寒雜病一體」的直接證據，" +
    "也是通讀比選讀更有收穫的原因。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>三、五步讀書法</h3>" +
    "<p>每一條讀過去，固定問五個問題：</p>" + svgChart({
      type: "chain", title: "五步",
      items: ["① 認位：這一條在十六卷的哪裡？",
              "② 辨體：這是什麼體例？（問曰／師曰／方後注／可與不可）",
              "③ 識力：模態詞是什麼？（主之／宜／可與／不可）→ 證據強度",
              "④ 通方：這一條掛哪些方？組成與劑量如何？",
              "⑤ 存疑：有沒有異文？對齊信心如何？"]
    });
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>四、本站怎麼用</h3>" +
    "<ul><li><b>全書</b>：通讀。可按卷、篇、模態、六氣篩選；讀完按「標為已讀」。</li>" +
    "<li><b>記誦</b>：抽背。先看原文，按「遮住」自問，想不起來再翻。</li>" +
    "<li><b>方法</b>：把上面五步展開成可操作的規矩。</li>" +
    "<li><b>題庫</b>：七型題（位・力・方・量・脈・禁・文）驗收。</li>" +
    "<li><b>進度</b>：全部存在本機，不上傳。</li></ul>";
};

/* ---------- 全書 ---------- */
VIEWS.text = function (box) {
  var st = { v: "", c: "", m: "", q: "" };
  box.appendChild(crumbs("全書通讀",
    "十六卷 " + SH.tiao.length + " 條。原文中的 <mark class='hl'>黃色</mark> 是模態詞——它們代表證據強度，不是修辭。"));
  var tip = el("div", "card");
  tip.innerHTML = "⚠ 本頁從<b>卷第一〈平脈法〉</b>開始，那是全書最抽象的一卷。" +
    "如果你是初讀，或覺得接不住，<b>請先去「🧱 準備」頁</b>——先備自測答不出，就還不到讀脈法的時候。";
  box.appendChild(tip);
  var bar = el("div", "card");
  var r1 = el("div", "row");
  var selV = el("select");
  selV.appendChild(new Option("全部卷", ""));
  SH.juan.forEach(function (j) {
    selV.appendChild(new Option(j.label + "（" + j.n + " 條）", String(j.no)));
  });
  var selC = el("select");
  var selM = el("select");
  selM.appendChild(new Option("全部模態", ""));
  ["主之", "宜", "可與", "不可", "屬"].forEach(function (m) { selM.appendChild(new Option(m, m)); });
  var selQ = el("select");
  selQ.appendChild(new Option("全部六氣", ""));
  ["風", "寒", "暑", "濕", "燥", "火"].forEach(function (q) { selQ.appendChild(new Option(q, q)); });
  var cnt = el("span", "muted small");
  r1.appendChild(selV); r1.appendChild(selC); r1.appendChild(selM); r1.appendChild(selQ); r1.appendChild(cnt);
  bar.appendChild(r1);
  box.appendChild(bar);
  var list = el("div");
  box.appendChild(list);

  function fillChaps() {
    selC.innerHTML = "";
    selC.appendChild(new Option("全部篇", ""));
    var j = SH.juan.filter(function (x) { return String(x.no) === selV.value; })[0];
    (j ? j.chaps : []).forEach(function (c) { selC.appendChild(new Option(c.name, c.name)); });
  }
  var PAGE = 40, shown = 0, rows = [];
  function render() {
    rows = SH.tiao.filter(function (t) {
      if (st.v && String(t.v) !== st.v) return false;
      if (st.c && t.c !== st.c) return false;
      if (st.m && (t.m || []).indexOf(st.m) < 0) return false;
      if (st.q && (t.q || []).indexOf(st.q) < 0) return false;
      return true;
    });
    shown = Math.min(PAGE, rows.length);
    paint();
  }
  function paint() {
    cnt.textContent = "共 " + rows.length + " 條（顯示 " + shown + "）";
    list.innerHTML = "";
    rows.slice(0, shown).forEach(function (t) { list.appendChild(tiaoBlock(t)); });
    if (shown < rows.length) {
      var b = el("button", "btn ghost", "載入更多（還有 " + (rows.length - shown) + " 條）");
      b.onclick = function () { shown = Math.min(shown + PAGE, rows.length); paint(); };
      var w = el("div", "row"); w.style.margin = "16px 0"; w.appendChild(b);
      list.appendChild(w);
    }
  }
  selV.onchange = function () { st.v = selV.value; fillChaps(); render(); };
  selC.onchange = function () { st.c = selC.value; render(); };
  selM.onchange = function () { st.m = selM.value; render(); };
  selQ.onchange = function () { st.q = selQ.value; render(); };
  fillChaps(); render();
};

/* ---------- 記誦 ---------- */
VIEWS.recite = function (box) {
  box.appendChild(crumbs("記誦", "共 " + SH.recite.length + " 條。先自己背，再按「顯示原文」對帳。"));
  var done = SH.recite.filter(function (x) { return STATE.rec && STATE.rec[x.id]; }).length;
  var c = el("div", "card");
  c.innerHTML = "<div class='row'><b>已記誦 " + done + " / " + SH.recite.length + "</b></div>" +
    "<div class='bar' style='margin-top:8px'><i style='width:" + pct(done, SH.recite.length) + "%'></i></div>";
  box.appendChild(c);
  var pick = el("div", "card");
  pick.innerHTML = "<h3>抽背</h3>";
  var q = el("div", "orig", "按下方按鈕抽一條。");
  var ans = el("div");
  var b1 = el("button", "btn", "抽一條");
  var b2 = el("button", "btn ghost", "顯示原文");
  var b3 = el("button", "btn ghost", "記住了 ✓");
  var cur = null;
  b2.disabled = b3.disabled = true;
  b1.onclick = function () {
    cur = SH.recite[Math.floor(Math.random() * SH.recite.length)];
    q.textContent = "【" + cur.id + "】" + cur.why + "　（請先默背）";
    ans.innerHTML = "";
    b2.disabled = b3.disabled = false;
  };
  b2.onclick = function () {
    ans.innerHTML = "";
    var o = el("div", "orig"); o.innerHTML = decorate(cur.t);
    ans.appendChild(o);
    ans.appendChild(el("div", "src", "【" + cur.id + "】" + cur.why));
  };
  b3.onclick = function () { markRecite(cur.id); b3.textContent = "已記錄 ✓"; };
  var r = el("div", "row"); r.appendChild(b1); r.appendChild(b2); r.appendChild(b3);
  pick.appendChild(q); pick.appendChild(r); pick.appendChild(ans);
  box.appendChild(pick);

  var list = el("div", "card");
  list.innerHTML = "<h3>全部記誦條目</h3>";
  SH.recite.forEach(function (x, i) {
    var d = el("div", "tiao");
    d.innerHTML = "<div><span class='no'>" + (i + 1) + ".</span>" +
      "<span class='muted small'>" + esc(x.why) + "</span> " +
      "<span class='pill'>【" + esc(x.id) + "】</span></div>" +
      "<div class='orig'>" + decorate(x.t) + "</div>";
    list.appendChild(d);
  });
  box.appendChild(list);
};

/* ---------- 方法 ---------- */
VIEWS.method = function (box) {
  box.appendChild(crumbs("方法", "把五步讀書法展開成可操作的規矩。"));
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>一、條號系統</h3><p>底本以<span class='hl'>【卷.條】</span>編號：<code>【3.16】</code>＝卷三第十六條，每卷重新編號。" +
    "本站直接沿用，不自創。經底本附錄四〈條文編號對照表〉驗證，逐卷條文數完全相符（合計 964 條）。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>二、模態詞＝證據強度</h3>" +
    "<p>這是本書最容易被讀漏的一層。同一個意思，仲景用不同的詞，強度不同：</p>" +
    "<table><tr><th>模態</th><th>意思</th><th>讀法</th></tr>" +
    "<tr><td><mark class='hl'>主之</mark></td><td>首選方（強）</td><td>這是本證的正治</td></tr>" +
    "<tr><td><mark class='hl'>宜</mark></td><td>建議（中）</td><td>可從，但非唯一</td></tr>" +
    "<tr><td><mark class='hl'>可與</mark></td><td>或然（弱）</td><td>可以給，不是必須</td></tr>" +
    "<tr><td><mark class='hl'>屬</mark></td><td>歸類</td><td>指向某類方／某類證</td></tr>" +
    "<tr><td><mark class='hl'>不可</mark></td><td>禁令</td><td><b>最不可違</b>；誤用代價最高</td></tr></table>" +
    "<p class='small muted'>把「宜」讀成「主之」，是把或然讀成必然——這是通讀最常見的失真。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>三、以方統證</h3><p>不要只按六經讀，也要<b>按方讀</b>：把同一首方在全書出現的每一處並排看，" +
    "就得到它的方證全貌。用「方藥」頁或題庫的「方」型題練。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>四、分歧地圖：讀到「異文」時怎麼辦</h3>" +
    "<p>底本附錄另有 " + SH.variants.length + " 條校勘記，記載白雲閣本、會通本、廣西本、宋本等的異文。" +
    "讀到可疑處，先查「出處」頁的分歧清單。<b>不要自行改字</b>——異文是版本學材料，不是錯字。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>五、五步與產物</h3>" + svgChart({
      type: "pairs", title: "每一步要產出什麼",
      rows: [["① 認位", "卷・篇・條號"], ["② 辨體", "問曰／師曰／方後注／可與不可"],
             ["③ 識力", "模態詞（證據強度）"], ["④ 通方", "方名・組成・劑量"],
             ["⑤ 存疑", "異文・對齊信心"]]
    });
};


/* ---------- 圖譜（病因 → 發展 → 截斷 → 誤診 → 治癒） ---------- */
VIEWS.graph = function (box) {
  var K = SH.kg;
  if (!K) { box.appendChild(el("p", "muted", "尚無圖譜資料，請先執行 scripts/build_kg.py。")); return; }
  box.appendChild(crumbs("知識圖譜",
    "病因 → 發展 → 截斷 → 誤診 → 治癒。每個節點與邊都有條文依據，不引入後世理論作一級框架。"));

  /* 一、病因 */
  var c1 = el("div", "card");
  c1.innerHTML = "<h3>一、病因（卷三・雜病例【3.77】「千般疢難，不越三條」）</h3>" +
    svgChart({ type: "tree", title: "病因三分", root: "病因",
      branches: K.causes.items.map(function (x) { return x.name; }) }) +
    "<table><tr><th>病因</th><th>原文</th><th>傳變</th></tr>" +
    K.causes.items.map(function (x) {
      return "<tr><td><b>" + esc(x.name) + "</b></td><td class='small'>" + esc(x.quote) +
        "</td><td class='small'>" + esc(x.note) + "</td></tr>";
    }).join("") + "</table>";
  box.appendChild(c1);

  /* 二、外感六經傳變 */
  var p0 = K.paths[0];
  var c2 = el("div", "card");
  c2.innerHTML = "<h3>二、外感：六經傳變（" + esc(p0.src) + "）</h3>" +
    "<p class='small muted'>先看圖：每一格是一個經，右側是該經的治法；綠帶是<b>截斷窗口</b>。</p>" +
    svgChart({ type: "flow", title: p0.name,
      stages: p0.stages.map(function (s) {
        var f = s.tx.split("；")[0];
        if (f.length > 9) f = f.slice(0, 9) + "…";
        return { s: s.stage, d: s.day, p: s.pulse, x: s.signs, f: f };
      }),
      gates: [{ after: 2, t: p0.gates[0].rule, src: p0.gates[0].src },
              { after: 5, t: p0.gates[1].rule, src: p0.gates[1].src }] }) +
    "<table><tr><th>日</th><th>經</th><th>脈</th><th>證</th><th>治</th></tr>" +
    p0.stages.map(function (s) {
      return "<tr><td>" + esc(s.day) + "</td><td><b>" + esc(s.stage) + "</b></td><td class='small'>" +
        esc(s.pulse) + "</td><td class='small'>" + esc(s.signs) + "</td><td class='small'>" +
        esc(s.tx) + "</td></tr>";
    }).join("") + "</table>" +
    "<p class='small'><b>傳經正法</b>：" + esc(K.bianzheng.ben) + "</p>" +
    "<p class='small' style='color:#9c3b3b'><b>變病</b>：" + esc(K.bianzheng.bian.slice(0, 90)) + "…</p>";
  box.appendChild(c2);

  /* 向愈時間軸 */
  var c3 = el("div", "card");
  c3.innerHTML = "<h3>三、向愈時間軸（【3.29】）</h3>" +
    "<p class='small muted'>同一部書給了兩條時間軸：前面是<b>受病</b>（1–7 日），這裡是<b>病衰</b>（7–12 日）。" +
    "兩條對照著讀，才知道「傳到第幾日、該往哪走」。</p>" +
    svgChart({ type: "pairs", title: "七日以後，依次病衰",
      rows: p0.recovery.map(function (r) { return [r.day, r.stage, r.effect]; }) });
  box.appendChild(c3);

  /* 四、內傷 */
  var p1 = K.paths[1];
  var c4 = el("div", "card");
  c4.innerHTML = "<h3>四、內傷：臟腑相傳與四組發展結構</h3>" +
    "<p class='small'>雜病篇多為<b>並列</b>而非傳變，但仍有四組明確的發展關係。先看總綱：</p>" +
    svgChart({ type: "chain", title: "臟腑相傳與截斷（【3.76】）",
      items: ["肝病", "知其所傳：肝 → 脾", "截斷：當先實脾（不是先治肝）", "四季脾旺不受邪，即勿補之"] }) +
    "<p class='small'><b>原則</b>：" + esc(p1.principle) + "</p>" +
    "<p class='small muted'><b>反面</b>：" + esc(p1.contrast) + "</p>" +
    (K.innerPaths || []).map(function (ip) {
      var h = "<h4>" + esc(ip.name) + "　<span class='pill'>" + esc(ip.src) + "</span></h4>" +
        "<p class='small muted'>" + esc(ip.note) + "</p>";
      if (ip.id === "kesou") {
        h += svgChart({ type: "pairs", title: "臟咳不已 → 流於所合之腑",
          rows: ip.stages.map(function (x) { return [x.from, "→ " + x.to, x.signs]; }) });
      } else {
        h += "<table><tr><th>從</th><th>證</th><th>至</th><th>出處</th></tr>" +
          ip.stages.map(function (x) {
            return "<tr><td>" + esc(x.from) + "</td><td class='small'>" + esc(x.signs) +
              "</td><td class='small'>" + esc(x.to) + "</td><td>【" + esc(x.src) + "】</td></tr>";
          }).join("") + "</table>";
      }
      (ip.positions || []).forEach(function (x) {
        h += "<div class='small'>· <b>四飲・" + esc(x.name) + "</b>：" + esc(x.where) + "（【" + esc(x.src) + "】）</div>";
      });
      if (ip.organs) {
        h += "<div class='small'>· <b>水在五臟</b>：" + ip.organs.map(function (x) {
          return esc(x.o) + "—" + esc(x.s);
        }).join("；") + "</div>";
      }
      (ip.cuts || []).forEach(function (x) {
        h += "<div class='small' style='color:#2f6b4f'>✂ <b>截斷</b>：" + esc(x.rule) + "（【" + esc(x.src) + "】）</div>";
      });
      return h;
    }).join("");
  box.appendChild(c4);

  /* 五、伏氣 */
  var c5 = el("div", "card");
  c5.innerHTML = "<h3>五、第三種發病模式：伏氣（" + esc(K.latent.src) + "）</h3>" +
    "<p class='small'>" + esc(K.latent.note) + "</p>" +
    "<table><tr><th>種類</th><th>何時發</th></tr>" +
    K.latent.kinds.map(function (k) {
      return "<tr><td>" + esc(k.name) + "</td><td>" + esc(k.when) + "</td></tr>";
    }).join("") + "</table>" +
    "<div class='orig'>" + esc(K.latent.warn) + "</div>" +
    "<p class='small muted'>這一條是原文<b>自己點名誤診根源</b>：把「傳經化熱」與「伏氣變溫」當成同一件事。</p>";
  box.appendChild(c5);

  /* 五之二、誤診鏈 */
  var c5b = el("div", "card");
  c5b.innerHTML = "<h3>六、誤診鏈：誤認 → 誤治 → 變證 → 更正</h3>" +
    "<p class='small'><b>誤治是「做錯」，誤診是「認錯」</b>——前者多半源於後者。" +
    "本書把認錯的地方直接寫出來，這是它最像教科書的一面。</p>" +
    svgChart({ type: "chain", title: "誤診的一般鏈條",
      items: ["① 認錯（謂病不盡／認為一體／不曉相傳）", "② 由此處置（複下之／為治乃誤）",
              "③ 變證（其痞益甚／榮衛內陷）", "④ 更正（此非結熱／根本異源）"] }) +
    "<table><tr><th>類型</th><th>條號</th><th>認成什麼</th><th>實際是什麼</th><th>用哪一診認對</th></tr>" +
    (K.diagnosisErrors || []).map(function (d) {
      var r = d.resolve || {};
      return "<tr><td>" + esc(d.kind) + "</td><td>【" + esc(d.tiao) + "】</td><td class='small'>" +
        esc(d.misread) + "</td><td class='small'>" + esc(d.truth) + "</td><td class='small'><b>" +
        esc(r.zhen || "—") + "</b>：" + esc(r.how || "") + "</td></tr>";
    }).join("") + "</table>" +
    "<p class='small muted'>統計：八條之中，<b>七條只要問診就能避免</b>（另兩條需兼用切診，一條需望切合參）。" +
    "誤診的代價通常不是「不會治」，是「沒問清楚」。</p>" +
    "<h4>逐條說明</h4>" +
    (K.diagnosisErrors || []).map(function (d) {
      return "<div class='tiao'><div><span class='pill b'>" + esc(d.kind) +
        "</span><span class='pill'>【" + esc(d.tiao) + "】</span></div>" +
        "<div class='small'>" + d.note + "</div></div>";
    }).join("");
  box.appendChild(c5b);

  /* 六、誤診 → 救逆 */
  var c6 = el("div", "card");
  var dist = K.errorDist || {};
  c6.innerHTML = "<h3>七、誤診 → 壞病 → 救逆（" + K.errors.length + " 則載有救逆）</h3>" +
    svgChart({ type: "pairs", title: "誤行分佈",
      rows: Object.keys(dist).sort(function (a, b) { return dist[b] - dist[a]; })
        .map(function (k) { return [k, dist[k] + " 條"]; }) }) +
    "<table><tr><th>條號</th><th>誤行</th><th>觸發</th><th>救逆</th></tr>" +
    K.errors.map(function (e) {
      return "<tr><td>【" + esc(e.tiao) + "】</td><td>" + esc(e.wrong.join("、")) + "</td><td class='small'>" +
        esc(e.trigger) + "</td><td class='small'>" + esc(e.rescue.join("、") || "—") + "</td></tr>";
    }).join("") + "</table>";
  box.appendChild(c6);

  /* 七、截斷通則 */
  var c7 = el("div", "card");
  c7.innerHTML = "<h3>八、截斷通則（" + K.cutRules.length + " 條）</h3>" +
    "<p class='small muted'>「截斷」不是一個方，是一組<b>順序與界線</b>的規矩：什麼時候該先做什麼、什麼時候該什麼都不做。</p>" +
    K.cutRules.map(function (r) {
      return "<div class='tiao'><div><span class='no'>" + esc(r.name) +
        "</span><span class='pill'>【" + esc(r.src) + "】</span></div>" +
        "<div class='orig'>" + decorate(r.text) + "</div>" +
        "<div class='small muted'>" + esc(r.note) + "</div></div>";
    }).join("");
  box.appendChild(c7);

  /* 八、轉歸 */
  var c8 = el("div", "card");
  var O = K.outcome || {};
  c8.innerHTML = "<h3>九、轉歸分佈</h3>" +
    svgChart({ type: "pairs", title: "全書轉歸語彙",
      rows: Object.keys(O).map(function (k) { return [k, O[k] + " 條"]; }) }) +
    "<p class='small'><b>欲解時／解以時辰</b></p>" +
    (K.jieShi || []).map(function (x) {
      return "<div class='small'>【" + esc(x.tiao) + "】" + esc(x.text) + "</div>";
    }).join("");
  box.appendChild(c8);
};

/* ---------- 方藥 ---------- */
VIEWS.fang = function (box, params) {
  var q0 = params && params.q ? decodeURIComponent(params.q) : "";
  box.appendChild(crumbs("方藥", SH.recipes.length + " 方。三層並列：原文組成 → 漢制換算 → 今日常用量。"));
  var MM = SH.modernMeta;
  if (MM) {
    var warn = el("div", "card");
    warn.innerHTML = "<h3>⚠ 三層劑量，不要混用</h3><p class='small'>" + esc(MM.warning) + "</p>" +
      "<table><tr><th>立場</th><th>依據</th><th>一兩</th><th>桂枝湯之桂枝</th><th>用於</th></tr>" +
      MM.conversion.positions.map(function (p) {
        return "<tr><td><b>" + esc(p.name) + "</b></td><td class='small'>" + esc(p.basis) +
          "</td><td>" + esc(p.per_liang) + "</td><td>" + esc(p.example) +
          "</td><td class='small'>" + esc(p.used_by) + "</td></tr>";
      }).join("") + "</table>" +
      "<p class='small' style='color:#9c3b3b'><b>" + esc(MM.conversion.key.replace(/\*\*/g, "")) + "</b></p>" +
      "<p class='small muted'>" + esc(MM.conversion.research_note) + "　依據：" + esc(MM.basis) + "</p>" +
      "<p class='small' style='background:#fbeaea;border:1px solid #e8c9c9;border-radius:8px;padding:8px 10px;color:#8a2f2f'><b>⚠ " +
      esc((SH.disclaimer || {}).core || "") + "</b>　本頁含劑量，僅供理解古方形制；" +
      "用藥須由執業中醫師處方與監測。</p>";
    box.appendChild(warn);
  }
  var bar = el("div", "card");
  var r = el("div", "row");
  var inp = el("input"); inp.type = "text"; inp.placeholder = "搜方名、藥味、條文…"; inp.value = q0;
  inp.style.minWidth = "240px";
  var cnt = el("span", "muted small");
  r.appendChild(inp); r.appendChild(cnt);
  bar.appendChild(r); box.appendChild(bar);
  var list = el("div"); box.appendChild(list);
  function render() {
    var q = inp.value.trim();
    var rows = SH.recipes.filter(function (x) {
      if (!q) return true;
      return (x.n + x.t + x.ind + x.comp.join("")).indexOf(q) >= 0;
    });
    cnt.textContent = "共 " + rows.length + " 方";
    list.innerHTML = "";
    rows.slice(0, 60).forEach(function (x) {
      var c = el("div", "card");
      var md = SH.modernDose || {};
      var modernLine = (x.gr || []).map(function (g) {
        var m = md[g.h];
        return m ? (g.h + " " + m.m) : null;
      }).filter(Boolean);
      var notes = (x.gr || []).map(function (g) {
        var m = md[g.h];
        return (m && m.note) ? (g.h + "：" + m.note) : null;
      }).filter(Boolean);
      c.innerHTML = "<h3 style='margin:0'>" + esc(x.n) + " <span class='pill'>【" + esc(x.t) +
        "】</span> <span class='muted small'>" + esc(x.c) + "</span></h3>" +
        "<p class='small'><b>① 原文組成</b>：" + esc(x.comp.join("、")) + "</p>" +
        "<p class='small'><b>② 漢制換算</b>：" + esc((x.gr || []).filter(function (g) {
          return typeof g.g === "number";
        }).map(function (g) { return g.h + g.g.toFixed(1) + "g"; }).join("、") || "（部分未換算）") +
        "　<span class='muted'>（依底本附錄一，漢制實測）</span></p>" +
        "<p class='small'><b>③ 今常用</b>：" + esc(modernLine.join("、") || "（未收錄）") +
        "　<span class='muted'>（現代參考，非原文）</span></p>" +
        (notes.length ? "<p class='small' style='color:#a8721c'><b>用藥注意</b>：" +
          esc(notes.join("；")) + "</p>" : "") +
        (x.prep ? "<p class='small'><b>煎服</b>：" + esc(x.prep) + "</p>" : "") +
        "<p class='small muted'>" + esc(x.ind) + "</p>";
      list.appendChild(c);
    });
  }
  inp.oninput = render; render();
};

/* ---------- 四診 ---------- */
VIEWS.four = function (box) {
  box.appendChild(crumbs("四診", "切・聞・嗅・問・色。素材取自卷一卷二〈平脈法〉與全書條文。"));
  var tabs = el("div", "row");
  var body = el("div");
  var T = [
    ["切", function () {
      var h = el("div");
      h.appendChild(el("div", "card")).innerHTML = "<h3>分部</h3><table><tr><th>項</th><th>原文</th></tr>" +
        SH.pulse.sections.map(function (s) {
          return "<tr><td>" + esc(s.k) + "</td><td>" + esc(s.v) + "</td></tr>";
        }).join("") + "</table>";
      h.appendChild(el("div", "card")).innerHTML = "<h3>五臟平脈（基線）</h3><table>" +
        "<tr><th>臟</th><th>配屬</th><th>平脈</th></tr>" +
        SH.pulse.organ.map(function (o) {
          return "<tr><td>" + esc(o.臟) + "</td><td>" + esc(o.配屬) + "</td><td>" + esc(o.平脈) + "</td></tr>";
        }).join("") + "</table>";
      h.appendChild(el("div", "card")).innerHTML = "<h3>六氣之脈</h3><table><tr><th>氣</th><th>脈</th></tr>" +
        SH.pulse.sixqi.map(function (s) { return "<tr><td>" + esc(s.氣) + "</td><td>" + esc(s.脈) + "</td></tr>"; }).join("") +
        "</table><p class='small'><b>陰陽總綱</b>：陽脈 " + esc(SH.pulse.yinyang.yang) +
        "；陰脈 " + esc(SH.pulse.yinyang.yin) + "。</p>";
      h.appendChild(el("div", "card")).innerHTML = "<h3>脈象詞典（" + SH.pulse.dict.length + "）</h3>" +
        "<table><tr><th>脈</th><th>義</th><th>條文</th></tr>" +
        SH.pulse.dict.map(function (d) {
          return "<tr><td><b>" + esc(d.name) + "</b></td><td>" + esc(d.mean) + "</td><td class='small'>" +
            esc(d.ev && d.ev[0] ? d.ev[0].head : "—") + "</td></tr>";
        }).join("") + "</table>";
      return h;
    }],
    ["聞", function () {
      var h = el("div", "card");
      h.innerHTML = "<h3>聽（聲與言）</h3><table><tr><th>項</th><th>原文</th></tr>" +
        SH.listen.map(function (x) {
          return "<tr><td>" + esc(x.項) + "</td><td>" + esc(x.原文) + "</td></tr>";
        }).join("") + "</table>";
      return h;
    }],
    ["嗅", function () {
      var h = el("div");
      var c = el("div", "card");
      c.innerHTML = "<h3>嗅（氣味）</h3><table><tr><th>項</th><th>原文</th><th>級</th></tr>" +
        SH.smell.map(function (x) {
          return "<tr><td>" + esc(x.項) + "</td><td>" + esc(x.原文) + "</td><td>" +
            esc((x.教學註 || "").charAt(0)) + "</td></tr>";
        }).join("") + "</table>";
      h.appendChild(c);
      if (SH.smellScope && SH.smellScope.position) {
        var s = el("div", "card");
        s.innerHTML = "<h3>定位（重要）</h3><p><b>" + esc(SH.smellScope.position) + "</b></p>" +
          "<p class='small'>誰能看：" + esc(SH.smellScope["誰能看"]) +
          "｜對誰看：" + esc(SH.smellScope["對誰看"]) +
          "｜為了什麼：" + esc(SH.smellScope["為了什麼"]) + "</p>" +
          "<p class='small muted'>" + esc(SH.smellScope["說明"]) + "</p>";
        h.appendChild(s);
      }
      return h;
    }],
    ["問", function () {
      var h = el("div", "card");
      h.innerHTML = "<h3>問診八類</h3>" + svgChart({
        type: "tree", title: "傷寒論所問", root: "問診（八類）",
        branches: SH.ask.map(function (x) { return x.項; }).filter(function (x) { return x.indexOf("問曰") < 0; })
      }) + "<table><tr><th>項</th><th>內容</th></tr>" +
        SH.ask.map(function (x) { return "<tr><td>" + esc(x.項) + "</td><td>" + esc(x.內容 || x.v) + "</td></tr>"; }).join("") +
        "</table>";
      return h;
    }],
    ["色", function () {
      var h = el("div", "card");
      h.innerHTML = "<h3>色診（與《望診遵經》對照）</h3>" + svgChart({
        type: "pairs", title: "五色 × 五臟",
        rows: [["肝", "青"], ["心", "赤"], ["脾", "黃"], ["肺", "白"], ["腎", "黑"]]
      }) + "<table><tr><th>項</th><th>原文</th></tr>" +
        SH.color.map(function (x) { return "<tr><td>" + esc(x.項) + "</td><td>" + esc(x.原文) + "</td></tr>"; }).join("") +
        "</table>";
      return h;
    }]
  ];
  T.forEach(function (t, i) {
    var b = el("button", "btn" + (i ? " ghost" : ""), t[0] + "診");
    b.onclick = function () {
      $$("button", tabs).forEach(function (x) { x.className = "btn ghost"; });
      b.className = "btn";
      body.innerHTML = ""; body.appendChild(t[1]());
    };
    tabs.appendChild(b);
  });
  box.appendChild(tabs); box.appendChild(body);
  body.appendChild(T[0][1]());
};

/* ---------- 題庫 ---------- */
VIEWS.drills = function (box, params) {
  var kinds = ["位", "力", "方", "量", "脈", "禁", "文"];
  var label = { 位: "定位（卷篇）", 力: "模態（證據強度）", 方: "方證配對", 量: "劑量換算",
                脈: "脈象辨識", 禁: "禁忌判斷", 文: "異文辨讀" };
  var cur = { kind: (params && params.k) || "", i: 0, right: 0, total: 0, q: null, answered: false };
  box.appendChild(crumbs("題庫", "七型共 " + SH.drills.length + " 題。答錯會記下，於「自測」檢視弱項。"));
  var bar = el("div", "card");
  var r = el("div", "row");
  var sel = el("select");
  sel.appendChild(new Option("全部題型", ""));
  kinds.forEach(function (k) {
    var n = SH.drills.filter(function (d) { return d.k === k; }).length;
    sel.appendChild(new Option(label[k] + "（" + n + "）", k));
  });
  var stat = el("span", "muted small");
  r.appendChild(sel); r.appendChild(stat);
  bar.appendChild(r); box.appendChild(bar);

  var panel = el("div", "card"); box.appendChild(panel);

  function pool() {
    return SH.drills.filter(function (d) { return !cur.kind || d.k === cur.kind; });
  }
  function next() {
    var p = pool();
    if (!p.length) { panel.innerHTML = "<p>此型無題。</p>"; return; }
    cur.q = p[Math.floor(Math.random() * p.length)];
    cur.answered = false; cur.i++; cur.total++;
    panel.innerHTML = "";
    var kr = el("div", "row");
    kr.appendChild(el("span", "pill b", label[cur.q.k]));
    kr.appendChild(el("span", "muted small", "第 " + cur.i + " 題　答對 " + cur.right + "/" + (cur.total - 1)));
    panel.appendChild(kr);
    panel.appendChild(el("div", "q", cur.q.q));
    var opts = el("div");
    cur.q.o.forEach(function (o) {
      var b = el("button", "opt", o);
      b.onclick = function () {
        if (cur.answered) return;
        cur.answered = true;
        var ok = o === cur.q.a;
        if (ok) { cur.right++; b.className = "opt right"; } else { b.className = "opt wrong"; }
        $$("button", opts).forEach(function (x) {
          if (x.textContent === cur.q.a) x.className = "opt right";
          x.disabled = true;
        });
        logDrill(cur.q.k, ok);
        var s = el("div", "card small");
        s.innerHTML = "<b>" + (ok ? "對 ✓" : "錯 ✗") + "</b>　" + esc(cur.q.s);
        panel.appendChild(s);
        var nb = el("button", "btn", "下一題");
        nb.onclick = next;
        panel.appendChild(nb);
      };
      opts.appendChild(b);
    });
    panel.appendChild(opts);
    stat.textContent = "累計 " + cur.total + " 題，答對率 " + pct(cur.right, Math.max(cur.total - (cur.answered ? 0 : 1), 1)) + "%";
  }
  sel.onchange = function () { cur.kind = sel.value; cur.i = 0; cur.right = 0; cur.total = 0; next(); };
  next();
};

/* ---------- 自測 ---------- */
VIEWS.mastery = function (box) {
  box.appendChild(crumbs("自測", "依答題紀錄推算各型掌握度。"));
  var log = STATE.log || [];
  var by = {};
  log.forEach(function (x) { by[x.k] = by[x.k] || { n: 0, ok: 0 }; by[x.k].n++; by[x.k].ok += x.ok; });
  var label = { 位: "定位", 力: "模態", 方: "方證", 量: "劑量", 脈: "脈象", 禁: "禁忌", 文: "異文" };
  var c = el("div", "card");
  var html = "<table><tr><th>題型</th><th>作答</th><th>答對</th><th>掌握度</th></tr>";
  ["位", "力", "方", "量", "脈", "禁", "文"].forEach(function (k) {
    var b = by[k] || { n: 0, ok: 0 };
    var p = pct(b.ok, b.n);
    html += "<tr><td>" + label[k] + "</td><td class='num'>" + b.n + "</td><td class='num'>" +
      b.ok + "</td><td>" + (b.n ? p + "%" : "未測") + "</td></tr>";
  });
  html += "</table>";
  var read = Object.keys(STATE.read || {}).length;
  var rec = Object.keys(STATE.rec || {}).length;
  html += "<p><b>通讀</b>：已讀 " + read + " / " + SH.tiao.length + " 條（" + pct(read, SH.tiao.length) + "%）</p>" +
    "<div class='bar'><i style='width:" + pct(read, SH.tiao.length) + "%'></i></div>" +
    "<p style='margin-top:12px'><b>記誦</b>：已記 " + rec + " / " + SH.recite.length + " 條（" +
    pct(rec, SH.recite.length) + "%）</p>" +
    "<div class='bar'><i style='width:" + pct(rec, SH.recite.length) + "%'></i></div>" +
    "<p class='small muted' style='margin-top:12px'>掌握度低於 60% 的題型，建議回「方法」頁重讀對應章節。</p>";
  c.innerHTML = html;
  box.appendChild(c);
};

/* ---------- 進度 ---------- */
VIEWS.progress = function (box) {
  box.appendChild(crumbs("進度", "全部存在本機（localStorage），不上傳、不同步。"));
  var read = STATE.read || {}, rec = STATE.rec || {}, log = STATE.log || [];
  var c = el("div", "card");
  c.innerHTML = "<h3>總覽</h3><table>" +
    "<tr><th>項目</th><th>數量</th></tr>" +
    "<tr><td>已讀條文</td><td class='num'>" + Object.keys(read).length + " / " + SH.tiao.length + "</td></tr>" +
    "<tr><td>已記誦</td><td class='num'>" + Object.keys(rec).length + " / " + SH.recite.length + "</td></tr>" +
    "<tr><td>答題紀錄</td><td class='num'>" + log.length + " 筆</td></tr>" +
    "</table>";
  box.appendChild(c);
  var byVol = {};
  SH.tiao.forEach(function (t) { if (read[t.id]) byVol[t.v] = (byVol[t.v] || 0) + 1; });
  var c2 = el("div", "card");
  var html = "<h3>分卷通讀</h3><table><tr><th>卷</th><th>已讀 / 總</th><th></th></tr>";
  SH.juan.forEach(function (j) {
    var n = byVol[j.no] || 0;
    html += "<tr><td>" + esc(j.label) + "</td><td class='num'>" + n + " / " + j.n + "</td><td>" +
      "<div class='bar'><i style='width:" + pct(n, j.n) + "%'></i></div></td></tr>";
  });
  html += "</table>";
  c2.innerHTML = html;
  box.appendChild(c2);
  var c3 = el("div", "card");
  var b = el("button", "btn ghost", "清除全部進度");
  b.onclick = function () {
    if (confirm("確定清除本機所有閱讀與答題紀錄？")) {
      STATE.read = {}; STATE.rec = {}; STATE.log = []; save(); route();
    }
  };
  c3.appendChild(el("h3", "", "重置"));
  c3.appendChild(b);
  box.appendChild(c3);
};

/* ---------- 出處 ---------- */
VIEWS.source = function (box) {
  var m = SH.meta;
  box.appendChild(crumbs("出處與信心", "這一頁講清楚：資料從哪來、哪些可信、哪些還不確定。"));
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>底本</h3><p>" + esc(m.bendi) + "</p>" +
    "<p class='small muted'>另以殆知閣電子本（簡體）作外部交叉校驗。</p>" +
    "<p class='small'>文獻定性：桂林古本文獻學上可視為偽書，但具旁證價值" +
    "（李青偉等，《安徽中醫藥大學學報》2020, 39(2)）。本站採<b>分級</b>處理，非二值判斷。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>規模</h3><table>" +
    "<tr><th>項目</th><th>數量</th></tr>" +
    "<tr><td>條號（邊欄編號）</td><td class='num'>964（逐卷與底本附錄四相符）</td></tr>" +
    "<tr><td>條文</td><td class='num'>" + m.stats.tiao + "</td></tr>" +
    "<tr><td>對齊信心 high</td><td class='num'>" + m.stats.tiao_high + "</td></tr>" +
    "<tr><td>頁碼獨立驗證為真</td><td class='num'>" + m.stats.page_verified + "</td></tr>" +
    "<tr><td>方劑實例</td><td class='num'>" + m.stats.recipes + "</td></tr>" +
    "<tr><td>校勘異文</td><td class='num'>" + m.stats.variants + "</td></tr>" +
    "</table>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>⚠ 已知限制</h3><ul>" +
    "<li><b>條號↔條文綁定部分未定</b>：約三成條文為 <code>provisional</code>（其所在卷的區塊數與條號數不符）。" +
    "可讀、可統計，但<b>引用條號前須回查原文</b>。</li>" +
    "<li><b>頁碼驗證只及於含方之條</b>：以底本〈湯方索引〉頁碼獨立驗證方→條綁定，吻合 95.2%；" +
    "但不含方的條文（多為脈法、禁忌、預後）無從施力。</li>" +
    "<li><b>繁簡回轉污染</b>：底本係簡→繁一鍵轉換產物，實測 9 類、184 處同音污染" +
    "（複→復、髒→臟、餘→余、雲→云…）。本站原文<b>保留原樣</b>，未回改，以存版本資訊。</li>" +
    "<li><b>劑量換算</b>：依底本附錄一（據 1981 年漢代「權」推算）。「分」之時代歧義（漢制约 4g vs 明清 0.3g）已標註。</li>" +
    "</ul>";
  var stop = el("div", "card");
  stop.innerHTML = "<h3>讀到這裡要停下來（三類）</h3>" +
    "<p>讀書訓練的重點不是讀得快，是知道<b>哪裡不能順順讀過去</b>。以下三類，本站已替你標出。</p>" +
    "<h4>① 校勘異文（" + (SH.variants || []).length + " 條）</h4>" +
    "<p class='small'>底本與白雲閣本、會通本、廣西本、宋本等不同。異文是<b>版本學材料，不是錯字</b>——不要自行改字。</p>" +
    "<table><tr><th>條號</th><th>底本</th><th>他本</th><th>類型</th></tr>" +
    (SH.variants || []).filter(function (x) { return x.variants && x.variants[0] && x.variants[0].variant; })
      .slice(0, 24).map(function (x) {
        var w = x.variants[0];
        return "<tr><td>【" + esc(x.tiao) + "】</td><td>" + esc(x.lemma) + "</td><td>" +
          esc(w.variant) + "（" + esc((w.witness || []).join("、")) + "）</td><td class='small'>" +
          esc(x.type) + "</td></tr>";
      }).join("") + "</table>" +
    "<h4>② 方頭與條文所稱不一致（" + (SH.nameOrder || []).length + " 處）</h4>" +
    "<p class='small'>同一首方，條文中的稱呼與方頭題名可能不同。成因有四種，須逐處判讀：<b>字序不同</b>（厚朴生薑半夏甘草人參湯／厚朴甘草生薑半夏人參湯）、<b>字詞誤轉</b>（詳下）、<b>條文截斷</b>、<b>一條多方</b>（條文先後提到數方，方頭依序排列）。</p>" +
    "<table><tr><th>條號</th><th>條文作</th><th>方頭作</th></tr>" +
    (SH.nameOrder || []).slice(0, 16).map(function (x) {
      return "<tr><td>【" + esc(x.t) + "】</td><td>" + esc(x.tiao) + "</td><td>" + esc(x.fang) + "</td></tr>";
    }).join("") + "</table>" +
    "<h4>③ 繁簡回轉污染</h4>" +
    "<p class='small'>底本係簡→繁一鍵轉換產物，常見同音／形近污染：複→復、髒→臟、餘→余、雲→云、曆→歷、幹→干、鬥→斗。" +
    "另發現一類<b>新誤轉：湯→東</b>（如「大青龍<b>東</b>加附子湯」「小青龍<b>東</b>加石膏」），共 " +
    ((SH.charIssues || []).length) + " 處。本站原文<b>保留原樣</b>，以存版本資訊。</p>" +
    ((SH.charIssues || []).length ? "<table><tr><th>條號</th><th>原文節錄</th></tr>" +
      SH.charIssues.map(function (x) {
        return "<tr><td>【" + esc(x.t) + "】</td><td class='small'>" + esc(x.text) + "</td></tr>";
      }).join("") + "</table>" : "") +
    "<p class='small muted'>註：「東方肝脈」等<b>正確用法不在誤轉之列</b>；本表的判準是「湯」被寫成「東」的構詞位置（如「青龍東加」「五物東加」）。</p>";
  box.appendChild(stop);
  if ((SH.quoteCheck || []).length) {
    var q = el("div", "card");
    q.innerHTML = "<h3>外部引文比對（與通行本系統）</h3>" +
      "<p class='small muted'>以郭生白《生命本能系統論》所引通行本條文比對，僅為<b>差異候選</b>，須以宋本確認。</p>" +
      "<table><tr><th>相似度</th><th>桂本條號</th><th>郭引</th></tr>" +
      SH.quoteCheck.slice(0, 10).map(function (r) {
        return "<tr><td class='num'>" + r.similarity + "</td><td>【" + esc(r.best_tiao) + "】</td><td class='small'>" +
          esc(r.quote.slice(0, 46)) + "…</td></tr>";
      }).join("") + "</table>";
    box.appendChild(q);
  }
  var cc = el("div", "card");
  var R = SH.recipes || [];
  var noComp = R.filter(function (r) { return !(r.comp || []).length; }).length;
  var noPrep = R.filter(function (r) { return !(r.prep || "").trim(); }).length;
  cc.innerHTML = "<h3>發現問題？</h3>" +
    "<p class='small'>本站最大的不確定處是<b>條號與原文的對應</b>——" +
    m.stats.tiao + " 條條文中有 " + (m.stats.tiao - m.stats.tiao_high) + " 條為 provisional。" +
    "另有 " + (SH.variants || []).length + " 條異文、" +
    noComp + " 方未抽到組成、" + noPrep + " 方未抽到煎服法。" +
    "看到不對的地方，請到 <a href='#/contact'>✉️ 聯絡</a> 頁告訴我；" +
    "原文異文我一律兩處並存，不代改一字。</p>";
  box.appendChild(cc);
};

/* ---------- 聯絡 ---------- */
VIEWS.contact = function (box) {
  var C = SH.contact;
  if (!C) { box.appendChild(el("p", "muted", "尚無聯絡資料。")); return; }
  box.appendChild(crumbs(C.title || "指正與聯絡", ""));

  var lead = el("div", "card lead");
  lead.innerHTML = "<p>" + mdInline(C.lead || "") + "</p>";
  box.appendChild(lead);

  if ((C.want || []).length) {
    var w = el("div", "card");
    w.innerHTML = "<h3>最需要人幫忙的四件事</h3>" +
      "<p class='small muted'>前三項是機械抽取的邊界，回報一處就少一處；" +
      "第一項是本站最大的不確定處。</p>" +
      (C.want || []).map(function (x) {
        return "<h4 class='want-k'>" + esc(x.k) + "</h4>" +
          "<p class='small'>" + mdInline(x.d) + "</p>";
      }).join("");
    box.appendChild(w);
  }

  var it = el("div", "card");
  it.appendChild(el("h3", "", "怎麼聯絡"));
  (C.items || []).forEach(function (x) {
    var row = el("div", "contact-row");
    var left = el("div", "contact-txt");
    left.appendChild(el("h4", "", x.k + (x.note ? "（" + x.note + "）" : "")));
    var d = el("p", "small"); d.innerHTML = mdInline(x.d); left.appendChild(d);
    if (x.mail) {
      var a = el("a", "mail", x.mailText || x.mail);
      a.href = "mailto:" + x.mail;
      left.appendChild(a);
    }
    row.appendChild(left);
    if (x.qr) {
      var wrap = el("div", "qr");
      var im = el("img");
      im.setAttribute("src", x.qr);
      im.setAttribute("alt", x.qrAlt || "二維碼");
      im.setAttribute("loading", "lazy");
      im.setAttribute("width", "180");
      im.setAttribute("height", "298");
      wrap.appendChild(im);
      wrap.appendChild(el("p", "tiny muted", x.qrAlt || ""));
      row.appendChild(wrap);
    }
    it.appendChild(row);
  });
  box.appendChild(it);

  var st = el("div", "card");
  st.appendChild(el("h3", "", "相關站點"));
  (C.sites || []).forEach(function (s) {
    var d = el("div", "site");
    var a = el("a", "site-a", s.k + " ↗");
    a.href = s.url;
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
    d.appendChild(a);
    var p = el("p", "small"); p.innerHTML = mdInline(s.d); d.appendChild(p);
    d.appendChild(el("p", "tiny muted", s.url));
    st.appendChild(d);
  });
  box.appendChild(st);

  var cl = el("div", "card");
  cl.innerHTML = "<p class='small'>" + mdInline(C.close || "") + "</p>" +
    "<p class='muted small' style='text-align:right'>⚠ " + esc(C.seal || "") + "</p>";
  box.appendChild(cl);
};

/* ---------- 給教學者 ---------- */
VIEWS.teacher = function (box) {
  box.appendChild(crumbs("給教學者（課孫用法）", "分齡、次序、紅線。"));
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>一、次序</h3>" + svgChart({
      type: "chain", title: "建議次序（第 0 步不可省）",
      items: ["① 「準備」：先備知識＋自測——答不出就先補，不要跳過",
              "② 「理念」：講清楚這是什麼書、為什麼值得讀",
              "③ 「記誦」：只背六經提綱 6 條（最短、最具體）",
              "④ 「全書」：從卷六〈太陽病上〉開始，不從卷第一開始",
              "⑤ 「題庫」：只做「位」與「力」兩型",
              "⑥ 「圖譜」「方藥」「四診」：進入結構與具體內容",
              "⑦ 「平脈法」留到最後：有了具體經驗再讀抽象"]
    }) +
    "<p class='small muted'>⚠ 原本本站把「全書」排在最前，但全書頁起點是卷第一〈平脈法〉——" +
    "那是全書最抽象的一卷。<b>次序已修正。</b></p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>二、分齡與先備條件</h3>" +
    "<p class='small'>分齡的依據不是年齡，是<b>先備知識到了沒有</b>。" +
    "每一階都先問「他具備上一階的先備了嗎」，而不是「他幾歲」。</p>" +
    "<table><tr><th>階段</th><th>先備（必須已具備）</th><th>做什麼</th><th>不做什麼</th></tr>" +
    "<tr><td>小學低年</td><td>能聽讀、能複述</td><td>聽讀原文（不求解）；只認「主之／不可」兩個詞</td>" +
    "<td>不背方劑、不講脈、不做題</td></tr>" +
    "<tr><td>小學高年</td><td>能背短句；知道「六經」是六個名稱</td>" +
    "<td>記誦六經提綱 6 條；做「位」型題（定位卷篇）</td><td>不碰劑量換算、不碰脈象</td></tr>" +
    "<tr><td>國中以上</td><td><b>「準備」頁自測 8 題能答對 6 題以上</b></td>" +
    "<td>全書通讀；七型題全開；四診可分診練</td><td>不作臨床推斷</td></tr></table>" +
    "<p class='small'><b>國中以上那一階的先備是硬的</b>：答不出「表裡」「脈浮」「六經提綱」" +
    "就去讀全書，只會變成背名詞。先回「準備」頁。</p>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>三、紅線（沿用識人訓練站）</h3><ul>" +
    "<li><b>不教相術</b>：面相、手相、骨相一律不碰。</li>" +
    "<li><b>不作人身判讀</b>：讀醫書是<b>病理求真</b>，不是評價人。</li>" +
    "<li><b>預後≠命定</b>：平脈法中的「生／死／難治」是<b>診治斷言</b>——" +
    "說「難治」是為了換思路，說「死」是為了及早轉手；與《冰鑑》那類「以貌定貴賤」是兩回事。" +
    "教的時候要把<b>觀察層</b>（如蟹腹＝潤澤、如枳實＝枯暗）與<b>判斷層</b>分開講。</li>" +
    "<li><b>不做臨床應用</b>：本站是讀書訓練，不是診療工具。</li></ul>";
  box.appendChild(el("div", "card")).innerHTML =
    "<h3>四、每天十五分鐘的用法</h3><p>通讀 5 條（按「標為已讀」）→ 抽背 1 條 → 做 5 題。" +
    "一週約 35 條、7 條記誦、35 題。全書 943 條約需 27 週。進度會自動記在本機。</p>";
};


/* ---------- 使用限制與免責聲明 ---------- */
VIEWS.disclaimer = function (box) {
  var D = SH.disclaimer;
  if (!D) { box.appendChild(el("p", "muted", "尚無聲明資料。")); return; }
  box.appendChild(crumbs("使用限制與免責聲明", "這一頁是本站最重要的一段文字。"));
  var c0 = el("div", "card");
  c0.style.borderTop = "6px solid var(--brand)";
  c0.innerHTML = "<h2 style='border:0;padding:0;color:var(--brand);text-align:center;margin:.2em 0'>⚠ "
    + esc(D.core) + "</h2><p>" + mdInline(D.lead) + "</p>";
  box.appendChild(c0);

  var c1 = el("div", "card");
  c1.innerHTML = "<h3>一、為什麼要有這句話</h3>" + D.why.map(function (w) {
    return "<h4 style='margin:.9em 0 .2em'>" + esc(w.t) + "</h4><p class='small'>" + esc(w.d) + "</p>";
  }).join("");
  box.appendChild(c1);

  var c2 = el("div", "card");
  c2.innerHTML = "<h3>二、本站不是什麼</h3><ul>" + D.not.map(function (x) {
    return "<li>" + esc(x) + "</li>";
  }).join("") + "</ul>";
  box.appendChild(c2);

  var c3 = el("div", "card");
  c3.innerHTML = "<h3>三、誰可以用、怎麼用</h3>" +
    "<table><tr><th>身分</th><th>可以</th><th>不可以</th></tr>" +
    D.who.map(function (w) {
      return "<tr><td><b>" + esc(w.who) + "</b></td><td>" + esc(w.can) +
        "</td><td style='color:#9c3b3b'>" + esc(w.cannot) + "</td></tr>";
    }).join("") + "</table>";
  box.appendChild(c3);

  var c4 = el("div", "card");
  c4.innerHTML = "<h3>四、藥與劑量的特別聲明</h3><ul>" + D.drug.map(function (x) {
    return "<li>" + mdInline(x) + "</li>";
  }).join("") + "</ul>";
  box.appendChild(c4);

  var c5 = el("div", "card");
  c5.innerHTML = "<h3>五、來源與版權</h3><ul>" + D.source.map(function (x) {
    return "<li>" + mdInline(x) + "</li>";
  }).join("") + "</ul>";
  box.appendChild(c5);

  var c6 = el("div", "card");
  c6.innerHTML = "<h3>六、無擔保</h3><p class='small'>" + esc(D.no_warranty) + "</p>" +
    "<p class='muted small' style='text-align:right'>" + esc(D.seal) + "</p>";
  box.appendChild(c6);

  var c7 = el("div", "card");
  var b = el("button", "btn ghost", "重新顯示進入確認");
  b.onclick = function () { STATE.ack = false; save(); gateShow(); };
  c7.appendChild(el("h3", "", "重新確認"));
  c7.appendChild(b);
  box.appendChild(c7);
};

/* ---------- 首次進入確認閘 ---------- */
function gateShow() {
  if (STATE.ack) return;
  var D = SH.disclaimer || {};
  var old = document.querySelector(".gate");
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var g = el("div", "gate");
  var b = el("div", "gate-box");
  b.innerHTML =
    "<div class='gate-mark'>⚠</div>" +
    "<h2>" + esc(D.core || "非有師傳，不可自行使用") + "</h2>" +
    "<p class='core-lead'>" + esc(D.lead || "") + "</p>" +
    "<ul>" + (D.why || []).slice(0, 3).map(function (w) {
      return "<li><b>" + esc(w.t) + "</b>：" + esc(w.d.slice(0, 46)) + "…</li>";
    }).join("") + "</ul>" +
    "<p class='small muted'>完整說明見「⚠️ 聲明」頁。本站按「現狀」提供，不保證正確完整；" +
    "使用所生之一切後果由使用者自負。</p>";
  var act = el("div", "gate-act");
  var ok = el("button", "btn", "我已閱讀並理解，承諾非有師傳不自行使用");
  ok.onclick = function () { STATE.ack = true; save(); if (g.parentNode) g.parentNode.removeChild(g); };
  var more = el("a", "small muted", "先看完整聲明 →");
  more.href = "#/disclaimer";
  act.appendChild(ok); act.appendChild(more);
  b.appendChild(act);
  g.appendChild(b);
  document.body.appendChild(g);
}

/* ---------------- 啟動 ---------------- */
function params() {
  var h = location.hash || "";
  var i = h.indexOf("?");
  if (i < 0) return {};
  var o = {};
  h.slice(i + 1).split("&").forEach(function (kv) {
    var p = kv.split("="); if (p[0]) o[p[0]] = p[1] || "";
  });
  return o;
}
function route() {
  var h = (location.hash || "#/idea").replace(/^#\//, "").split("?")[0];
  var v = VIEWS[h] || VIEWS.idea;
  $$("#nav a").forEach(function (a) {
    a.className = a.getAttribute("href") === "#/" + h ? "on" : "";
  });
  var box = $("#view");
  box.innerHTML = "";
  // 常駐使用限制條：每次換頁重建（route 會清空 #view，插在啟動時只會出現一次）
  var D = SH.disclaimer || {};
  if (D.core && h !== "disclaimer") {
    box.appendChild(el("div", "limitbar",
      "⚠ " + D.core + "　——　本站為讀書訓練工具，非診療工具；用藥須由執業中醫師決定"));
  }
  v(box, params());
  window.scrollTo(0, 0);
}

navBar();
window.addEventListener("hashchange", route);
if (!location.hash) location.hash = "#/idea";
route();
$("#footNote").textContent = (SH.meta && SH.meta.warn) || "";

// 頁腳常駐連結：聯絡 + 相關站點（資料來自 contact.json，不手寫）
(function footLinks() {
  var fl = $("#footLinks");
  if (!fl) return;
  var C = SH.contact || {};
  function link(txt, href, blank) {
    var a = el("a", "", txt);
    a.href = href;
    if (blank) {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer");
    }
    fl.appendChild(a);
  }
  link("✉️ 指正與聯絡", "#/contact", false);
  (C.items || []).forEach(function (x) {
    if (x.mail) link(x.mailText || x.mail, "mailto:" + x.mail, false);
  });
  (C.sites || []).forEach(function (s) { link(s.k + " ↗", s.url, true); });
})();

gateShow();

// 測試鉤子：供 scripts/site_check.js 逐視圖檢查（不影響瀏覽器行為）
window.__DSH_VIEWS = VIEWS;
window.__DSH_MODULES = MODULES;
})();
