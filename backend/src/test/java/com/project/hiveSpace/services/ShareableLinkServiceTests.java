package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.*;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShareableLinkServiceTests {

    @Mock
    private ShareableLinkRepository shareableLinkRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectTeamRepository projectTeamRepository;

    @Mock
    private ProjectMemberRepository projectMemberRepository;

    @Mock
    private RbacService rbacService;

    @InjectMocks
    private ShareableLinkService shareableLinkService;

    private UUID projectId;
    private Project project;
    private User actor;

    @BeforeEach
    void setUp() {
        projectId = UUID.randomUUID();
        actor = User.builder()
                .id(UUID.randomUUID())
                .username("sharer")
                .email("share@example.com")
                .fullName("Sharer User")
                .build();

        Workspace workspace = Workspace.builder()
                .id(UUID.randomUUID())
                .name("Workspace")
                .build();

        project = Project.builder()
                .id(projectId)
                .name("Shared Project")
                .workspace(workspace)
                .createdAt(new Date())
                .build();
    }

    @Test
    void testGenerateShareLink_Success_NewLink() {
        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER)).thenReturn(true);
        when(shareableLinkRepository.findByProjectIdAndIsActiveTrue(projectId)).thenReturn(Optional.empty());
        when(shareableLinkRepository.save(any(ShareableLink.class))).thenAnswer(invocation -> {
            ShareableLink link = invocation.getArgument(0);
            link.setId(UUID.randomUUID());
            return link;
        });

        ShareableLinkResponse response = shareableLinkService.generateShareLink(projectId, actor);

        assertNotNull(response);
        assertEquals(projectId, response.getProjectId());
        assertTrue(response.isActive());
        assertNotNull(response.getToken());
        verify(shareableLinkRepository, times(1)).save(any(ShareableLink.class));
    }

    @Test
    void testGenerateShareLink_Success_ExistingLink() {
        ShareableLink existing = ShareableLink.builder()
                .id(UUID.randomUUID())
                .token("existingtoken123")
                .project(project)
                .isActive(true)
                .createdAt(new Date())
                .build();

        when(projectRepository.findById(projectId)).thenReturn(Optional.of(project));
        when(rbacService.hasProjectRole(projectId, ProjectMemberRole.VIEWER)).thenReturn(true);
        when(shareableLinkRepository.findByProjectIdAndIsActiveTrue(projectId)).thenReturn(Optional.of(existing));

        ShareableLinkResponse response = shareableLinkService.generateShareLink(projectId, actor);

        assertNotNull(response);
        assertEquals("existingtoken123", response.getToken());
        verify(shareableLinkRepository, never()).save(any(ShareableLink.class));
    }

    @Test
    void testGetPublicProjectData_Success() {
        ShareableLink link = ShareableLink.builder()
                .id(UUID.randomUUID())
                .token("publictoken")
                .project(project)
                .isActive(true)
                .accessCount(0)
                .createdAt(new Date())
                .build();

        Task task = Task.builder()
                .id(UUID.randomUUID())
                .title("Shared Task")
                .description("Public detail")
                .status(TaskStatus.TODO)
                .priority(TaskPriority.MEDIUM)
                .project(project)
                .createdAt(new Date())
                .build();

        when(shareableLinkRepository.findByToken("publictoken")).thenReturn(Optional.of(link));
        when(taskRepository.findAllByProjectId(projectId)).thenReturn(Collections.singletonList(task));
        when(projectTeamRepository.countByProjectId(projectId)).thenReturn(0L);
        when(projectMemberRepository.countByProjectId(projectId)).thenReturn(1L);

        SharedProjectResponse response = shareableLinkService.getPublicProjectData("publictoken");

        assertNotNull(response);
        assertEquals("Shared Project", response.getProject().getName());
        assertEquals(1, response.getTasks().size());
        assertEquals("Shared Task", response.getTasks().get(0).getTitle());
        verify(shareableLinkRepository, times(1)).save(link);
    }

    @Test
    void testGetPublicProjectData_ThrowsNotFound_WhenRevoked() {
        ShareableLink link = ShareableLink.builder()
                .id(UUID.randomUUID())
                .token("publictoken")
                .project(project)
                .isActive(false)
                .build();

        when(shareableLinkRepository.findByToken("publictoken")).thenReturn(Optional.of(link));

        assertThrows(NotFoundException.class, () -> 
                shareableLinkService.getPublicProjectData("publictoken")
        );
    }
}
