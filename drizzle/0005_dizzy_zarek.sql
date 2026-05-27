CREATE TABLE `outreach_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`senderUserId` int NOT NULL,
	`channel` enum('email','whatsapp') NOT NULL,
	`subject` varchar(300),
	`body` text NOT NULL,
	`source` enum('llm','template','manual') NOT NULL DEFAULT 'llm',
	`status` enum('drafted','sent') NOT NULL DEFAULT 'drafted',
	`flagAtCompose` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `outreach_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `outreach_messages` ADD CONSTRAINT `outreach_messages_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outreach_messages` ADD CONSTRAINT `outreach_messages_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `outreach_messages` ADD CONSTRAINT `outreach_messages_senderUserId_users_id_fk` FOREIGN KEY (`senderUserId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `outreach_workspace_idx` ON `outreach_messages` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `outreach_client_idx` ON `outreach_messages` (`clientId`);--> statement-breakpoint
CREATE INDEX `outreach_sender_idx` ON `outreach_messages` (`senderUserId`);--> statement-breakpoint
CREATE INDEX `outreach_created_idx` ON `outreach_messages` (`createdAt`);