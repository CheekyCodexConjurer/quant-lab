const clampIndex = (index, length) => {
  if (typeof index !== 'number' || !Number.isFinite(index)) return null;
  if (!length || length <= 0) return null;
  const i = Math.floor(index);
  if (i < 0) return 0;
  if (i >= length) return length - 1;
  return i;
};

module.exports = {
  clampIndex,
};

