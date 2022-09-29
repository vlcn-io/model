// from https://github.com/kripod/uuidv7 but without the dashes for easier storage as 16 byte primary key

const UNIX_TS_MS_BITS = 48;
const VER_DIGIT = "7";
const SEQ_BITS = 12;
const VAR = 0b10;
const VAR_BITS = 2;
const RAND_BITS = 62;

function uuidv7Builder(getRandomValues: (array: Uint32Array) => Uint32Array) {
  let prevTimestamp = -1;
  let seq = 0;

  return () => {
    // Negative system clock adjustments are ignored to keep monotonicity
    const timestamp = Math.max(Date.now(), prevTimestamp);
    seq = timestamp === prevTimestamp ? seq + 1 : 0;
    prevTimestamp = timestamp;

    const var_rand = new Uint32Array(2);
    getRandomValues(var_rand);
    var_rand[0] = (VAR << (32 - VAR_BITS)) | (var_rand[0]! >>> VAR_BITS);

    return (
      timestamp.toString(16).padStart(UNIX_TS_MS_BITS / 4, "0") +
      VER_DIGIT +
      seq.toString(16).padStart(SEQ_BITS / 4, "0") +
      var_rand[0]!.toString(16).padStart((VAR_BITS + RAND_BITS) / 2 / 4, "0") +
      var_rand[1]!.toString(16).padStart((VAR_BITS + RAND_BITS) / 2 / 4, "0")
    );
  };
}

export const uuidv7 = uuidv7Builder((array) => crypto.getRandomValues(array));
