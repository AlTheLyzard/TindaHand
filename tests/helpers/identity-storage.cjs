// Native persistence seam for the existing dependency-free service test loaders.
module.exports = function identityStorage(initial = null) {
  let value = initial;
  return { read: () => value, write: next => { value = next; } };
};
