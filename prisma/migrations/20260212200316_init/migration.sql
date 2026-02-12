-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repo_full_name" TEXT NOT NULL,
    "webhook_secret" TEXT NOT NULL,
    "api_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commits" (
    "id" TEXT NOT NULL,
    "sha" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "author_type" TEXT NOT NULL,
    "ai_tool" TEXT,
    "category" TEXT NOT NULL,
    "files_changed" INTEGER NOT NULL,
    "insertions" INTEGER NOT NULL,
    "deletions" INTEGER NOT NULL,
    "test_files_touched" INTEGER NOT NULL DEFAULT 0,
    "type_files_touched" INTEGER NOT NULL DEFAULT 0,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "commits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_reports" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "window_end" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL,
    "project_id" TEXT NOT NULL,

    CONSTRAINT "quality_reports_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_repo_full_name_key" ON "projects"("repo_full_name");

-- CreateIndex
CREATE UNIQUE INDEX "projects_api_key_key" ON "projects"("api_key");

-- CreateIndex
CREATE INDEX "commits_project_id_timestamp_idx" ON "commits"("project_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "commits_project_id_sha_key" ON "commits"("project_id", "sha");

-- CreateIndex
CREATE INDEX "milestones_project_id_timestamp_idx" ON "milestones"("project_id", "timestamp");

-- CreateIndex
CREATE INDEX "quality_reports_project_id_type_idx" ON "quality_reports"("project_id", "type");

-- AddForeignKey
ALTER TABLE "commits" ADD CONSTRAINT "commits_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_reports" ADD CONSTRAINT "quality_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
