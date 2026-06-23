package com.project.hiveSpace.services;

import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.googleapis.auth.oauth2.GoogleRefreshTokenRequest;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeTokenRequest;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.gmail.Gmail;
import com.google.api.services.gmail.model.ListMessagesResponse;
import com.google.api.services.gmail.model.Message;
import com.google.api.services.gmail.model.MessagePart;
import com.google.api.services.gmail.model.MessagePartHeader;
import com.project.hiveSpace.dto.MailResponse;
import com.project.hiveSpace.dto.SendMailRequest;
import com.project.hiveSpace.models.User;
import com.project.hiveSpace.models.UserOauthCredential;
import com.project.hiveSpace.repository.UserOauthCredentialRepository;
import jakarta.mail.Session;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class GmailService {

    private final UserOauthCredentialRepository oauthRepository;

    @Value("${google.client.id}")
    private String clientId;

    @Value("${google.client.secret}")
    private String clientSecret;

    @Value("${google.redirect.uri}")
    private String redirectUri;

    private static final Collection<String> SCOPES = Collections.singletonList("https://mail.google.com/");
    private static final GsonFactory JSON_FACTORY = GsonFactory.getDefaultInstance();
    private static final NetHttpTransport HTTP_TRANSPORT = new NetHttpTransport();

    // 1. Generate Auth Redirection URL
    public String getAuthorizationUrl() {
        return "https://accounts.google.com/o/oauth2/auth?" +
                "client_id=" + clientId +
                "&redirect_uri=" + redirectUri +
                "&response_type=code" +
                "&scope=https://mail.google.com/" +
                "&access_type=offline" +
                "&prompt=consent";
    }

    // 2. Exchange Auth Code for Access/Refresh Tokens
    public UserOauthCredential handleCallback(String code, User user) throws IOException {
        GoogleTokenResponse tokenResponse = new GoogleAuthorizationCodeTokenRequest(
                HTTP_TRANSPORT,
                JSON_FACTORY,
                "https://oauth2.googleapis.com/token",
                clientId,
                clientSecret,
                code,
                redirectUri
        ).execute();

        String accessToken = tokenResponse.getAccessToken();
        String refreshToken = tokenResponse.getRefreshToken();
        Long expiresInSeconds = tokenResponse.getExpiresInSeconds();
        Date expiresAt = new Date(System.currentTimeMillis() + (expiresInSeconds * 1000));

        // Get connected user's email
        String email = getConnectedEmail(accessToken);

        // Save/Update in db
        UserOauthCredential credential = oauthRepository.findByUserAndProvider(user, "GOOGLE")
                .orElse(UserOauthCredential.builder()
                        .user(user)
                        .provider("GOOGLE")
                        .build());

        credential.setAccessToken(accessToken);
        if (refreshToken != null) {
            credential.setRefreshToken(refreshToken);
        }
        credential.setExpiresAt(expiresAt);
        credential.setEmail(email);

        return oauthRepository.save(credential);
    }

    // 3. Fetch user connected email
    private String getConnectedEmail(String accessToken) {
        try {
            Gmail service = getGmailServiceDirectly(accessToken);
            com.google.api.services.gmail.model.Profile profile = service.users().getProfile("me").execute();
            return profile.getEmailAddress();
        } catch (Exception e) {
            log.error("Failed to fetch user profile", e);
            return "unknown@gmail.com";
        }
    }

    // 4. Check if user is connected
    public boolean isConnected(User user) {
        return oauthRepository.findByUserAndProvider(user, "GOOGLE").isPresent();
    }

    // 5. Disconnect Gmail
    public void disconnect(User user) {
        oauthRepository.findByUserAndProvider(user, "GOOGLE").ifPresent(oauthRepository::delete);
    }

    // 6. Fetch Inbox
    public List<MailResponse> fetchInbox(User user) throws IOException {
        UserOauthCredential credential = getValidCredential(user);
        Gmail service = getGmailServiceDirectly(credential.getAccessToken());

        ListMessagesResponse messagesResponse = service.users().messages().list("me")
                .setMaxResults(15L)
                .execute();

        List<MailResponse> responseList = new ArrayList<>();
        if (messagesResponse.getMessages() == null) {
            return responseList;
        }

        // Color palettes for UI initials avatars matching frontend themes
        String[] colors = {
                "bg-violet-500/10 text-violet-400",
                "bg-blue-500/10 text-blue-400",
                "bg-emerald-500/10 text-emerald-400",
                "bg-pink-500/10 text-pink-400",
                "bg-amber-500/10 text-amber-400"
        };
        int colorIdx = 0;

        for (Message msgSummary : messagesResponse.getMessages()) {
            Message msg = service.users().messages().get("me", msgSummary.getId()).execute();
            
            String subject = "No Subject";
            String from = "Unknown";
            String date = "";
            boolean isUnread = false;

            if (msg.getLabelIds() != null) {
                isUnread = msg.getLabelIds().contains("UNREAD");
            }

            if (msg.getPayload() != null && msg.getPayload().getHeaders() != null) {
                for (MessagePartHeader header : msg.getPayload().getHeaders()) {
                    if ("Subject".equalsIgnoreCase(header.getName())) {
                        subject = header.getValue();
                    } else if ("From".equalsIgnoreCase(header.getName())) {
                        from = header.getValue();
                    } else if ("Date".equalsIgnoreCase(header.getName())) {
                        date = header.getValue();
                    }
                }
            }

            String email = from;
            String senderName = from;
            if (from.contains("<")) {
                senderName = from.substring(0, from.indexOf("<")).trim();
                email = from.substring(from.indexOf("<") + 1, from.indexOf(">")).trim();
            }

            String initials = getInitials(senderName);
            String preview = msg.getSnippet();
            String body = getBodyText(msg.getPayload());

            responseList.add(MailResponse.builder()
                    .id(msg.getId())
                    .unread(isUnread)
                    .sender(senderName)
                    .email(email)
                    .subject(subject)
                    .preview(preview)
                    .body(body != null && !body.isEmpty() ? body : preview)
                    .time(date)
                    .initials(initials)
                    .color(colors[colorIdx++ % colors.length])
                    .build());
        }

        return responseList;
    }

    // Helper to get text body
    private String getBodyText(MessagePart part) {
        if (part == null) return "";
        if (part.getBody() != null && part.getBody().getData() != null) {
            return new String(Base64.getUrlDecoder().decode(part.getBody().getData()));
        }
        if (part.getParts() != null) {
            for (MessagePart subPart : part.getParts()) {
                String body = getBodyText(subPart);
                if (body != null && !body.isEmpty()) {
                    return body;
                }
            }
        }
        return "";
    }

    private String getInitials(String name) {
        if (name == null || name.isEmpty()) return "??";
        String[] parts = name.split(" ");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        }
        return name.substring(0, Math.min(2, name.length())).toUpperCase();
    }

    // 7. Send Email
    public void sendEmail(User user, SendMailRequest request) throws Exception {
        UserOauthCredential credential = getValidCredential(user);
        Gmail service = getGmailServiceDirectly(credential.getAccessToken());

        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        MimeMessage mimeMessage = new MimeMessage(session);
        mimeMessage.setFrom(new InternetAddress(credential.getEmail()));
        mimeMessage.addRecipient(jakarta.mail.Message.RecipientType.TO, new InternetAddress(request.getTo()));
        mimeMessage.setSubject(request.getSubject());
        mimeMessage.setText(request.getBody());

        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        mimeMessage.writeTo(buffer);
        byte[] rawMessageBytes = buffer.toByteArray();
        String encodedEmail = Base64.getUrlEncoder().encodeToString(rawMessageBytes);

        Message message = new Message();
        message.setRaw(encodedEmail);

        if (request.getThreadId() != null && !request.getThreadId().isEmpty()) {
            message.setThreadId(request.getThreadId());
        }

        service.users().messages().send("me", message).execute();
    }

    // Refresh credentials if expired
    private UserOauthCredential getValidCredential(User user) throws IOException {
        UserOauthCredential credential = oauthRepository.findByUserAndProvider(user, "GOOGLE")
                .orElseThrow(() -> new IllegalStateException("Google Workspace/Gmail account is not connected"));

        if (credential.getExpiresAt() != null && credential.getExpiresAt().before(new Date(System.currentTimeMillis() + 60000))) {
            log.info("Refreshing Google access token for user: {}", user.getEmail());
            
            GoogleTokenResponse tokenResponse = new GoogleRefreshTokenRequest(
                    HTTP_TRANSPORT,
                    JSON_FACTORY,
                    credential.getRefreshToken(),
                    clientId,
                    clientSecret
            ).execute();

            credential.setAccessToken(tokenResponse.getAccessToken());
            credential.setExpiresAt(new Date(System.currentTimeMillis() + (tokenResponse.getExpiresInSeconds() * 1000)));
            oauthRepository.save(credential);
        }

        return credential;
    }

    private Gmail getGmailServiceDirectly(String accessToken) {
        com.google.api.client.auth.oauth2.Credential googleCreds = new com.google.api.client.auth.oauth2.Credential(
                com.google.api.client.auth.oauth2.BearerToken.authorizationHeaderAccessMethod()
        ).setAccessToken(accessToken);

        return new Gmail.Builder(HTTP_TRANSPORT, JSON_FACTORY, googleCreds)
                .setApplicationName("HiveSpace")
                .build();
    }
}
