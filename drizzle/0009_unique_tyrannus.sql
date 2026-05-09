CREATE TABLE `payment_attempts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`requestId` varchar(64) NOT NULL,
	`workspaceId` int NOT NULL,
	`initiatedByUserId` int NOT NULL,
	`plan` enum('basic','pro','premium') NOT NULL,
	`billingPeriod` enum('monthly','yearly') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','succeeded','failed','abandoned') NOT NULL DEFAULT 'pending',
	`customerSnapshot` json,
	`paymentUrl` text,
	`invoiceId` varchar(100),
	`subscriptionId` varchar(100),
	`callbackAt` timestamp,
	`abandonedNotifiedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_attempts_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_attempts_requestId_unique` UNIQUE(`requestId`)
);
--> statement-breakpoint
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_attempts` ADD CONSTRAINT `payment_attempts_initiatedByUserId_users_id_fk` FOREIGN KEY (`initiatedByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payment_attempts_workspace_idx` ON `payment_attempts` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `payment_attempts_status_idx` ON `payment_attempts` (`status`);--> statement-breakpoint
CREATE INDEX `payment_attempts_created_idx` ON `payment_attempts` (`createdAt`);