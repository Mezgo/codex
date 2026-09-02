import test from "node:test";
import assert from "node:assert/strict";
import { preventFormSubmit } from "../../src/ui/prevent-form-submit.mjs";

test("preventFormSubmit cancela la navegacion GET nativa del formulario", () => {
  const toolbar = new EventTarget();
  toolbar.addEventListener("submit", preventFormSubmit);
  const submitEvent = new Event("submit", { cancelable: true });

  assert.equal(toolbar.dispatchEvent(submitEvent), false);
  assert.equal(submitEvent.defaultPrevented, true);
});
