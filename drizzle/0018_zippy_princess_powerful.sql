CREATE TABLE `message_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`createdBy` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`channel` varchar(16) NOT NULL DEFAULT 'email',
	`subject` varchar(200),
	`body` text NOT NULL,
	`triggerKey` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `message_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_createdBy_users_id_fk` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `message_templates_workspace_idx` ON `message_templates` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `message_templates_channel_idx` ON `message_templates` (`workspaceId`,`channel`);