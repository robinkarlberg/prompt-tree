/**
 * Sentinel value returned by `when()` for falsy conditions with no else branch.
 * Filtered out at render time.
 */
export const EMPTY = Symbol("EMPTY");

/**
 * @typedef {{ type: 'section'; title: string; content: Block[] }} SectionNode
 * @typedef {{ type: 'raw'; value: string }} RawNode
 * @typedef {string | SectionNode | RawNode | typeof EMPTY | null | undefined | false} Block
 * @typedef {{ headingDepth?: number }} MarkdownOptions
 */

/**
 * Conditional block helper. Evaluates eagerly — just a ternary
 * that returns EMPTY instead of undefined for the missing else branch.
 *
 * @param {*} condition
 * @param {Block} ifTrue
 * @param {Block} [ifFalse]
 * @returns {Block}
 */
export function when(condition, ifTrue, ifFalse) {
  return condition ? ifTrue : (ifFalse !== undefined ? ifFalse : EMPTY);
}

/**
 * Creates a section node with a title and flat content array.
 *
 * @param {string} title
 * @param {Block[]} content
 * @returns {SectionNode}
 */
export function section(title, content) {
  return { type: "section", title, content };
}

/**
 * Wraps a string so it passes through renderers without escaping.
 *
 * @param {string} value
 * @returns {RawNode}
 */
export function raw(value) {
  return { type: "raw", value };
}

/**
 * @param {Block} block
 * @returns {block is SectionNode}
 */
function isSection(block) {
  return block != null && typeof block === "object" && block.type === "section";
}

/**
 * @param {Block} block
 * @returns {block is RawNode}
 */
function isRaw(block) {
  return block != null && typeof block === "object" && block.type === "raw";
}

/**
 * @param {Block} block
 * @returns {boolean}
 */
function isRenderable(block) {
  if (block === EMPTY || block == null || block === false || block === "") {
    return false;
  }
  return true;
}

/**
 * @param {Block[]} blocks
 * @returns {Block[]}
 */
function filter(blocks) {
  return blocks.filter(isRenderable);
}

// ── Markdown renderer ──────────────────────────────────────────────

/**
 * @param {Block[]} blocks
 * @param {number} depth
 * @returns {string}
 */
function renderMarkdown(blocks, depth) {
  /** @type {{ text: string; kind: 'string' | 'section' }[]} */
  const parts = [];
  const filtered = filter(blocks);

  for (const block of filtered) {
    if (isSection(block)) {
      const heading = "#".repeat(depth) + " " + block.title;
      const body = renderMarkdown(block.content, depth + 1);
      if (body) {
        parts.push({ text: heading + "\n\n" + body, kind: "section" });
      }
      // Empty section — omit entirely
    } else if (typeof block === "string" || isRaw(block)) {
      const text = isRaw(block) ? block.value : block;
      const prev = parts.length ? parts[parts.length - 1] : null;
      if (prev && prev.kind === "string") {
        // Consecutive strings merge with single newline (tight lists)
        prev.text += "\n" + text;
      } else {
        parts.push({ text, kind: "string" });
      }
    }
  }

  return parts.map((p) => p.text).join("\n\n");
}

// ── XML renderer ───────────────────────────────────────────────────

/**
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} text
 * @param {number} indent
 * @returns {string}
 */
function indentText(text, indent) {
  const prefix = "  ".repeat(indent);
  return text
    .split("\n")
    .map((line) => (line ? prefix + line : line))
    .join("\n");
}

/**
 * @param {string} title
 * @returns {string}
 */
function toTagName(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * @param {Block[]} blocks
 * @param {number} indent
 * @returns {string}
 */
function renderXml(blocks, indent) {
  const parts = [];
  const filtered = filter(blocks);

  for (const block of filtered) {
    if (isSection(block)) {
      const body = renderXml(block.content, indent + 1);
      if (!body) continue; // empty section — omit

      const tag = toTagName(block.title);
      parts.push(`<${tag}>\n` + indentText(body, 1) + `\n</${tag}>`);
    } else if (isRaw(block)) {
      parts.push(block.value);
    } else if (typeof block === "string") {
      parts.push(escapeXml(block));
    }
  }

  return parts.join("\n");
}

// ── Entry point ────────────────────────────────────────────────────

/**
 * Builds a prompt tree from a variadic list of blocks (strings, sections, when results).
 * Call `.markdown()` or `.xml()` on the result to render.
 *
 * @param {...Block} blocks
 * @returns {{ markdown(options?: MarkdownOptions): string, xml(options?: XmlOptions): string }}
 */
export default function prompt(...blocks) {
  return {
    /**
     * Render as Markdown with `#` headings.
     * @param {MarkdownOptions} [options]
     */
    markdown(options = {}) {
      const { headingDepth = 2 } = options;
      return renderMarkdown(blocks, headingDepth);
    },

    /**
     * Render as XML with semantic tag names derived from section titles.
     */
    xml() {
      return renderXml(blocks, 0);
    },
  };
}
