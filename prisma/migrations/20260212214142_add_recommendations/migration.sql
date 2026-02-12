-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "last_analyzed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "next_steps" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "dismissed_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "project_id" TEXT NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recommendations_project_id_status_idx" ON "recommendations"("project_id", "status");

-- CreateIndex
CREATE INDEX "recommendations_project_id_detected_at_idx" ON "recommendations"("project_id", "detected_at");

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
