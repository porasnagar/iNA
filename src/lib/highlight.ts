import type { SourceLanguage } from "./android-source";

const KOTLIN_KEYWORDS = new Set(
  "package import class object interface fun val var private public internal protected override open abstract sealed data enum companion const lateinit by lazy init return if else when for while do in is as try catch finally throw null true false this super suspend inline operator infix typealias annotation get set field it".split(
    " ",
  ),
);

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const span = (cls: string, text: string) => `<span class="${cls}">${escape(text)}</span>`;

const KOTLIN_RE =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*")|(@[A-Za-z_][\w.]*)|(\b0x[0-9A-Fa-f_]+\b|\b\d[\d_]*(?:\.\d+)?[fFL]?\b)|([A-Za-z_][\w]*)/g;

function highlightKotlin(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(KOTLIN_RE)) {
    const idx = m.index ?? 0;
    out += escape(code.slice(last, idx));
    const [whole, comment, str, annotation, num, ident] = m;
    if (comment) out += span("text-muted-foreground italic", comment);
    else if (str) out += span("text-success", str);
    else if (annotation) out += span("text-warning", annotation);
    else if (num) out += span("text-tint-teal", num);
    else if (ident && KOTLIN_KEYWORDS.has(ident) && code[idx - 1] !== ".") out += span("text-tint-purple", ident);
    else if (ident && /^[A-Z]/.test(ident)) out += span("text-tint-blue", ident);
    else out += escape(whole);
    last = idx + whole.length;
  }
  return out + escape(code.slice(last));
}

const XML_RE = /(<!--[\s\S]*?-->)|(<\/?[\w:.-]+)|([\w:.-]+)(=)("[^"]*")|(\/?>)/g;

function highlightXml(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(XML_RE)) {
    const idx = m.index ?? 0;
    out += escape(code.slice(last, idx));
    const [whole, comment, tag, attr, eq, value, close] = m;
    if (comment) out += span("text-muted-foreground italic", comment);
    else if (tag) out += span("text-tint-blue", tag);
    else if (attr && eq && value) out += span("text-tint-purple", attr) + escape(eq) + span("text-success", value);
    else if (close) out += span("text-tint-blue", close);
    else out += escape(whole);
    last = idx + whole.length;
  }
  return out + escape(code.slice(last));
}

export function highlight(code: string, language: SourceLanguage): string {
  if (language === "kotlin" || language === "gradle") return highlightKotlin(code);
  if (language === "xml") return highlightXml(code);
  return escape(code);
}
