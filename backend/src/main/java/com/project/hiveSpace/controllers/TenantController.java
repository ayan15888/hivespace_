package com.project.hiveSpace.controllers;

import com.project.hiveSpace.dto.TenantRequest;
import com.project.hiveSpace.dto.TenantResponse;
import com.project.hiveSpace.dto.MemberResponse;
import com.project.hiveSpace.services.TenantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;

    @PostMapping
    public ResponseEntity<TenantResponse> createTenant(@Valid @RequestBody TenantRequest request) {
        return ResponseEntity.ok(tenantService.createTenant(request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<TenantResponse>> getTenantsForCurrentUser() {
        return ResponseEntity.ok(tenantService.getTenantsForCurrentUser());
    }

    @GetMapping("/count/{userId}")
    public ResponseEntity<Long> getTenantCountByEmail(@PathVariable UUID userId) {
        return ResponseEntity.ok(tenantService.getTenantCountByOwnerId(userId));
    }

    @GetMapping("/u/{userId}")
    public ResponseEntity<List<TenantResponse>> getTenantsByEmail(@PathVariable UUID userId) {
        return ResponseEntity.ok(tenantService.getTenantsByOwnerId(userId));
    }

    @GetMapping("/{tenantId}/members")
    public ResponseEntity<List<MemberResponse>> getTenantMembers(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(tenantService.getMembersByTenantId(tenantId));
    }

    @PutMapping("/{tenantId}/members/{userId}/role")
    public ResponseEntity<MemberResponse> updateMemberRole(
            @PathVariable UUID tenantId,
            @PathVariable UUID userId,
            @RequestParam String role) {
        return ResponseEntity.ok(tenantService.updateMemberRole(tenantId, userId, role));
    }

    @DeleteMapping("/{tenantId}/members/{userId}")
    public ResponseEntity<Void> removeMember(
            @PathVariable UUID tenantId,
            @PathVariable UUID userId) {
        tenantService.removeMember(tenantId, userId);
        return ResponseEntity.noContent().build();
    }
}
