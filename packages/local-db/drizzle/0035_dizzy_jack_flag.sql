ALTER TABLE `workspaces` ADD `execution_mode` text DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_host` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_user` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_port` integer;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_repo_path` text;--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_transport` text DEFAULT 'ssh';--> statement-breakpoint
ALTER TABLE `workspaces` ADD `remote_use_sshfs` integer DEFAULT false;