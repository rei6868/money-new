import type { NextApiRequest, NextApiResponse } from 'next';
import { randomUUID } from 'crypto';

import { getDb } from '../../../lib/db/client';
import { people, type NewPerson } from '../../../src/db/schema/people';

type PeopleListResponse = {
  people: Array<typeof people.$inferSelect>;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    res.status(503).json({ error: 'Database connection is not configured' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const rows = await db.select().from(people);
      const response: PeopleListResponse = { people: rows };
      res.status(200).json(response);
    } catch (error) {
      console.error('Failed to fetch people', error);
      res.status(500).json({ error: 'Failed to fetch people' });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const fullName = normalizeString(req.body?.fullName);
      const status = normalizeString(req.body?.status);
      if (!fullName || !status) {
        res.status(400).json({ error: 'fullName and status are required' });
        return;
      }

      const newPerson: NewPerson = {
        personId: generatePersonId(),
        fullName,
        status,
      };

      const optionalFields: Array<keyof NewPerson> = ['contactInfo', 'groupId', 'imgUrl', 'note'];
      for (const field of optionalFields) {
        const value = req.body?.[field];
        if (value !== undefined && value !== null && value !== '') {
          newPerson[field] = value;
        }
      }

      const [created] = await db.insert(people).values(newPerson).returning();
      res.status(201).json(created);
    } catch (error) {
      console.error('Failed to create person', error);
      res.status(500).json({ error: 'Failed to create person' });
    }
    return;
  }

  res.setHeader('Allow', ['GET', 'POST']);
  res.status(405).json({ error: 'Method not allowed' });
}
