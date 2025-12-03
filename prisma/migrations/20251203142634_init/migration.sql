-- CreateTable
CREATE TABLE `user` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'officer',
    `department` VARCHAR(191) NOT NULL DEFAULT 'General',
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `lastLogin` DATETIME(0) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `activitylog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` TEXT NULL,
    `userId` INTEGER NULL,
    `action` VARCHAR(255) NULL,
    `metadata` TEXT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `idx_timestamp`(`timestamp`),
    INDEX `idx_userId`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cases` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `caseId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'open',
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `location` VARCHAR(191) NOT NULL,
    `reporter` VARCHAR(191) NULL,
    `officerId` INTEGER NULL,
    `createdById` INTEGER NOT NULL,
    `reported` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `caseId`(`caseId`),
    INDEX `idx_caseId`(`caseId`),
    INDEX `idx_createdById`(`createdById`),
    INDEX `idx_officerId`(`officerId`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `officers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `badge` INTEGER NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `rank_` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `department` VARCHAR(191) NOT NULL DEFAULT 'General',
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'available',
    `activeCases` INTEGER NOT NULL DEFAULT 0,
    `totalCases` INTEGER NOT NULL DEFAULT 0,
    `hiredAt` DATETIME(0) NULL,
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `badge`(`badge`),
    UNIQUE INDEX `email`(`email`),
    INDEX `idx_badge`(`badge`),
    INDEX `idx_email`(`email`),
    INDEX `idx_status`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reportId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `format` VARCHAR(191) NOT NULL DEFAULT 'PDF',
    `notes` TEXT NULL,
    `caseId` INTEGER NULL,
    `generatedById` INTEGER NOT NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `reportId`(`reportId`),
    INDEX `idx_caseId`(`caseId`),
    INDEX `idx_generatedById`(`generatedById`),
    INDEX `idx_reportId`(`reportId`),
    INDEX `idx_type`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `incidents` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'medium',
    `description` TEXT NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `coordinates` VARCHAR(191) NULL,
    `reporter` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'active',
    `caseId` INTEGER NULL,
    `timestamp` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_caseId`(`caseId`),
    INDEX `idx_priority`(`priority`),
    INDEX `idx_status`(`status`),
    INDEX `idx_timestamp`(`timestamp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `activitylog` ADD CONSTRAINT `fk_activitylog_user` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_ibfk_1` FOREIGN KEY (`officerId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `cases` ADD CONSTRAINT `cases_ibfk_2` FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_ibfk_2` FOREIGN KEY (`generatedById`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `incidents` ADD CONSTRAINT `incidents_ibfk_1` FOREIGN KEY (`caseId`) REFERENCES `cases`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION;
