-- CreateEnum
CREATE TYPE "RoleChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "admin_role_change_requests" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "previous_role" "AdminRole" NOT NULL,
    "requested_role" "AdminRole" NOT NULL,
    "status" "RoleChangeStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "reviewed_by_id" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_role_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_role_change_requests_target_id_idx" ON "admin_role_change_requests"("target_id");

-- CreateIndex
CREATE INDEX "admin_role_change_requests_status_idx" ON "admin_role_change_requests"("status");

-- CreateIndex
CREATE INDEX "admin_role_change_requests_requested_by_id_idx" ON "admin_role_change_requests"("requested_by_id");

-- AddForeignKey
ALTER TABLE "admin_role_change_requests" ADD CONSTRAINT "admin_role_change_requests_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_change_requests" ADD CONSTRAINT "admin_role_change_requests_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_role_change_requests" ADD CONSTRAINT "admin_role_change_requests_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
