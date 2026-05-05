CREATE TABLE `action_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`assignedToUserId` int,
	`type` varchar(50) NOT NULL,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('open','in_progress','done','dismissed') NOT NULL DEFAULT 'open',
	`title` varchar(300) NOT NULL,
	`description` text,
	`dueDate` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `action_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`ownerUserId` int NOT NULL,
	`idNumber` varchar(32) NOT NULL,
	`fullName` varchar(200),
	`email` varchar(320),
	`phone` varchar(32),
	`birthDate` timestamp,
	`notes` text,
	`isVip` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_client_id_per_workspace` UNIQUE(`workspaceId`,`idNumber`)
);
--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`email` varchar(320) NOT NULL,
	`workspaceRole` enum('admin','agent') NOT NULL DEFAULT 'agent',
	`token` varchar(64) NOT NULL,
	`invitedByUserId` int NOT NULL,
	`status` enum('pending','accepted','expired','revoked') NOT NULL DEFAULT 'pending',
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invitations_id` PRIMARY KEY(`id`),
	CONSTRAINT `invitations_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `policies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`productType` varchar(100),
	`company` varchar(100),
	`policyNumber` varchar(100),
	`annualPremium` decimal(12,2),
	`monthlyPremium` decimal(12,2),
	`balance` decimal(14,2),
	`startDate` timestamp,
	`endDate` timestamp,
	`status` enum('active','inactive','cancelled','expired') NOT NULL DEFAULT 'active',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `policies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`uploadedByUserId` int NOT NULL,
	`fileName` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`fileSize` bigint,
	`source` enum('shorens','manual','api') NOT NULL DEFAULT 'shorens',
	`status` enum('pending','processing','done','failed') NOT NULL DEFAULT 'pending',
	`summary` json,
	`clientCount` int,
	`totalAum` decimal(16,2),
	`errorMessage` text,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`plan` enum('trial','basic','premium','enterprise') NOT NULL DEFAULT 'trial',
	`trialEndsAt` timestamp,
	`subscriptionEndsAt` timestamp,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workspaces_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `workspaceId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD `workspaceRole` enum('owner','admin','agent') DEFAULT 'agent' NOT NULL;--> statement-breakpoint
ALTER TABLE `action_items` ADD CONSTRAINT `action_items_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `action_items` ADD CONSTRAINT `action_items_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `action_items` ADD CONSTRAINT `action_items_assignedToUserId_users_id_fk` FOREIGN KEY (`assignedToUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `invitations` ADD CONSTRAINT `invitations_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `policies` ADD CONSTRAINT `policies_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `policies` ADD CONSTRAINT `policies_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_uploadedByUserId_users_id_fk` FOREIGN KEY (`uploadedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `actions_workspace_idx` ON `action_items` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `actions_client_idx` ON `action_items` (`clientId`);--> statement-breakpoint
CREATE INDEX `actions_assignee_idx` ON `action_items` (`assignedToUserId`);--> statement-breakpoint
CREATE INDEX `actions_status_idx` ON `action_items` (`status`);--> statement-breakpoint
CREATE INDEX `clients_workspace_idx` ON `clients` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `clients_owner_idx` ON `clients` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `clients_idnumber_idx` ON `clients` (`idNumber`);--> statement-breakpoint
CREATE INDEX `invitations_workspace_idx` ON `invitations` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `invitations_email_idx` ON `invitations` (`email`);--> statement-breakpoint
CREATE INDEX `policies_workspace_idx` ON `policies` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `policies_client_idx` ON `policies` (`clientId`);--> statement-breakpoint
CREATE INDEX `reports_workspace_idx` ON `reports` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `reports_uploader_idx` ON `reports` (`uploadedByUserId`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `users_workspace_idx` ON `users` (`workspaceId`);