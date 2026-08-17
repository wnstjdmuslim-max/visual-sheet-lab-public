CREATE TABLE `characterPromptBenchmarks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`caseName` varchar(128) NOT NULL,
	`platform` varchar(64) NOT NULL,
	`strength` varchar(64) NOT NULL,
	`inputFields` text NOT NULL,
	`outputPrompts` text NOT NULL,
	`sourceLabel` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characterPromptBenchmarks_id` PRIMARY KEY(`id`),
	CONSTRAINT `characterPromptBenchmarks_caseName_unique` UNIQUE(`caseName`)
);
