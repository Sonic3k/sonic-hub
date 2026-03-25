package com.sonic.connector.telegram.handler;

import com.fasterxml.jackson.databind.JsonNode;
import com.sonic.connector.railway.RailwayApiClient;
import com.sonic.connector.railway.RailwayConfig;
import com.sonic.connector.telegram.util.MessageFormatter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.meta.api.objects.message.Message;

import java.util.Set;

@Component
@ConditionalOnBean(RailwayConfig.class)
@RequiredArgsConstructor
@Slf4j
public class RailwayCommandHandler implements CommandHandler {

    private final RailwayApiClient railway;
    private final RailwayConfig config;

    // Track current context per chat
    private String currentProjectId;
    private String currentEnvironmentId;

    @Override
    public boolean supports(String command) {
        return "/rw".equals(command);
    }

    @Override
    public String handle(Message message, String command, String args) {
        if (args == null || args.isBlank()) return helpText();

        String[] parts = args.split("\\s+", 2);
        String sub = parts[0].toLowerCase();
        String rest = parts.length > 1 ? parts[1] : null;

        try {
            return switch (sub) {
                case "projects", "ps" -> listProjects();
                case "use" -> useProject(rest);
                case "services", "svc" -> listServices();
                case "vars" -> getVars(rest);
                case "setvar" -> setVar(rest);
                case "delvar" -> delVar(rest);
                case "deploy" -> deploy(rest);
                case "branch" -> setBranch(rest);
                case "rootdir" -> setRootDir(rest);
                case "status" -> getStatus(rest);
                case "logs" -> getLogs(rest);
                case "help" -> helpText();
                default -> "❌ Unknown subcommand `" + sub + "`. Type `/rw help`";
            };
        } catch (Exception e) {
            log.error("Railway command error: {} {}", sub, rest, e);
            return "❌ Error: " + e.getMessage();
        }
    }

    private String listProjects() {
        var result = railway.listProjects();
        var edges = result.path("data").path("me").path("projects").path("edges");

        if (!edges.isArray() || edges.isEmpty()) return "📭 No projects found.";

        var sb = new StringBuilder("🚂 *Projects*\n\n");
        for (var edge : edges) {
            var node = edge.path("node");
            String id = node.path("id").asText();
            String name = node.path("name").asText();
            String alias = config.resolveAlias(id);
            int serviceCount = node.path("services").path("edges").size();
            sb.append(String.format("📁 *%s* (`%s`)\n   %d services\n\n",
                    MessageFormatter.escape(name), alias, serviceCount));
        }
        sb.append("_Use_ `/rw use <alias>` _to select a project_");
        return sb.toString();
    }

    private String useProject(String args) {
        if (args == null || args.isBlank()) return "❌ Usage: `/rw use <project-alias>`";

        currentProjectId = config.resolveProjectId(args.trim());

        // Fetch project to get production environment
        var result = railway.getProject(currentProjectId);
        var project = result.path("data").path("project");

        if (project.isMissingNode()) return "❌ Project not found: " + args;

        var envEdges = project.path("environments").path("edges");
        currentEnvironmentId = null;
        for (var edge : envEdges) {
            var env = edge.path("node");
            if ("production".equalsIgnoreCase(env.path("name").asText())) {
                currentEnvironmentId = env.path("id").asText();
                break;
            }
        }
        if (currentEnvironmentId == null && envEdges.size() > 0) {
            currentEnvironmentId = envEdges.get(0).path("node").path("id").asText();
        }

        String name = project.path("name").asText();
        int svcCount = project.path("services").path("edges").size();
        return String.format("✅ Switched to *%s*\n%d services, env: production",
                MessageFormatter.escape(name), svcCount);
    }

    private String listServices() {
        if (currentProjectId == null) return "❌ No project selected. Use `/rw use <alias>` first.";

        var result = railway.getProject(currentProjectId);
        var edges = result.path("data").path("project").path("services").path("edges");

        if (!edges.isArray() || edges.isEmpty()) return "📭 No services found.";

        var sb = new StringBuilder("⚙️ *Services*\n\n");
        for (var edge : edges) {
            var node = edge.path("node");
            String name = node.path("name").asText();
            String id = node.path("id").asText();

            var instances = node.path("serviceInstances").path("edges");
            String branch = "-";
            String rootDir = "-";
            String domain = "-";
            if (instances.size() > 0) {
                var inst = instances.get(0).path("node");
                branch = inst.path("source").path("branch").asText("-");
                rootDir = inst.path("rootDirectory").asText("-");
                var domains = inst.path("domains").path("serviceDomains");
                if (domains.isArray() && domains.size() > 0) {
                    domain = domains.get(0).path("domain").asText("-");
                }
            }

            sb.append(String.format("🔧 *%s*\n   `ID: %s`\n   branch: `%s` | root: `%s`\n   🌐 %s\n\n",
                    MessageFormatter.escape(name),
                    id.length() >= 8 ? id.substring(0, 8) : id,
                    branch, rootDir, domain));
        }
        return sb.toString();
    }

    private String getVars(String serviceName) {
        if (currentProjectId == null) return "❌ No project selected. Use `/rw use <alias>` first.";
        if (serviceName == null) return "❌ Usage: `/rw vars <service-name>`";

        String serviceId = resolveServiceId(serviceName.trim());
        if (serviceId == null) return "❌ Service not found: " + serviceName;

        var result = railway.getVariables(currentProjectId, currentEnvironmentId, serviceId);
        var vars = result.path("data").path("variables");

        if (vars.isMissingNode() || vars.isEmpty()) return "📭 No variables found.";

        var sb = new StringBuilder("🔑 *Variables*\n\n");
        vars.fields().forEachRemaining(entry -> {
            String value = entry.getValue().asText();
            // Mask sensitive values
            String display = value.length() > 8
                    ? value.substring(0, 4) + "..." + value.substring(value.length() - 4)
                    : "****";
            sb.append(String.format("`%s` = `%s`\n", entry.getKey(), display));
        });
        return sb.toString();
    }

    private String setVar(String args) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (args == null) return "❌ Usage: `/rw setvar <service> KEY=VALUE`";

        String[] parts = args.split("\\s+", 2);
        if (parts.length < 2 || !parts[1].contains("="))
            return "❌ Usage: `/rw setvar <service> KEY=VALUE`";

        String serviceId = resolveServiceId(parts[0]);
        if (serviceId == null) return "❌ Service not found: " + parts[0];

        int eq = parts[1].indexOf('=');
        String key = parts[1].substring(0, eq).trim();
        String value = parts[1].substring(eq + 1).trim();

        railway.upsertVariable(currentProjectId, currentEnvironmentId, serviceId, key, value);
        return String.format("✅ Set `%s` on *%s*\n_Redeploy needed to take effect_", key, parts[0]);
    }

    private String delVar(String args) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (args == null) return "❌ Usage: `/rw delvar <service> KEY`";

        String[] parts = args.split("\\s+", 2);
        if (parts.length < 2) return "❌ Usage: `/rw delvar <service> KEY`";

        String serviceId = resolveServiceId(parts[0]);
        if (serviceId == null) return "❌ Service not found: " + parts[0];

        railway.deleteVariable(currentProjectId, currentEnvironmentId, serviceId, parts[1].trim());
        return String.format("✅ Deleted `%s` from *%s*", parts[1].trim(), parts[0]);
    }

    private String deploy(String serviceName) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (serviceName == null) return "❌ Usage: `/rw deploy <service>`";

        String serviceId = resolveServiceId(serviceName.trim());
        if (serviceId == null) return "❌ Service not found: " + serviceName;

        // Try to get latest deployment to redeploy
        var latest = railway.getLatestDeployment(currentProjectId, currentEnvironmentId, serviceId);
        var edges = latest.path("data").path("deployments").path("edges");

        if (edges.isArray() && edges.size() > 0) {
            String deployId = edges.get(0).path("node").path("id").asText();
            railway.redeploy(deployId);
            return "🚀 Redeploying *" + MessageFormatter.escape(serviceName) + "*...";
        }

        // No previous deployment, trigger new
        railway.triggerDeploy(currentProjectId, currentEnvironmentId, serviceId);
        return "🚀 Triggered new deploy for *" + MessageFormatter.escape(serviceName) + "*...";
    }

    private String setBranch(String args) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (args == null) return "❌ Usage: `/rw branch <service> <branch-name>`";

        String[] parts = args.split("\\s+", 2);
        if (parts.length < 2) return "❌ Usage: `/rw branch <service> <branch-name>`";

        String serviceId = resolveServiceId(parts[0]);
        if (serviceId == null) return "❌ Service not found: " + parts[0];

        railway.updateServiceInstance(serviceId, currentEnvironmentId, parts[1].trim(), null);
        return String.format("✅ Branch set to `%s` for *%s*\n_Redeploy needed_", parts[1].trim(), parts[0]);
    }

    private String setRootDir(String args) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (args == null) return "❌ Usage: `/rw rootdir <service> <path>`";

        String[] parts = args.split("\\s+", 2);
        if (parts.length < 2) return "❌ Usage: `/rw rootdir <service> <path>`";

        String serviceId = resolveServiceId(parts[0]);
        if (serviceId == null) return "❌ Service not found: " + parts[0];

        railway.updateServiceInstance(serviceId, currentEnvironmentId, null, parts[1].trim());
        return String.format("✅ Root dir set to `%s` for *%s*", parts[1].trim(), parts[0]);
    }

    private String getStatus(String serviceName) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (serviceName == null) return "❌ Usage: `/rw status <service>`";

        String serviceId = resolveServiceId(serviceName.trim());
        if (serviceId == null) return "❌ Service not found: " + serviceName;

        var result = railway.getLatestDeployment(currentProjectId, currentEnvironmentId, serviceId);
        var edges = result.path("data").path("deployments").path("edges");

        if (!edges.isArray() || edges.isEmpty()) return "📭 No deployments found.";

        var dep = edges.get(0).path("node");
        String status = dep.path("status").asText();
        String branch = dep.path("meta").path("branch").asText("-");
        String commit = dep.path("meta").path("commitMessage").asText("-");
        String created = dep.path("createdAt").asText("-");

        String icon = switch (status) {
            case "SUCCESS" -> "🟢";
            case "BUILDING", "DEPLOYING" -> "🔵";
            case "FAILED", "CRASHED" -> "🔴";
            default -> "⚪";
        };

        return String.format("%s *%s* — `%s`\nbranch: `%s`\ncommit: _%s_\ntime: %s",
                icon, MessageFormatter.escape(serviceName), status, branch,
                MessageFormatter.escape(truncate(commit, 60)), created);
    }

    private String getLogs(String serviceName) {
        if (currentProjectId == null) return "❌ No project selected.";
        if (serviceName == null) return "❌ Usage: `/rw logs <service>`";

        String serviceId = resolveServiceId(serviceName.trim());
        if (serviceId == null) return "❌ Service not found: " + serviceName;

        var result = railway.getLatestDeployment(currentProjectId, currentEnvironmentId, serviceId);
        var edges = result.path("data").path("deployments").path("edges");

        if (!edges.isArray() || edges.isEmpty()) return "📭 No deployments found.";

        String deployId = edges.get(0).path("node").path("id").asText();
        var logs = railway.getBuildLogs(deployId);
        var logEntries = logs.path("data").path("buildLogs");

        if (!logEntries.isArray() || logEntries.isEmpty()) return "📭 No build logs.";

        var sb = new StringBuilder("📋 *Build Logs* (last 30 lines)\n```\n");
        int start = Math.max(0, logEntries.size() - 30);
        for (int i = start; i < logEntries.size(); i++) {
            sb.append(logEntries.get(i).path("message").asText()).append("\n");
        }
        sb.append("```");

        // Telegram message limit is 4096 chars
        if (sb.length() > 4000) {
            return sb.substring(0, 3990) + "\n...```";
        }
        return sb.toString();
    }

    // ── Helpers ──

    private String resolveServiceId(String nameOrPrefix) {
        if (currentProjectId == null) return null;

        var result = railway.getProject(currentProjectId);
        var edges = result.path("data").path("project").path("services").path("edges");

        for (var edge : edges) {
            var node = edge.path("node");
            String name = node.path("name").asText();
            String id = node.path("id").asText();

            if (name.equalsIgnoreCase(nameOrPrefix)
                || name.toLowerCase().contains(nameOrPrefix.toLowerCase())
                || id.startsWith(nameOrPrefix)) {
                return id;
            }
        }
        return null;
    }

    private String truncate(String s, int max) {
        return s.length() > max ? s.substring(0, max) + "..." : s;
    }

    private String helpText() {
        return """
                🚂 *Railway Commands*
                
                *Setup:*
                `/rw projects` — list all projects
                `/rw use <alias>` — select a project
                
                *Services:*
                `/rw services` — list services in project
                `/rw status <svc>` — deployment status
                `/rw logs <svc>` — last build logs
                
                *Variables:*
                `/rw vars <svc>` — list variables
                `/rw setvar <svc> KEY=VALUE` — set variable
                `/rw delvar <svc> KEY` — delete variable
                
                *Deploy:*
                `/rw deploy <svc>` — redeploy service
                `/rw branch <svc> <branch>` — change branch
                `/rw rootdir <svc> <path>` — change root dir
                
                *Aliases:* sonic-hub, mushroom-hills, comparison-tool, celestial
                _Service names are fuzzy matched_
                """;
    }
}
