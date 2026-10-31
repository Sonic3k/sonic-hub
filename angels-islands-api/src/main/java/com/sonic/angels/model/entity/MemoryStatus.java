package com.sonic.angels.model.entity;

/** How sure a memory item is: DRAFT = written by an import or an AI pass and not looked over yet,
 *  CONFIRMED = checked (or typed in) by the owner. Rows from before this field have none. */
public enum MemoryStatus { DRAFT, CONFIRMED }
