"use client";
import { WorkspaceSettings } from "@/features/workspace/workspace-settings";
import { HostLegalProfile, HostContracts } from "./host-legal";
import "./host-contract.css";

export function HostSettings() {
  return <WorkspaceSettings role="host" afterAccount={<><HostLegalProfile/><HostContracts/></>}/>;
}
