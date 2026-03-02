import type { RemoteWorkspaceTransport } from "@superset/local-db/schema/zod";
import { RemoteWorkspaceTransportEnum } from "shared/workspace-execution-mode";
import type {
	TerminalCapabilities,
	TerminalManagement,
	TerminalRuntime,
	WorkspaceRuntime,
	WorkspaceRuntimeId,
} from "./types";

export interface RemoteWorkspaceConfig {
	host: string;
	user: string | null;
	port: number | null;
	repoPath: string;
	transport: RemoteWorkspaceTransport;
	useSshfs: boolean;
}

function shellEscape(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

function sanitizeTmuxSessionName(value: string): string {
	const normalized = value.replace(/[^a-zA-Z0-9_-]/g, "-");
	return normalized.slice(0, 64);
}

function formatRemoteTarget(config: RemoteWorkspaceConfig): string {
	return config.user ? `${config.user}@${config.host}` : config.host;
}

function buildRemoteAttachCommand(params: {
	workspaceId: string;
	paneId: string;
	config: RemoteWorkspaceConfig;
}): string {
	const { workspaceId, paneId, config } = params;
	const tmuxSession = sanitizeTmuxSessionName(
		`superset-${workspaceId}-${paneId}`,
	);
	const remoteTarget = formatRemoteTarget(config);
	const tmuxCommand = `tmux new-session -A -s ${shellEscape(tmuxSession)} -c ${shellEscape(config.repoPath)}`;

	if (config.transport === RemoteWorkspaceTransportEnum.Mosh) {
		const sshCommand = config.port ? `ssh -p ${config.port}` : "ssh";
		return `exec mosh --ssh=${shellEscape(sshCommand)} ${shellEscape(remoteTarget)} -- ${shellEscape(tmuxCommand)}`;
	}

	const portArg = config.port ? `-p ${config.port} ` : "";
	return `exec ssh -t ${portArg}${shellEscape(remoteTarget)} ${shellEscape(tmuxCommand)}`;
}

class RemoteSshTerminalRuntime implements TerminalRuntime {
	readonly management: TerminalManagement;
	readonly capabilities: TerminalCapabilities;

	constructor(
		private readonly backend: TerminalRuntime,
		private readonly workspaceId: string,
		private readonly config: RemoteWorkspaceConfig,
	) {
		this.management = backend.management;
		this.capabilities = backend.capabilities;
	}

	createOrAttach: TerminalRuntime["createOrAttach"] = async (params) => {
		const result = await this.backend.createOrAttach(params);
		if (result.isNew) {
			const command = buildRemoteAttachCommand({
				workspaceId: this.workspaceId,
				paneId: params.paneId,
				config: this.config,
			});
			this.backend.write({ paneId: params.paneId, data: `${command}\r` });
		}
		return result;
	};

	write: TerminalRuntime["write"] = (params) => {
		return this.backend.write(params);
	};

	resize: TerminalRuntime["resize"] = (params) => {
		return this.backend.resize(params);
	};

	signal: TerminalRuntime["signal"] = (params) => {
		return this.backend.signal(params);
	};

	kill: TerminalRuntime["kill"] = (params) => {
		return this.backend.kill(params);
	};

	detach: TerminalRuntime["detach"] = (params) => {
		return this.backend.detach(params);
	};

	clearScrollback: TerminalRuntime["clearScrollback"] = (params) => {
		return this.backend.clearScrollback(params);
	};

	ackColdRestore: TerminalRuntime["ackColdRestore"] = (paneId) => {
		return this.backend.ackColdRestore(paneId);
	};

	getSession: TerminalRuntime["getSession"] = (paneId) => {
		return this.backend.getSession(paneId);
	};

	killByWorkspaceId: TerminalRuntime["killByWorkspaceId"] = (workspaceId) => {
		return this.backend.killByWorkspaceId(workspaceId);
	};

	getSessionCountByWorkspaceId: TerminalRuntime["getSessionCountByWorkspaceId"] =
		(workspaceId) => {
			return this.backend.getSessionCountByWorkspaceId(workspaceId);
		};

	refreshPromptsForWorkspace: TerminalRuntime["refreshPromptsForWorkspace"] = (
		workspaceId,
	) => {
		return this.backend.refreshPromptsForWorkspace(workspaceId);
	};

	on(event: string | symbol, listener: (...args: unknown[]) => void): this {
		this.backend.on(event, listener);
		return this;
	}

	off(event: string | symbol, listener: (...args: unknown[]) => void): this {
		this.backend.off(event, listener);
		return this;
	}

	once(event: string | symbol, listener: (...args: unknown[]) => void): this {
		this.backend.once(event, listener);
		return this;
	}

	emit(event: string | symbol, ...args: unknown[]): boolean {
		return this.backend.emit(event, ...args);
	}

	addListener(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		this.backend.addListener(event, listener);
		return this;
	}

	removeListener(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		this.backend.removeListener(event, listener);
		return this;
	}

	removeAllListeners(event?: string | symbol): this {
		this.backend.removeAllListeners(event);
		return this;
	}

	setMaxListeners(n: number): this {
		this.backend.setMaxListeners(n);
		return this;
	}

	getMaxListeners(): number {
		return this.backend.getMaxListeners();
	}

	// biome-ignore lint/complexity/noBannedTypes: EventEmitter interface requires Function[]
	listeners(event: string | symbol): Function[] {
		return this.backend.listeners(event);
	}

	// biome-ignore lint/complexity/noBannedTypes: EventEmitter interface requires Function[]
	rawListeners(event: string | symbol): Function[] {
		return this.backend.rawListeners(event);
	}

	listenerCount(
		event: string | symbol,
		listener?: (...args: unknown[]) => void,
	): number {
		return this.backend.listenerCount(event, listener);
	}

	prependListener(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		this.backend.prependListener(event, listener);
		return this;
	}

	prependOnceListener(
		event: string | symbol,
		listener: (...args: unknown[]) => void,
	): this {
		this.backend.prependOnceListener(event, listener);
		return this;
	}

	eventNames(): (string | symbol)[] {
		return this.backend.eventNames();
	}

	detachAllListeners(): void {
		this.backend.detachAllListeners();
	}

	cleanup: TerminalRuntime["cleanup"] = async () => {
		// No-op: backend lifetime is owned by the local runtime singleton.
	};
}

export class RemoteWorkspaceRuntime implements WorkspaceRuntime {
	readonly id: WorkspaceRuntimeId;
	readonly terminal: TerminalRuntime;
	readonly capabilities: WorkspaceRuntime["capabilities"];

	constructor(params: {
		workspaceId: string;
		config: RemoteWorkspaceConfig;
		localTerminal: TerminalRuntime;
	}) {
		const { workspaceId, config, localTerminal } = params;
		this.id = `remote-ssh:${workspaceId}`;
		this.terminal = new RemoteSshTerminalRuntime(
			localTerminal,
			workspaceId,
			config,
		);
		this.capabilities = {
			terminal: this.terminal.capabilities,
		};
	}
}
