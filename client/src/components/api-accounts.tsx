"use client";
import { PublicAuth } from "@/features/auth/PublicAuth";
import { CustomerProfile } from "@/features/customer/customer-profile";
import { HostApplication } from "@/features/workspace/host-application";
export function ApiAuth({ register = false, host = false }: {
    register?: boolean;
    host?: boolean;
}) {
    return host ? <HostApplication/> : <PublicAuth register={register}/>;
}

export function ApiProfile() {
    return <CustomerProfile/>;
}
