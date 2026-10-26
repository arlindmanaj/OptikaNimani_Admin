import { emptyGrid, type CustomerInput, type RxInput } from "./model";
export const sampleCustomers: CustomerInput[] = [
  {
    firstName: "Arta",
    lastName: "Krasniqi",
    phone: "+383 44 000 101",
    email: "arta@example.com",
    dob: "1992-04-16",
    address: "Prishtina",
    notes: "Prefers lightweight frames. Usually visits with her daughter, Lea.",
    tags: ["Lightweight frames"],
  },
  {
    firstName: "Lea",
    lastName: "Krasniqi",
    phone: "",
    email: "",
    dob: "2016-09-03",
    address: "Prishtina",
    notes: "Contact her mother, Arta, for any follow-up.",
    tags: ["Junior"],
  },
  {
    firstName: "Dren",
    lastName: "Berisha",
    phone: "+383 44 000 102",
    email: "dren@example.com",
    dob: "1985-11-22",
    address: "Peja",
    notes: "Prefers a phone call for follow-ups.",
    tags: ["Phone preferred"],
  },
  {
    firstName: "Elira",
    lastName: "Berisha",
    phone: "+383 44 000 103",
    email: "",
    dob: "1988-06-12",
    address: "Peja",
    notes: "Interested in classic acetate frames.",
    tags: ["Acetate frames"],
  },
  {
    firstName: "Luan",
    lastName: "Gashi",
    phone: "+383 44 000 104",
    email: "luan@example.com",
    dob: "1974-02-08",
    address: "Gjakova",
    notes: "Bring previous glasses to the next visit.",
    tags: [],
  },
  {
    firstName: "Nora",
    lastName: "Hoxha",
    phone: "+383 44 000 105",
    email: "nora@example.com",
    dob: "1998-07-25",
    address: "Prishtina",
    notes: "",
    tags: ["Metal frames"],
  },
  {
    firstName: "Blerim",
    lastName: "Gashi",
    phone: "+383 44 000 106",
    email: "",
    dob: "1978-03-17",
    address: "Gjakova",
    notes: "",
    tags: [],
  },
  {
    firstName: "Era",
    lastName: "Shala",
    phone: "+383 44 000 107",
    email: "era@example.com",
    dob: "2001-12-04",
    address: "Prizren",
    notes: "",
    tags: ["Lightweight frames"],
  },
];
export function sampleRx(index: number, old = false): RxInput {
  const grid = emptyGrid();
  grid.distance.od = {
    sph: old ? "-1.00" : "-1.25",
    cyl: "-0.50",
    axis: "90",
    pd: "",
  };
  grid.distance.os = {
    sph: old ? "-0.75" : "-1.00",
    cyl: "-0.25",
    axis: "85",
    pd: "",
  };
  grid.distance.pd = "62";
  return {
    date: old ? "2025-05-12" : `2026-10-${String(10 + index).padStart(2, "0")}`,
    doctor: "Dr. Demo",
    notes: "Fictional example for exploring the workspace.",
    pdMode: "binocular",
    grid,
    supersedesId: null,
    correctionReason: "",
  };
}
