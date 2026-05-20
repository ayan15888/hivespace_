package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ProjectMemberResponse;
import com.project.hiveSpace.models.Project;
import com.project.hiveSpace.models.ProjectMember;
import com.project.hiveSpace.models.ProjectMemberRole;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.repository.ProjectMemberRepository;
import com.project.hiveSpace.repository.ProjectRepository;
import com.project.hiveSpace.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProjectMemberService {

    private final ProjectMemberRepository projectMemberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public List<ProjectMemberResponse> getMembersByProject(UUID projectId) {
        if (!projectRepository.existsById(projectId)) {
            throw new IllegalArgumentException("Project not found");
        }

        return projectMemberRepository.findAllByProjectId(projectId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ProjectMemberResponse addMemberToProject(UUID projectId, UUID userId, ProjectMemberRole role) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (projectMemberRepository.existsByProjectAndUser(project, user)) {
            throw new IllegalArgumentException("User is already a member of this project");
        }

        ProjectMemberRole actualRole = role != null ? role : ProjectMemberRole.MEMBER;

        ProjectMember projectMember = ProjectMember.builder()
                .project(project)
                .user(user)
                .role(actualRole)
                .joinedAt(new Date())
                .build();

        ProjectMember saved = projectMemberRepository.save(projectMember);

        // Increment project members count
        project.setMembersCount(project.getMembersCount() + 1);
        projectRepository.save(project);

        return mapToResponse(saved);
    }

    @Transactional
    public ProjectMemberResponse updateMemberRole(UUID projectId, UUID userId, ProjectMemberRole role) {
        ProjectMember projectMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        projectMember.setRole(role);
        ProjectMember updated = projectMemberRepository.save(projectMember);
        return mapToResponse(updated);
    }

    @Transactional
    public void removeMemberFromProject(UUID projectId, UUID userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        ProjectMember projectMember = projectMemberRepository.findByProjectIdAndUserId(projectId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Membership not found"));

        projectMemberRepository.delete(projectMember);

        // Decrement project members count
        if (project.getMembersCount() > 0) {
            project.setMembersCount(project.getMembersCount() - 1);
            projectRepository.save(project);
        }
    }

    private ProjectMemberResponse mapToResponse(ProjectMember member) {
        return ProjectMemberResponse.builder()
                .id(member.getId())
                .projectId(member.getProject().getId())
                .userId(member.getUser().getId())
                .username(member.getUser().getUsername())
                .email(member.getUser().getEmail())
                .fullName(member.getUser().getFullName())
                .avatarUrl(member.getUser().getAvatarUrl())
                .role(member.getRole())
                .joinedAt(member.getJoinedAt())
                .build();
    }
}
