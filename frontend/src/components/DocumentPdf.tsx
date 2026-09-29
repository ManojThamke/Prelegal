import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import { DISCLAIMER } from "@/components/ui";
import {
  ATTRIBUTION_URL,
  attribution,
  keyTerms,
  signatureRows,
  type DocumentSpec,
  type Draft,
} from "@/lib/documents";
import { clauseLabel, clauseNumber, isSection, type Clause, type Run } from "@/lib/template";

// PDF rendering of the same content as DocumentPreview. Uses the built-in Times fonts.
const styles = StyleSheet.create({
  page: { paddingVertical: 60, paddingHorizontal: 64, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.45 },
  title: { fontFamily: "Times-Bold", fontSize: 18, textAlign: "center", marginBottom: 18 },
  subheading: { fontFamily: "Times-Bold", fontSize: 12, marginBottom: 4 },
  draftNote: { fontSize: 8, color: "#666", textAlign: "center", marginBottom: 4 },
  footer: { position: "absolute", bottom: 24, left: 64, right: 64, fontSize: 7, color: "#777", textAlign: "center" },
  termRow: { flexDirection: "row", paddingVertical: 4, borderBottomWidth: 0.5, borderColor: "#ccc" },
  termLabel: { width: 150, fontFamily: "Times-Bold" },
  termValue: { flex: 1 },
  bold: { fontFamily: "Times-Bold" },
  term: { textDecoration: "underline" },
  link: { color: "#209dd7", textDecoration: "underline" },
  table: { marginTop: 10, borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#666" },
  row: { flexDirection: "row" },
  cell: { flex: 1, minHeight: 26, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#666" },
  labelCell: { flex: 0.7, fontFamily: "Times-Bold" },
  headerCell: { fontFamily: "Times-Bold", textAlign: "center", textTransform: "uppercase" },
  sectionHeading: { fontFamily: "Times-Bold", marginTop: 10, marginBottom: 4 },
  clause: { marginBottom: 6, textAlign: "justify" },
  item: { marginBottom: 4, marginLeft: 18, textAlign: "justify" },
  attribution: { marginTop: 14, fontSize: 8, color: "#555" },
});

type Props = { spec: DocumentSpec; clauses: Clause[]; draft: Draft };

export default function DocumentPdf({ spec, clauses, draft }: Props) {
  return (
    <Document title={spec.name} author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Footer />
        <Text style={styles.draftNote}>Draft for legal review</Text>
        <Text style={styles.title}>{spec.name}</Text>
        <Text style={styles.subheading}>Key terms</Text>
        {keyTerms(spec, draft).map((term) => (
          <View key={term.label} style={styles.termRow} wrap={false}>
            <Text style={styles.termLabel}>{term.label}</Text>
            <Text style={styles.termValue}>{term.value}</Text>
          </View>
        ))}

        <Text style={{ marginTop: 16 }}>
          By signing below, each party agrees to enter into this {spec.name} as of the date of the last
          signature below, including the Key Terms above and the Standard Terms that follow.
        </Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]} />
            {spec.roles.map((role) => (
              <Text key={role} style={[styles.cell, styles.headerCell]}>
                {role}
              </Text>
            ))}
          </View>
          {signatureRows(draft).map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]}>{row.label}</Text>
              <Text style={styles.cell}>{row.values[0]}</Text>
              <Text style={styles.cell}>{row.values[1]}</Text>
            </View>
          ))}
        </View>
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Footer />
        <Text style={styles.title}>Standard Terms</Text>
        {clauses.map((clause, i) => (
          <ClauseView key={i} clause={clause} number={clause.marker} />
        ))}
        <Link src={ATTRIBUTION_URL} style={styles.attribution}>
          {attribution(spec)}
        </Link>
      </Page>
    </Document>
  );
}

function ClauseView({ clause, number }: { clause: Clause; number: string }) {
  const children = clause.children.map((child, i) => (
    <ClauseView key={i} clause={child} number={clauseNumber(child, number)} />
  ));
  if (isSection(clause)) {
    return (
      <View>
        <Text style={styles.sectionHeading} minPresenceAhead={40}>
          {clauseLabel(clause, number)} {clause.title}
        </Text>
        {clause.body.length > 0 && (
          <Text style={styles.clause}>
            <Runs runs={clause.body} />
          </Text>
        )}
        {children}
      </View>
    );
  }
  return (
    <View>
      <Text style={clause.level >= 2 ? styles.item : styles.clause}>
        {clauseLabel(clause, number)}{" "}
        {clause.title ? <Text style={styles.bold}>{clause.title}. </Text> : null}
        <Runs runs={clause.body} />
      </Text>
      {children}
    </View>
  );
}

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    switch (run.kind) {
      case "bold":
        return (
          <Text key={i} style={styles.bold}>
            <Runs runs={run.runs} />
          </Text>
        );
      case "term":
        return (
          <Text key={i} style={styles.term}>
            {run.text}
          </Text>
        );
      case "link":
        return (
          <Link key={i} src={run.href} style={styles.link}>
            {run.text}
          </Link>
        );
      default:
        return <Text key={i}>{run.text}</Text>;
    }
  });
}

/** The disclaimer, repeated at the bottom of every page. */
function Footer() {
  return (
    <Text fixed style={styles.footer}>
      {DISCLAIMER}
    </Text>
  );
}
