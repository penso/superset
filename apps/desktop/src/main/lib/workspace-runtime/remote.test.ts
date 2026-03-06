import { describe, expect, it } from "bun:test";
import { EventEmitter } from "node:events";
import { RemoteWorkspaceTransportEnum } from "shared/workspace-execution-mode";
import type { CreateSessionParams, SessionResult } from "../terminal/types";
import { type RemoteWorkspaceConfig, RemoteWorkspaceRuntime } from "./remote";
import type { TerminalRuntime } from "./types";

class FakeTerminalRuntime extends EventEmitter implements TerminalRuntime {
	readonly management = {
		listSessions: async () => ({ sessions: [] }),
		killAllSessions: async () => {},
		resetHistoryPersistence: async () => {},
	};

	readonly capabilities = {
		persistent: true,
		coldRestore: true,
	};

	public writes: Array<{ paneId: string; data: string }> = [];
	public nextResult: SessionResult = {
		isNew: true,
		scrollback: "",
		wasRecovered: false,
	};

	async createOrAttach(_params: CreateSessionParams): Promise<SessionResult> {
		return this.nextResult;
	}

	write(params: { paneId: string; data: string }): void {
		this.writes.push(params);
	}

	resize(_params: { paneId: string; cols: number; rows: number }): void {}

	signal(_params: { paneId: string; signal?: string }): void {}

	async kill(_params: { paneId: string }): Promise<void> {}

	detach(_params: { paneId: string }): void {}

	clearScrollback(_params: { paneId: string }): void {}

	ackColdRestore(_paneId: string): void {}

	getSession(
		_paneId: string,
	): { isAlive: boolean; cwd: string; lastActive: number } | null {
		return null;
	}

	async killByWorkspaceId(
		_workspaceId: string,
	): Promise<{ killed: number; failed: number }> {
		return { killed: 0, failed: 0 };
	}

	async getSessionCountByWorkspaceId(_workspaceId: string): Promise<number> {
		return 0;
	}

	refreshPromptsForWorkspace(_workspaceId: string): void {}

	detachAllListeners(): void {
		this.removeAllListeners();
	}

	async cleanup(): Promise<void> {}
}

function createConfig(
	overrides: Partial<RemoteWorkspaceConfig> = {},
): RemoteWorkspaceConfig {
	return {
		host: "example.com",
		user: "alice",
		port: 2222,
		repoPath: "~/src/repo",
		transport: RemoteWorkspaceTransportEnum.Ssh,
		useSshfs: false,
		...overrides,
	};
}

describe("RemoteWorkspaceRuntime", () => {
	it("bootstraps new sessions using ssh + tmux", async () => {
		const backend = new FakeTerminalRuntime();
		const runtime = new RemoteWorkspaceRuntime({
			workspaceId: "ws-1",
			config: createConfig(),
			localTerminal: backend,
		});

		await runtime.terminal.createOrAttach({
			paneId: "pane-1",
			tabId: "tab-1",
			workspaceId: "ws-1",
			themeType: "dark",
		});

		expect(backend.writes).toHaveLength(1);
		const command = backend.writes[0]?.data ?? "";
		expect(command).toContain("exec ssh -t");
		expect(command).toContain("alice@example.com");
		expect(command).toContain("tmux new-session -A -s");
	});

	it("uses mosh transport when configured", async () => {
		const backend = new FakeTerminalRuntime();
		const runtime = new RemoteWorkspaceRuntime({
			workspaceId: "ws-2",
			config: createConfig({
				transport: RemoteWorkspaceTransportEnum.Mosh,
				port: 2223,
			}),
			localTerminal: backend,
		});

		await runtime.terminal.createOrAttach({
			paneId: "pane-2",
			tabId: "tab-2",
			workspaceId: "ws-2",
		});

		expect(backend.writes).toHaveLength(1);
		const command = backend.writes[0]?.data ?? "";
		expect(command).toContain("exec mosh");
		expect(command).toContain("ssh -p 2223");
		expect(command).toContain("tmux new-session -A -s");
	});

	it("does not re-bootstrap when attaching to an existing session", async () => {
		const backend = new FakeTerminalRuntime();
		backend.nextResult = {
			isNew: false,
			scrollback: "",
			wasRecovered: true,
		};
		const runtime = new RemoteWorkspaceRuntime({
			workspaceId: "ws-3",
			config: createConfig(),
			localTerminal: backend,
		});

		await runtime.terminal.createOrAttach({
			paneId: "pane-3",
			tabId: "tab-3",
			workspaceId: "ws-3",
		});

		expect(backend.writes).toHaveLength(0);
	});
});
