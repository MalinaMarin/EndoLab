import { NextResponse } from "next/server";
import { demoEmrRecords } from "@/lib/emr-connector";
import { getUserContext } from "@/lib/account";

export async function GET() {
  const context = await getUserContext();
  if (!context || context.accountType !== "clinic") {
    return NextResponse.json({ error: "Clinic account required." }, { status: 403 });
  }
  return NextResponse.json({
    provider: "Demo EMR Alpha",
    records: demoEmrRecords.map((record) => ({
      id: record.id,
      patientName: record.patientName,
      mrn: record.mrn,
      age: record.age,
      country: record.country,
      diagnosis: record.diagnosis,
      summary: record.clinicalNote,
      lastUpdated: record.lastUpdated,
      sourceSystem: record.sourceSystem,
    })),
  });
}
