package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import java.util.UUID;

/**
 * What money was for. `code` is a stable key (the AI answers with it; system categories are found by it).
 * Expense categories carry a budget group: FIXED (bills that come anyway), FLEXIBLE (what the monthly
 * "còn tiêu được" number watches) or SAVING (money put aside — reported apart, never counted as spending).
 */
@Entity
@Table(name = "finance_categories",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_category_code", columnNames = "code"))
public class FinanceCategory extends BaseEntity {

    public enum Kind { EXPENSE, INCOME }
    public enum BudgetGroup { FIXED, FLEXIBLE, SAVING }

    /** Codes the code relies on. */
    public static final String CASH = "tien-mat";
    public static final String UNKNOWN_EXPENSE = "chi-chua-ro";
    public static final String UNKNOWN_INCOME = "thu-chua-ro";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", nullable = false, length = 60)
    private String code;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    @Column(name = "icon", length = 16)
    private String icon;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private Kind kind = Kind.EXPENSE;

    @Enumerated(EnumType.STRING)
    @Column(name = "budget_group", length = 20)
    private BudgetGroup budgetGroup;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    /** Built-in: the code depends on it, so it can be renamed but not deleted. */
    @Column(name = "is_system", nullable = false)
    private boolean system = false;

    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    public FinanceCategory() {}

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public Kind getKind() { return kind; }
    public void setKind(Kind kind) { this.kind = kind; }
    public BudgetGroup getBudgetGroup() { return budgetGroup; }
    public void setBudgetGroup(BudgetGroup budgetGroup) { this.budgetGroup = budgetGroup; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
