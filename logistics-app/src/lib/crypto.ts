const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const fallbackSha256 = (message: string) => {
  const rightRotate = (value: number, amount: number) =>
    (value >>> amount) | (value << (32 - amount));

  let result = "";
  const words: number[] = [];
  const messageLength = message.length;
  let hash: number[] = [];
  let k: number[] = [];
  const maxWord = Math.pow(2, 32);

  const buildConstants = () => {
    let primeCounter = k.length;
    const isComposite: Record<number, boolean> = {};
    for (let candidate = 2; primeCounter < 64; candidate += 1) {
      if (!isComposite[candidate]) {
        for (let i = 0; i < 313; i += candidate) {
          isComposite[i] = true;
        }
        hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
        k[primeCounter] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
        primeCounter += 1;
      }
    }
  };

  if (!k.length) {
    buildConstants();
  }

  message += "\x80";
  while ((message.length % 64) - 56) {
    message += "\x00";
  }

  for (let i = 0; i < message.length; i += 1) {
    const code = message.charCodeAt(i);
    words[i >> 2] |= code << ((3 - (i % 4)) * 8);
  }

  words[words.length] = ((messageLength * 8) / maxWord) | 0;
  words[words.length] = messageLength * 8;

  for (let j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    const tempHash = hash.slice(0, 8);

    for (let i = 0; i < 64; i += 1) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];

      const a = tempHash[0];
      const e = tempHash[4];

      const temp1 =
        tempHash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & tempHash[5]) ^ (~e & tempHash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);

      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & tempHash[1]) ^ (a & tempHash[2]) ^ (tempHash[1] & tempHash[2]));

      tempHash.unshift((temp1 + temp2) | 0);
      tempHash[4] = (tempHash[4] + temp1) | 0;
      tempHash.pop();
    }

    for (let i = 0; i < 8; i += 1) {
      hash[i] = (hash[i] + tempHash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i += 1) {
    for (let j = 3; j >= 0; j -= 1) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? "0" : "") + b.toString(16);
    }
  }

  return result;
};

export const hashPin = async (pin: string) => {
  const subtle = typeof globalThis !== "undefined" ? globalThis.crypto?.subtle : null;
  if (!subtle) {
    return fallbackSha256(pin);
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const digest = await subtle.digest("SHA-256", data);
  return toHex(digest);
};
