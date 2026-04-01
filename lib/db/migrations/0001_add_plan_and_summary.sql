ALTER TABLE "User" ADD COLUMN "plan" varchar NOT NULL DEFAULT 'free';
ALTER TABLE "User" ADD COLUMN "planExpiresAt" timestamp;
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" varchar(255);
ALTER TABLE "Chat" ADD COLUMN "summary" text;
