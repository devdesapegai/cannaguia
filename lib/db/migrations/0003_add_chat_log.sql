CREATE TABLE IF NOT EXISTS "ChatLog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL,
  "messageId" uuid,
  "userId" uuid NOT NULL,
  "userText" text NOT NULL,
  "ragDocsUsed" json,
  "ragTopScore" real,
  "searchMode" varchar(20) NOT NULL DEFAULT 'keyword',
  "latencyMs" integer NOT NULL,
  "tokenCount" integer,
  "inputFlagged" boolean NOT NULL DEFAULT false,
  "inputFlagReason" varchar(50),
  "outputFlagged" boolean NOT NULL DEFAULT false,
  "outputViolations" json,
  "actionTaken" varchar(50),
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_cl_userId" ON "ChatLog" ("userId");
CREATE INDEX IF NOT EXISTS "idx_cl_createdAt" ON "ChatLog" ("createdAt");
CREATE INDEX IF NOT EXISTS "idx_cl_ragTopScore" ON "ChatLog" ("ragTopScore");
CREATE INDEX IF NOT EXISTS "idx_cl_inputFlagged" ON "ChatLog" ("inputFlagged") WHERE "inputFlagged" = true;
CREATE INDEX IF NOT EXISTS "idx_cl_outputFlagged" ON "ChatLog" ("outputFlagged") WHERE "outputFlagged" = true;
