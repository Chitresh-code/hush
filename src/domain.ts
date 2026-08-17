export type OrganizationRole = 'admin' | 'member';
export type ProjectRole = 'co_owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  displayName: string;
}

export interface Organization {
  id: string;
  name: string;
}

export interface OrganizationMembership {
  userId: User['id'];
  organizationId: Organization['id'];
  role: OrganizationRole;
  active: boolean;
}

export interface Project {
  id: string;
  organizationId: Organization['id'];
  name: string;
}

export interface ProjectMembership {
  userId: User['id'];
  projectId: Project['id'];
  role: ProjectRole;
  active: boolean;
}

export interface Environment {
  id: string;
  projectId: Project['id'];
  name: string;
}
