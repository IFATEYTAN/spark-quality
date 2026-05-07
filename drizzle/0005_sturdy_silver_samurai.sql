ALTER TABLE `workspaces` ADD `billingPeriod` enum('monthly','yearly') DEFAULT 'yearly' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `paymentMethod` enum('standing_order','manual') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `subscriptionStatus` enum('active','past_due','suspended','cancelled') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `lastPaymentAt` timestamp;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `nextChargeAt` timestamp;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `pastDueSince` timestamp;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `suspensionEmailSentAt` timestamp;