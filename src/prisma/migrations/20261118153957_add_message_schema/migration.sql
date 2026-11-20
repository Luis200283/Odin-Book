-- CreateTable
CREATE TABLE "message" (
    "id" SERIAL NOT NULL,
    "client_offset" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "message_client_offset_key" ON "message"("client_offset");
