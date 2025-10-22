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

const convertThreeDigits = (group, isHighestGroup, hasTrailingNonZero) => {
  const paddedGroup = group.padStart(3, '0');
  const hundredsDigit = Number(paddedGroup[0]);
  const tensDigit = Number(paddedGroup[1]);
  const onesDigit = Number(paddedGroup[2]);

  if (hundredsDigit === 0 && tensDigit === 0 && onesDigit === 0) {
    return '';
  }

  const parts = [];

  if (hundredsDigit > 0) {
    parts.push(`${DIGIT_WORDS[hundredsDigit]} trăm`);
  } else if (!isHighestGroup && (tensDigit > 0 || onesDigit > 0 || hasTrailingNonZero)) {
    parts.push('không trăm');
  }

  if (tensDigit > 1) {
    parts.push(`${DIGIT_WORDS[tensDigit]} mươi`);
    if (onesDigit === 1) {
      parts.push('mốt');
    } else if (onesDigit === 4) {
      parts.push('tư');
    } else if (onesDigit === 5) {
      parts.push('lăm');
    } else if (onesDigit > 0) {
      parts.push(DIGIT_WORDS[onesDigit]);
    }
  } else if (tensDigit === 1) {
    parts.push('mười');
    if (onesDigit === 5) {
      parts.push('lăm');
    } else if (onesDigit === 4) {
      parts.push('bốn');
    } else if (onesDigit > 0) {
      parts.push(DIGIT_WORDS[onesDigit]);
    }
  } else if (tensDigit === 0) {
    if (onesDigit > 0) {
      const shouldUseLe = parts.length > 0 || (!isHighestGroup && hasTrailingNonZero);
      if (shouldUseLe) {
        parts.push('lẻ');
      }
      parts.push(DIGIT_WORDS[onesDigit]);
    }
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
};

const convertIntegerToWords = (integerPart) => {
  if (!integerPart) {
    return '';
  }

  if (integerPart === '0') {
    return DIGIT_WORDS[0];
  }

  const groups = [];
  let remaining = integerPart;
  while (remaining.length > 0) {
    const group = remaining.slice(-3);
    remaining = remaining.slice(0, -3);
    groups.unshift(group);
  }

  const words = [];

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const unitIndex = groups.length - index - 1;
    const unitLabel = GROUP_UNITS[unitIndex] || '';
    const hasTrailingNonZero = groups
      .slice(index + 1)
      .some((nextGroup) => Number(nextGroup) !== 0);

    const groupWords = convertThreeDigits(group, index === 0, hasTrailingNonZero);
    if (groupWords) {
      words.push(groupWords);
      if (unitLabel) {
        words.push(unitLabel);
      }
    }
  }

  return words.join(' ').replace(/\s+/g, ' ').trim();
};

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
  const integerWords = convertIntegerToWords(integerPart);

  if (!integerWords) {
    return '';
  }

  const prefix = isNegative ? 'âm ' : '';
  return `${prefix}${integerWords} đồng`;
}

export default convertToVietnameseWords;
