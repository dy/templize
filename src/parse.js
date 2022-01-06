const mem = {}, STRING = 0, PART = 1
export default (text) => {
  let value = '', open = 0, tokens = mem[text], i = 0, c

  if (tokens) return tokens; else tokens = []

  for (; c=text[i]; i++) {
    if (c === '{' && text[i+1] === '{' && text[i-1] !== '\\' && text[i+2]) {
      if (++open===1) {
        if (value) tokens.push([STRING, value ]);
        value = '';
        i += 2;
      }
    }
    else if (c === '}' && text[i+1] === '}' && text[i-1] !== '\\') {
      if (!--open) {
        open = false;
        tokens.push([PART, value.trim() ]);
        value = '';
        i += 2;
      }
    }

    value += text[i] || ''; // text[i] is undefined if i+=2 caught
  }
  if (value) tokens.push([STRING, value ]);

  return mem[text] = tokens
}

