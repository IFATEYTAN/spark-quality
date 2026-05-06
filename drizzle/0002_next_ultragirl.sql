ALTER TABLE `clients` ADD `flagStatus` varchar(32) DEFAULT 'regular' NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `totalBalance` decimal(14,2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `vipThreshold` decimal(14,2) DEFAULT '1000000.00' NOT NULL;