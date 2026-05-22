import React from "react";

export type LevelType = "tenant" | "workspace" | "project" | "team" | "task";

export interface RoleDetail {
  name: string;
  label: string;
  colorClass: string;
  description: string;
  capabilities: string[];
}

export interface MatrixRow {
  action: string;
  description: string;
  rolesGranted: string[];
}

export interface LevelDetail {
  id: LevelType;
  name: string;
  tableName: string;
  icon: React.ElementType;
  description: string;
  roles: RoleDetail[];
  matrix: MatrixRow[];
  ddl?: string;
  indexes?: string[];
}
