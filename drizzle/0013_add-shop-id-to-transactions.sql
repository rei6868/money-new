ALTER TABLE "transactions" ADD COLUMN "shop_id" varchar(36);

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_shop_id_shops_shop_id_fk"
  FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("shop_id")
  ON DELETE set null ON UPDATE no action;
