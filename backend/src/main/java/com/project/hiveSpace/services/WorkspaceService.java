package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.WorkspaceRequest;
import com.project.hiveSpace.dto.WorkspaceResponse;
import com.project.hiveSpace.models.Tenant;
import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.repository.TenantRepository;
import com.project.hiveSpace.repository.WorkspaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WorkspaceService {

    private final WorkspaceRepository workspaceRepository;
    private final TenantRepository tenantRepository;

    @Transactional
    public WorkspaceResponse createWorkspace(WorkspaceRequest request) {
        Tenant tenant = tenantRepository.findById(request.getTenantId())
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found"));

        // Check workspace name uniqueness within this tenant
        if (workspaceRepository.existsByNameAndTenant(request.getName(), tenant)) {
            throw new IllegalArgumentException(
                    "A workspace with the name '" + request.getName() + "' already exists in this organization");
        }

        Workspace workspace = Workspace.builder()
                .name(request.getName())
                .description(request.getDescription())
                .plan(request.getPlan())
                .tenant(tenant)
                .createdAt(new Date())
                .updatedAt(new Date())
                .build();

        Workspace savedWorkspace = workspaceRepository.save(workspace);

        // Increment workspaces count on tenant
        tenant.setWorkspacesCount(tenant.getWorkspacesCount() + 1);
        tenantRepository.save(tenant);

        return mapToResponse(savedWorkspace);
    }

    public List<WorkspaceResponse> getWorkspacesByTenant(UUID tenantId) {
        if (!tenantRepository.existsById(tenantId)) {
            throw new IllegalArgumentException("Tenant not found");
        }

        return workspaceRepository.findAllByTenantId(tenantId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private WorkspaceResponse mapToResponse(Workspace workspace) {
        return new WorkspaceResponse(
                workspace.getId(),
                workspace.getName(),
                workspace.getDescription(),
                workspace.getPlan(),
                workspace.getTenant().getId(),
                workspace.getCreatedAt(),
                workspace.getUpdatedAt()
        );
    }
}
