CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`fileId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` text PRIMARY KEY NOT NULL,
	`paperworkId` text NOT NULL,
	`fileName` text NOT NULL,
	`fileSize` real NOT NULL,
	`fileBlob` blob NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`paperworkId`) REFERENCES `paperworks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `logs` (
	`id` integer PRIMARY KEY NOT NULL,
	`actionType` text,
	`method` text,
	`message` text,
	`oldData` text,
	`newData` text,
	`actionBy` text,
	`ipaddress` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `paperworksCategories` (
	`id` text PRIMARY KEY NOT NULL,
	`paperworkId` text NOT NULL,
	`categoryId` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`paperworkId`) REFERENCES `paperworks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `paperworks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`issuedAt` integer,
	`price` real,
	`priceCurrency` text,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	`isDeleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `userFiles` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`fileId` text NOT NULL,
	`role` text NOT NULL,
	`isSelected` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`fileId`) REFERENCES `files`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `usersSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`createdAt` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`createdBy` text,
	`updatedAt` integer,
	`updatedBy` text,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `settings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`userName` text NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`systemRole` text DEFAULT 'user' NOT NULL,
	`isDeleted` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `settings_key_unique` ON `settings` (`key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_userName_unique` ON `users` (`userName`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);