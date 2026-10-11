// Markdown is canonical; generate the complete HTML pages and check local links.
const fs = require("node:fs/promises");
const path = require("node:path");

const prettier = require("prettier");
const markdown = require("prettier/plugins/markdown");

const root = path.resolve(__dirname, "../docs/nestjs-fundamentals");
const checkOnly = process.argv.includes("--check");
const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const walk = (node, fn) => {
  fn(node);
  for (const child of node.children ?? []) walk(child, fn);
};
const plain = (node) => node.value ?? (node.children ?? []).map(plain).join("");
const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
const outputName = (name) =>
  name === "README.md" ? "index.html" : name.replace(/\.md$/, ".html");

async function readDocument(file) {
  const source = await fs.readFile(file, "utf8");
  const ast = await markdown.parsers.markdown.parse(source);
  const headings = [];
  const links = [];
  const used = new Set();
  walk(ast, (node) => {
    if (node.type === "heading") {
      const base = slug(plain(node));
      let id = base;
      let suffix = 0;
      while (used.has(id)) id = `${base}-${++suffix}`;
      used.add(id);
      node.id = id;
      headings.push(node);
    }
    if (node.type === "link" || node.type === "image") links.push(node.url);
  });
  return { ast, headings, links, ids: used, file };
}

async function main() {
  const names = (await fs.readdir(root))
    .filter((name) => name.endsWith(".md"))
    .sort();
  const documents = new Map(
    await Promise.all(
      names.map(async (name) => [
        name,
        await readDocument(path.join(root, name)),
      ]),
    ),
  );
  const externalDocuments = new Map();
  const errors = [];
  let linkCount = 0;
  for (const [name, doc] of documents) {
    for (const url of doc.links) {
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(url)) continue;
      linkCount++;
      const [rawFile, rawHash] = url.split("#");
      const target = path.resolve(root, decodeURIComponent(rawFile || name));
      const sameDirectory = path.dirname(target) === root;
      let targetName = path.basename(target);
      if (sameDirectory && targetName.endsWith(".html")) {
        targetName =
          targetName === "index.html"
            ? "README.md"
            : targetName.replace(/\.html$/, ".md");
      }
      let targetDoc = sameDirectory ? documents.get(targetName) : undefined;
      if (!targetDoc) {
        try {
          await fs.access(target);
          if (target.endsWith(".md")) {
            if (!externalDocuments.has(target))
              externalDocuments.set(target, await readDocument(target));
            targetDoc = externalDocuments.get(target);
          }
        } catch {
          errors.push(`${name}: missing file ${url}`);
          continue;
        }
      }
      if (
        rawHash &&
        targetDoc &&
        !targetDoc.ids.has(decodeURIComponent(rawHash))
      ) {
        errors.push(`${name}: missing anchor ${url}`);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));

  const css = await fs.readFile(
    path.join(root, "assets/fundamentals.css"),
    "utf8",
  );
  const js = await fs.readFile(
    path.join(root, "assets/fundamentals.mjs"),
    "utf8",
  );
  const series = names.filter((name) => name !== "README.md");
  const shortLabels = [
    "00 Prototype",
    "01 Decorator",
    "02 Reflector",
    "03 Guard",
    "04 Middleware",
    "05 Vòng đời request",
    "06 Module & DI",
    "07 DTO",
    "08 Instance & scope",
    "09 Interceptor",
    "10 Filter",
    "11 Controller",
    "12 Pipe",
    "13 Testing",
    "14 Bootstrap",
  ];
  const relink = (url) => {
    const [file, hash] = url.split("#");
    const normalized = file.replace(/^\.\//, "");
    return documents.has(normalized)
      ? outputName(normalized) + (hash ? `#${hash}` : "")
      : url;
  };
  const render = (node) => {
    const children = () => (node.children ?? []).map(render).join("");
    switch (node.type) {
      case "root":
        return children();
      case "text":
        return escapeHtml(node.value);
      case "inlineCode":
        return `<code>${escapeHtml(node.value)}</code>`;
      case "strong":
        return `<strong>${children()}</strong>`;
      case "emphasis":
        return `<em>${children()}</em>`;
      case "delete":
        return `<del>${children()}</del>`;
      case "paragraph":
        return `<p class="prose">${children()}</p>`;
      case "heading":
        return `<h${node.depth} id="${escapeHtml(node.id)}" class="${node.depth === 2 ? "sec-head" : "sub"}">${children()}</h${node.depth}>`;
      case "link":
        return `<a href="${escapeHtml(relink(node.url))}">${children()}</a>`;
      case "image":
        return `<img src="${escapeHtml(node.url)}" alt="${escapeHtml(node.alt ?? "")}" loading="lazy">`;
      case "blockquote":
        return `<blockquote>${children()}</blockquote>`;
      case "list":
        return `<${node.ordered ? "ol" : "ul"}${node.ordered ? ` start="${node.start ?? 1}"` : ""}>${children()}</${node.ordered ? "ol" : "ul"}>`;
      case "listItem":
        return `<li>${children()}</li>`;
      case "thematicBreak":
        return "<hr>";
      case "break":
        return "<br>";
      case "html":
        return node.value;
      case "table":
        return `<div class="table-wrap"><table><thead>${renderRow(node.children[0], "th")}</thead><tbody>${node.children
          .slice(1)
          .map((row) => renderRow(row, "td"))
          .join("")}</tbody></table></div>`;
      case "code": {
        if (node.lang !== "mermaid")
          return `<div class="code-file"><div class="code-file__header">${escapeHtml(node.lang ?? "text")}</div><pre class="code-file__body"><code>${escapeHtml(node.value)}</code></pre></div>`;
        return `<section class="diagram-shell"><p class="diagram-shell__hint">Ctrl/Cmd + lăn để phóng · kéo để di chuyển</p><div class="mermaid-wrap"><div class="zoom-controls"><button type="button" data-action="zoom-in" aria-label="Phóng to">+</button><button type="button" data-action="zoom-out" aria-label="Thu nhỏ">−</button><button type="button" data-action="zoom-fit" aria-label="Vừa khung">↺</button><button type="button" data-action="zoom-one">1:1</button><button type="button" data-action="zoom-expand" aria-label="Mở rộng">⛶</button><span class="zoom-label">Đang tải…</span></div><div class="mermaid-viewport"><div class="mermaid mermaid-canvas"></div></div></div><script type="text/plain" class="diagram-source">${node.value.replace(/<\/script/gi, "<\\/script")}</script><details class="diagram-code"><summary>Mã sơ đồ (xem khi offline)</summary><pre><code>${escapeHtml(node.value)}</code></pre></details></section>`;
      }
      default:
        throw new Error(`Unsupported Markdown node: ${node.type}`);
    }
  };
  const renderRow = (node, cell) =>
    `<tr>${node.children.map((entry) => `<${cell}>${entry.children.map(render).join("")}</${cell}>`).join("")}</tr>`;
  const config = await prettier.resolveConfig(path.join(root, "index.html"));
  const outputs = [];
  for (const [name, doc] of documents) {
    const heading = doc.headings.find((entry) => entry.depth === 1);
    const title = heading ? plain(heading) : name;
    const toc = doc.headings
      .filter((entry) => entry.depth === 2)
      .map(
        (entry) =>
          `<a href="#${escapeHtml(entry.id)}">${escapeHtml(plain(entry))}</a>`,
      )
      .join("");
    const nav = series
      .map(
        (entry) =>
          `<a href="${outputName(entry)}"${entry === name ? ' aria-current="page"' : ""}>${escapeHtml(shortLabels[Number(entry.slice(0, 2))] ?? plain(documents.get(entry).headings[0]))}</a>`,
      )
      .join("");
    const body = {
      ...doc.ast,
      children: doc.ast.children.filter((entry) => entry !== heading),
    };
    const html = await prettier.format(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&amp;family=Azeret+Mono:wght@400;500;600&amp;display=swap" rel="stylesheet"><style>${css}</style></head><body><button class="theme-toggle" id="themeToggle" aria-label="Đổi giao diện sáng tối">☾</button><div class="wrap"><nav class="toc" aria-label="Mục lục chương"><div class="toc-title">Trong chương</div>${toc}<div class="toc-series"><a href="index.html">↑ Mục lục bộ</a><a href="${name}">Bản Markdown</a></div></nav><main class="main"><nav class="series-bar" aria-label="Các chương"><a href="index.html">Mục lục</a>${nav}</nav><header class="masthead"><h1 id="${escapeHtml(heading?.id ?? "title")}">${escapeHtml(title)}</h1></header>${render(body)}<footer class="source-footer"><a href="${name}">Nguồn Markdown</a> · Sinh bằng scripts/build-nestjs-fundamentals.cjs</footer></main></div><script type="module">${js}</script></body></html>`,
      { ...config, parser: "html" },
    );
    outputs.push([path.join(root, outputName(name)), html]);
  }
  if (checkOnly) {
    for (const [file, html] of outputs) {
      let actual = "";
      try {
        actual = await fs.readFile(file, "utf8");
      } catch {
        /* report missing output below */
      }
      if (actual !== html)
        errors.push(`HTML out of date: ${path.relative(process.cwd(), file)}`);
    }
    if (errors.length) throw new Error(errors.join("\n"));
  } else {
    for (const [file, html] of outputs) await fs.writeFile(file, html);
  }
  console.log(
    `${checkOnly ? "Checked" : "Generated"} ${outputs.length} HTML pages; ${linkCount} local links valid.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
