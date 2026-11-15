module.exports = function authStorage() {
  const records = new Map();
  const secrets = new Map();
  return {
    recordStorage: {
      read(key) { return records.get(key) ?? null; },
      write(key, value) { records.set(key, value); },
    },
    secretStorage: {
      async read(key) { return secrets.get(key) ?? null; },
      async write(key, value) { secrets.set(key, value); },
      async remove(key) { secrets.delete(key); },
    },
  };
};
