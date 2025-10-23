import { evaluate } from 'mathjs';

export function safeEvaluate(expression) {
  if (!expression || typeof expression !== 'string') {
    return null;
  }

  const trimmedExpression = expression.trim();
  if (!trimmedExpression) {
    return null;
  }

  try {
    const sanitizedExpression = trimmedExpression.replace(/,/g, '');
    const evaluationResult = evaluate(sanitizedExpression);

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
