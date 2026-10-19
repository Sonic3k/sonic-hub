package com.sonic.angels.model.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.BatchSize;

import java.util.UUID;

/**
 * One way of looking at money ("mặt"): what it was for, who it was with, what form it took, the occasion. Each
 * facet holds its own tags (FinanceCategory rows), and a transaction can carry tags of every facet at once — and
 * more than one in a facet. The main facet ("Hạng mục") is the classic category list: it decides spending vs
 * saving and the budget group, and a line without a tag there waits for review. The other facets never do.
 * A per-transaction facet ("Với ai", "Dịp") describes one occasion, so its tags are not carried into a rule
 * learned from one line unless chosen there.
 */
@Entity
@Table(name = "finance_facets",
    uniqueConstraints = @UniqueConstraint(name = "uk_finance_facet_code", columnNames = "code"))
@BatchSize(size = 20)
public class FinanceFacet extends FinanceEntity {

    public static final String MAIN = "hang-muc";

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "code", nullable = false, length = 60)
    private String code;

    @Column(name = "name", nullable = false, length = 80)
    private String name;

    @Column(name = "icon", length = 16)
    private String icon;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(name = "is_main", nullable = false)
    private boolean main = false;

    @Column(name = "per_transaction", nullable = false)
    private boolean perTransaction = false;

    /** Built-in: the code depends on it, so it can be renamed but not deleted. */
    @Column(name = "is_system", nullable = false)
    private boolean system = false;

    @Column(name = "archived", nullable = false)
    private boolean archived = false;

    public FinanceFacet() {}

    public UUID getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getIcon() { return icon; }
    public void setIcon(String icon) { this.icon = icon; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isMain() { return main; }
    public void setMain(boolean main) { this.main = main; }
    public boolean isPerTransaction() { return perTransaction; }
    public void setPerTransaction(boolean perTransaction) { this.perTransaction = perTransaction; }
    public boolean isSystem() { return system; }
    public void setSystem(boolean system) { this.system = system; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
