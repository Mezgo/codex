import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { preventFormSubmit } from "../../src/ui/prevent-form-submit.mjs";

test("preventFormSubmit cancela la navegacion GET nativa del formulario", () => {
  const toolbar = new EventTarget();
  toolbar.addEventListener("submit", preventFormSubmit);
  const submitEvent = new Event("submit", { cancelable: true });

  assert.equal(toolbar.dispatchEvent(submitEvent), false);
  assert.equal(submitEvent.defaultPrevented, true);
});

test("el input de busqueda pertenece al formulario protegido", () => {
  const html = fs.readFileSync(new URL("../../src/index.html", import.meta.url), "utf8");
  const toolbarTag = html.match(/<form\b[^>]*class="toolbar"[^>]*>/)?.[0];
  const searchTag = html.match(/<input\b(?=[^>]*\bid="search-input")[^>]*>/)?.[0];
  const toolbarId = attributeValue(toolbarTag, "id");

  assert.ok(toolbarId, "el formulario toolbar requiere un id estable");
  assert.equal(attributeValue(searchTag, "form"), toolbarId);
});

function attributeValue(tag, name) {
  return tag?.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
}
