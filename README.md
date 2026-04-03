# prompt-tree

Build structured LLM prompts from composable primitives, with pluggable output formats (Markdown and XML).

Instead of wrestling with nested template literals and `.map().join()` chains, define prompts as code that visually resembles the output.

## Install

```
npm install prompt-tree
```

## Quick start

```js
import prompt, { section, when } from "prompt-tree";

const hasTickets = true;

const sys = prompt(
  "You are a helpful assistant.",

  section("RULES", [
    "Always be concise.",
    when(hasTickets,
      section("TICKETS", [
        "Use the ticket system.",
      ])
    ),
  ]),

  section("BEHAVIOUR", [
    when(hasTickets,
      "Offer to escalate tickets.",
      "Show contact info.",
    ),
    "Keep answers short.",
  ]),
);

sys.markdown();
sys.xml();
```

**Markdown output:**

```
## RULES

Always be concise.

### TICKETS

Use the ticket system.

## BEHAVIOUR

Offer to escalate tickets.
Keep answers short.
```

**XML output:**

```xml
<rules>
  Always be concise.
  <tickets>
    Use the ticket system.
  </tickets>
</rules>
<behaviour>
  Offer to escalate tickets.
  Keep answers short.
</behaviour>
```

## API

### `prompt(...blocks)`

Entry point. Returns an object with `.markdown(options?)` and `.xml()` methods.

### `section(title, content[])`

Creates a named section. Sections nest freely — heading depth (Markdown) and tag nesting (XML) are resolved at render time.

### `when(condition, ifTrue, ifFalse?)`

Conditional helper. Returns `ifTrue` when condition is truthy, `ifFalse` when falsy, or an internal `EMPTY` symbol if no else branch is provided. Falsy values are filtered out at render time.

### `raw(value)`

Wraps a string to bypass XML escaping. All regular strings are escaped by default to prevent tag injection. Use `raw()` when you need to pass through pre-built XML.

```js
import { raw } from "prompt-tree";

section("INFO", [
  "User said: <script>alert(1)</script>",  // escaped
  raw('<examples type="few-shot">...</examples>'),  // not escaped
])
```

### Markdown options

```js
sys.markdown({ headingDepth: 1 }) // top-level sections start at # instead of ##
```

## Behavior

- Falsy values (`null`, `undefined`, `false`, `""`) are filtered out — conditionals never leave blank lines.
- Empty sections (all content filtered out) are omitted entirely, including recursively.
- Consecutive strings within a section join with `\n` (tight lists). Sections are separated by `\n\n`.
- XML content is escaped by default (`<`, `>`, `&`, `"`). Use `raw()` to opt out.
- XML tag names are derived from section titles as kebab-case (`"MY RULES"` becomes `<my-rules>`).

## License

MIT