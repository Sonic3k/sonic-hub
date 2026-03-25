package com.sonic.connector.core;

import com.sonic.connector.core.ApiModels.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;

@Service
@Slf4j
public class SonicHubApiClient {

    private final RestClient restClient;

    public SonicHubApiClient(@Value("${sonic-hub.api-url}") String apiUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .build();
        log.info("SonicHubApiClient initialized with base URL: {}", apiUrl);
    }

    // ── Tasks ──

    public TaskResponse createTask(TaskRequest request) {
        return restClient.post()
                .uri("/api/tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(TaskResponse.class);
    }

    public List<TaskResponse> getTasks() {
        return restClient.get()
                .uri("/api/tasks")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public TaskResponse getTask(String id) {
        return restClient.get()
                .uri("/api/tasks/{id}", id)
                .retrieve()
                .body(TaskResponse.class);
    }

    public TaskResponse updateTask(String id, TaskRequest request) {
        return restClient.put()
                .uri("/api/tasks/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(TaskResponse.class);
    }

    // ── Todos ──

    public TodoResponse createTodo(TodoRequest request) {
        return restClient.post()
                .uri("/api/todos")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(TodoResponse.class);
    }

    public List<TodoResponse> getTodos() {
        return restClient.get()
                .uri("/api/todos")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public TodoResponse getTodo(String id) {
        return restClient.get()
                .uri("/api/todos/{id}", id)
                .retrieve()
                .body(TodoResponse.class);
    }

    public TodoResponse updateTodo(String id, TodoRequest request) {
        return restClient.put()
                .uri("/api/todos/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(TodoResponse.class);
    }

    // ── Problems ──

    public ProblemResponse createProblem(ProblemRequest request) {
        return restClient.post()
                .uri("/api/problems")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ProblemResponse.class);
    }

    public List<ProblemResponse> getProblems() {
        return restClient.get()
                .uri("/api/problems")
                .retrieve()
                .body(new ParameterizedTypeReference<>() {});
    }

    public ProblemResponse getProblem(String id) {
        return restClient.get()
                .uri("/api/problems/{id}", id)
                .retrieve()
                .body(ProblemResponse.class);
    }

    public ProblemResponse updateProblem(String id, ProblemRequest request) {
        return restClient.put()
                .uri("/api/problems/{id}", id)
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(ProblemResponse.class);
    }
}
