package com.project.hiveSpace.models;

import java.io.Serializable;
import java.util.Objects;
import java.util.UUID;

public class ProjectTeamId implements Serializable {
    private UUID project;
    private UUID team;

    public ProjectTeamId() {}

    public ProjectTeamId(UUID project, UUID team) {
        this.project = project;
        this.team = team;
    }

    public UUID getProject() {
        return project;
    }

    public void setProject(UUID project) {
        this.project = project;
    }

    public UUID getTeam() {
        return team;
    }

    public void setTeam(UUID team) {
        this.team = team;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ProjectTeamId that = (ProjectTeamId) o;
        return Objects.equals(project, that.project) && Objects.equals(team, that.team);
    }

    @Override
    public int hashCode() {
        return Objects.hash(project, team);
    }
}
