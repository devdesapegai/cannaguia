ALTER TABLE "ChatLog" ADD COLUMN IF NOT EXISTS "ragLatencyMs" integer;
ALTER TABLE "ChatLog" ADD COLUMN IF NOT EXISTS "vectorTopScore" real;
ALTER TABLE "ChatLog" ADD COLUMN IF NOT EXISTS "keywordTopScore" real;
ALTER TABLE "ChatLog" ADD COLUMN IF NOT EXISTS "vectorError" varchar(200);
