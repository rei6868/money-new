-- Drop the owner_id foreign key constraint and column from accounts table
-- This removes the requirement for accounts to have an owner, allowing for
-- shared/group accounts and simplifying the account model.

ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_id_fkey";
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_id_people_person_id_fk";
ALTER TABLE "accounts" DROP COLUMN "owner_id";

