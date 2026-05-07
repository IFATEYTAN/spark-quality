ALTER TABLE `workspaces` MODIFY COLUMN `plan` enum('trial','basic','pro','premium','enterprise') NOT NULL DEFAULT 'basic';--> statement-breakpoint
ALTER TABLE `users` ADD `licenseNumber` varchar(64);--> statement-breakpoint
ALTER TABLE `users` ADD `licenseFileKey` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `licenseVerifiedAt` timestamp;