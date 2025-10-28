// pages/api/people/index.ts - FIXED VERSION
import type { NextApiRequest, NextApiResponse } from "next";
import { asc } from "drizzle-orm";
import { randomUUID } from "crypto";

import { db } from "../../../lib/db/client";
import { people, type NewPerson } from "../../../src/db/schema/people";

// Mock data for development when database is not configured
const MOCK_PEOPLE: any[] = [
  {
    personId: "mock-person-1",
    fullName: "John Doe",
    contactInfo: "john@example.com",
    status: "active",
    groupId: null,
    imgUrl: null,
    note: "Primary user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    personId: "mock-person-2",
    fullName: "Jane Smith",
    contactInfo: "jane@example.com",
    status: "active",
    groupId: null,
    imgUrl: null,
    note: "Secondary user",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const database = db;

  if (!database) {
    console.warn("Database connection is not configured - using mock data");

    // Handle GET request with mock data
    if (req.method === "GET") {
      res.status(200).json(MOCK_PEOPLE);
      return;
    }

    // Handle POST request with mock data
    if (req.method === "POST") {
      const body = req.body || {};

      if (!body.fullName || !body.status) {
        res.status(400).json({
          error: "Validation failed",
          details: "fullName and status are required"
        });
        return;
      }

      const newPerson = {
        personId: `mock-person-${Date.now()}`,
        fullName: body.fullName,
        contactInfo: body.contactInfo || null,
        status: body.status,
        groupId: body.groupId || null,
        imgUrl: body.imgUrl || null,
        note: body.note || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      MOCK_PEOPLE.push(newPerson);
      res.status(201).json(newPerson);
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (req.method === "GET") {
    try {
      const result = await database.select().from(people).orderBy(asc(people.fullName));
      res.status(200).json(result);
    } catch (error) {
      console.error("Failed to fetch people", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  if (req.method === "POST") {
    try {
      const body = req.body || {};
      
      // ✅ VALIDATE required fields
      if (!body.fullName || !body.status) {
        res.status(400).json({ 
          error: "Validation failed", 
          details: "fullName and status are required" 
        });
        return;
      }

      // ✅ BUILD INSERT PAYLOAD with auto UUID
      const payload: NewPerson = {
        personId: randomUUID(), // ← AUTO GENERATE UUID
        fullName: body.fullName,
        status: body.status,
        contactInfo: body.contactInfo || null,
        groupId: body.groupId || null,
        imgUrl: body.imgUrl || null,
        note: body.note || null,
      };

      const created = await database.insert(people).values(payload).returning();
      res.status(201).json(created[0]);
    } catch (error) {
      console.error("Failed to create person", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ error: message });
    }
    return;
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).json({ error: "Method not allowed" });
}
