package com.sonic.angels.util;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.*;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Reads the first sheet of an .xlsx file into rows of cell texts — enough for bank statements, without a spreadsheet
 * library. Numbers come back as plain decimals ("1247270"), shared and inline strings as their text, empty cells as "".
 * The file is untrusted: entries are size-capped and the XML parser resolves no DTDs or external entities.
 */
public final class XlsxReader {

    private static final long MAX_ENTRY = 40L * 1024 * 1024;
    private static final long MAX_TOTAL = 80L * 1024 * 1024;

    private XlsxReader() {}

    public static List<List<String>> firstSheet(InputStream in) throws IOException {
        Map<String, byte[]> parts = unzip(in);
        byte[] sheet = parts.get(firstSheetPath(parts));
        if (sheet == null) throw new IOException("The file has no worksheet");
        List<String> shared = parts.containsKey("xl/sharedStrings.xml") ? sharedStrings(parts.get("xl/sharedStrings.xml")) : List.of();
        try { return rows(sheet, shared); }
        catch (XMLStreamException e) { throw new IOException("Broken Excel file: " + e.getMessage(), e); }
    }

    private static Map<String, byte[]> unzip(InputStream in) throws IOException {
        Map<String, byte[]> out = new HashMap<>();
        long total = 0;
        try (ZipInputStream zip = new ZipInputStream(in)) {
            ZipEntry e;
            byte[] buf = new byte[16384];
            while ((e = zip.getNextEntry()) != null) {
                String name = e.getName();
                boolean wanted = name.equals("xl/workbook.xml") || name.equals("xl/_rels/workbook.xml.rels")
                    || name.equals("xl/sharedStrings.xml") || (name.startsWith("xl/worksheets/") && name.endsWith(".xml"));
                if (e.isDirectory() || !wanted) continue;
                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                int n;
                long size = 0;
                while ((n = zip.read(buf)) > 0) {
                    size += n; total += n;
                    if (size > MAX_ENTRY || total > MAX_TOTAL) throw new IOException("The file is too big");
                    bos.write(buf, 0, n);
                }
                out.put(name, bos.toByteArray());
            }
        }
        if (out.isEmpty()) throw new IOException("Not an .xlsx file");
        return out;
    }

    /** The sheet listed first in the workbook; else the lowest-numbered worksheet file. */
    private static String firstSheetPath(Map<String, byte[]> parts) {
        try {
            String rid = null;
            XMLStreamReader r = reader(parts.get("xl/workbook.xml"));
            while (r != null && r.hasNext()) {
                if (r.next() == XMLStreamConstants.START_ELEMENT && r.getLocalName().equals("sheet")) {
                    for (int i = 0; i < r.getAttributeCount(); i++)
                        if (r.getAttributeLocalName(i).equals("id")) rid = r.getAttributeValue(i);
                    break;
                }
            }
            if (rid != null) {
                XMLStreamReader rel = reader(parts.get("xl/_rels/workbook.xml.rels"));
                while (rel != null && rel.hasNext()) {
                    if (rel.next() == XMLStreamConstants.START_ELEMENT && rel.getLocalName().equals("Relationship")
                        && rid.equals(rel.getAttributeValue(null, "Id"))) {
                        String target = rel.getAttributeValue(null, "Target");
                        if (target != null) {
                            String path = target.startsWith("/") ? target.substring(1) : "xl/" + target;
                            if (parts.containsKey(path)) return path;
                        }
                    }
                }
            }
        } catch (XMLStreamException ignored) { }
        return parts.keySet().stream().filter(k -> k.startsWith("xl/worksheets/sheet")).sorted().findFirst().orElse(null);
    }

    private static List<String> sharedStrings(byte[] xml) throws IOException {
        List<String> out = new ArrayList<>();
        try {
            XMLStreamReader r = reader(xml);
            StringBuilder cur = null;
            boolean inText = false, inPhonetic = false;
            while (r.hasNext()) {
                int ev = r.next();
                if (ev == XMLStreamConstants.START_ELEMENT) {
                    switch (r.getLocalName()) {
                        case "si" -> cur = new StringBuilder();
                        case "rPh" -> inPhonetic = true;
                        case "t" -> inText = !inPhonetic;
                        default -> { }
                    }
                } else if (ev == XMLStreamConstants.CHARACTERS || ev == XMLStreamConstants.CDATA) {
                    if (inText && cur != null) cur.append(r.getText());
                } else if (ev == XMLStreamConstants.END_ELEMENT) {
                    switch (r.getLocalName()) {
                        case "t" -> inText = false;
                        case "rPh" -> inPhonetic = false;
                        case "si" -> { out.add(cur == null ? "" : cur.toString()); cur = null; }
                        default -> { }
                    }
                }
            }
        } catch (XMLStreamException e) { throw new IOException("Broken Excel file: " + e.getMessage(), e); }
        return out;
    }

    private static List<List<String>> rows(byte[] xml, List<String> shared) throws XMLStreamException {
        List<List<String>> rows = new ArrayList<>();
        XMLStreamReader r = reader(xml);
        List<String> row = null;
        int col = -1;
        String type = null;
        StringBuilder val = null;
        boolean inValue = false;
        while (r.hasNext()) {
            int ev = r.next();
            if (ev == XMLStreamConstants.START_ELEMENT) {
                switch (r.getLocalName()) {
                    case "row" -> {
                        String rn = r.getAttributeValue(null, "r");
                        int index = rn == null ? rows.size() : Integer.parseInt(rn) - 1;
                        while (rows.size() < index) rows.add(new ArrayList<>());
                        row = new ArrayList<>();
                    }
                    case "c" -> {
                        String ref = r.getAttributeValue(null, "r");
                        col = ref == null ? (row == null ? 0 : row.size()) : column(ref);
                        type = r.getAttributeValue(null, "t");
                        val = new StringBuilder();
                    }
                    case "v", "t" -> inValue = true;
                    default -> { }
                }
            } else if (ev == XMLStreamConstants.CHARACTERS || ev == XMLStreamConstants.CDATA) {
                if (inValue && val != null) val.append(r.getText());
            } else if (ev == XMLStreamConstants.END_ELEMENT) {
                switch (r.getLocalName()) {
                    case "v", "t" -> inValue = false;
                    case "c" -> {
                        if (row != null && col >= 0) {
                            while (row.size() < col) row.add("");
                            String text = cell(type, val == null ? "" : val.toString(), shared);
                            if (row.size() == col) row.add(text); else row.set(col, text);
                        }
                        val = null; type = null; col = -1;
                    }
                    case "row" -> { if (row != null) rows.add(row); row = null; }
                    default -> { }
                }
            }
        }
        return rows;
    }

    private static String cell(String type, String raw, List<String> shared) {
        if ("s".equals(type)) {
            try {
                int i = Integer.parseInt(raw.trim());
                return i >= 0 && i < shared.size() ? shared.get(i) : "";
            } catch (NumberFormatException e) { return ""; }
        }
        if ("b".equals(type)) return "1".equals(raw.trim()) ? "TRUE" : "FALSE";
        if (type == null || "n".equals(type)) {
            String t = raw.trim();
            if (t.isEmpty()) return "";
            try { return new BigDecimal(t).stripTrailingZeros().toPlainString(); }
            catch (NumberFormatException e) { return t; }
        }
        return raw;
    }

    /** "AB12" → 27. */
    private static int column(String ref) {
        int c = 0;
        for (char ch : ref.toCharArray()) {
            if (ch < 'A' || ch > 'Z') break;
            c = c * 26 + (ch - 'A' + 1);
        }
        return c - 1;
    }

    private static XMLStreamReader reader(byte[] xml) throws XMLStreamException {
        if (xml == null) return null;
        XMLInputFactory f = XMLInputFactory.newFactory();
        f.setProperty(XMLInputFactory.SUPPORT_DTD, false);
        f.setProperty(XMLInputFactory.IS_SUPPORTING_EXTERNAL_ENTITIES, false);
        return f.createXMLStreamReader(new ByteArrayInputStream(xml));
    }
}
