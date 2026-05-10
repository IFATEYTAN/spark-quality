CREATE TABLE `messageGenerations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int,
	`triggerKey` varchar(64) NOT NULL,
	`tone` varchar(32) NOT NULL,
	`freeFormContext` text,
	`variantsJson` json NOT NULL,
	`selectedIndex` int,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messageGenerations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `triggerHandled` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`triggerKey` varchar(64) NOT NULL,
	`handledByUserId` int NOT NULL,
	`handledAt` timestamp NOT NULL DEFAULT (now()),
	`note` text,
	CONSTRAINT `triggerHandled_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_trighandled_client_trigger_per_ws` UNIQUE(`workspaceId`,`clientId`,`triggerKey`)
);
--> statement-breakpoint
ALTER TABLE `messageGenerations` ADD CONSTRAINT `messageGenerations_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messageGenerations` ADD CONSTRAINT `messageGenerations_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messageGenerations` ADD CONSTRAINT `messageGenerations_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `triggerHandled` ADD CONSTRAINT `triggerHandled_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `triggerHandled` ADD CONSTRAINT `triggerHandled_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `triggerHandled` ADD CONSTRAINT `triggerHandled_handledByUserId_users_id_fk` FOREIGN KEY (`handledByUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `msggen_workspace_idx` ON `messageGenerations` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `msggen_client_idx` ON `messageGenerations` (`clientId`);--> statement-breakpoint
CREATE INDEX `msggen_trigger_idx` ON `messageGenerations` (`triggerKey`);--> statement-breakpoint
CREATE INDEX `msggen_created_idx` ON `messageGenerations` (`createdAt`);--> statement-breakpoint
CREATE INDEX `trighandled_workspace_idx` ON `triggerHandled` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `trighandled_client_idx` ON `triggerHandled` (`clientId`);--> statement-breakpoint
CREATE INDEX `trighandled_trigger_idx` ON `triggerHandled` (`triggerKey`);