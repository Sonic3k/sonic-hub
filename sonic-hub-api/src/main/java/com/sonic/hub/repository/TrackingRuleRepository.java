package com.sonic.hub.repository;

import com.sonic.hub.model.TrackingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface TrackingRuleRepository extends JpaRepository<TrackingRule, UUID> {

    List<TrackingRule> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);

    List<TrackingRule> findByActiveOrderByCreatedAtDesc(boolean active);

    List<TrackingRule> findByReminderPatternNotNullAndActiveOrderByCreatedAtDesc(boolean active);
}
