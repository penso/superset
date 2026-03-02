/**
 * Workspace Runtime Registry
 *
 * Process-scoped registry for workspace runtime providers.
 * The registry is cached for the lifetime of the process.
 *
 * Current behavior:
 * - All workspaces use the LocalWorkspaceRuntime
 * - The runtime is selected once based on settings (requires restart to change)
 *
 * Future behavior (cloud readiness):
 * - Per-workspace selection based on workspace metadata (cloudWorkspaceId, etc.)
 * - Local + cloud workspaces can coexist
 */

import { workspaces } from "@superset/local-db";
import { eq } from "drizzle-orm";
import {
	isMoshTransport,
	isRemoteSshExecutionMode,
	RemoteWorkspaceTransportEnum,
} from "shared/workspace-execution-mode";
import { localDb } from "../local-db";
import { LocalWorkspaceRuntime } from "./local";
import { type RemoteWorkspaceConfig, RemoteWorkspaceRuntime } from "./remote";
import type { WorkspaceRuntime, WorkspaceRuntimeRegistry } from "./types";

// =============================================================================
// Registry Implementation
// =============================================================================

/**
 * Default registry implementation.
 *
 * Currently returns the same LocalWorkspaceRuntime for all workspaces.
 * The interface supports per-workspace selection for future cloud work.
 */
class DefaultWorkspaceRuntimeRegistry implements WorkspaceRuntimeRegistry {
	private localRuntime: LocalWorkspaceRuntime | null = null;
	private remoteRuntimeByWorkspaceId = new Map<
		string,
		{ cacheKey: string; runtime: RemoteWorkspaceRuntime }
	>();

	/**
	 * Get the runtime for a specific workspace.
	 *
	 * Currently always returns the local runtime.
	 * Future: will check workspace metadata to select local vs cloud.
	 */
	getForWorkspaceId(workspaceId: string): WorkspaceRuntime {
		const workspace = localDb
			.select()
			.from(workspaces)
			.where(eq(workspaces.id, workspaceId))
			.get();
		if (!workspace || !isRemoteSshExecutionMode(workspace.executionMode)) {
			return this.getDefault();
		}

		const config = this.toRemoteConfig(workspace);
		if (!config) {
			return this.getDefault();
		}

		const cacheKey = this.getRemoteCacheKey(config);
		const cached = this.remoteRuntimeByWorkspaceId.get(workspaceId);
		if (cached && cached.cacheKey === cacheKey) {
			return cached.runtime;
		}

		const runtime = new RemoteWorkspaceRuntime({
			workspaceId,
			config,
			localTerminal: this.getDefault().terminal,
		});
		this.remoteRuntimeByWorkspaceId.set(workspaceId, { cacheKey, runtime });
		return runtime;
	}

	private toRemoteConfig(
		workspace: typeof workspaces.$inferSelect,
	): RemoteWorkspaceConfig | null {
		if (!workspace.remoteHost || !workspace.remoteRepoPath) {
			console.warn(
				`[workspace-runtime] Workspace ${workspace.id} is marked remote but is missing host or repo path, falling back to local runtime`,
			);
			return null;
		}

		return {
			host: workspace.remoteHost,
			user: workspace.remoteUser ?? null,
			port: workspace.remotePort ?? null,
			repoPath: workspace.remoteRepoPath,
			transport: isMoshTransport(workspace.remoteTransport)
				? RemoteWorkspaceTransportEnum.Mosh
				: RemoteWorkspaceTransportEnum.Ssh,
			useSshfs: workspace.remoteUseSshfs ?? false,
		};
	}

	private getRemoteCacheKey(config: RemoteWorkspaceConfig): string {
		return JSON.stringify({
			host: config.host,
			user: config.user,
			port: config.port,
			repoPath: config.repoPath,
			transport: config.transport,
			useSshfs: config.useSshfs,
		});
	}

	reset(): void {
		this.localRuntime = null;
		this.remoteRuntimeByWorkspaceId.clear();
	}

	/**
	 * Get the default runtime (for global/legacy endpoints).
	 *
	 * Returns the local runtime, lazily initialized.
	 * The runtime instance is cached for the lifetime of the process.
	 */
	getDefault(): WorkspaceRuntime {
		if (!this.localRuntime) {
			this.localRuntime = new LocalWorkspaceRuntime();
		}
		return this.localRuntime;
	}
}

// =============================================================================
// Singleton Instance
// =============================================================================

let registryInstance: WorkspaceRuntimeRegistry | null = null;

/**
 * Get the workspace runtime registry.
 *
 * The registry is process-scoped and cached. Callers should capture it once
 * (e.g., when creating a tRPC router) and use it for the lifetime of the router.
 *
 * This design allows:
 * 1. Stable runtime instances (no re-creation on each call)
 * 2. Consistent event wiring (same backend for all listeners)
 * 3. Future per-workspace selection (local vs cloud)
 */
export function getWorkspaceRuntimeRegistry(): WorkspaceRuntimeRegistry {
	if (!registryInstance) {
		registryInstance = new DefaultWorkspaceRuntimeRegistry();
	}
	return registryInstance;
}

/**
 * Reset the registry (for testing only).
 * This should not be called in production code.
 */
export function resetWorkspaceRuntimeRegistry(): void {
	if (registryInstance instanceof DefaultWorkspaceRuntimeRegistry) {
		registryInstance.reset();
	}
	registryInstance = null;
}
