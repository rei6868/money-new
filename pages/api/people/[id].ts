import type { NextApiRequest, NextApiResponse } from 'next';
import { eq } from 'drizzle-orm';

import { getDb } from '../../../lib/db/client';
import { people, personStatusEnum, type NewPerson } from '../../../src/db/schema/people';

const toSingle = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const db = getDb();
  if (!db) {
    res.status(503).json({ error: 'Database connection is not configured' });
    return;
  }

  const personId = toSingle(req.query.id);
  if (!personId) {
    res.status(400).json({ error: 'Person id is required' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const [person] = await db.select().from(people).where(eq(people.personId, personId)).limit(1);
      if (!person) {
        res.status(404).json({ error: 'Person not found' });
        return;
      }
      res.status(200).json(person);
      return;
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const updates: Partial<NewPerson> = {};
      const { fullName, status, contactInfo, groupId, imgUrl, note } = req.body ?? {};

      if (typeof fullName === 'string' && fullName.trim().length > 0) {
        updates.fullName = fullName.trim();
      }
      if (typeof status === 'string' && status.trim().length > 0) {
        const normalizedStatus = status.trim();
        if (!(personStatusEnum.enumValues as readonly string[]).includes(normalizedStatus)) {
          res.status(400).json({
            error: 'Validation failed',
            details: `status must be one of: ${personStatusEnum.enumValues.join(', ')}`,
          });
          return;
        }
        updates.status = normalizedStatus as NewPerson['status'];
      }
      if (contactInfo !== undefined) {
        updates.contactInfo = contactInfo;
      }
      if (groupId !== undefined) {
        updates.groupId = groupId;
      }
      if (imgUrl !== undefined) {
        updates.imgUrl = imgUrl;
      }
      if (note !== undefined) {
        updates.note = note;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ error: 'No updates provided' });
        return;
      }

      updates.updatedAt = new Date();

      const [updated] = await db.update(people).set(updates).where(eq(people.personId, personId)).returning();
      if (!updated) {
        res.status(404).json({ error: 'Person not found' });
        return;
      }
      res.status(200).json(updated);
      return;
    }

    if (req.method === 'DELETE') {
      const deleted = await db.delete(people).where(eq(people.personId, personId)).returning({ personId: people.personId });
      if (deleted.length === 0) {
        res.status(404).json({ error: 'Person not found' });
        return;
      }
      res.status(204).end();
      return;
    }
  } catch (error) {
    console.error(`Failed to handle ${req.method} /api/people/${personId}`, error);
    res.status(500).json({ error: 'Failed to process request' });
    return;
  }

  res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
  res.status(405).json({ error: 'Method not allowed' });
}
