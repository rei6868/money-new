import { evaluate, parse } from 'mathjs';

const NON_EXPRESSION_CHAR_PATTERN = /[^0-9.+\-*/()]/g;
const NUMBER_BEFORE_PAREN_PATTERN = /(\d)\(/g;
const PAREN_BEFORE_NUMBER_PATTERN = /\)(\d)/g;
const ADJACENT_PARENS_PATTERN = /\)\(/g;
const DIVISION_LEADING_ZERO_PATTERN = /\/0+([1-9]\d*(?:\.\d+)?)/g;

export const normalizeExpression = (expression) => {
  if (!expression || typeof expression !== 'string') {
    return '';
  }

  const trimmedExpression = expression.trim();
  if (!trimmedExpression) {
    return '';
  }

  const sanitizedExpression = trimmedExpression
    .replace(/\s+/g, '')
    .replace(/,/g, '')
    .replace(NON_EXPRESSION_CHAR_PATTERN, '');

  if (!sanitizedExpression) {
    return '';
  }

  const withImplicitMultiplication = sanitizedExpression
    .replace(NUMBER_BEFORE_PAREN_PATTERN, '$1*(')
    .replace(PAREN_BEFORE_NUMBER_PATTERN, ')*$1')
    .replace(ADJACENT_PARENS_PATTERN, ')*(');

  return withImplicitMultiplication.replace(
    DIVISION_LEADING_ZERO_PATTERN,
    (_, digits) => `/${digits}`,
  );
};

export const containsDivisionByZero = (expression) => {
  const normalizedExpression = normalizeExpression(expression);
  if (!normalizedExpression) {
    return false;
  }

  try {
    const rootNode = parse(normalizedExpression);
    let divisionByZero = false;

    rootNode.traverse((node) => {
      if (divisionByZero) {
        return;
      }

      if (!node || !node.isOperatorNode || node.op !== '/') {
        return;
      }

      const denominator = node.args?.[1];
      if (!denominator) {
        return;
      }

      try {
        const denominatorValue = denominator.compile().evaluate({});

        let numericValue;
        if (typeof denominatorValue === 'number') {
          numericValue = denominatorValue;
        } else if (
          denominatorValue &&
          typeof denominatorValue.toNumber === 'function'
        ) {
          numericValue = denominatorValue.toNumber();
        } else {
          numericValue = Number(denominatorValue);
        }

        if (Number.isFinite(numericValue) && numericValue === 0) {
          divisionByZero = true;
        }
      } catch (error) {
        if (
          error &&
          typeof error.message === 'string' &&
          error.message.toLowerCase().includes('division by zero')
        ) {
          divisionByZero = true;
        }
      }
    });

    return divisionByZero;
  } catch (error) {
    return false;
  }
};

export function safeEvaluate(expression) {
  const normalizedExpression = normalizeExpression(expression);
  if (!normalizedExpression) {
    return null;
  }

  try {
    const evaluationResult = evaluate(normalizedExpression);

    let numericResult;
    if (typeof evaluationResult === 'number') {
      numericResult = evaluationResult;
    } else if (evaluationResult && typeof evaluationResult.toNumber === 'function') {
      numericResult = evaluationResult.toNumber();
    } else {
      numericResult = Number(evaluationResult);
    }

    if (typeof numericResult === 'number' && Number.isFinite(numericResult)) {
      return numericResult;
    }

    return null;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('Error evaluating expression:', error);
    }
    return null;
  }
}
