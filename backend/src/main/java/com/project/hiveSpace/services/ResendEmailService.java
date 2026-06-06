package com.project.hiveSpace.services;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

@Service
public class ResendEmailService {

    @Value("${RESEND_API_KEY:}")
    private String resendApiKey;

    @Value("${APP_DOMAIN:hive-space.indevs.in}")
    private String appDomain;

    private final HttpClient httpClient = HttpClient.newHttpClient();

    public void sendInvitationEmail(String toEmail, String orgName, String role, String inviter, String inviteUrl, String pin) {
        sendInvitationEmail(toEmail, orgName, null, null, role, inviter, inviteUrl, pin);
    }

    public void sendInvitationEmail(String toEmail, String orgName, String workspaceName, String teamName, String role, String inviter, String inviteUrl, String pin) {
        if (resendApiKey == null || resendApiKey.isBlank()) {
            System.err.println("⚠️ RESEND_API_KEY is not configured. Skipping email sending.");
            return;
        }

        try {
            String description;
            String buttonText;
            String subject;

            if (teamName != null && !teamName.isBlank()) {
                description = String.format(
                    "You have been invited to join the <strong>%s</strong> organization and its <strong>%s</strong> workspace on HiveSpace as a <strong>%s</strong> by <strong>%s</strong>. You will be added directly to the <strong>%s</strong> team.",
                    orgName, workspaceName != null && !workspaceName.isBlank() ? workspaceName : "associated", role, inviter, teamName
                );
                buttonText = "Join Team";
                subject = String.format("Invitation to join team %s in %s on HiveSpace", teamName, orgName);
            } else if (workspaceName != null && !workspaceName.isBlank()) {
                description = String.format(
                    "You have been invited to join the <strong>%s</strong> organization and its <strong>%s</strong> workspace on HiveSpace as a <strong>%s</strong> by <strong>%s</strong>.",
                    orgName, workspaceName, role, inviter
                );
                buttonText = "Join Workspace";
                subject = String.format("Invitation to join workspace %s in %s on HiveSpace", workspaceName, orgName);
            } else {
                description = String.format(
                    "You have been invited to join the <strong>%s</strong> organization on HiveSpace as a <strong>%s</strong> by <strong>%s</strong>.",
                    orgName, role, inviter
                );
                buttonText = "Join Organization";
                subject = String.format("Invitation to join %s on HiveSpace", orgName);
            }

            String htmlContent = String.format(
                "<!DOCTYPE html>\n" +
                "<html>\n" +
                "<head>\n" +
                "  <style>\n" +
                "    body { font-family: 'Inter', -apple-system, sans-serif; background-color: #0E0E10; color: #E5E1E4; margin: 0; padding: 40px; }\n" +
                "    .card { background-color: #1C1B1F; border: 1px solid #272629; border-radius: 24px; padding: 40px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }\n" +
                "    h1 { color: #FFFFFF; font-size: 28px; font-weight: 700; margin-top: 0; margin-bottom: 16px; text-align: center; }\n" +
                "    p { color: #A1A1AA; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }\n" +
                "    .btn { display: block; background-color: #7C5CFC; color: #FFFFFF !important; text-decoration: none; text-align: center; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 30px auto; width: fit-content; box-shadow: 0 4px 14px rgba(124, 92, 252, 0.4); }\n" +
                "    .pin-box { background-color: #0E0E10; border: 1px dashed #7C5CFC; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0; }\n" +
                "    .pin-title { color: #A1A1AA; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; font-weight: 700; }\n" +
                "    .pin-value { color: #7C5CFC; font-size: 32px; font-weight: 800; letter-spacing: 4px; font-family: monospace; }\n" +
                "    .footer { text-align: center; color: #71717A; font-size: 12px; margin-top: 40px; }\n" +
                "  </style>\n" +
                "</head>\n" +
                "<body>\n" +
                "  <div class=\"card\">\n" +
                "    <h1>Welcome to HiveSpace</h1>\n" +
                "    <p>Hi there,</p>\n" +
                "    <p>%s</p>\n" +
                "    <p>To accept the invitation, please click the button below to sign up and join:</p>\n" +
                "    <a href=\"%s\" class=\"btn\">%s</a>\n" +
                "    <div class=\"pin-box\">\n" +
                "      <div class=\"pin-title\">Security PIN</div>\n" +
                "      <div class=\"pin-value\">%s</div>\n" +
                "    </div>\n" +
                "    <p>This invite will expire in 7 days. If you believe this was sent in error, please disregard this email.</p>\n" +
                "    <div class=\"footer\">\n" +
                "      &copy; 2026 HiveSpace. All rights reserved.\n" +
                "    </div>\n" +
                "  </div>\n" +
                "</body>\n" +
                "</html>",
                description, inviteUrl, buttonText, pin
            );

            // Resend API expects escaping of quotes or simple JSON payload construction
            String escapedHtml = htmlContent.replace("\\", "\\\\")
                                            .replace("\"", "\\\"")
                                            .replace("\n", "\\n")
                                            .replace("\r", "\\r");

            String fromDomain = appDomain;
            if (fromDomain == null || fromDomain.isBlank() || fromDomain.contains("localhost")) {
                fromDomain = "hive-space.indevs.in";
            }
            String fromEmail = "noreply@" + fromDomain;

            String jsonPayload = "{"
                + "\"from\":\"HiveSpace <" + fromEmail + ">\","
                + "\"to\":[\"" + toEmail + "\"],"
                + "\"subject\":\"" + subject + "\","
                + "\"html\":\"" + escapedHtml + "\""
                + "}";

            HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.resend.com/emails"))
                .header("Authorization", "Bearer " + resendApiKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

            System.out.println("📩 Sending Resend invite email to " + toEmail + "...");
            httpClient.sendAsync(httpRequest, HttpResponse.BodyHandlers.ofString())
                .thenAccept(response -> {
                    if (response.statusCode() >= 200 && response.statusCode() < 300) {
                        System.out.println("✅ Email sent successfully to " + toEmail + ", Response: " + response.body());
                    } else {
                        System.err.println("❌ Failed to send email via Resend, Status: " + response.statusCode() + ", Body: " + response.body());
                    }
                }).exceptionally(ex -> {
                    System.err.println("❌ Exception sending email: " + ex.getMessage());
                    return null;
                });
        } catch (Exception e) {
            System.err.println("❌ Exception constructing email payload: " + e.getMessage());
        }
    }
}
