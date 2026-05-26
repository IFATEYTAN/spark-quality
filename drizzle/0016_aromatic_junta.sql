CREATE TABLE `client_activities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`outcome` varchar(64),
	`content` text,
	`triggerKey` varchar(64),
	`scheduledFor` timestamp,
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_activities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `client_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`triggerKey` varchar(64),
	`note` text,
	`remindAt` timestamp NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`createdBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_activities` ADD CONSTRAINT `client_activities_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_activities` ADD CONSTRAINT `client_activities_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_activities` ADD CONSTRAINT `client_activities_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_reminders` ADD CONSTRAINT `client_reminders_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_reminders` ADD CONSTRAINT `client_reminders_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_reminders` ADD CONSTRAINT `client_reminders_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_activities_workspace_idx` ON `client_activities` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `client_activities_client_idx` ON `client_activities` (`clientId`);--> statement-breakpoint
CREATE INDEX `client_activities_ws_client_idx` ON `client_activities` (`workspaceId`,`clientId`);--> statement-breakpoint
CREATE INDEX `client_activities_type_idx` ON `client_activities` (`type`);--> statement-breakpoint
CREATE INDEX `client_reminders_workspace_idx` ON `client_reminders` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `client_reminders_client_idx` ON `client_reminders` (`clientId`);--> statement-breakpoint
CREATE INDEX `client_reminders_status_idx` ON `client_reminders` (`status`);--> statement-breakpoint
CREATE INDEX `client_reminders_due_idx` ON `client_reminders` (`workspaceId`,`status`,`remindAt`);