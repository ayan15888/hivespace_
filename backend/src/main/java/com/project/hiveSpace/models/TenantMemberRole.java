package com.project.hiveSpace.models;

/** Aligns with HIveSpaceSchema.sql tenant_members.role CHECK constraint. */
public enum TenantMemberRole {
    OWNER,
    ADMIN,
    BILLING_ADMIN,
    MEMBER
}

