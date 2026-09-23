// Renders an email template for preview.
// Supports: {variable}, spin text {a|b|c} (preview shows the first option),
// and [if field = "value"]…[else]…[end].

export function renderTemplate(tpl: string, vars: Record<string, string>): string {
  let out = tpl.replace(
    /\[if\s+(\w+)\s*=\s*"([^"]*)"\]([\s\S]*?)(?:\[else\]([\s\S]*?))?\[end\]/g,
    (_m, field: string, val: string, yes: string, no?: string) =>
      (vars[field] ?? "").toLowerCase() === val.toLowerCase() ? yes : no ?? ""
  );
  out = out.replace(/\{([^{}]*\|[^{}]*)\}/g, (_m, opts: string) => opts.split("|")[0]);
  out = out.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = vars[key];
    if (v) return v;
    if (key === "website") return "your site";
    return `{${key}}`;
  });
  return out;
}

export const TEMPLATE_VARIABLES = ["first_name", "company", "website", "last_page_viewed", "visit_count"] as const;
