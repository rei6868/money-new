import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

import { getDb } from '../../../lib/db/client';
import { people, type NewPerson } from '../../../src/db/schema/people';

type PeopleListResponse = {
  people: Array<typeof people.$inferSelect>;
};

const respondJson = (res: NextApiResponse, status: number, payload: unknown): void => {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(payload);
};

const generatePersonId = (): string => {
  if (typeof randomUUID === 'function') {
    return randomUUID();
  }
  return `person_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const normalizeString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const parseRequestBody = (raw: unknown): Record<string, unknown> | null => {
  if (raw == null) {
    return {};
  }
  if (typeof raw === 'string') {
    if (raw.trim().length === 0) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null;
    } catch (error) {
      console.error('Failed to parse JSON payload for /api/people', error);
      return null;
    }
  }
  if (typeof raw === 'object') {
    return raw as Record<string, unknown>;
  }
  return null;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    respondJson(res, 503, { error: 'Database connection is not configured' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.select().from(people);
      const response: PeopleListResponse = { people: rows };
      respondJson(res, 200, response);
    } catch (error) {
      console.error('Failed to fetch people', error);
      const details = error instanceof Error ? error.message : 'Unknown error';
      respondJson(res, 500, { error: 'Failed to fetch people', details });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const parsedBody = parseRequestBody(req.body);
      if (parsedBody === null) {
        respondJson(res, 400, { error: 'Validation failed', details: 'Invalid JSON payload' });
        return;
      }

      const payload = parsedBody as Partial<NewPerson>;

      const fullName = normalizeString(payload.fullName);
      const status = normalizeString(payload.status);
      if (!fullName || !status) {
        respondJson(res, 400, {
          error: 'Validation failed',
          details: 'fullName and status are required',
        });
        return;
      }

      const newPerson: NewPerson = {
        personId: generatePersonId(),
        fullName,
        status,
      };

      const optionalFields: Array<keyof NewPerson> = ['contactInfo', 'groupId', 'imgUrl', 'note'];
      for (const field of optionalFields) {
        const value = payload[field];
        if (value !== undefined && value !== null && value !== '') {
          newPerson[field] = value;
        }
      }

      const [created] = await db.insert(people).values(newPerson).returning();
      respondJson(res, 201, created);
    } catch (error) {
      console.error('Failed to create person', error);
      const details = error instanceof Error ? error.message : 'Unknown error';
      respondJson(res, 500, { error: 'Failed to create person', details });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  respondJson(res, 405, { error: 'Method not allowed' });
}
