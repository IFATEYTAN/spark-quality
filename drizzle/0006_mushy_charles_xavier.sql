ALTER TABLE `workspaces` ADD `taxId` varchar(20);--> statement-breakpoint
ALTER TABLE `workspaces` ADD `taxIdType` enum('company','individual');--> statement-breakpoint
ALTER TABLE `workspaces` ADD `contactPhone` varchar(32);