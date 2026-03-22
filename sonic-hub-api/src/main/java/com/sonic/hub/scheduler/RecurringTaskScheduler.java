package com.sonic.hub.scheduler;

import com.sonic.hub.model.Task;
import com.sonic.hub.model.TaskStatus;
import com.sonic.hub.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class RecurringTaskScheduler {

    private final TaskRepository taskRepository;

    // Runs every day at 00:05
    @Scheduled(cron = "0 5 0 * * *")
    @Transactional
    public void processRecurringTasks() {
        List<Task> recurringTasks = taskRepository.findAllRecurring();
        LocalDate today = LocalDate.now();

        for (Task task : recurringTasks) {
            try {
                Map<String, Object> config = task.getRecurringConfig();
                if (config == null) continue;

                String nextRunStr = (String) config.get("nextRun");
                if (nextRunStr == null) continue;

                LocalDate nextRun = LocalDate.parse(nextRunStr);
                if (!nextRun.isAfter(today)) {
                    spawnNextOccurrence(task, config, today);
                }
            } catch (Exception e) {
                log.error("Failed to process recurring task {}: {}", task.getId(), e.getMessage());
            }
        }
    }

    private void spawnNextOccurrence(Task template, Map<String, Object> config, LocalDate today) {
        // Create new task from template
        Task newTask = Task.builder()
                .title(template.getTitle())
                .description(template.getDescription())
                .status(TaskStatus.OPEN)
                .priority(template.getPriority())
                .project(template.getProject())
                .tags(template.getTags())
                .dueDate(today)
                .build();
        taskRepository.save(newTask);

        // Advance nextRun on the template
        String type = (String) config.getOrDefault("type", "DAILY");
        int interval = ((Number) config.getOrDefault("interval", 1)).intValue();

        LocalDate nextRun = switch (type) {
            case "WEEKLY" -> today.plusWeeks(interval);
            case "MONTHLY" -> today.plusMonths(interval);
            default -> today.plusDays(interval); // DAILY
        };

        Map<String, Object> updatedConfig = new HashMap<>(config);
        updatedConfig.put("nextRun", nextRun.toString());
        template.setRecurringConfig(updatedConfig);
        taskRepository.save(template);

        log.info("Spawned recurring task '{}', next run: {}", template.getTitle(), nextRun);
    }
}
