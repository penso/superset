import type {
	RemoteWorkspaceTransport,
	WorkspaceExecutionMode,
} from "@superset/local-db/schema/zod";
import { Button } from "@superset/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@superset/ui/collapsible";
import {
	Command,
	CommandEmpty,
	CommandInput,
	CommandItem,
	CommandList,
} from "@superset/ui/command";
import { Input } from "@superset/ui/input";
import { Label } from "@superset/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@superset/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@superset/ui/select";
import { Switch } from "@superset/ui/switch";
import { GoGitBranch } from "react-icons/go";
import {
	HiCheck,
	HiChevronDown,
	HiChevronUpDown,
	HiOutlinePencil,
} from "react-icons/hi2";
import { formatRelativeTime } from "renderer/lib/formatRelativeTime";
import {
	RemoteWorkspaceTransportEnum,
	WorkspaceExecutionModeEnum,
} from "shared/workspace-execution-mode";

interface BranchOption {
	name: string;
	lastCommitDate: number;
}

interface NewWorkspaceAdvancedOptionsProps {
	showAdvanced: boolean;
	onShowAdvancedChange: (open: boolean) => void;
	branchInputValue: string;
	onBranchInputChange: (value: string) => void;
	onBranchInputBlur: () => void;
	onEditPrefix: () => void;
	isBranchesError: boolean;
	isBranchesLoading: boolean;
	baseBranchOpen: boolean;
	onBaseBranchOpenChange: (open: boolean) => void;
	effectiveBaseBranch: string | null;
	defaultBranch?: string;
	branchSearch: string;
	onBranchSearchChange: (value: string) => void;
	filteredBranches: BranchOption[];
	onSelectBaseBranch: (branchName: string) => void;
	runSetupScript: boolean;
	onRunSetupScriptChange: (checked: boolean) => void;
	executionMode: WorkspaceExecutionMode;
	onExecutionModeChange: (value: WorkspaceExecutionMode) => void;
	remoteHost: string;
	onRemoteHostChange: (value: string) => void;
	remoteUser: string;
	onRemoteUserChange: (value: string) => void;
	remotePort: string;
	onRemotePortChange: (value: string) => void;
	remoteRepoPath: string;
	onRemoteRepoPathChange: (value: string) => void;
	remoteTransport: RemoteWorkspaceTransport;
	onRemoteTransportChange: (value: RemoteWorkspaceTransport) => void;
	remoteUseSshfs: boolean;
	onRemoteUseSshfsChange: (checked: boolean) => void;
}

export function NewWorkspaceAdvancedOptions({
	showAdvanced,
	onShowAdvancedChange,
	branchInputValue,
	onBranchInputChange,
	onBranchInputBlur,
	onEditPrefix,
	isBranchesError,
	isBranchesLoading,
	baseBranchOpen,
	onBaseBranchOpenChange,
	effectiveBaseBranch,
	defaultBranch,
	branchSearch,
	onBranchSearchChange,
	filteredBranches,
	onSelectBaseBranch,
	runSetupScript,
	onRunSetupScriptChange,
	executionMode,
	onExecutionModeChange,
	remoteHost,
	onRemoteHostChange,
	remoteUser,
	onRemoteUserChange,
	remotePort,
	onRemotePortChange,
	remoteRepoPath,
	onRemoteRepoPathChange,
	remoteTransport,
	onRemoteTransportChange,
	remoteUseSshfs,
	onRemoteUseSshfsChange,
}: NewWorkspaceAdvancedOptionsProps) {
	const handleExecutionModeSelect = (value: string) => {
		if (
			value === WorkspaceExecutionModeEnum.Local ||
			value === WorkspaceExecutionModeEnum.RemoteSsh
		) {
			onExecutionModeChange(value);
		}
	};

	const handleRemoteTransportSelect = (value: string) => {
		if (
			value === RemoteWorkspaceTransportEnum.Ssh ||
			value === RemoteWorkspaceTransportEnum.Mosh
		) {
			onRemoteTransportChange(value);
		}
	};

	return (
		<Collapsible open={showAdvanced} onOpenChange={onShowAdvancedChange}>
			<CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
				<HiChevronDown
					className={`size-3 transition-transform ${showAdvanced ? "" : "-rotate-90"}`}
				/>
				Advanced options
			</CollapsibleTrigger>
			<CollapsibleContent className="pt-3 space-y-3">
				<div className="space-y-1.5">
					<div className="flex items-center justify-between">
						<label htmlFor="branch" className="text-xs text-muted-foreground">
							Branch name
						</label>
						<button
							type="button"
							onClick={onEditPrefix}
							className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							<HiOutlinePencil className="size-3" />
							<span>Edit prefix</span>
						</button>
					</div>
					<Input
						id="branch"
						className="h-8 text-sm font-mono"
						placeholder="auto-generated"
						value={branchInputValue}
						onChange={(e) => onBranchInputChange(e.target.value)}
						onBlur={onBranchInputBlur}
					/>
				</div>

				<div className="space-y-1.5">
					<span className="text-xs text-muted-foreground">Base branch</span>
					{isBranchesError ? (
						<div className="flex items-center gap-2 h-8 px-3 rounded-md border border-destructive/50 bg-destructive/10 text-destructive text-xs">
							Failed to load branches
						</div>
					) : (
						<Popover
							open={baseBranchOpen}
							onOpenChange={onBaseBranchOpenChange}
							modal={false}
						>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									size="sm"
									className="w-full h-8 justify-between font-normal"
									disabled={isBranchesLoading}
								>
									<span className="flex items-center gap-2 truncate">
										<GoGitBranch className="size-3.5 shrink-0 text-muted-foreground" />
										<span className="truncate font-mono text-sm">
											{effectiveBaseBranch || "Select branch..."}
										</span>
										{effectiveBaseBranch === defaultBranch && (
											<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
												default
											</span>
										)}
									</span>
									<HiChevronUpDown className="size-4 shrink-0 text-muted-foreground" />
								</Button>
							</PopoverTrigger>
							<PopoverContent
								className="w-[--radix-popover-trigger-width] p-0"
								align="start"
								onWheel={(e) => e.stopPropagation()}
							>
								<Command shouldFilter={false}>
									<CommandInput
										placeholder="Search branches..."
										value={branchSearch}
										onValueChange={onBranchSearchChange}
									/>
									<CommandList className="max-h-[200px]">
										<CommandEmpty>No branches found</CommandEmpty>
										{filteredBranches.map((branch) => (
											<CommandItem
												key={branch.name}
												value={branch.name}
												onSelect={() => onSelectBaseBranch(branch.name)}
												className="flex items-center justify-between"
											>
												<span className="flex items-center gap-2 truncate">
													<GoGitBranch className="size-3.5 shrink-0 text-muted-foreground" />
													<span className="truncate">{branch.name}</span>
													{branch.name === defaultBranch && (
														<span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
															default
														</span>
													)}
												</span>
												<span className="flex items-center gap-2 shrink-0">
													{branch.lastCommitDate > 0 && (
														<span className="text-xs text-muted-foreground">
															{formatRelativeTime(branch.lastCommitDate)}
														</span>
													)}
													{effectiveBaseBranch === branch.name && (
														<HiCheck className="size-4 text-primary" />
													)}
												</span>
											</CommandItem>
										))}
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					)}
				</div>

				<div className="flex items-center justify-between">
					<Label
						htmlFor="run-setup-script"
						className="text-xs text-muted-foreground"
					>
						Run setup script
					</Label>
					<Switch
						id="run-setup-script"
						checked={runSetupScript}
						onCheckedChange={onRunSetupScriptChange}
					/>
				</div>

				<div className="space-y-1.5">
					<span className="text-xs text-muted-foreground">Execution mode</span>
					<Select
						value={executionMode}
						onValueChange={handleExecutionModeSelect}
					>
						<SelectTrigger className="h-8">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={WorkspaceExecutionModeEnum.Local}>
								Local
							</SelectItem>
							<SelectItem value={WorkspaceExecutionModeEnum.RemoteSsh}>
								Remote over SSH / Mosh
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				{executionMode === WorkspaceExecutionModeEnum.RemoteSsh && (
					<>
						<div className="space-y-1.5">
							<Label
								htmlFor="remote-host"
								className="text-xs text-muted-foreground"
							>
								Remote host
							</Label>
							<Input
								id="remote-host"
								className="h-8 text-sm font-mono"
								placeholder="example.com"
								value={remoteHost}
								onChange={(e) => onRemoteHostChange(e.target.value)}
							/>
						</div>

						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1.5">
								<Label
									htmlFor="remote-user"
									className="text-xs text-muted-foreground"
								>
									Remote user
								</Label>
								<Input
									id="remote-user"
									className="h-8 text-sm font-mono"
									placeholder="optional"
									value={remoteUser}
									onChange={(e) => onRemoteUserChange(e.target.value)}
								/>
							</div>
							<div className="space-y-1.5">
								<Label
									htmlFor="remote-port"
									className="text-xs text-muted-foreground"
								>
									Port
								</Label>
								<Input
									id="remote-port"
									className="h-8 text-sm font-mono"
									placeholder="22"
									value={remotePort}
									onChange={(e) => onRemotePortChange(e.target.value)}
								/>
							</div>
						</div>

						<div className="space-y-1.5">
							<Label
								htmlFor="remote-repo-path"
								className="text-xs text-muted-foreground"
							>
								Remote repo path
							</Label>
							<Input
								id="remote-repo-path"
								className="h-8 text-sm font-mono"
								placeholder="~/src/repo"
								value={remoteRepoPath}
								onChange={(e) => onRemoteRepoPathChange(e.target.value)}
							/>
						</div>

						<div className="space-y-1.5">
							<span className="text-xs text-muted-foreground">Transport</span>
							<Select
								value={remoteTransport}
								onValueChange={handleRemoteTransportSelect}
							>
								<SelectTrigger className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={RemoteWorkspaceTransportEnum.Ssh}>
										SSH
									</SelectItem>
									<SelectItem value={RemoteWorkspaceTransportEnum.Mosh}>
										Mosh
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-center justify-between">
							<Label
								htmlFor="remote-use-sshfs"
								className="text-xs text-muted-foreground"
							>
								Mount with SSHFS (experimental)
							</Label>
							<Switch
								id="remote-use-sshfs"
								checked={remoteUseSshfs}
								onCheckedChange={onRemoteUseSshfsChange}
							/>
						</div>
					</>
				)}
			</CollapsibleContent>
		</Collapsible>
	);
}
