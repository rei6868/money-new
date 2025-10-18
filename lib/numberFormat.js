const amountFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatAmount(value) {
  if (value === null || value === undefined) {
    return '0';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '0';
  }

  const formatted = amountFormatter.format(numeric);
  return formatted.replace(/\.00$/, '');
}

export function formatAmountWithTrailing(value) {
  if (value === null || value === undefined) {
    return '0.00';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '0.00';
  }

  return amountFormatter.format(numeric);
}

export function formatPercent(value) {
  if (value === null || value === undefined) {
    return '0%';
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '0%';
  }

  return `${percentFormatter.format(numeric)}%`;
}
