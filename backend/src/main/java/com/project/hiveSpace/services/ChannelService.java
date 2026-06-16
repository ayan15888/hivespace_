package com.project.hiveSpace.services;

import com.project.hiveSpace.dto.ChannelResponse;
import com.project.hiveSpace.dto.CreateChannelRequest;
import com.project.hiveSpace.dto.OpenDmRequest;
import com.project.hiveSpace.exceptions.ForbiddenException;
import com.project.hiveSpace.exceptions.NotFoundException;
import com.project.hiveSpace.models.*;
import com.project.hiveSpace.repository.*;
import com.project.hiveSpace.security.RbacService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class ChannelService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final WorkspaceRepository workspaceRepository;
    private final ProjectRepository projectRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final RbacService rbacService;

    // POST /api/channels
    public ChannelResponse createChannel(CreateChannelRequest req, UUID currentUserId) {
        // 1. Verify currentUser is a MEMBER or above in req.workspaceId
        if (!rbacService.hasWorkspaceRole(req.workspaceId(), WorkspaceMemberRole.MEMBER)) {
            throw new ForbiddenException("Access denied: Must be a member of the workspace to create channels");
        }

        // 2. If type == PRIVATE, verify user is ADMIN or workspace owner (can admin workspace)
        if (req.type() == ChannelType.PRIVATE && !rbacService.canAdminWorkspace(req.workspaceId())) {
            throw new ForbiddenException("Access denied: Only workspace administrators can create private channels");
        }

        Workspace workspace = workspaceRepository.findById(req.workspaceId())
                .orElseThrow(() -> new NotFoundException("Workspace not found"));

        Project project = null;
        if (req.projectId() != null) {
            project = projectRepository.findById(req.projectId())
                    .orElseThrow(() -> new NotFoundException("Project not found"));
        }

        Team team = null;
        if (req.teamId() != null) {
            team = teamRepository.findById(req.teamId())
                    .orElseThrow(() -> new NotFoundException("Team not found"));
        }

        User currentUser = userRepository.findById(currentUserId)
                .orElseThrow(() -> new NotFoundException("Current user not found"));

        // 3. Build and save Channel entity
        Channel channel = Channel.builder()
                .name(req.name())
                .type(req.type())
                .workspace(workspace)
                .project(project)
                .team(team)
                .createdBy(currentUser)
                .build();

        Channel savedChannel = channelRepository.save(channel);

        // 4. Add creator as first channel member
        ChannelMemberId memberId = ChannelMemberId.builder()
                .channelId(savedChannel.getId())
                .userId(currentUserId)
                .build();

        ChannelMember member = ChannelMember.builder()
                .id(memberId)
                .channel(savedChannel)
                .user(currentUser)
                .joinedAt(Instant.now())
                .build();

        channelMemberRepository.save(member);

        // 5. Return ChannelResponse (unreadCount = 0 for new channel)
        return new ChannelResponse(
                savedChannel.getId(),
                savedChannel.getName(),
                savedChannel.getType(),
                savedChannel.getWorkspace().getId(),
                savedChannel.getProject() != null ? savedChannel.getProject().getId() : null,
                savedChannel.getTeam() != null ? savedChannel.getTeam().getId() : null,
                0L
        );
    }

    // GET /api/workspaces/{workspaceId}/channels
    @Transactional(readOnly = true)
    public List<ChannelResponse> getChannelsForUser(UUID workspaceId, UUID currentUserId) {
        if (!rbacService.hasWorkspaceRole(workspaceId, WorkspaceMemberRole.MEMBER)) {
            throw new ForbiddenException("Access denied: Must be a member of the workspace to list channels");
        }

        List<Channel> channels = channelRepository.findByWorkspaceAndMember(workspaceId, currentUserId);

        return channels.stream().map(channel -> {
            ChannelMember member = channelMemberRepository.findByIdChannelIdAndIdUserId(channel.getId(), currentUserId)
                    .orElse(null);
            Instant lastReadAt = member != null ? member.getLastReadAt() : null;
            Instant resolvedLastReadAt = lastReadAt != null ? lastReadAt : Instant.EPOCH;
            long unreadCount = channelMemberRepository.countUnread(channel.getId(), currentUserId, resolvedLastReadAt);

            String channelName = channel.getName();
            if (channel.getType() == ChannelType.DM) {
                List<ChannelMember> members = channelMemberRepository.findByIdChannelId(channel.getId());
                User otherUser = members.stream()
                        .map(ChannelMember::getUser)
                        .filter(u -> !u.getId().equals(currentUserId))
                        .findFirst()
                        .orElse(null);
                if (otherUser != null) {
                    channelName = otherUser.getFullName() != null && !otherUser.getFullName().isEmpty()
                            ? otherUser.getFullName() : otherUser.getUsername();
                }
            }

            return new ChannelResponse(
                    channel.getId(),
                    channelName,
                    channel.getType(),
                    channel.getWorkspace().getId(),
                    channel.getProject() != null ? channel.getProject().getId() : null,
                    channel.getTeam() != null ? channel.getTeam().getId() : null,
                    unreadCount
            );
        }).collect(Collectors.toList());
    }

    // POST /api/channels/dm
    public ChannelResponse openDm(OpenDmRequest req, UUID currentUserId) {
        if (!rbacService.hasWorkspaceRole(req.workspaceId(), WorkspaceMemberRole.MEMBER)) {
            throw new ForbiddenException("Access denied: Must be a member of the workspace to open DMs");
        }

        // 1. Run dedup: channelRepository.findExistingDmChannel(req.workspaceId, currentUserId, req.targetUserId)
        UUID existingChannelId = channelRepository.findExistingDmChannel(req.workspaceId(), currentUserId, req.targetUserId())
                .orElse(null);

        if (existingChannelId != null) {
            // 2. If found: load that Channel and return ChannelResponse (unreadCount computed normally)
            Channel channel = channelRepository.findById(existingChannelId)
                    .orElseThrow(() -> new NotFoundException("Channel not found"));

            ChannelMember member = channelMemberRepository.findByIdChannelIdAndIdUserId(channel.getId(), currentUserId)
                    .orElse(null);
            Instant lastReadAt = member != null ? member.getLastReadAt() : null;
            Instant resolvedLastReadAt = lastReadAt != null ? lastReadAt : Instant.EPOCH;
            long unreadCount = channelMemberRepository.countUnread(channel.getId(), currentUserId, resolvedLastReadAt);

            String channelName = channel.getName();
            if (channel.getType() == ChannelType.DM) {
                List<ChannelMember> members = channelMemberRepository.findByIdChannelId(channel.getId());
                User otherUser = members.stream()
                        .map(ChannelMember::getUser)
                        .filter(u -> !u.getId().equals(currentUserId))
                        .findFirst()
                        .orElse(null);
                if (otherUser != null) {
                    channelName = otherUser.getFullName() != null && !otherUser.getFullName().isEmpty()
                            ? otherUser.getFullName() : otherUser.getUsername();
                }
            }

            return new ChannelResponse(
                    channel.getId(),
                    channelName,
                    channel.getType(),
                    channel.getWorkspace().getId(),
                    channel.getProject() != null ? channel.getProject().getId() : null,
                    channel.getTeam() != null ? channel.getTeam().getId() : null,
                    unreadCount
            );
        } else {
            // 3. If not found:
            Workspace workspace = workspaceRepository.findById(req.workspaceId())
                    .orElseThrow(() -> new NotFoundException("Workspace not found"));

            User currentUser = userRepository.findById(currentUserId)
                    .orElseThrow(() -> new NotFoundException("Current user not found"));

            User targetUser = userRepository.findById(req.targetUserId())
                    .orElseThrow(() -> new NotFoundException("Target user not found"));

            // a. INSERT Channel (type=DM, name=null, workspaceId=req.workspaceId)
            Channel channel = Channel.builder()
                    .name(null)
                    .type(ChannelType.DM)
                    .workspace(workspace)
                    .createdBy(currentUser)
                    .build();

            Channel savedChannel = channelRepository.save(channel);

            // b. INSERT ChannelMember for currentUserId
            ChannelMember memberSelf = ChannelMember.builder()
                    .id(new ChannelMemberId(savedChannel.getId(), currentUserId))
                    .channel(savedChannel)
                    .user(currentUser)
                    .joinedAt(Instant.now())
                    .build();
            channelMemberRepository.save(memberSelf);

            // c. INSERT ChannelMember for targetUserId
            ChannelMember memberTarget = ChannelMember.builder()
                    .id(new ChannelMemberId(savedChannel.getId(), req.targetUserId()))
                    .channel(savedChannel)
                    .user(targetUser)
                    .joinedAt(Instant.now())
                    .build();
            channelMemberRepository.save(memberTarget);

            // d. Return ChannelResponse (unreadCount = 0)
            String targetName = targetUser.getFullName() != null && !targetUser.getFullName().isEmpty()
                    ? targetUser.getFullName() : targetUser.getUsername();

            return new ChannelResponse(
                    savedChannel.getId(),
                    targetName,
                    ChannelType.DM,
                    savedChannel.getWorkspace().getId(),
                    null,
                    null,
                    0L
            );
        }
    }

    // POST /api/channels/{channelId}/read
    public void markRead(UUID channelId, UUID currentUserId) {
        ChannelMember member = channelMemberRepository.findByIdChannelIdAndIdUserId(channelId, currentUserId)
                .orElseThrow(() -> new NotFoundException("Channel membership not found"));

        member.setLastReadAt(Instant.now());
        channelMemberRepository.save(member);
    }
}
