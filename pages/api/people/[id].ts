import type { NextApiRequest, NextApiResponse } from "next";
import { eq } from "drizzle-orm";

import { db } from "../../../lib/db/client";
import { people, type NewPerson } from "../../../src/db/schema/people";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.error("Database connection is not configured");
    res.status(500).json({ error: "Database connection is not configured" });
    return;
  }

  const { id } = req.query;
  const personId = Array.isArray(id) ? id[0] : id;

  if (!personId) {
    res.status(400).json({ message: "Person id is required" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(people).where(eq(people.personId, personId));
      if (result.length === 0) {
        res.status(404).json({ message: "Person not found" });
        return;
      }
      res.status(200).json(result[0]);
    } catch (error) {
      console.error(`Failed to fetch person with id ${personId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "PUT" || req.method === "PATCH") {
    try {
      const { personId: _ignoredPersonId, ...rest } = req.body as Partial<NewPerson>;
      const updated = await database
        .update(people)
        .set(rest)
        .where(eq(people.personId, personId))
        .returning();

      if (updated.length === 0) {
        res.status(404).json({ message: "Person not found" });
        return;
      }

      res.status(200).json(updated[0]);
    } catch (error) {
      console.error(`Failed to update person with id ${personId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "DELETE") {
    try {
      const deleted = await database.delete(people).where(eq(people.personId, personId)).returning();
      if (deleted.length === 0) {
        res.status(404).json({ message: "Person not found" });
        return;
      }
      res.status(200).json(deleted[0]);
    } catch (error) {
      console.error(`Failed to delete person with id ${personId}`, error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "PUT", "PATCH", "DELETE"]);
  res.status(405).json({ error: "Method not allowed" });
}
