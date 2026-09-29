import { Document, Link, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

import {
  ATTRIBUTION,
  ATTRIBUTION_URL,
  coverSections,
  signatureRows,
  type NdaData,
  type NdaTemplate,
  type Run,
} from "@/lib/nda";

// PDF rendering of the same content as NdaPreview. Uses the built-in Times fonts.
const styles = StyleSheet.create({
  page: { paddingVertical: 60, paddingHorizontal: 64, fontFamily: "Times-Roman", fontSize: 10.5, lineHeight: 1.45 },
  title: { fontFamily: "Times-Bold", fontSize: 18, textAlign: "center", marginBottom: 18 },
  subheading: { fontFamily: "Times-Bold", fontSize: 11, marginBottom: 4, textTransform: "uppercase" },
  section: { marginTop: 10 },
  heading: { fontFamily: "Times-Bold", fontSize: 11 },
  label: { fontFamily: "Times-Italic", fontSize: 9, color: "#555" },
  bold: { fontFamily: "Times-Bold" },
  term: { textDecoration: "underline" },
  link: { color: "#3730a3", textDecoration: "underline" },
  table: { marginTop: 10, borderTopWidth: 1, borderLeftWidth: 1, borderColor: "#666" },
  row: { flexDirection: "row" },
  cell: { flex: 1, minHeight: 26, padding: 5, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#666" },
  labelCell: { flex: 0.7, fontFamily: "Times-Bold" },
  headerCell: { fontFamily: "Times-Bold", textAlign: "center" },
  clause: { marginBottom: 8, textAlign: "justify" },
  attribution: { marginTop: 14, fontSize: 8, color: "#555" },
});

export default function NdaPdf({ template, data }: { template: NdaTemplate; data: NdaData }) {
  return (
    <Document title="Mutual Non-Disclosure Agreement" author="Prelegal">
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Mutual Non-Disclosure Agreement</Text>
        <Text style={styles.subheading}>Using this Mutual Non-Disclosure Agreement</Text>
        <Text>
          <Runs runs={template.coverIntro} />
        </Text>

        {coverSections(data).map((section) => (
          <View key={section.heading} style={styles.section} wrap={false}>
            <Text style={styles.heading}>{section.heading}</Text>
            {section.label && <Text style={styles.label}>{section.label}</Text>}
            {section.lines.map((line) => (
              <Text key={line.text}>{line.text}</Text>
            ))}
          </View>
        ))}

        <Text style={{ marginTop: 16 }}>
          By signing this Cover Page, each party agrees to enter into this MNDA as of the Effective Date.
        </Text>

        <View style={styles.table} wrap={false}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.labelCell]} />
            <Text style={[styles.cell, styles.headerCell]}>PARTY 1</Text>
            <Text style={[styles.cell, styles.headerCell]}>PARTY 2</Text>
          </View>
          {signatureRows(data).map((row) => (
            <View key={row.label} style={styles.row}>
              <Text style={[styles.cell, styles.labelCell]}>{row.label}</Text>
              <Text style={styles.cell}>{row.values[0]}</Text>
              <Text style={styles.cell}>{row.values[1]}</Text>
            </View>
          ))}
        </View>

        <Attribution />
      </Page>

      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Standard Terms</Text>
        {template.clauses.map((clause) => (
          <Text key={clause.number} style={styles.clause}>
            {clause.number}. <Text style={styles.bold}>{clause.title}</Text>. <Runs runs={clause.body} />
          </Text>
        ))}
        <Attribution />
      </Page>
    </Document>
  );
}

function Runs({ runs }: { runs: Run[] }) {
  return runs.map((run, i) => {
    switch (run.kind) {
      case "bold":
        return <Text key={i} style={styles.bold}>{run.text}</Text>;
      case "term":
        return <Text key={i} style={styles.term}>{run.text}</Text>;
      case "link":
        return <Link key={i} src={run.href} style={styles.link}>{run.text}</Link>;
      default:
        return <Text key={i}>{run.text}</Text>;
    }
  });
}

function Attribution() {
  return (
    <Link src={ATTRIBUTION_URL} style={styles.attribution}>
      {ATTRIBUTION}
    </Link>
  );
}
