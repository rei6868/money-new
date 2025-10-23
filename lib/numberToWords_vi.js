const DIGIT_WORDS = [
  'không',
  'một',
  'hai',
  'ba',
  'bốn',
  'năm',
  'sáu',
  'bảy',
  'tám',
  'chín',
];

const GROUP_UNITS = [
  '',
  'nghìn',
  'triệu',
  'tỷ',
  'nghìn tỷ',
  'triệu tỷ',
  'tỷ tỷ',
];

const SIGNIFICANT_UNIT_TOKENS = new Set(['tỷ', 'triệu', 'nghìn', 'ngàn', 'trăm']);

const sanitizeInput = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'number' && Number.isNaN(value)) {
    return '';
  }

  const stringValue = String(value).trim();
  if (!stringValue) {
    return '';
  }

  return stringValue;
};

const convertThreeDigitsTokens = (group, { isHighestGroup, hasTrailingNonZero }) => {
  const paddedGroup = group.padStart(3, '0');
  const hundredsDigit = Number(paddedGroup[0]);
  const tensDigit = Number(paddedGroup[1]);
  const onesDigit = Number(paddedGroup[2]);

  if (hundredsDigit === 0 && tensDigit === 0 && onesDigit === 0) {
    return [];
  }

  const tokens = [];

  if (hundredsDigit > 0) {
    tokens.push(DIGIT_WORDS[hundredsDigit], 'trăm');
  } else if (!isHighestGroup && (tensDigit > 0 || onesDigit > 0 || hasTrailingNonZero)) {
    tokens.push('không', 'trăm');
  }

  if (tensDigit > 1) {
    tokens.push(DIGIT_WORDS[tensDigit], 'mươi');
    if (onesDigit === 1) {
      tokens.push('mốt');
    } else if (onesDigit === 4) {
      tokens.push('tư');
    } else if (onesDigit === 5) {
      tokens.push('lăm');
    } else if (onesDigit > 0) {
      tokens.push(DIGIT_WORDS[onesDigit]);
    }
  } else if (tensDigit === 1) {
    tokens.push('mười');
    if (onesDigit === 5) {
      tokens.push('lăm');
    } else if (onesDigit === 4) {
      tokens.push('bốn');
    } else if (onesDigit > 0) {
      tokens.push(DIGIT_WORDS[onesDigit]);
    }
  } else if (tensDigit === 0) {
    if (onesDigit > 0) {
      const shouldUseLe = tokens.length > 0 || (!isHighestGroup && hasTrailingNonZero);
      if (shouldUseLe) {
        tokens.push('lẻ');
      }
      tokens.push(DIGIT_WORDS[onesDigit]);
    }
  }

  return tokens;
};

const convertIntegerToTokens = (integerPart) => {
  if (!integerPart) {
    return [];
  }

  if (integerPart === '0') {
    return [DIGIT_WORDS[0]];
  }

  const groups = [];
  let remaining = integerPart;
  while (remaining.length > 0) {
    const group = remaining.slice(-3);
    remaining = remaining.slice(0, -3);
    groups.unshift(group);
  }

  const tokens = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const unitIndex = groups.length - index - 1;
    const unitLabel = GROUP_UNITS[unitIndex] || '';
    const hasTrailingNonZero = groups
      .slice(index + 1)
      .some((nextGroup) => Number(nextGroup) !== 0);

    const groupTokens = convertThreeDigitsTokens(group, {
      isHighestGroup: index === 0,
      hasTrailingNonZero,
    });

    if (groupTokens.length > 0) {
      tokens.push(...groupTokens);
      if (unitLabel) {
        tokens.push(...unitLabel.split(' '));
      }
    }
  }

  return tokens;
};

const tokensToWords = (tokens) => tokens.join(' ').replace(/\s+/g, ' ').trim();

export function convertToVietnameseWords(input) {
  const sanitizedValue = sanitizeInput(input);
  if (!sanitizedValue) {
    return '';
  }

  const isNegative = sanitizedValue.startsWith('-');
  const unsignedValue = isNegative ? sanitizedValue.slice(1) : sanitizedValue;

  if (!/^\d+(?:\.\d+)?$/.test(unsignedValue)) {
    return '';
  }

  const [integerPartRaw] = unsignedValue.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const tokens = convertIntegerToTokens(integerPart);

  if (tokens.length === 0) {
    return '';
  }

  const words = tokensToWords(tokens);
  if (!words) {
    return '';
  }

  const prefix = isNegative ? 'âm ' : '';
  return `${prefix}${words} đồng`;
}

export function convertToVietnameseWordsAbbreviated(input) {
  const sanitizedValue = sanitizeInput(input);
  if (!sanitizedValue) {
    return '';
  }

  const isNegative = sanitizedValue.startsWith('-');
  const unsignedValue = isNegative ? sanitizedValue.slice(1) : sanitizedValue;

  if (!/^\d+(?:\.\d+)?$/.test(unsignedValue)) {
    return '';
  }

  const numericValue = Number(unsignedValue);
  if (!Number.isFinite(numericValue) || numericValue === 0) {
    return '';
  }

  const [integerPartRaw] = unsignedValue.split('.');
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, '') || '0';
  const tokens = convertIntegerToTokens(integerPart);

  if (tokens.length === 0) {
    return '';
  }

  let significantCount = 0;
  const abbreviatedTokens = [];

  for (const token of tokens) {
    abbreviatedTokens.push(token);
    if (SIGNIFICANT_UNIT_TOKENS.has(token)) {
      significantCount += 1;
      if (significantCount >= 4) {
        break;
      }
    }
  }

  const truncated = abbreviatedTokens.length < tokens.length;
  const words = tokensToWords(abbreviatedTokens);

  if (!words) {
    return '';
  }

  const prefix = isNegative ? 'âm ' : '';
  const suffix = truncated ? '... đồng' : ' đồng';
  return `${prefix}${words}${suffix}`;
}

export default convertToVietnameseWords;
