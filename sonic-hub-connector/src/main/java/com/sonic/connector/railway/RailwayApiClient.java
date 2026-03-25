package com.sonic.connector.railway;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Service
@ConditionalOnProperty(name = "railway.api-token")
@Slf4j
public class RailwayApiClient {

    private static final String ENDPOINT = "https://backboard.railway.app/graphql/v2";
    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public RailwayApiClient(@Value("${railway.api-token}") String apiToken) {
        this.restClient = RestClient.builder()
                .baseUrl(ENDPOINT)
                .defaultHeader("Authorization", "Bearer " + apiToken)
                .defaultHeader("Content-Type", "application/json")
                .build();
        log.info("RailwayApiClient initialized");
    }

    // ── Projects ──

    public JsonNode listProjects() {
        return query("""
            query {
              me {
                projects(first: 20) {
                  edges {
                    node {
                      id
                      name
                      services {
                        edges {
                          node { id name }
                        }
                      }
                      environments {
                        edges {
                          node { id name }
                        }
                      }
                    }
                  }
                }
              }
            }
            """, null);
    }

    // ── Services ──

    public JsonNode getProject(String projectId) {
        return query("""
            query($projectId: String!) {
              project(id: $projectId) {
                id
                name
                services {
                  edges {
                    node {
                      id
                      name
                      serviceInstances {
                        edges {
                          node {
                            domains { serviceDomains { domain } }
                            source { repo branch }
                            rootDirectory
                          }
                        }
                      }
                    }
                  }
                }
                environments {
                  edges {
                    node { id name }
                  }
                }
              }
            }
            """, Map.of("projectId", projectId));
    }

    // ── Variables ──

    public JsonNode getVariables(String projectId, String environmentId, String serviceId) {
        return query("""
            query($projectId: String!, $environmentId: String!, $serviceId: String) {
              variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId)
            }
            """, Map.of(
                "projectId", projectId,
                "environmentId", environmentId,
                "serviceId", serviceId
            ));
    }

    public JsonNode upsertVariable(String projectId, String environmentId, String serviceId,
                                    String name, String value) {
        return query("""
            mutation($input: VariableUpsertInput!) {
              variableUpsert(input: $input)
            }
            """, Map.of("input", Map.of(
                "projectId", projectId,
                "environmentId", environmentId,
                "serviceId", serviceId,
                "name", name,
                "value", value
            )));
    }

    public JsonNode deleteVariable(String projectId, String environmentId, String serviceId,
                                    String name) {
        return query("""
            mutation($input: VariableDeleteInput!) {
              variableDelete(input: $input)
            }
            """, Map.of("input", Map.of(
                "projectId", projectId,
                "environmentId", environmentId,
                "serviceId", serviceId,
                "name", name
            )));
    }

    // ── Deployments ──

    public JsonNode getLatestDeployment(String projectId, String environmentId, String serviceId) {
        return query("""
            query($projectId: String!, $environmentId: String!, $serviceId: String!) {
              deployments(
                first: 1
                input: {
                  projectId: $projectId
                  environmentId: $environmentId
                  serviceId: $serviceId
                }
              ) {
                edges {
                  node {
                    id
                    status
                    createdAt
                    staticUrl
                    meta { branch commitMessage }
                  }
                }
              }
            }
            """, Map.of(
                "projectId", projectId,
                "environmentId", environmentId,
                "serviceId", serviceId
            ));
    }

    public JsonNode redeploy(String deploymentId) {
        return query("""
            mutation($deploymentId: String!) {
              deploymentRedeploy(id: $deploymentId)
            }
            """, Map.of("deploymentId", deploymentId));
    }

    public JsonNode triggerDeploy(String projectId, String environmentId, String serviceId) {
        return query("""
            mutation($input: DeploymentTriggerInput!) {
              deploymentTriggerCreate(input: $input) {
                id
              }
            }
            """, Map.of("input", Map.of(
                "projectId", projectId,
                "environmentId", environmentId,
                "serviceId", serviceId
            )));
    }

    // ── Service update (branch, root dir) ──

    public JsonNode updateServiceInstance(String serviceId, String environmentId,
                                           String branch, String rootDirectory) {
        var source = new java.util.HashMap<String, Object>();
        if (branch != null) source.put("branch", branch);

        var input = new java.util.HashMap<String, Object>();
        input.put("serviceId", serviceId);
        input.put("environmentId", environmentId);
        if (!source.isEmpty()) input.put("source", source);
        if (rootDirectory != null) input.put("rootDirectory", rootDirectory);

        return query("""
            mutation($input: ServiceInstanceUpdateInput!) {
              serviceInstanceUpdate(input: $input)
            }
            """, Map.of("input", input));
    }

    // ── Build logs ──

    public JsonNode getBuildLogs(String deploymentId) {
        return query("""
            query($deploymentId: String!) {
              buildLogs(deploymentId: $deploymentId) {
                message
                timestamp
              }
            }
            """, Map.of("deploymentId", deploymentId));
    }

    // ── Internal ──

    private JsonNode query(String graphql, Map<String, Object> variables) {
        try {
            var body = new java.util.HashMap<String, Object>();
            body.put("query", graphql);
            if (variables != null) body.put("variables", variables);

            String response = restClient.post()
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(String.class);

            return objectMapper.readTree(response);
        } catch (Exception e) {
            log.error("Railway API error", e);
            throw new RuntimeException("Railway API error: " + e.getMessage(), e);
        }
    }
}
