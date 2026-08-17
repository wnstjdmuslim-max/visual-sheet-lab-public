CREATE TABLE `filmGrabBenchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`filmTitle` varchar(255) NOT NULL,
	`sourcePage` varchar(512) NOT NULL,
	`imageUrls` text NOT NULL,
	`palette` text NOT NULL,
	`analysis` text NOT NULL,
	`sourceUpdatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `filmGrabBenchmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `filmGrabBenchmarks_sourcePage_unique` UNIQUE(`sourcePage`)
);
