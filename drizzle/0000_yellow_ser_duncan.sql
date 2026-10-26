CREATE TABLE `aftercare` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`notes` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `care_customer` ON `aftercare` (`customer_id`);--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`prescription_id` text NOT NULL,
	`name` text NOT NULL,
	`key` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`customer_id` text NOT NULL,
	`action` text NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_owner` ON `audit` (`owner_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text DEFAULT '' NOT NULL,
	`dob` text DEFAULT '' NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`demo` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_owner` ON `customers` (`owner_id`);--> statement-breakpoint
CREATE TABLE `families` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`relative_id` text NOT NULL,
	`relationship` text NOT NULL,
	`contact` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`relative_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `family_customer` ON `families` (`customer_id`);--> statement-breakpoint
CREATE INDEX `family_relative` ON `families` (`relative_id`);--> statement-breakpoint
CREATE TABLE `prescriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`date` text NOT NULL,
	`doctor` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`pd_mode` text NOT NULL,
	`grid` text NOT NULL,
	`supersedes_id` text,
	`correction_reason` text DEFAULT '' NOT NULL,
	`author` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `rx_customer` ON `prescriptions` (`customer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rx_one_correction` ON `prescriptions` (`supersedes_id`);