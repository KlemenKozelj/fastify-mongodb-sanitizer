const isValueObject = (o) => typeof o === 'object' && o !== null;

const startsWith$ = (v) => typeof v === 'string' && v.startsWith('$');

const sanatizeValues = (inp) => {
  if (startsWith$(inp)) return undefined;

  if (!isValueObject(inp)) return inp;

  if (Array.isArray(inp)) {
    return inp.reduce((arrR, v) => {
      if (isValueObject(v)) {
        arrR.push(sanatizeValues(v));
        return arrR;
      }
      if (!startsWith$(v)) {
        arrR.push(v);
      }
      return arrR;
    }, []);
  }

  return Object.entries(inp)
      .filter(([k, v]) => {
        if (startsWith$(k) || startsWith$(v)) return false;
        return true;
      })
      .reduce((objR, [k, v]) => {
        if (isValueObject(v)) {
          objR[k] = sanatizeValues(v);
          return objR;
        }
        objR[k] = v;
        return objR;
      }, {});
};

module.exports = sanatizeValues;
