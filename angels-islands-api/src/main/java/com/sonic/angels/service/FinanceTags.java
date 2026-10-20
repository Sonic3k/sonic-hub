package com.sonic.angels.service;

import com.sonic.angels.model.entity.FinanceCategory;
import com.sonic.angels.model.entity.FinanceTransaction;
import com.sonic.angels.model.entity.FinanceTransaction.By;
import com.sonic.angels.model.entity.FinanceTransaction.Kind;
import com.sonic.angels.model.entity.FinanceTransaction.Status;
import com.sonic.angels.model.entity.FinanceTxnTag;

import java.util.*;

/**
 * The tags of one transaction, kept consistent. Every change goes through here and ends with {@link #settle}:
 * implied tags follow the tags that bring them, and `category` — the one main-facet tag that does the counting —
 * follows the main-facet tags. Facets are told apart by {@link #facet} ("main", or the facet's id).
 * Callers run inside a transaction (tags and facets are lazy).
 */
public final class FinanceTags {

    public static final String MAIN = "main";

    private FinanceTags() {}

    /** The facet a tag belongs to, as a key. */
    public static String facet(FinanceCategory tag) {
        return tag.isMain() ? MAIN : tag.getFacet().getId().toString();
    }

    /** Whose word counts most among the tags of a facet: his own, then the system's, a rule's, the AI's. */
    static int weight(By by) {
        if (by == null) return 0;
        return switch (by) { case USER -> 4; case SYSTEM -> 3; case RULE -> 2; case AI -> 1; case IMPLIED -> 0; };
    }

    /** The tags of one facet that were put there (not brought along by another tag). */
    public static List<FinanceTxnTag> chosen(FinanceTransaction t, String facet) {
        return t.getTags().stream().filter(x -> !x.isImplied() && facet.equals(facet(x.getTag()))).toList();
    }

    /** Did he choose this facet's tags himself? Then rules leave it alone. */
    public static boolean his(FinanceTransaction t, String facet) {
        FinanceCategory c = t.getCategory();
        if (MAIN.equals(facet) && c != null && t.getCategorizedBy() == By.USER
            && t.getTags().stream().noneMatch(x -> x.getTag().getId().equals(c.getId()))) return true;    // from before tags existed
        return chosen(t, facet).stream().anyMatch(x -> x.getDecidedBy() == By.USER);
    }

    /** Every tag put on the line (not implied), in the order they came. */
    public static List<FinanceCategory> chosenTags(FinanceTransaction t) {
        return t.getTags().stream().filter(x -> !x.isImplied()).map(FinanceTxnTag::getTag).toList();
    }

    /**
     * The tags of one facet become exactly these. One already there stays as it was, except that by USER the whole
     * facet becomes his. Returns whether the tag set changed.
     */
    public static boolean replace(FinanceTransaction t, String facet, Collection<FinanceCategory> tags, By by) {
        adopt(t);
        Map<UUID, FinanceCategory> want = new LinkedHashMap<>();
        for (FinanceCategory c : tags) if (facet.equals(facet(c))) want.put(c.getId(), c);
        boolean changed = drop(t, x -> !x.isImplied() && facet.equals(facet(x.getTag())) && !want.containsKey(x.getTag().getId()));
        for (FinanceCategory c : want.values()) changed |= put(t, c, by);
        return changed;
    }

    /** Put these tags on the line beside what it has (each in its own facet). */
    public static boolean add(FinanceTransaction t, Collection<FinanceCategory> tags, By by) {
        adopt(t);
        boolean changed = false;
        for (FinanceCategory c : tags) changed |= put(t, c, by);
        return changed;
    }

    /** Take these tags off. One that another tag of the line brings along comes back with {@link #settle}. */
    public static boolean remove(FinanceTransaction t, Collection<UUID> tagIds) {
        adopt(t);
        return drop(t, x -> tagIds.contains(x.getTag().getId()));
    }

    private static boolean drop(FinanceTransaction t, java.util.function.Predicate<FinanceTxnTag> which) {
        FinanceCategory c = t.getCategory();
        boolean changed = t.getTags().removeIf(which);
        // `category` must not keep pointing at a tag that is gone, or adopt() would bring it back
        if (changed && c != null && t.getTags().stream().noneMatch(x -> x.getTag().getId().equals(c.getId()))) t.setCategory(null);
        return changed;
    }

    private static boolean put(FinanceTransaction t, FinanceCategory c, By by) {
        for (FinanceTxnTag x : t.getTags()) {
            if (!x.getTag().getId().equals(c.getId())) continue;
            boolean wasImplied = x.isImplied();
            if (wasImplied || (by == By.USER && x.getDecidedBy() != By.USER)) x.setDecidedBy(by);
            return wasImplied;
        }
        t.getTags().add(new FinanceTxnTag(t, c, by));
        return true;
    }

    /**
     * A line from before tags existed (or one whose category was set directly) has a category but no tag for it:
     * that category becomes its tag, decided by whoever decided the category.
     */
    private static void adopt(FinanceTransaction t) {
        FinanceCategory c = t.getCategory();
        if (c == null || t.getKind() == Kind.TRANSFER) return;
        for (FinanceTxnTag x : t.getTags()) if (x.getTag().getId().equals(c.getId())) return;
        By by = t.getCategorizedBy() == null || t.getCategorizedBy() == By.IMPLIED ? By.RULE : t.getCategorizedBy();
        t.getTags().add(new FinanceTxnTag(t, c, by));
    }

    /**
     * After any change: implied tags worked out again from the chosen ones; then `category`, kind and who decided
     * follow the main-facet tags. With no main-facet tag the line waits for review. A move between own accounts
     * carries no tags. Status is otherwise left to the caller (see {@link #settleDecided}).
     */
    public static void settle(FinanceTransaction t) {
        if (t.getKind() == Kind.TRANSFER) { t.getTags().clear(); return; }
        adopt(t);

        // a parent chosen beside its own child is brought along by the child instead: a line keeps its most specific
        // labels (the child takes over who decided, when the parent's word was the stronger one)
        Map<UUID, FinanceTxnTag> chosenTag = new LinkedHashMap<>();
        for (FinanceTxnTag x : t.getTags()) if (!x.isImplied()) chosenTag.putIfAbsent(x.getTag().getId(), x);
        Set<UUID> parents = new HashSet<>();
        for (FinanceTxnTag child : chosenTag.values()) {
            String f = facet(child.getTag());
            for (FinanceCategory p : reach(child.getTag())) {
                FinanceTxnTag parent = chosenTag.get(p.getId());
                if (parent == null || parent == child || !f.equals(facet(p)) || reach(p).contains(child.getTag())) continue;
                parents.add(p.getId());
                if (weight(parent.getDecidedBy()) > weight(child.getDecidedBy())) child.setDecidedBy(parent.getDecidedBy());
            }
        }
        if (!parents.isEmpty()) t.getTags().removeIf(x -> !x.isImplied() && parents.contains(x.getTag().getId()));

        // implied tags: everything the chosen ones bring along, transitively; each owes its weight to the strongest bringer
        Map<UUID, FinanceCategory> chosen = new LinkedHashMap<>();
        Map<UUID, By> chosenBy = new HashMap<>();
        for (FinanceTxnTag x : t.getTags()) if (!x.isImplied()) { chosen.put(x.getTag().getId(), x.getTag()); chosenBy.put(x.getTag().getId(), x.getDecidedBy()); }
        Map<UUID, FinanceCategory> implied = new LinkedHashMap<>();
        Map<UUID, By> impliedBy = new HashMap<>();
        for (FinanceCategory start : chosen.values()) {
            Deque<FinanceCategory> todo = new ArrayDeque<>(start.getImplies());
            Set<UUID> seen = new HashSet<>();
            while (!todo.isEmpty()) {
                FinanceCategory c = todo.poll();
                if (!seen.add(c.getId()) || c.isArchived()) continue;
                if (!chosen.containsKey(c.getId())) {
                    implied.put(c.getId(), c);
                    impliedBy.merge(c.getId(), chosenBy.get(start.getId()), (a, b) -> weight(a) >= weight(b) ? a : b);
                }
                todo.addAll(c.getImplies());
            }
        }
        t.getTags().removeIf(x -> x.isImplied() && !implied.containsKey(x.getTag().getId()));
        Set<UUID> have = new HashSet<>();
        for (FinanceTxnTag x : t.getTags()) have.add(x.getTag().getId());
        for (FinanceCategory c : implied.values()) if (!have.contains(c.getId())) t.getTags().add(new FinanceTxnTag(t, c, By.IMPLIED));

        // the main facet does the counting
        List<FinanceTxnTag> main = t.getTags().stream().filter(x -> x.getTag().isMain()).toList();
        if (main.isEmpty()) {
            t.setCategory(null);
            t.setCategorizedBy(null);
            t.setKind(t.getAmount().signum() < 0 ? Kind.EXPENSE : Kind.INCOME);
            t.setStatus(Status.REVIEW);
            return;
        }
        boolean out = t.getAmount().signum() < 0;
        FinanceTxnTag primary = main.stream().min(Comparator
            .comparingInt((FinanceTxnTag x) -> x.getTag().getKind() == (out ? FinanceCategory.Kind.EXPENSE : FinanceCategory.Kind.INCOME) ? 0 : 1)
            .thenComparingInt(x -> strength(x.getTag()))
            .thenComparingInt(x -> x.isImplied() ? 1 : 0)
            .thenComparingInt(x -> x.getTag().getSortOrder())
            .thenComparing(x -> x.getTag().getName())).orElseThrow();
        By decider = null;
        for (FinanceTxnTag x : main) {
            By b = x.isImplied() ? impliedBy.get(x.getTag().getId()) : x.getDecidedBy();
            if (decider == null || weight(b) > weight(decider)) decider = b;
        }
        t.setCategory(primary.getTag());
        t.setKind(primary.getTag().getKind() == FinanceCategory.Kind.INCOME ? Kind.INCOME : Kind.EXPENSE);
        t.setCategorizedBy(decider);
    }

    /** Every live tag this one brings along, transitively (not itself, unless it comes back round). */
    static Set<FinanceCategory> reach(FinanceCategory start) {
        Set<FinanceCategory> out = new LinkedHashSet<>();
        Deque<FinanceCategory> todo = new ArrayDeque<>(start.getImplies());
        Set<UUID> seen = new HashSet<>();
        while (!todo.isEmpty()) {
            FinanceCategory c = todo.poll();
            if (!seen.add(c.getId()) || c.isArchived()) continue;
            out.add(c);
            todo.addAll(c.getImplies());
        }
        return out;
    }

    /** {@link #settle}, and a line whose main facet anyone but the AI decided is done. */
    public static void settleDecided(FinanceTransaction t) {
        settle(t);
        if (t.getCategory() != null && t.getCategorizedBy() != By.AI) t.setStatus(Status.OK);
    }

    /** What the line is, in one string — to tell whether a change changed anything. */
    public static String signature(FinanceTransaction t) {
        StringBuilder sb = new StringBuilder().append(t.getKind()).append('|').append(t.getStatus()).append('|')
            .append(t.getCategory() == null ? "-" : t.getCategory().getId()).append('|').append(t.getDescription());
        t.getTags().stream().map(x -> x.getTag().getId() + ":" + x.getDecidedBy()).sorted().forEach(x -> sb.append('|').append(x));
        return sb.toString();
    }

    /** Money put aside counts first, then bills, then the rest — the least spending-like tag does the counting. */
    private static int strength(FinanceCategory c) {
        if (c.getBudgetGroup() == FinanceCategory.BudgetGroup.SAVING) return 0;
        if (c.getBudgetGroup() == FinanceCategory.BudgetGroup.FIXED) return 1;
        return 2;
    }
}
