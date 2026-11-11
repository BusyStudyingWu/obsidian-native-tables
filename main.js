"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => NativeTables
});
module.exports = __toCommonJS(main_exports);
var import_commands = require("@codemirror/commands");
var import_obsidian2 = require("obsidian");
var import_state = require("@codemirror/state");
var import_view = require("@codemirror/view");

// src/model.ts
var key = (r, c) => `${r}:${c}`;
var rect = (a, b) => ({ r: Math.min(a.r, b.r), c: Math.min(a.c, b.c), er: Math.max(a.r, b.r), ec: Math.max(a.c, b.c) });
function split(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const out = [];
  let value = "", ticks = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && i + 1 < s.length) {
      value += ch + s[++i];
      continue;
    }
    if (ch === "`") {
      let n = 1;
      while (s[i + 1] === "`") {
        n++;
        i++;
      }
      ticks = ticks === n ? 0 : ticks === 0 ? n : ticks;
      value += "`".repeat(n);
      continue;
    }
    if (ch === "|" && !ticks) {
      out.push(value.trim());
      value = "";
    } else value += ch;
  }
  out.push(value.trim());
  return out;
}
function fresh(cells) {
  return { version: 1, id: globalThis.crypto.randomUUID(), rows: cells.length, cols: cells[0].length, merges: [], styles: {}, widths: [], heights: [] };
}
function scan(text) {
  const lines = text.split("\n"), offsets = [];
  let n = 0;
  for (const l of lines) {
    offsets.push(n);
    n += l.length + 1;
  }
  const tables = [];
  const start = lines[0] === "---" ? Math.max(0, lines.findIndex((l, i) => i > 0 && (l === "---" || l === "...")) + 1) : 0;
  for (let i = start, fence = ""; i < lines.length - 1; i++) {
    const f = lines[i].match(/^\s{0,3}(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1][0];
      else if (f[1][0] === fence) fence = "";
      continue;
    }
    if (fence || /^\s/.test(lines[i]) || !lines[i].includes("|")) continue;
    const sep = split(lines[i + 1]);
    if (!sep.length || !sep.every((v) => /^:?-{3,}:?$/.test(v))) continue;
    const head = split(lines[i]);
    if (head.length !== sep.length) continue;
    const cells = [head];
    let j = i + 2;
    while (j < lines.length && lines[j].includes("|") && !/^\s/.test(lines[j]) && lines[j].trim() && !lines[j].startsWith("<!--")) {
      const row = split(lines[j]);
      if (row.length !== head.length) break;
      cells.push(row);
      j++;
    }
    let meta = fresh(cells), error;
    meta.id = "plain-" + offsets[i];
    const comment = lines[j]?.match(/^<!-- native-tables:(.*?) -->$/);
    if (comment) {
      try {
        meta = JSON.parse(comment[1]);
        error = validate(meta, cells);
      } catch {
        error = "\u8868\u683C\u5143\u6570\u636E\u635F\u574F";
      }
      j++;
    }
    tables.push({ from: offsets[i], to: j < lines.length ? offsets[j] - 1 : text.length, cells, align: sep.map((v) => v.startsWith(":") ? v.endsWith(":") ? "center" : "left" : v.endsWith(":") ? "right" : "left"), meta, error });
    i = j - 1;
  }
  return tables;
}
function validate(m, cells) {
  if (m.version !== 1) return "\u4E0D\u652F\u6301\u7684\u8868\u683C\u5143\u6570\u636E\u7248\u672C";
  if (m.rows !== cells.length || m.cols !== cells[0].length) return "\u6E90\u7801\u7ED3\u6784\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u7F6E\u683C\u5F0F";
  if (!Array.isArray(m.merges) || !Array.isArray(m.widths) || !Array.isArray(m.heights) || !m.styles || typeof m.id !== "string") return "\u8868\u683C\u5143\u6570\u636E\u4E0D\u5B8C\u6574";
  const occupied = /* @__PURE__ */ new Set();
  for (const g of m.merges) {
    if (![g.r, g.c, g.rs, g.cs].every(Number.isInteger) || g.r < 0 || g.c < 0 || g.rs < 1 || g.cs < 1 || g.r + g.rs > m.rows || g.c + g.cs > m.cols || !Array.isArray(g.original)) return "\u65E0\u6548\u7684\u5408\u5E76\u533A\u57DF";
    for (let r = g.r; r < g.r + g.rs; r++) for (let c = g.c; c < g.c + g.cs; c++) {
      const k = key(r, c);
      if (occupied.has(k)) return "\u5408\u5E76\u533A\u57DF\u91CD\u53E0";
      occupied.add(k);
      if ((r !== g.r || c !== g.c) && cells[r][c]) return "\u5408\u5E76\u533A\u57DF\u6E90\u7801\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u7F6E\u683C\u5F0F";
    }
  }
}
function serialize(t) {
  t.meta.rows = t.cells.length;
  t.meta.cols = t.cells[0].length;
  const clean = (s) => s.replace(/\r?\n/g, "<br>").replace(/(?<!\\)\|/g, "\\|");
  const row = (r) => "| " + r.map(clean).join(" | ") + " |";
  const separator = t.cells[0].map((_, c) => t.align[c] === "center" ? ":---:" : t.align[c] === "right" ? "---:" : "---");
  return [row(t.cells[0]), row(separator), ...t.cells.slice(1).map(row), "<!-- native-tables:" + JSON.stringify(t.meta).replace(/</g, "\\u003c").replace(/>/g, "\\u003e") + " -->"].join("\n");
}
function owner(t, r, c) {
  return t.meta.merges.find((g) => r >= g.r && r < g.r + g.rs && c >= g.c && c < g.c + g.cs);
}
function merge(t, a) {
  if (a.r === a.er && a.c === a.ec) return;
  if (t.meta.merges.some((g) => g.r <= a.er && g.r + g.rs > a.r && g.c <= a.ec && g.c + g.cs > a.c)) throw Error("\u8BF7\u5148\u62C6\u5206\u5DF2\u6709\u5408\u5E76\u683C");
  const original = t.cells.slice(a.r, a.er + 1).map((r) => r.slice(a.c, a.ec + 1));
  const joined = original.flat().filter(Boolean).join("<br>");
  for (let r = a.r; r <= a.er; r++) for (let c = a.c; c <= a.ec; c++) t.cells[r][c] = "";
  t.cells[a.r][a.c] = joined;
  t.meta.merges.push({ r: a.r, c: a.c, rs: a.er - a.r + 1, cs: a.ec - a.c + 1, original, joined });
}
function unmerge(t, a) {
  const matches = t.meta.merges.filter((g) => g.r <= a.er && g.r + g.rs > a.r && g.c <= a.ec && g.c + g.cs > a.c);
  for (const g of matches) {
    if (t.cells[g.r][g.c] === g.joined) for (let r = 0; r < g.rs; r++) for (let c = 0; c < g.cs; c++) t.cells[g.r + r][g.c + c] = g.original[r]?.[c] ?? "";
  }
  t.meta.merges = t.meta.merges.filter((g) => !matches.includes(g));
}
function assertSortable(t) {
  if (t.meta.merges.some((g) => g.rs > 1)) throw Error("\u8BF7\u5148\u62C6\u5206\u8DE8\u884C\u5408\u5E76\u683C\uFF0C\u518D\u6392\u5E8F\u6216\u7B5B\u9009");
}
function sort(t, c, descending = false) {
  assertSortable(t);
  const ids = t.cells.slice(1).map((_, i) => i + 1);
  const values = ids.map((r) => t.cells[r][c]).filter((v) => v.trim());
  const numeric = values.length > 0 && values.every((v) => Number.isFinite(Number(v)));
  ids.sort((a, b) => {
    const x = t.cells[a][c], y = t.cells[b][c];
    if (!x.trim()) return y.trim() ? 1 : 0;
    if (!y.trim()) return -1;
    return (numeric ? Number(x) - Number(y) : x.localeCompare(y, "zh-CN")) * (descending ? -1 : 1);
  });
  const map = new Map([[0, 0], ...ids.map((old, i) => [old, i + 1])]);
  t.cells = [t.cells[0], ...ids.map((r) => t.cells[r])];
  const styles = {};
  for (const [k, v] of Object.entries(t.meta.styles)) {
    const [r, c2] = k.split(":").map(Number);
    styles[key(map.get(r), c2)] = v;
  }
  t.meta.styles = styles;
  t.meta.heights = [t.meta.heights[0], ...ids.map((r) => t.meta.heights[r])];
  t.meta.merges.forEach((g) => g.r = map.get(g.r));
}
function structure(t, axis, index, remove = false) {
  if (t.meta.merges.length) throw Error("\u589E\u5220\u884C\u5217\u524D\u8BF7\u5148\u62C6\u5206\u5408\u5E76\u5355\u5143\u683C");
  if (remove && (axis === "row" && index === 0 || axis === "col" && t.cells[0].length === 1)) throw Error("\u5FC5\u987B\u4FDD\u7559\u8868\u5934\u548C\u81F3\u5C11\u4E00\u5217");
  const styles = {};
  for (const [k, v] of Object.entries(t.meta.styles)) {
    let [r, c] = k.split(":").map(Number);
    let p = axis === "row" ? r : c;
    if (remove && p === index) continue;
    if (p >= index) p += remove ? -1 : 1;
    if (axis === "row") r = p;
    else c = p;
    styles[key(r, c)] = v;
  }
  t.meta.styles = styles;
  if (axis === "row") {
    t.cells.splice(index, remove ? 1 : 0, ...remove ? [] : [Array(t.cells[0].length).fill("")]);
    t.meta.heights.splice(index, remove ? 1 : 0, ...remove ? [] : [32]);
  } else {
    t.cells.forEach((r) => r.splice(index, remove ? 1 : 0, ...remove ? [] : [""]));
    t.align.splice(index, remove ? 1 : 0, ...remove ? [] : ["left"]);
    t.meta.widths.splice(index, remove ? 1 : 0, ...remove ? [] : [140]);
  }
}

// src/grid.ts
var import_obsidian = require("obsidian");

// src/clipboard.ts
function clipboard(html, text) {
  const doc = new DOMParser().parseFromString(html, "text/html"), el = doc.querySelector("table");
  if (!el) {
    const cells2 = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((r) => r.split("	"));
    const cols2 = Math.max(...cells2.map((r) => r.length));
    cells2.forEach((r) => {
      while (r.length < cols2) r.push("");
    });
    return { from: 0, to: 0, cells: cells2, align: [], meta: fresh(cells2) };
  }
  const cells = [], merges = [], styles = {}, widths = [], heights = [];
  const taken = /* @__PURE__ */ new Set();
  Array.from(el.rows).forEach((row, r) => {
    cells[r] ??= [];
    let c = 0;
    for (const cell of Array.from(row.cells)) {
      while (taken.has(key(r, c))) c++;
      const rs = Math.max(1, cell.rowSpan), cs = Math.max(1, cell.colSpan);
      const content = (cell.textContent ?? "").trim();
      cells[r][c] = content;
      for (let rr = r; rr < r + rs; rr++) {
        cells[rr] ??= [];
        for (let cc = c; cc < c + cs; cc++) {
          taken.add(key(rr, cc));
          if (rr !== r || cc !== c) cells[rr][cc] = "";
        }
      }
      if (rs > 1 || cs > 1) merges.push({ r, c, rs, cs, original: Array.from({ length: rs }, (_, rr) => Array.from({ length: cs }, (_2, cc) => rr === 0 && cc === 0 ? content : "")), joined: content });
      const s = cell.style;
      const borderRules = {};
      for (const edge of ["top", "right", "bottom", "left"]) {
        const style = s.getPropertyValue(`border-${edge}-style`);
        if (style) borderRules[edge] = { color: s.getPropertyValue(`border-${edge}-color`) || "#808080", width: parseFloat(s.getPropertyValue(`border-${edge}-width`)) || 0, style };
      }
      styles[key(r, c)] = { borderRules, fontSize: parseFloat(s.fontSize) || void 0, background: s.backgroundColor || void 0, align: s.textAlign || void 0, verticalAlign: ["top", "middle", "bottom"].includes(s.verticalAlign) ? s.verticalAlign : void 0, borderColor: s.borderColor || void 0, borderWidth: parseFloat(s.borderWidth) || void 0, borderEdges: ["top", "right", "bottom", "left"] };
      if (parseFloat(s.width || cell.getAttribute("width") || "")) widths[c] = parseFloat(s.width || cell.getAttribute("width") || "");
      if (parseFloat(s.height)) heights[r] = Math.max(heights[r] ?? 0, parseFloat(s.height));
      c += cs;
    }
  });
  if (!cells.length) throw Error("\u526A\u8D34\u677F\u4E2D\u6CA1\u6709\u8868\u683C\u5185\u5BB9");
  const cols = Math.max(...cells.map((r) => r.length));
  for (const row of cells) for (let c = 0; c < cols; c++) row[c] ??= "";
  const meta = fresh(cells);
  Object.assign(meta, { merges, styles, widths, heights });
  return { from: 0, to: 0, cells, align: [], meta };
}
function paste(target, incoming, r, c) {
  const nr = incoming.cells.length, nc = incoming.cells[0].length;
  if (target.meta.merges.some((g) => g.r < r + nr && g.r + g.rs > r && g.c < c + nc && g.c + g.cs > c)) throw Error("\u7C98\u8D34\u8303\u56F4\u4E0E\u5408\u5E76\u683C\u4EA4\u53E0\uFF0C\u8BF7\u5148\u62C6\u5206");
  const cols = Math.max(target.cells[0].length, c + nc);
  for (const row of target.cells) while (row.length < cols) row.push("");
  while (target.cells.length < r + nr) target.cells.push(Array(cols).fill(""));
  for (let rr = 0; rr < nr; rr++) for (let cc = 0; cc < nc; cc++) {
    target.cells[r + rr][c + cc] = incoming.cells[rr][cc];
    const s = incoming.meta.styles[key(rr, cc)];
    if (s) target.meta.styles[key(r + rr, c + cc)] = { ...s };
    else delete target.meta.styles[key(r + rr, c + cc)];
  }
  incoming.meta.merges.forEach((g) => target.meta.merges.push({ ...g, r: r + g.r, c: c + g.c }));
  incoming.meta.widths.forEach((w, i) => {
    if (w) target.meta.widths[c + i] = w;
  });
  incoming.meta.heights.forEach((h, i) => {
    if (h) target.meta.heights[r + i] = h;
  });
}

// src/grid.ts
var InputModal = class extends import_obsidian.Modal {
  constructor(app, title, fields, done) {
    super(app);
    this.setTitle(title);
    const values = fields.map((f) => f.value);
    fields.forEach((f, i) => new import_obsidian.Setting(this.contentEl).setName(f.name).addText((x) => x.setValue(f.value).onChange((v) => values[i] = v)));
    new import_obsidian.Setting(this.contentEl).addButton((b) => b.setButtonText("\u786E\u5B9A").setCta().onClick(() => {
      done(values);
      this.close();
    }));
  }
};
var ConfirmModal = class extends import_obsidian.Modal {
  constructor(app, done) {
    super(app);
    this.setTitle("\u5220\u9664\u542B\u5185\u5BB9\u7684\u884C\u5217\uFF1F");
    this.contentEl.createEl("p", { text: "\u5220\u9664\u540E\u53EF\u4EE5\u4F7F\u7528\u64A4\u9500\u6062\u590D\u3002" });
    new import_obsidian.Setting(this.contentEl).addButton((b) => b.setButtonText("\u53D6\u6D88").onClick(() => this.close())).addButton((b) => b.setButtonText("\u5220\u9664").setWarning().onClick(() => {
      done();
      this.close();
    }));
  }
};
var Grid = class {
  constructor(o) {
    this.o = o;
    this.selection = o.session?.selection ?? this.selection;
    this.filter = o.session?.filter;
    this.selection = { r: Math.min(this.selection.r, o.table.cells.length - 1), er: Math.min(this.selection.er, o.table.cells.length - 1), c: Math.min(this.selection.c, o.table.cells[0].length - 1), ec: Math.min(this.selection.ec, o.table.cells[0].length - 1) };
    this.anchor = { r: this.selection.r, c: this.selection.c };
    this.cursor = { ...this.anchor };
    this.el.className = "nt-grid";
    if (o.commit) this.el.classList.add("nt-editable");
    this.el.tabIndex = 0;
    this.el.setAttribute("aria-label", "\u589E\u5F3A\u8868\u683C\u7F16\u8F91\u5668");
    this.toolbar.className = "nt-toolbar";
    this.el.append(this.table, this.outline, this.controls);
    this.outline.className = "nt-selection-outline";
    this.controls.className = "nt-edge-controls";
    this.controls.hidden = true;
    this.outline.hidden = true;
    this.toolbar.hidden = true;
    this.toolbar.setAttribute("role", "toolbar");
    this.toolbar.setAttribute("aria-label", "\u8868\u683C\u683C\u5F0F");
    if (o.table.error) {
      this.el.classList.add("nt-error");
      const p = document.createElement("p");
      p.textContent = o.table.error;
      this.el.insertBefore(p, this.table);
      for (const row of o.table.cells) {
        const tr = this.table.insertRow();
        for (const value of row) {
          const td = tr.insertCell();
          td.textContent = value;
        }
      }
      if (o.reset) this.button("\u91CD\u7F6E\u683C\u5F0F", o.reset, p);
      if (o.fallback) this.button("\u4F7F\u7528\u539F\u751F\u7F16\u8F91", o.fallback, p);
      return;
    }
    if (o.commit) {
      document.body.append(this.toolbar);
      this.tools();
      document.addEventListener("pointerdown", this.outside, true);
      window.addEventListener("resize", this.reposition);
      document.addEventListener("scroll", this.reposition, true);
      if (typeof ResizeObserver !== "undefined") {
        this.resizeObserver = new ResizeObserver(this.reposition);
        this.resizeObserver.observe(this.el);
      }
      this.el.addEventListener("pointermove", this.onDrag);
      window.addEventListener("pointerup", this.endDrag);
      this.el.addEventListener("keydown", this.onKey);
      this.el.addEventListener("copy", this.onCopy);
      this.el.addEventListener("paste", this.onPaste);
    }
    this.render();
    if (o.session?.focus) {
      queueMicrotask(() => {
        if (!this.disposed && this.o.session?.focus) {
          this.el.focus();
          this.active = true;
          this.toolbar.hidden = false;
          this.mark();
        }
      });
    }
  }
  el = document.createElement("div");
  toolbar = document.createElement("div");
  table = document.createElement("table");
  selection = { r: 0, c: 0, er: 0, ec: 0 };
  anchor = { r: 0, c: 0 };
  cursor = { r: 0, c: 0 };
  axisDrag;
  resizing;
  dragging = false;
  dragStart;
  editing = false;
  filter;
  disposed = false;
  outline = document.createElement("div");
  controls = document.createElement("div");
  popup;
  popupAnchor;
  resizeObserver;
  active = false;
  observer;
  destroy() {
    this.disposed = true;
    this.endDrag();
    this.el.removeEventListener("pointermove", this.onDrag);
    window.removeEventListener("pointerup", this.endDrag);
    this.observer?.disconnect();
    this.resizeObserver?.disconnect();
    document.removeEventListener("pointerdown", this.outside, true);
    document.removeEventListener("scroll", this.reposition, true);
    window.removeEventListener("resize", this.reposition);
    this.toolbar.remove();
    this.popup?.remove();
    this.el.removeEventListener("keydown", this.onKey);
    this.el.removeEventListener("copy", this.onCopy);
    this.el.removeEventListener("paste", this.onPaste);
  }
  button(text, fn, parent = this.toolbar) {
    const b = document.createElement("button");
    b.textContent = text;
    b.type = "button";
    b.setAttribute("aria-label", text);
    const icons = { "\u5408\u5E76": "combine", "\u62C6\u5206": "split", "\u5C3A\u5BF8": "move-horizontal", "\u7B5B\u9009": "filter", "\u22EF": "ellipsis" };
    if (icons[text]) {
      const icon = document.createElement("span");
      icon.className = "nt-tool-icon";
      (0, import_obsidian.setIcon)(icon, icons[text]);
      b.prepend(icon);
    }
    b.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    b.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
    parent.append(b);
    return b;
  }
  apply(fn, focus = true) {
    try {
      const t = structuredClone(this.o.table);
      fn(t);
      if (this.o.session) {
        this.o.session.selection = this.selection;
        this.o.session.filter = this.filter;
        this.o.session.focus = focus;
      }
      this.o.commit?.(t);
    } catch (e) {
      new import_obsidian.Notice(e.message);
    }
  }
  selected(fn) {
    for (let r = this.selection.r; r <= this.selection.er; r++) for (let c = this.selection.c; c <= this.selection.ec; c++) fn(r, c);
  }
  style(s) {
    this.apply((t) => this.selected((r, c) => t.meta.styles[key(r, c)] = { ...t.meta.styles[key(r, c)], ...s }));
  }
  tool(label, icon, action) {
    const b = this.button("", () => {
      this.popupAnchor = b;
      action();
    });
    b.setAttribute("aria-label", label);
    b.title = label;
    (0, import_obsidian.setIcon)(b, icon);
    return b;
  }
  tools() {
    this.tool("\u5408\u5E76\u6216\u62C6\u5206\u5355\u5143\u683C", "table-cells-merge", () => this.apply((t) => owner(t, this.selection.r, this.selection.c) ? unmerge(t, this.selection) : merge(t, this.selection)));
    this.divider();
    this.tool("\u589E\u5927\u5B57\u53F7", "a-arrow-up", () => this.fontSize(1));
    this.tool("\u51CF\u5C0F\u5B57\u53F7", "a-arrow-down", () => this.fontSize(-1));
    this.tool("\u7C97\u4F53", "bold", () => this.toggle("bold"));
    this.tool("\u6587\u5B57\u7A81\u51FA\u663E\u793A", "highlighter", () => this.colors("highlight"));
    this.tool("\u5B57\u4F53\u989C\u8272", "baseline", () => this.colors("color"));
    this.tool("\u63D2\u5165\u94FE\u63A5", "link", () => this.linkPanel());
    this.tool("\u66F4\u591A\u6587\u5B57\u683C\u5F0F", "ellipsis", () => this.textPanel());
    this.divider();
    this.tool("\u8FB9\u6846", "table-2", () => this.borderMenu());
    this.tool("\u5355\u5143\u683C\u5E95\u8272", "paint-bucket", () => this.colors("background"));
    this.tool("\u5BF9\u9F50\u65B9\u5F0F", "align-left", () => this.alignPanel());
    this.tool("\u63D2\u5165\u884C\u5217", "panel-top-open", () => this.insertPanel());
    this.tool("\u5220\u9664\u884C\u5217", "trash-2", () => this.deletePanel());
    this.divider();
    this.tool("\u5355\u5143\u683C\u6279\u6CE8", "message-square-plus", () => this.commentPanel());
  }
  fontSize(delta) {
    this.apply((t) => this.selected((r, c) => {
      const s = t.meta.styles[key(r, c)] ?? {};
      t.meta.styles[key(r, c)] = { ...s, fontSize: Math.max(8, Math.min(72, (s.fontSize ?? 16) + delta)) };
    }));
  }
  textPanel() {
    const p = this.panel("\u66F4\u591A\u6587\u5B57\u683C\u5F0F");
    for (const [label, icon, field] of [["\u659C\u4F53", "italic", "italic"], ["\u4E0B\u5212\u7EBF", "underline", "underline"], ["\u5220\u9664\u7EBF", "strikethrough", "strike"]]) {
      const b = this.button(label, () => {
        this.closePopup();
        this.toggle(field);
      }, p);
      b.className = "nt-menu-item";
      const i = document.createElement("span");
      (0, import_obsidian.setIcon)(i, icon);
      b.prepend(i);
    }
    this.button("\u8C03\u6574\u884C\u9AD8\u4E0E\u5217\u5BBD", () => this.sizePanel(), p).className = "nt-menu-item";
    this.button("\u66F4\u591A\u8868\u683C\u64CD\u4F5C", () => {
      this.closePopup();
      this.menu();
    }, p).className = "nt-menu-item";
  }
  linkPanel() {
    const p = this.panel("\u63D2\u5165\u94FE\u63A5");
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "\u8F93\u5165\u94FE\u63A5\u5730\u5740";
    input.setAttribute("aria-label", "\u94FE\u63A5\u5730\u5740");
    p.append(input);
    this.button("\u786E\u5B9A", () => {
      const url = input.value.trim();
      if (!url) return;
      this.closePopup();
      this.apply((t) => this.selected((r, c) => {
        const label = t.cells[r][c] || url;
        t.cells[r][c] = `[${label.replace(/\]/g, "\\]")}](${url.replace(/\)/g, "%29")})`;
      }));
    }, p).className = "nt-panel-reset";
    input.focus();
  }
  commentPanel() {
    const p = this.panel("\u5355\u5143\u683C\u6279\u6CE8");
    const input = document.createElement("textarea");
    input.value = this.o.table.meta.styles[key(this.selection.r, this.selection.c)]?.comment ?? "";
    input.setAttribute("aria-label", "\u6279\u6CE8\u5185\u5BB9");
    p.append(input);
    this.button("\u4FDD\u5B58", () => {
      this.closePopup();
      this.style({ comment: input.value || void 0 });
    }, p).className = "nt-panel-reset";
  }
  alignPanel() {
    const p = this.panel("\u5BF9\u9F50\u65B9\u5F0F");
    p.classList.add("nt-align-panel");
    const style = this.o.table.meta.styles[key(this.selection.r, this.selection.c)];
    for (const [field, choices, current] of [
      ["align", [["\u5DE6\u5BF9\u9F50", "left", "align-left"], ["\u6C34\u5E73\u5C45\u4E2D", "center", "align-center"], ["\u53F3\u5BF9\u9F50", "right", "align-right"]], style?.align ?? this.o.table.align[this.selection.c] ?? "left"],
      ["verticalAlign", [["\u9876\u7AEF\u5BF9\u9F50", "top", "align-start-horizontal"], ["\u5782\u76F4\u5C45\u4E2D", "middle", "align-center-horizontal"], ["\u5E95\u7AEF\u5BF9\u9F50", "bottom", "align-end-horizontal"]], style?.verticalAlign ?? "top"]
    ]) {
      const group = document.createElement("div");
      group.className = "nt-align-options";
      p.append(group);
      for (const [name, value, icon] of choices) {
        const b = this.button("", () => {
          this.closePopup();
          this.style({ [field]: value });
        }, group);
        (0, import_obsidian.setIcon)(b, icon);
        b.title = name;
        b.setAttribute("aria-label", name);
        b.setAttribute("aria-pressed", String(current === value));
      }
    }
  }
  insertPanel() {
    const p = this.panel("\u63D2\u5165\u884C\u5217");
    p.classList.add("nt-insert-panel");
    for (const [label, axis, index, unit] of [["\u5728\u4E0A\u65B9\u63D2\u5165", "row", Math.max(1, this.selection.r), "\u884C"], ["\u5728\u4E0B\u65B9\u63D2\u5165", "row", this.selection.er + 1, "\u884C"], ["\u5728\u5DE6\u4FA7\u63D2\u5165", "col", this.selection.c, "\u5217"], ["\u5728\u53F3\u4FA7\u63D2\u5165", "col", this.selection.ec + 1, "\u5217"]]) {
      const line = document.createElement("div");
      line.className = "nt-insert-line";
      const input = document.createElement("input");
      input.type = "number";
      input.min = "1";
      input.max = "100";
      input.value = "1";
      input.setAttribute("aria-label", label + unit + "\u6570");
      this.button(label, () => {
        const count = Number(input.value);
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          new import_obsidian.Notice("\u8BF7\u8F93\u5165 1\u2013100 \u4E4B\u95F4\u7684\u6574\u6570");
          return;
        }
        this.closePopup();
        this.apply((t) => {
          for (let n = 0; n < count; n++) structure(t, axis, index + n);
        });
      }, line);
      line.append(input, unit);
      p.append(line);
    }
  }
  deletePanel() {
    const p = this.panel("\u5220\u9664\u884C\u5217");
    for (const [label, axis] of [["\u5220\u9664\u6240\u9009\u884C", "row"], ["\u5220\u9664\u6240\u9009\u5217", "col"]]) this.button(label, () => {
      this.closePopup();
      const start = axis === "row" ? this.selection.r : this.selection.c, end = axis === "row" ? this.selection.er : this.selection.ec;
      const run = () => this.apply((t) => {
        for (let i = end; i >= start; i--) structure(t, axis, i, true);
      });
      const content = this.o.table.cells.some((row, r) => row.some((v, c) => Boolean(v) && (axis === "row" ? r >= start && r <= end : c >= start && c <= end)));
      if (content) new ConfirmModal(this.o.app, run).open();
      else run();
    }, p).className = "nt-menu-item";
  }
  borderMenu() {
    const p = this.panel("\u8FB9\u6846");
    p.classList.add("nt-border-menu");
    for (const [label, mode] of [["\u4E0B\u6846\u7EBF", "bottom"], ["\u4E0A\u6846\u7EBF", "top"], ["\u5DE6\u6846\u7EBF", "left"], ["\u53F3\u6846\u7EBF", "right"], ["\u65E0\u6846\u7EBF", "none"], ["\u6240\u6709\u6846\u7EBF", "all"], ["\u5916\u90E8\u6846\u7EBF", "outer"], ["\u5185\u90E8\u6846\u7EBF", "inner"], ["\u5185\u90E8\u6A2A\u6846\u7EBF", "horizontal"], ["\u5185\u90E8\u7AD6\u6846\u7EBF", "vertical"], ["\u659C\u5411\u4E0B\u6846\u7EBF", "diagonalDown"], ["\u659C\u5411\u4E0A\u6846\u7EBF", "diagonalUp"]]) {
      const b = this.button(label, () => {
        this.closePopup();
        this.applyBorders(mode, "#808080", 1, "solid");
      }, p);
      b.className = "nt-menu-item";
      const icon = document.createElement("span");
      icon.className = "nt-border-preview nt-border-" + mode;
      b.prepend(icon);
    }
    this.button("\u8FB9\u6846\u8BBE\u7F6E\u2026", () => this.borderDialog(), p).className = "nt-menu-item";
  }
  applyBorders(mode, color, width, style) {
    this.apply((t) => {
      const a = this.selection;
      this.selected((r, c) => {
        const g = owner(t, r, c);
        if (g && (g.r !== r || g.c !== c)) return;
        const endR = r + (g?.rs ?? 1) - 1, endC = c + (g?.cs ?? 1) - 1;
        const s = t.meta.styles[key(r, c)] ?? {};
        if (mode.startsWith("diagonal")) {
          t.meta.styles[key(r, c)] = { ...s, [mode]: !s[mode], borderColor: color };
          return;
        }
        const list = ["top", "right", "bottom", "left"];
        const chosen = mode === "all" ? list : mode === "none" ? [] : mode === "outer" ? list.filter((e) => e === "top" ? r === a.r : e === "bottom" ? endR >= a.er : e === "left" ? c === a.c : endC >= a.ec) : mode === "inner" || mode === "horizontal" || mode === "vertical" ? list.filter((e) => (mode === "inner" || mode === "horizontal") && (e === "top" && r > a.r || e === "bottom" && endR < a.er) || (mode === "inner" || mode === "vertical") && (e === "left" && c > a.c || e === "right" && endC < a.ec)) : [mode];
        const rules = { ...s.borderRules };
        for (const edge of list) if (mode === "all" || mode === "none" || mode === "outer" || mode === "inner" || mode === "horizontal" || mode === "vertical" || chosen.includes(edge)) rules[edge] = { color, width: chosen.includes(edge) ? width : 0, style: chosen.includes(edge) ? style : "hidden" };
        t.meta.styles[key(r, c)] = { ...s, borderRules: rules };
      });
    });
  }
  borderDialog() {
    this.closePopup();
    const overlay = document.createElement("div");
    overlay.className = "nt-dialog-overlay";
    const dialog = document.createElement("div");
    dialog.className = "nt-border-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "\u8FB9\u6846\u8BBE\u7F6E");
    overlay.append(dialog);
    document.body.append(overlay);
    this.popup = overlay;
    const title = document.createElement("div");
    title.className = "nt-dialog-heading";
    title.textContent = "\u8FB9\u6846\u8BBE\u7F6E";
    this.button("\xD7", () => this.closePopup(), title);
    dialog.append(title);
    const body = document.createElement("div");
    body.className = "nt-border-dialog-body";
    dialog.append(body);
    const presets = document.createElement("div"), settings = document.createElement("div"), preview = document.createElement("div");
    body.append(presets, settings, preview);
    const label = (parent, text) => {
      const l = document.createElement("div");
      l.className = "nt-palette-label";
      l.textContent = text;
      parent.append(l);
    };
    let mode = "all";
    label(presets, "\u8BBE\u7F6E");
    for (const [name, value] of [["\u65E0", "none"], ["\u6846", "outer"], ["\u5168\u90E8", "all"], ["\u81EA\u5B9A\u4E49", "custom"]]) {
      const b = this.button(name, () => {
        mode = value;
        update();
      }, presets);
      b.className = "nt-preset";
      b.dataset.mode = value;
      const icon = document.createElement("span");
      icon.className = "nt-border-preview nt-border-" + value;
      b.prepend(icon);
    }
    label(settings, "\u6837\u5F0F");
    const lineStyle = document.createElement("select");
    lineStyle.setAttribute("aria-label", "\u8FB9\u6846\u7EBF\u578B");
    for (const [name, value] of [["\u5B9E\u7EBF", "solid"], ["\u865A\u7EBF", "dashed"], ["\u70B9\u7EBF", "dotted"], ["\u53CC\u7EBF", "double"]]) {
      const option = document.createElement("option");
      option.textContent = name;
      option.value = value;
      lineStyle.append(option);
    }
    settings.append(lineStyle);
    label(settings, "\u989C\u8272");
    const color = document.createElement("input");
    color.type = "color";
    color.value = "#000000";
    color.setAttribute("aria-label", "\u8FB9\u6846\u989C\u8272");
    settings.append(color);
    label(settings, "\u5BBD\u5EA6");
    const width = document.createElement("select");
    width.setAttribute("aria-label", "\u8FB9\u6846\u5BBD\u5EA6");
    for (const n of [0.5, 0.75, 1, 1.5, 2, 3, 4]) {
      const option = document.createElement("option");
      option.value = String(n);
      option.textContent = n + " px";
      width.append(option);
    }
    width.value = "1";
    settings.append(width);
    label(preview, "\u9884\u89C8");
    const tip = document.createElement("div");
    tip.className = "nt-preview-tip";
    tip.textContent = "\u5355\u51FB\u4E0B\u65B9\u8FB9\u7EBF\u53EF\u5207\u6362\u663E\u793A";
    preview.append(tip);
    const canvas = document.createElement("div");
    canvas.className = "nt-border-canvas";
    canvas.setAttribute("aria-label", "\u8FB9\u6846\u9884\u89C8");
    preview.append(canvas);
    const toggles = /* @__PURE__ */ new Set(["top", "bottom", "left", "right", "horizontal", "vertical"]);
    for (const edge of ["top", "bottom", "left", "right", "horizontal", "vertical"]) {
      const b = this.button("", () => {
        mode = "custom";
        if (toggles.has(edge)) toggles.delete(edge);
        else toggles.add(edge);
        update();
      }, canvas);
      b.className = "nt-preview-edge nt-preview-" + edge;
      b.setAttribute("aria-label", "\u5207\u6362\u9884\u89C8 " + edge);
    }
    const update = () => {
      presets.querySelectorAll("[data-mode]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
      if (mode !== "custom") {
        toggles.clear();
        if (mode !== "none") for (const e of ["top", "bottom", "left", "right"]) toggles.add(e);
        if (mode === "all") for (const e of ["horizontal", "vertical"]) toggles.add(e);
      }
      canvas.querySelectorAll("button").forEach((b) => {
        const e = b.getAttribute("aria-label").split(" ")[1];
        b.style.setProperty("--preview-line", `${width.value}px ${lineStyle.value} ${color.value}`);
        b.classList.toggle("is-on", toggles.has(e));
      });
    };
    color.oninput = update;
    lineStyle.onchange = update;
    width.onchange = update;
    update();
    const footer = document.createElement("div");
    footer.className = "nt-dialog-footer";
    dialog.append(footer);
    this.button("\u53D6\u6D88", () => this.closePopup(), footer);
    this.button("\u786E\u5B9A", () => {
      this.closePopup();
      if (mode !== "custom") {
        this.applyBorders(mode, color.value, Number(width.value), lineStyle.value);
        return;
      }
      const a = this.selection;
      this.apply((t) => this.selected((r, c) => {
        const g = owner(t, r, c);
        if (g && (g.r !== r || g.c !== c)) return;
        const er = r + (g?.rs ?? 1) - 1, ec = c + (g?.cs ?? 1) - 1;
        const rules = { ...t.meta.styles[key(r, c)]?.borderRules };
        for (const edge of ["top", "bottom", "left", "right"]) {
          const outer = edge === "top" ? r === a.r : edge === "bottom" ? er >= a.er : edge === "left" ? c === a.c : ec >= a.ec;
          const on = toggles.has(outer ? edge : edge === "top" || edge === "bottom" ? "horizontal" : "vertical");
          rules[edge] = { color: color.value, width: on ? Number(width.value) : 0, style: on ? lineStyle.value : "hidden" };
        }
        t.meta.styles[key(r, c)] = { ...t.meta.styles[key(r, c)], borderRules: rules };
      }));
    }, footer).classList.add("mod-cta");
    overlay.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (e.target === overlay) this.closePopup();
    });
    overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closePopup();
    });
    dialog.tabIndex = -1;
    dialog.focus();
  }
  divider() {
    const d = document.createElement("span");
    d.className = "nt-divider";
    this.toolbar.append(d);
  }
  toggle(name) {
    this.style({ [name]: !this.o.table.meta.styles[key(this.selection.r, this.selection.c)]?.[name] });
  }
  outside = (e) => {
    const target = e.target;
    if (this.table.contains(target) || this.controls.contains(target) || this.toolbar.contains(target) || this.popup?.contains(target)) return;
    this.dismiss();
  };
  dismiss() {
    this.active = false;
    this.endDrag();
    this.previewAxis();
    if (this.o.session) this.o.session.focus = false;
    this.closePopup();
    this.mark();
  }
  closePopup() {
    this.popup?.remove();
    this.popup = void 0;
  }
  panel(title) {
    this.closePopup();
    const p = document.createElement("div");
    p.className = "nt-popover";
    p.setAttribute("role", "dialog");
    p.setAttribute("aria-label", title);
    p.addEventListener("pointerdown", (e) => e.stopPropagation());
    p.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        this.closePopup();
        this.el.focus();
      }
    });
    document.body.append(p);
    this.popup = p;
    const h = document.createElement("div");
    h.className = "nt-popover-title";
    h.textContent = title;
    p.append(h);
    this.positionPopup();
    return p;
  }
  positionPopup() {
    if (!this.popup || this.popup.classList.contains("nt-dialog-overlay")) return;
    const b = this.toolbar.getBoundingClientRect(), anchor = this.popupAnchor?.getBoundingClientRect() ?? b;
    const width = this.popup.getBoundingClientRect().width || 270;
    this.popup.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - width - 8))}px`;
    this.popup.style.top = `${b.bottom + 6}px`;
    queueMicrotask(() => {
      if (!this.popup) return;
      const p = this.popup.getBoundingClientRect();
      if (p.bottom > window.innerHeight - 8) this.popup.style.top = `${Math.max(8, b.top - p.height - 6)}px`;
    });
  }
  colors(kind) {
    const p = this.panel(kind === "color" ? "\u5B57\u4F53\u989C\u8272" : kind === "highlight" ? "\u6587\u5B57\u7A81\u51FA\u663E\u793A" : kind === "background" ? "\u5355\u5143\u683C\u5E95\u8272" : "\u6587\u5B57\u4E0E\u80CC\u666F\u989C\u8272");
    p.classList.add("nt-color-menu");
    const hues = ["#374151", "#9ca3af", "#ef4444", "#f97316", "#eab308", "#22c55e", "#14b8a6", "#38bdf8", "#3b82f6", "#8b5cf6", "#ec4899"];
    const pastels = ["#f3f4f6", "#e5e7eb", "#fee2e2", "#ffedd5", "#fef3c7", "#dcfce7", "#ccfbf1", "#e0f2fe", "#dbeafe", "#ede9fe", "#fce7f3"];
    for (const [title, name, list] of [["\u5B57\u4F53\u989C\u8272", "color", hues], [kind === "highlight" ? "\u6587\u5B57\u7A81\u51FA\u663E\u793A" : "\u5355\u5143\u683C\u80CC\u666F\u989C\u8272", kind === "highlight" ? "highlight" : "background", pastels.concat(hues)]]) {
      if (kind === "color" && name !== "color" || kind && kind !== "color" && name === "color") continue;
      const h = document.createElement("div");
      h.className = "nt-palette-label";
      h.textContent = title;
      p.append(h);
      const palette = document.createElement("div");
      palette.className = "nt-palette";
      p.append(palette);
      list.forEach((color) => {
        const b = this.button(name === "color" ? "A" : "", () => {
          this.closePopup();
          this.style({ [name]: color });
        }, palette);
        b.className = "nt-swatch";
        b.title = `${title} ${color}`;
        b.setAttribute("aria-label", b.title);
        if (name === "color") b.style.color = color;
        else b.style.background = color;
      });
    }
    this.button("\u6062\u590D\u9ED8\u8BA4\u989C\u8272", () => {
      this.closePopup();
      this.style(kind ? { [kind]: void 0 } : { color: void 0, background: void 0, highlight: void 0 });
    }, p).className = "nt-panel-reset";
  }
  formatPanel() {
    const p = this.panel("\u5355\u5143\u683C\u683C\u5F0F");
    p.classList.add("nt-format-panel");
    this.button("\u5E95\u8272\u4E0E\u6587\u5B57\u989C\u8272", () => this.colors(), p).className = "nt-panel-item";
    const h = document.createElement("div");
    h.className = "nt-palette-label";
    h.textContent = "\u8FB9\u6846";
    p.append(h);
    const choices = document.createElement("div");
    choices.className = "nt-border-options";
    p.append(choices);
    const color = document.createElement("input");
    color.type = "color";
    color.value = this.o.table.meta.styles[key(this.selection.r, this.selection.c)]?.borderColor || "#d1d5db";
    color.setAttribute("aria-label", "\u8FB9\u6846\u989C\u8272");
    const width = document.createElement("select");
    width.setAttribute("aria-label", "\u8FB9\u6846\u7C97\u7EC6");
    for (const n of [1, 2, 3]) {
      const option = document.createElement("option");
      option.value = String(n);
      option.textContent = `${n}px`;
      width.append(option);
    }
    width.value = String(this.o.table.meta.styles[key(this.selection.r, this.selection.c)]?.borderWidth || 1);
    p.append(color, width);
    for (const [label, edges] of [["\u5168\u90E8\u8FB9\u6846", "all"], ["\u5916\u8FB9\u6846", "outer"], ["\u4E0A\u8FB9\u6846", "top"], ["\u53F3\u8FB9\u6846", "right"], ["\u4E0B\u8FB9\u6846", "bottom"], ["\u5DE6\u8FB9\u6846", "left"], ["\u65E0\u8FB9\u6846", "none"]]) {
      const b = this.button("", () => {
        const a = this.selection, w = edges === "none" ? 0 : Number(width.value), co = color.value;
        this.closePopup();
        this.apply((t) => this.selected((r, c) => {
          const g = owner(t, r, c);
          const list = edges === "all" || edges === "none" ? ["top", "right", "bottom", "left"] : edges === "outer" ? [...r === a.r ? ["top"] : [], ...r + (g?.rs ?? 1) - 1 >= a.er ? ["bottom"] : [], ...c === a.c ? ["left"] : [], ...c + (g?.cs ?? 1) - 1 >= a.ec ? ["right"] : []] : [edges];
          t.meta.styles[key(r, c)] = { ...t.meta.styles[key(r, c)], borderColor: co, borderWidth: w, borderEdges: list };
        }));
      }, choices);
      b.className = "nt-border-option";
      b.title = label;
      b.setAttribute("aria-label", label);
      const preview = document.createElement("span");
      preview.className = "nt-border-preview nt-border-" + edges;
      b.append(preview);
    }
    this.button("\u8C03\u6574\u884C\u9AD8\u4E0E\u5217\u5BBD", () => this.sizePanel(), p).className = "nt-panel-item";
  }
  sizePanel() {
    const p = this.panel("\u884C\u5217\u5C3A\u5BF8");
    p.classList.add("nt-size-panel");
    const inputs = [];
    const changed = /* @__PURE__ */ new Set();
    for (const [label, value, min] of [["\u5217\u5BBD", this.o.table.meta.widths[this.selection.c] || 140, 48], ["\u884C\u9AD8", this.o.table.meta.heights[this.selection.r] || 32, 24]]) {
      const line = document.createElement("label");
      line.textContent = label;
      line.className = "nt-size-field";
      const input = document.createElement("input");
      input.type = "number";
      input.min = String(min);
      input.value = String(value);
      input.setAttribute("aria-label", label + "\uFF08px\uFF09");
      const field = inputs.length;
      input.addEventListener("input", () => changed.add(field));
      line.append(input, "px");
      p.append(line);
      inputs.push(input);
    }
    this.button("\u5E94\u7528", () => {
      const [w, h] = inputs.map((x) => Number(x.value));
      if (!changed.size) {
        this.closePopup();
        return;
      }
      if (!Number.isFinite(w) || !Number.isFinite(h) || w < 48 || h < 24) {
        new import_obsidian.Notice("\u5217\u5BBD\u81F3\u5C1148px\uFF0C\u884C\u9AD8\u81F3\u5C1124px");
        return;
      }
      this.closePopup();
      this.apply((t) => {
        if (changed.has(0)) for (let c = this.selection.c; c <= this.selection.ec; c++) t.meta.widths[c] = w;
        if (changed.has(1)) for (let r = this.selection.r; r <= this.selection.er; r++) t.meta.heights[r] = h;
      });
    }, p).className = "nt-panel-reset";
  }
  reposition = () => {
    if (this.disposed) return;
    this.mark();
  };
  edges() {
    this.controls.replaceChildren();
    if (!this.o.commit) return;
    const base = this.el.getBoundingClientRect();
    const table = this.table.getBoundingClientRect();
    const all = this.button("", () => {
      this.active = true;
      this.selection = { r: 0, c: 0, er: this.o.table.cells.length - 1, ec: this.o.table.cells[0].length - 1 };
      this.mark();
      this.menu();
    }, this.controls);
    (0, import_obsidian.setIcon)(all, "table");
    all.title = "\u8868\u683C\u64CD\u4F5C";
    all.setAttribute("aria-label", "\u8868\u683C\u64CD\u4F5C");
    all.className = "nt-table-grip";
    all.style.left = `${table.left - base.left - 30}px`;
    all.style.top = `${table.top - base.top}px`;
    this.table.querySelectorAll("th").forEach((td) => {
      const b = td.getBoundingClientRect(), c = Number(td.dataset.c);
      this.grip("col", c, b.left - base.left, table.top - base.top - 10, b.width);
    });
    this.table.querySelectorAll("tr").forEach((tr) => {
      const td = tr.querySelector("td,th");
      if (!td) return;
      const b = tr.getBoundingClientRect();
      this.grip("row", Number(td.dataset.r), table.left - base.left - 10, b.top - base.top, b.height);
    });
  }
  grip(axis, index, x, y, size) {
    const select = (end = index) => {
      this.el.focus();
      this.active = true;
      this.closePopup();
      this.selection = axis === "row" ? { r: Math.min(index, end), er: Math.max(index, end), c: 0, ec: this.o.table.cells[0].length - 1 } : { r: 0, er: this.o.table.cells.length - 1, c: Math.min(index, end), ec: Math.max(index, end) };
      this.anchor = { r: this.selection.r, c: this.selection.c };
      this.cursor = { r: this.selection.er, c: this.selection.ec };
      this.mark();
    };
    const b = this.button("", () => select(), this.controls);
    b.className = "nt-axis-grip nt-axis-" + axis;
    const selected = axis === "row" ? index >= this.selection.r && index <= this.selection.er : index >= this.selection.c && index <= this.selection.ec;
    b.classList.toggle("is-selected", this.active && selected);
    b.title = axis === "row" ? "\u9009\u62E9\u6574\u884C" : "\u9009\u62E9\u6574\u5217";
    b.setAttribute("aria-label", (axis === "row" ? "\u6574\u884C\u64CD\u4F5C " : "\u6574\u5217\u64CD\u4F5C ") + (index + 1));
    b.style.left = `${x}px`;
    b.style.top = `${y}px`;
    b.style[axis === "col" ? "width" : "height"] = `${size}px`;
    b.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      this.axisDrag = { axis, from: index };
      select();
    });
    b.addEventListener("pointerenter", (e) => {
      if (this.axisDrag?.axis !== axis || !(e.buttons & 1)) return;
      const from = this.axisDrag.from;
      this.active = true;
      this.selection = axis === "row" ? { r: Math.min(from, index), er: Math.max(from, index), c: 0, ec: this.o.table.cells[0].length - 1 } : { r: 0, er: this.o.table.cells.length - 1, c: Math.min(from, index), ec: Math.max(from, index) };
      this.mark();
    });
    b.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      select();
      this.menu(e);
    });
  }
  render() {
    this.observer?.disconnect();
    const pending = /* @__PURE__ */ new WeakMap();
    if (typeof IntersectionObserver !== "undefined") this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) {
        pending.get(entry.target)?.();
        this.observer?.unobserve(entry.target);
      }
    }, { rootMargin: "300px" });
    this.table.replaceChildren();
    const t = this.o.table;
    const colgroup = document.createElement("colgroup");
    t.cells[0].forEach((_, c) => {
      const col = document.createElement("col");
      col.style.width = `${t.meta.widths[c] || 140}px`;
      colgroup.append(col);
    });
    this.table.append(colgroup);
    this.table.style.width = `${t.cells[0].reduce((sum, _, c) => sum + (t.meta.widths[c] || 140), 0)}px`;
    const tbody = document.createElement("tbody");
    this.table.append(tbody);
    t.cells.forEach((row, r) => {
      if (r > 0 && this.filter) {
        const v = row[this.filter.c] ?? "";
        if (this.filter.mode === "equals" ? v !== this.filter.value : !v.toLocaleLowerCase().includes(this.filter.value.toLocaleLowerCase())) return;
      }
      const tr = document.createElement("tr");
      tbody.append(tr);
      row.forEach((content, c) => {
        const g = owner(t, r, c);
        if (g && (g.r !== r || g.c !== c)) return;
        tr.style.height = `${t.meta.heights[r] || 32}px`;
        const td = document.createElement(r === 0 ? "th" : "td");
        td.dataset.r = String(r);
        td.dataset.c = String(c);
        if (g) {
          td.rowSpan = g.rs;
          td.colSpan = g.cs;
        }
        const s = t.meta.styles[key(r, c)];
        td.style.verticalAlign = s?.verticalAlign ?? "top";
        td.style.textAlign = s?.align ?? t.align[c] ?? "left";
        if (s?.background) td.style.backgroundColor = s.background;
        if (s?.verticalAlign) td.style.verticalAlign = s.verticalAlign;
        if (s?.align) td.style.textAlign = s.align;
        if (s?.color) td.style.color = s.color;
        if (s?.bold !== void 0) td.style.fontWeight = s.bold ? "700" : "400";
        if (s?.italic) td.style.fontStyle = "italic";
        td.style.textDecoration = [s?.underline ? "underline" : "", s?.strike ? "line-through" : ""].filter(Boolean).join(" ");
        if (s?.borderColor || s?.borderWidth !== void 0) {
          for (const edge of s.borderEdges ?? ["top", "right", "bottom", "left"]) {
            if (["top", "right", "bottom", "left"].includes(edge)) td.style.setProperty(`border-${edge}`, `${s.borderWidth ?? 1}px ${s.borderWidth === 0 ? "hidden" : "solid"} ${s.borderColor ?? "var(--background-modifier-border)"}`);
          }
        }
        if (s?.borderRules) {
          for (const [edge, rule] of Object.entries(s.borderRules)) if (["top", "right", "bottom", "left"].includes(edge)) td.style.setProperty(`border-${edge}`, `${rule.width}px ${rule.style} ${rule.color}`);
        }
        if (s?.fontSize) td.style.fontSize = `${s.fontSize}px`;
        if (s?.comment) {
          td.title = s.comment;
          td.classList.add("nt-has-comment");
        }
        const value = document.createElement("div");
        value.className = "nt-value";
        if (s?.highlight) value.style.backgroundColor = s.highlight;
        value.textContent = content.replace(/<br\s*\/?\s*>/gi, "\n").replace(/\\\|/g, "|");
        value.style.minHeight = "0";
        td.append(value);
        for (const direction of ["diagonalDown", "diagonalUp"]) if (s?.[direction]) {
          const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          svg.setAttribute("viewBox", "0 0 100 100");
          svg.setAttribute("preserveAspectRatio", "none");
          svg.classList.add("nt-diagonal");
          const line = document.createElementNS(svg.namespaceURI, "line");
          line.setAttribute("x1", "0");
          line.setAttribute("x2", "100");
          line.setAttribute("y1", direction === "diagonalDown" ? "0" : "100");
          line.setAttribute("y2", direction === "diagonalDown" ? "100" : "0");
          line.setAttribute("stroke", s.borderColor || "#808080");
          line.setAttribute("vector-effect", "non-scaling-stroke");
          svg.append(line);
          td.append(svg);
        }
        tr.append(td);
        const render = () => {
          value.replaceChildren();
          void import_obsidian.MarkdownRenderer.render(this.o.app, content.replace(/\\\|/g, "|"), value, this.o.source, this.o.component).catch(() => {
            if (!this.disposed) value.textContent = content;
          });
        };
        if (this.observer) {
          pending.set(value, render);
          this.observer.observe(value);
        } else render();
        if (this.o.commit) {
          td.addEventListener("pointerdown", (e) => {
            if (this.editing || e.button !== 0 || e.target.closest("a")) return;
            e.preventDefault();
            this.el.focus();
            this.active = true;
            this.toolbar.hidden = false;
            this.closePopup();
            const p = { r, c };
            this.cursor = p;
            if (!e.shiftKey) this.anchor = p;
            this.selection = rect(this.anchor, p);
            this.dragging = false;
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.mark();
          });
          td.addEventListener("dblclick", () => this.edit(r, c));
          td.addEventListener("contextmenu", (e) => {
            e.preventDefault();
            if (r < this.selection.r || r > this.selection.er || c < this.selection.c || c > this.selection.ec) this.selection = rect({ r, c }, { r, c });
            this.mark();
            this.menu(e);
          });
          this.handle(td, "col", c + (g?.cs ?? 1) - 1);
          this.handle(td, "row", r + (g?.rs ?? 1) - 1);
        }
      });
    });
    this.mark();
  }
  mark() {
    this.controls.hidden = !this.active || this.editing || Boolean(this.resizing);
    if (this.resizing) {
      const { axis, index } = this.resizing;
      this.el.classList.add("nt-resizing");
      this.table.querySelectorAll("td,th").forEach((td) => {
        const r = Number(td.dataset.r), c = Number(td.dataset.c), g = owner(this.o.table, r, c);
        const start = axis === "row" ? r : c, span = axis === "row" ? g?.rs ?? 1 : g?.cs ?? 1;
        td.classList.toggle("nt-resizing-cell", start <= index && start + span > index);
        td.classList.remove("nt-selected");
      });
      this.outline.hidden = true;
      this.toolbar.hidden = true;
      return;
    }
    this.el.classList.remove("nt-resizing");
    this.table.querySelectorAll(".nt-resizing-cell").forEach((td) => td.classList.remove("nt-resizing-cell"));
    if (this.o.session) {
      this.o.session.selection = this.selection;
      this.o.session.filter = this.filter;
    }
    const selected = [];
    this.table.querySelectorAll("td,th").forEach((td) => {
      const r = Number(td.dataset.r), c = Number(td.dataset.c), g = owner(this.o.table, r, c);
      const yes = r <= this.selection.er && r + (g?.rs ?? 1) > this.selection.r && c <= this.selection.ec && c + (g?.cs ?? 1) > this.selection.c;
      td.classList.toggle("nt-selected", yes && this.active);
      if (yes) selected.push(td);
    });
    const style = this.o.table.meta.styles[key(this.selection.r, this.selection.c)];
    for (const [label, field] of [["\u7C97\u4F53", "bold"], ["\u659C\u4F53", "italic"], ["\u4E0B\u5212\u7EBF", "underline"], ["\u5220\u9664\u7EBF", "strike"]]) {
      this.toolbar.querySelector(`[aria-label="${label}"]`)?.setAttribute("aria-pressed", String(Boolean(style?.[field])));
    }
    this.edges();
    if (!selected.length || !this.active || !this.o.commit) {
      this.outline.hidden = true;
      this.toolbar.hidden = true;
      return;
    }
    const boxes = selected.map((td) => td.getBoundingClientRect()), left = Math.min(...boxes.map((b2) => b2.left)), right = Math.max(...boxes.map((b2) => b2.right)), top = Math.min(...boxes.map((b2) => b2.top)), bottom = Math.max(...boxes.map((b2) => b2.bottom));
    const base = this.el.getBoundingClientRect();
    Object.assign(this.outline.style, { left: `${left - base.left}px`, top: `${top - base.top}px`, width: `${right - left}px`, height: `${bottom - top}px` });
    this.outline.hidden = this.editing;
    this.toolbar.hidden = this.editing;
    const b = this.toolbar.getBoundingClientRect();
    const above = (this.selection.r === 0 ? Math.min(top, base.top) : top) - b.height - 8;
    let y = Math.min(top, this.table.getBoundingClientRect().top) - b.height - 14;
    if (y < 8) y = bottom + 8;
    if (y + b.height > window.innerHeight - 8) y = Math.max(8, above);
    this.toolbar.style.left = `${Math.max(8, Math.min(left, window.innerWidth - b.width - 8))}px`;
    this.toolbar.style.top = `${y}px`;
    this.positionPopup();
  }
  endDrag = () => {
    this.axisDrag = void 0;
    this.dragging = false;
    this.dragStart = void 0;
  };
  onDrag = (e) => {
    if (!this.dragStart || this.editing) return;
    if (!(e.buttons & 1)) {
      this.endDrag();
      return;
    }
    if (!this.dragging && Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y) < 6) return;
    this.dragging = true;
    const td = e.target.closest("td[data-r],th[data-r]");
    if (!td || !this.table.contains(td)) return;
    const r = Number(td.dataset.r), c = Number(td.dataset.c);
    this.cursor = { r, c };
    this.selection = rect(this.anchor, { r, c });
    this.mark();
  };
  edit(r, c, initial) {
    if (this.editing) return;
    const g = owner(this.o.table, r, c);
    if (g) {
      r = g.r;
      c = g.c;
    }
    const td = this.table.querySelector(`[data-r="${r}"][data-c="${c}"]`);
    if (!td) return;
    this.endDrag();
    this.active = true;
    const cellHeight = td.getBoundingClientRect().height;
    this.selection = rect({ r, c }, { r, c });
    this.anchor = { r, c };
    this.cursor = { r, c };
    this.editing = true;
    this.controls.hidden = true;
    this.outline.hidden = true;
    this.toolbar.hidden = true;
    this.closePopup();
    const input = document.createElement("textarea");
    input.className = "nt-editor";
    input.style.minHeight = `${Math.max(32, cellHeight - 16)}px`;
    input.value = initial ?? this.o.table.cells[r][c].replace(/<br\s*\/?\s*>/gi, "\n");
    td.replaceChildren(input);
    const fit = () => {
      input.style.height = "auto";
      input.style.height = `${Math.max(32, cellHeight - 16, input.scrollHeight)}px`;
    };
    input.addEventListener("input", fit);
    fit();
    input.focus();
    if (initial === void 0) input.select();
    let finished = false;
    const done = (save) => {
      if (finished) return;
      finished = true;
      this.editing = false;
      if (save) {
        const value = input.value.replace(/\n/g, "<br>");
        this.apply((t) => t.cells[r][c] = value, this.active);
      } else this.render();
    };
    input.onblur = () => done(true);
    input.onkeydown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        done(false);
        this.el.focus();
      } else if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        done(true);
      } else if (e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        let nc = c + (e.shiftKey ? -1 : 1), nr = r;
        const cols = this.o.table.cells[0].length;
        if (nc >= cols) {
          nc = 0;
          nr++;
        }
        if (nc < 0) {
          nc = cols - 1;
          nr--;
        }
        nr = Math.max(0, Math.min(nr, this.o.table.cells.length - 1));
        this.selection = rect({ r: nr, c: nc }, { r: nr, c: nc });
        done(true);
      }
    };
  }
  onKey = (e) => {
    if (this.editing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.dismiss();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && ["c", "v"].includes(e.key.toLowerCase())) return;
    if ((e.ctrlKey || e.metaKey) && ["z", "y"].includes(e.key.toLowerCase())) {
      e.preventDefault();
      this.o.history?.(e.key.toLowerCase() === "y" || e.shiftKey);
      return;
    }
    const a = this.selection;
    if (e.key === "Enter") {
      e.preventDefault();
      this.edit(a.r, a.c);
    } else if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"].includes(e.key)) {
      e.preventDefault();
      let r = this.cursor.r, c = this.cursor.c;
      const g = owner(this.o.table, r, c);
      if (e.key === "ArrowUp") r = (g?.r ?? r) - 1;
      if (e.key === "ArrowDown") r = (g?.r ?? r) + (g?.rs ?? 1);
      if (e.key === "ArrowLeft") c = (g?.c ?? c) - 1;
      if (e.key === "ArrowRight") c = (g?.c ?? c) + (g?.cs ?? 1);
      if (e.key === "Tab") {
        c += e.shiftKey ? -1 : 1;
        if (c >= this.o.table.cells[0].length) {
          r++;
          c = 0;
        }
        if (c < 0) {
          r--;
          c = this.o.table.cells[0].length - 1;
        }
      }
      r = Math.max(0, Math.min(r, this.o.table.cells.length - 1));
      c = Math.max(0, Math.min(c, this.o.table.cells[0].length - 1));
      this.cursor = { r, c };
      this.selection = e.shiftKey && e.key !== "Tab" ? rect(this.anchor, { r, c }) : rect({ r, c }, { r, c });
      if (!e.shiftKey) this.anchor = { r, c };
      this.active = true;
      this.mark();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      this.apply((t) => this.selected((r, c) => {
        const g = owner(t, r, c);
        if (!g || g.r === r && g.c === c) t.cells[r][c] = "";
      }));
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.edit(a.r, a.c, e.key);
    }
  };
  onCopy = (e) => {
    if (this.editing) return;
    e.preventDefault();
    const a = this.selection, t = this.o.table;
    const text = t.cells.slice(a.r, a.er + 1).map((r) => r.slice(a.c, a.ec + 1).join("	")).join("\n");
    e.clipboardData?.setData("text/plain", text);
    const el = document.createElement("table");
    for (let r = a.r; r <= a.er; r++) {
      const tr = el.insertRow();
      for (let c = a.c; c <= a.ec; c++) {
        const g = owner(t, r, c);
        if (g && (g.r !== r || g.c !== c) && g.r >= a.r && g.c >= a.c) continue;
        const td = tr.insertCell();
        td.textContent = t.cells[r][c];
        if (g && g.r >= a.r && g.c >= a.c) {
          td.rowSpan = Math.min(g.rs, a.er - r + 1);
          td.colSpan = Math.min(g.cs, a.ec - c + 1);
        }
        const s = t.meta.styles[key(r, c)];
        if (s?.background) td.style.backgroundColor = s.background;
        if (s?.verticalAlign) td.style.verticalAlign = s.verticalAlign;
        if (s?.align) td.style.textAlign = s.align;
        if (s?.color) td.style.color = s.color;
        if (s?.bold !== void 0) td.style.fontWeight = s.bold ? "700" : "400";
        if (s?.italic) td.style.fontStyle = "italic";
        td.style.textDecoration = [s?.underline ? "underline" : "", s?.strike ? "line-through" : ""].filter(Boolean).join(" ");
        if (s?.fontSize) td.style.fontSize = `${s.fontSize}px`;
        if (s?.borderRules) {
          for (const [edge, rule] of Object.entries(s.borderRules)) if (["top", "right", "bottom", "left"].includes(edge)) td.style.setProperty(`border-${edge}`, `${rule.width}px ${rule.style} ${rule.color}`);
        }
        if (s?.borderColor && !s?.borderRules) td.style.border = `${s.borderWidth ?? 1}px solid ${s.borderColor}`;
        td.style.width = `${t.meta.widths[c] || 140}px`;
      }
    }
    e.clipboardData?.setData("text/html", el.outerHTML);
  };
  onPaste = (e) => {
    if (this.editing) return;
    e.preventDefault();
    try {
      const incoming = clipboard(e.clipboardData?.getData("text/html") ?? "", e.clipboardData?.getData("text/plain") ?? "");
      this.apply((t) => paste(t, incoming, this.selection.r, this.selection.c));
    } catch (err) {
      new import_obsidian.Notice(err.message);
    }
  };
  axisSize(axis, index) {
    const element = axis === "col" ? this.table.querySelectorAll("col")[index] : this.table.querySelector(`[data-r="${index}"]`)?.parentElement;
    const box = element?.getBoundingClientRect();
    const actual = axis === "col" ? box?.width : box?.height;
    return actual && actual > 0 ? actual : axis === "col" ? this.o.table.meta.widths[index] || 140 : this.o.table.meta.heights[index] || 32;
  }
  previewAxis(axis, index = 0) {
    this.table.querySelectorAll("td,th").forEach((td) => {
      const r = Number(td.dataset.r), c = Number(td.dataset.c), g = owner(this.o.table, r, c), start = axis === "row" ? r : c, span = axis === "row" ? g?.rs ?? 1 : g?.cs ?? 1;
      td.classList.toggle("nt-resize-preview", Boolean(axis) && start <= index && start + span > index);
    });
  }
  handle(td, axis, index) {
    const h = document.createElement("span");
    h.className = `nt-resize nt-resize-${axis}`;
    h.title = axis === "col" ? "\u62D6\u52A8\u8C03\u6574\u6574\u5217\u5BBD\u5EA6" : "\u62D6\u52A8\u8C03\u6574\u6574\u884C\u9AD8\u5EA6";
    h.onpointerenter = () => {
      if (!this.resizing && !this.editing) this.previewAxis(axis, index);
    };
    h.onpointerleave = () => {
      if (!this.resizing) this.previewAxis();
    };
    h.ondblclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
    h.onpointerdown = (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      this.endDrag();
      this.closePopup();
      this.previewAxis();
      this.resizing = { axis, index };
      this.active = false;
      if (this.o.session) this.o.session.focus = false;
      this.mark();
      const start = axis === "col" ? e.clientX : e.clientY, initial = this.axisSize(axis, index), columnSizes = this.o.table.cells[0].map((_, c) => this.axisSize("col", c));
      let value = initial;
      h.setPointerCapture(e.pointerId);
      h.onpointermove = (ev) => {
        value = Math.max(axis === "col" ? 48 : 24, Math.round(initial + (axis === "col" ? ev.clientX : ev.clientY) - start));
        h.title = `${value}px`;
        if (axis === "col") {
          const col = this.table.querySelectorAll("col")[index];
          col.style.width = `${value}px`;
          this.table.style.width = `${columnSizes.reduce((sum, w, c) => sum + (c === index ? value : w), 0)}px`;
        } else {
          const row = this.table.querySelector(`[data-r="${index}"]`)?.parentElement;
          if (row) row.style.height = `${value}px`;
        }
      };
      h.onpointercancel = () => {
        h.onpointermove = null;
        h.onpointerup = null;
        this.resizing = void 0;
        this.render();
      };
      h.onpointerup = () => {
        h.onpointermove = null;
        h.onpointerup = null;
        this.resizing = void 0;
        this.mark();
        if (value === initial) return;
        this.apply((t) => (axis === "col" ? t.meta.widths : t.meta.heights)[index] = value, false);
      };
    };
    td.append(h);
  }
  filterDialog() {
    try {
      assertSortable(this.o.table);
    } catch (e) {
      new import_obsidian.Notice(e.message);
      return;
    }
    new InputModal(this.o.app, "\u7B5B\u9009\u5F53\u524D\u5217", [{ name: "\u6761\u4EF6\uFF1Acontains / equals\uFF08\u7559\u7A7A\u503C\u6E05\u9664\u7B5B\u9009\uFF09", value: "contains" }, { name: "\u7B5B\u9009\u503C", value: "" }], (v) => {
      if (!["contains", "equals"].includes(v[0])) {
        new import_obsidian.Notice("\u6761\u4EF6\u5E94\u4E3A contains \u6216 equals");
        return;
      }
      this.filter = v[1] ? { c: this.selection.c, mode: v[0], value: v[1] } : void 0;
      this.render();
    }).open();
  }
  menu(e) {
    const menu = new import_obsidian.Menu();
    const add = (name, fn) => menu.addItem((i) => i.setTitle(name).onClick(fn));
    add("\u5408\u5E76\u5355\u5143\u683C", () => this.apply((t) => merge(t, this.selection)));
    add("\u62C6\u5206\u5355\u5143\u683C", () => this.apply((t) => unmerge(t, this.selection)));
    add("\u5BF9\u9F50\u65B9\u5F0F", () => this.alignPanel());
    add("\u8BBE\u7F6E\u8FB9\u6846", () => this.borderDialog());
    add("\u8C03\u6574\u5C3A\u5BF8", () => this.sizePanel());
    add("\u6E05\u9664\u6240\u9009\u683C\u5F0F", () => this.apply((t) => this.selected((r, c) => delete t.meta.styles[key(r, c)])));
    menu.addSeparator();
    add("\u5347\u5E8F\u6392\u5E8F", () => this.apply((t) => sort(t, this.selection.c)));
    add("\u964D\u5E8F\u6392\u5E8F", () => this.apply((t) => sort(t, this.selection.c, true)));
    add("\u7B5B\u9009\u5F53\u524D\u5217", () => this.filterDialog());
    add("\u6E05\u9664\u7B5B\u9009", () => {
      this.filter = void 0;
      this.render();
    });
    menu.addSeparator();
    for (const axis of ["row", "col"]) {
      const index = axis === "row" ? this.selection.r : this.selection.c;
      add(axis === "row" ? "\u5728\u4E0B\u65B9\u63D2\u5165\u884C" : "\u5728\u53F3\u4FA7\u63D2\u5165\u5217", () => this.apply((t) => structure(t, axis, index + 1)));
      add(axis === "row" ? "\u5220\u9664\u5F53\u524D\u884C" : "\u5220\u9664\u5F53\u524D\u5217", () => {
        const act = () => this.apply((t) => structure(t, axis, index, true));
        const has = axis === "row" ? this.o.table.cells[index].some(Boolean) : this.o.table.cells.some((r) => Boolean(r[index]));
        if (has) new ConfirmModal(this.o.app, act).open();
        else act();
      });
    }
    menu.addSeparator();
    if (this.o.fallback) add("\u4F7F\u7528\u539F\u751F\u8868\u683C\u7F16\u8F91", this.o.fallback);
    if (e) menu.showAtMouseEvent(e);
    else {
      const b = this.toolbar.getBoundingClientRect();
      menu.showAtPosition({ x: b.left, y: b.bottom });
    }
  }
};

// src/main.ts
var refresh = import_state.StateEffect.define();
var TableWidget = class extends import_view.WidgetType {
  constructor(plugin, table, path) {
    super();
    this.plugin = plugin;
    this.table = table;
    this.path = path;
  }
  eq(other) {
    return this.path === other.path && this.table.from === other.table.from && JSON.stringify(this.table) === JSON.stringify(other.table);
  }
  toDOM(view) {
    const t = this.table, p = this.plugin;
    let grid;
    const component = new import_obsidian2.Component();
    component.load();
    const commit = (next) => {
      const current = scan(view.state.doc.toString()).find((x) => x.from === t.from);
      if (!current || view.state.doc.sliceString(current.from, current.to) !== serializeOriginal) {
        new import_obsidian2.Notice("\u8868\u683C\u5DF2\u88AB\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u540E\u64CD\u4F5C");
        return;
      }
      if (next.meta.id.startsWith("plain-")) {
        const oldKey = this.path + ":" + next.meta.id + ":" + t.from;
        next.meta.id = globalThis.crypto.randomUUID();
        const session = p.sessions.get(oldKey);
        if (session) p.sessions.set(this.path + ":" + next.meta.id + ":" + t.from, session);
        p.sessions.delete(oldKey);
      }
      const insert = serialize(next);
      view.dispatch({ changes: { from: current.from, to: current.to, insert }, selection: { anchor: current.from }, userEvent: "input" });
      view.focus();
    };
    const serializeOriginal = view.state.doc.sliceString(t.from, t.to);
    grid = new Grid({ app: p.app, source: this.path, component, table: t, session: p.sessions.get(this.path + ":" + t.meta.id + ":" + t.from) ?? (() => {
      const s = {};
      p.sessions.set(this.path + ":" + t.meta.id + ":" + t.from, s);
      return s;
    })(), commit, history: (forward) => {
      (forward ? import_commands.redo : import_commands.undo)(view);
    }, fallback: () => {
      p.native.add(`${this.path}:${t.from}`);
      view.dispatch({ effects: refresh.of() });
      view.focus();
    }, reset: () => {
      const next = structuredClone(t);
      next.meta = fresh(next.cells);
      next.error = void 0;
      commit(next);
    } });
    p.grids.set(grid.el, grid);
    p.components.set(grid.el, component);
    return grid.el;
  }
  destroy(dom) {
    this.plugin.grids.get(dom)?.destroy();
    this.plugin.grids.delete(dom);
    this.plugin.components.get(dom)?.unload();
    this.plugin.components.delete(dom);
  }
  ignoreEvent() {
    return true;
  }
};
var NativeTables = class extends import_obsidian2.Plugin {
  settings = { enabled: true };
  native = /* @__PURE__ */ new Set();
  grids = /* @__PURE__ */ new Map();
  components = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  async onload() {
    Object.assign(this.settings, await this.loadData());
    const p = this;
    const field = import_state.StateField.define({ create: (state) => decorate(state), update: (v, tr) => tr.docChanged || tr.effects.length ? decorate(tr.state) : v, provide: (f) => import_view.EditorView.decorations.from(f) });
    const decorate = (state) => {
      if (!p.settings.enabled || !state.field(import_obsidian2.editorLivePreviewField, false)) return import_view.Decoration.none;
      const info = state.field(import_obsidian2.editorInfoField, false), path = info?.file?.path ?? "";
      if (!path) return import_view.Decoration.none;
      const tables = scan(state.doc.toString());
      const ranges = tables.filter((t) => !p.native.has(`${path}:${t.from}`)).map((t) => {
        return import_view.Decoration.replace({ widget: new TableWidget(p, t, path), block: true }).range(t.from, t.to);
      });
      return import_view.Decoration.set(ranges, true);
    };
    this.registerEditorExtension(import_state.Prec.highest(field));
    this.registerMarkdownPostProcessor((el, ctx) => {
      if (!p.settings.enabled) return;
      const source = p.app.vault.getAbstractFileByPath(ctx.sourcePath);
      if (!source || !("extension" in source)) return;
      void p.app.vault.cachedRead(source).then((text) => {
        const tables = scan(text);
        el.querySelectorAll("table").forEach((table) => {
          if (table.closest(".nt-grid")) return;
          const info = ctx.getSectionInfo(table);
          if (!info) return;
          const offset = text.split("\n").slice(0, info.lineStart).join("\n").length + (info.lineStart ? 1 : 0), end = text.split("\n").slice(0, info.lineEnd + 1).join("\n").length;
          const candidates = tables.filter((t) => t.from >= offset && t.from <= end);
          const index = Array.from(el.querySelectorAll("table")).indexOf(table);
          const model = candidates.length === 1 ? candidates[0] : candidates[index];
          if (!model) return;
          const child = new import_obsidian2.MarkdownRenderChild(document.createElement("div"));
          ctx.addChild(child);
          const grid = new Grid({ app: p.app, source: ctx.sourcePath, component: child, table: model });
          table.replaceWith(grid.el);
          child.register(() => grid.destroy());
        });
      });
    });
    this.addSettingTab(new NativeSettings(this));
    this.addCommand({ id: "restore-enhanced", name: "\u6062\u590D\u589E\u5F3A\u8868\u683C\u7F16\u8F91", callback: () => {
      this.native.clear();
      this.refresh();
    } });
    this.addCommand({ id: "insert-table", name: "\u63D2\u5165\u589E\u5F3A\u8868\u683C", editorCallback: (editor) => {
      const cells = [["\u6807\u9898 1", "\u6807\u9898 2", "\u6807\u9898 3"], ["", "", ""], ["", "", ""]];
      editor.replaceSelection("\n" + serialize({ from: 0, to: 0, cells, align: [], meta: fresh(cells) }) + "\n");
    } });
  }
  refresh() {
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.view instanceof import_obsidian2.MarkdownView) {
        const editor = leaf.view.editor;
        editor.cm?.dispatch({ effects: refresh.of() });
      }
    });
  }
  onunload() {
    for (const g of this.grids.values()) g.destroy();
    this.grids.clear();
    for (const c of this.components.values()) c.unload();
    this.components.clear();
    this.sessions.clear();
  }
};
var NativeSettings = class extends import_obsidian2.PluginSettingTab {
  constructor(plugin) {
    super(plugin.app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian2.Setting(this.containerEl).setName("\u589E\u5F3A\u8868\u683C\u7F16\u8F91").setDesc("\u9ED8\u8BA4\u63A5\u7BA1\u9876\u5C42 Markdown \u8868\u683C\u3002\u5207\u6362\u540E\u91CD\u65B0\u6253\u5F00\u9605\u8BFB\u89C6\u56FE\u4EE5\u5237\u65B0\u3002").addToggle((t) => t.setValue(this.plugin.settings.enabled).onChange(async (value) => {
      this.plugin.settings.enabled = value;
      await this.plugin.saveData(this.plugin.settings);
      this.plugin.refresh();
    }));
  }
};
