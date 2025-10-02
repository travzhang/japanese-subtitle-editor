-- CreateTable
CREATE TABLE "public"."project" (
    "id" TEXT NOT NULL,
    "path_with_namespace" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."subtitle" (
                                  "id" TEXT NOT NULL,
  "start_time" TEXT NOT NULL,
                                  "end_time" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "content" JSONB NOT NULL,
                                  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

                                  CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);
