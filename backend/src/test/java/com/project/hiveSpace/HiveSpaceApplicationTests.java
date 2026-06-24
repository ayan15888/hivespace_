package com.project.hiveSpace;

import com.project.hiveSpace.models.Workspace;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.ResourceType;
import com.project.hiveSpace.repository.WorkspaceRepository;
import com.project.hiveSpace.repository.UserRepository;
import com.project.hiveSpace.security.RbacService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@SpringBootTest
class HiveSpaceApplicationTests {

    @Autowired
    private WorkspaceRepository workspaceRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RbacService rbacService;

    @Test
    @Transactional
    void testWorkspaceBelongsToTenant() {
        try {
            System.out.println("=== STARTING WORKSPACE TENANT VERIFICATION TEST ===");
            List<Workspace> workspaces = workspaceRepository.findAll();
            if (workspaces.isEmpty()) {
                System.out.println("No workspaces found.");
                return;
            }
            Workspace ws = workspaces.get(0);
            System.out.println("Testing with workspace: " + ws.getName() + " (ID: " + ws.getId() + ")");

            List<User> users = userRepository.findAll();
            if (users.isEmpty()) {
                System.out.println("No users found.");
                return;
            }
            User user = users.get(0);
            System.out.println("Testing with user: " + user.getEmail() + " (Tenant ID: " + (user.getTenant() != null ? user.getTenant().getId() : "null") + ")");

            UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(auth);

            try {
                rbacService.verifyResourceBelongsToTenant(ws.getId(), ResourceType.WORKSPACE);
                System.out.println("verifyResourceBelongsToTenant completed successfully");
            } catch (Exception e) {
                System.err.println("verifyResourceBelongsToTenant failed with exception:");
                e.printStackTrace();
                throw e;
            }
        } catch (Exception e) {
            System.err.println("=== TEST FAILURE ===");
            e.printStackTrace();
            throw e;
        } finally {
            SecurityContextHolder.clearContext();
        }
    }
}
