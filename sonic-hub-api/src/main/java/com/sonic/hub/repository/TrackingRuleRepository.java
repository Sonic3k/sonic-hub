package com.sonic.hub.repository;

import com.sonic.hub.model.TrackingRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface TrackingRuleRepository extends JpaRepository<TrackingRule, UUID> {

    List<TrackingRule> findByEntityTypeAndEntityIdOrderByCreatedAtDesc(String entityType, UUID entityId);

    List<TrackingRule> findByActiveOrderByCreatedAtDesc(Boolean active);

    @Query("SELECT r FROM TrackingRule r WHERE r.active = true AND " +
           "(r.remindBeforeMinutes IS NOT NULL OR r.remindAt IS NOT NULL OR " +
           "r.remindIntervalDays IS NOT NULL OR r.remindDaysOfWeek IS NOT NULL)")
    List<TrackingRule> findActiveWithReminders();
}
