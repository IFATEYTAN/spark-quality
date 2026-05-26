CREATE TABLE `client_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`workspaceId` int NOT NULL,
	`clientId` int NOT NULL,
	`triggerKey` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `uq_client_flags_ws_client_trigger` UNIQUE(`workspaceId`,`clientId`,`triggerKey`)
);
--> statement-breakpoint
ALTER TABLE `client_flags` ADD CONSTRAINT `client_flags_workspaceId_workspaces_id_fk` FOREIGN KEY (`workspaceId`) REFERENCES `workspaces`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `client_flags` ADD CONSTRAINT `client_flags_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `client_flags_workspace_idx` ON `client_flags` (`workspaceId`);--> statement-breakpoint
CREATE INDEX `client_flags_client_idx` ON `client_flags` (`clientId`);--> statement-breakpoint
CREATE INDEX `client_flags_trigger_idx` ON `client_flags` (`triggerKey`);--> statement-breakpoint
CREATE INDEX `client_flags_ws_trigger_idx` ON `client_flags` (`workspaceId`,`triggerKey`);