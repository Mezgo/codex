export function bindFilterFormSubmit(form) {
  form.addEventListener("submit", preventFormSubmit);
}

function preventFormSubmit(event) {
  event.preventDefault();
}
