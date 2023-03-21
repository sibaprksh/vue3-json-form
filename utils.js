window.isDecimalNumber = function ({ options }) {
  const val = this.value;
  const { max = Infinity, mantissa } = options;
  if (val > max) return false;
  const splt = val.split('.');
  if (splt.length > 2) return false;
  if (mantissa && splt[1]) {
    const { minlength = 1, maxlength = Infinity } = mantissa;
    if (splt[1].length > maxlength) return false;
    if (splt[1].length < minlength) return false;
  }
  return true;
};
