import {
	type RemoteWorkspaceTransport,
	RemoteWorkspaceTransportEnum,
	type WorkspaceExecutionMode,
	WorkspaceExecutionModeEnum,
} from "@superset/local-db/schema/zod";

export { RemoteWorkspaceTransportEnum, WorkspaceExecutionModeEnum };

export function isRemoteSshExecutionMode(
	mode: WorkspaceExecutionMode | null | undefined,
): mode is WorkspaceExecutionModeEnum.RemoteSsh {
	return mode === WorkspaceExecutionModeEnum.RemoteSsh;
}

export function isMoshTransport(
	transport: RemoteWorkspaceTransport | null | undefined,
): transport is RemoteWorkspaceTransportEnum.Mosh {
	return transport === RemoteWorkspaceTransportEnum.Mosh;
}
