import Mustache from 'mustache';

/**
 * Render an email template with Mustache (a real, battle-tested template engine).
 *
 * The discount sentence MUST be wrapped in {{#discount_active}}…{{/discount_active}} so it
 * is omitted entirely when the discount is 0% (see references/email-copy.md). We compute
 * `discount_active` here so templates stay simple and the 0%-rule is enforced in one place.
 */
export function renderEmail(template, data = {}) {
  const view = { ...data, discount_active: Number(data.discount_pct) > 0 };
  return Mustache.render(template, view);
}

export function renderSubject(template, data = {}) {
  return Mustache.render(template, data);
}
