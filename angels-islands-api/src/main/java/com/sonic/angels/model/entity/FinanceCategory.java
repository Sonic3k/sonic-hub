package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

/**
 * A tag ("nhãn") in one facet. The tags of the main facet are the classic categories — what money was for:
 * they say spending or income, and expense ones carry a budget group: FIXED (bills that come anyway), FLEXIBLE
 * (what the monthly "còn tiêu được" number watches) or SAVING (money put aside — reported apart, never counted as
 * spending). Tags of the other facets ("Bạn bè", "Digital", "Tết") are kind ANY and carry no budget group.
 * `code` is a stable key (the AI answers with it; system categories are found by it).
 * `implies`: tags that come along whenever this one is put on a line ("Game" → "Giải trí" + "Digital").
 */
@Entity
@Table(name = "finance_categories",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_category_code", columnNames = "code"))
@BatchSize(size = 50)
public class FinanceCategory extends FinanceEntity {

    public enum Kind { EXPENSE, INCOME, ANY }
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

    /** Null only on rows from before facets existed — those belong to the main facet. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facet_id")
    private FinanceFacet facet;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "finance_category_implies",
        joinColumns = @JoinColumn(name = "category_id"), inverseJoinColumns = @JoinColumn(name = "implied_id"))
    @BatchSize(size = 50)
    private Set<FinanceCategory> implies = new LinkedHashSet<>();

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
    public FinanceFacet getFacet() { return facet; }
    public void setFacet(FinanceFacet facet) { this.facet = facet; }
    public Set<FinanceCategory> getImplies() { return implies; }

    /** A tag of the main facet: a category in the classic sense. */
    public boolean isMain() { return facet == null || facet.isMain(); }
}
