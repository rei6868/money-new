module.exports = new Proxy(
  {},
  {
    get: (target, property) => {
      if (property === '__esModule') {
        return false;
      }
      return typeof property === 'string' ? property : '';
    },
  },
);
