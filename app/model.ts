import { z } from "zod";
export const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid calendar date");
export const customerInput = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  phone: z.string().trim().max(40),
  email: z
    .union([z.literal(""), z.string().email("Enter a valid email")])
    .default(""),
  dob: z
    .union([
      z.literal(""),
      date.refine((v) => v <= today(), "Birth date cannot be in the future"),
    ])
    .default(""),
  address: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
});
const measurement = (min: number, max: number, label: string) =>
  z
    .string()
    .trim()
    .max(20)
    .refine(
      (v) =>
        v === "" ||
        (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v) &&
          Number(v) >= min &&
          Number(v) <= max),
      label,
    );
export const eyeInput = z.object({
  sph: measurement(-40, 40, "SPH must be between -40 and +40"),
  cyl: measurement(-20, 20, "CYL must be between -20 and +20"),
  axis: measurement(0, 180, "Axis must be between 0 and 180").refine(
    (v) => v === "" || Number.isInteger(Number(v)),
    "Axis must be a whole number",
  ),
  pd: measurement(1, 100, "PD must be between 1 and 100 mm"),
});
export const groupInput = z.object({
  od: eyeInput,
  os: eyeInput,
  pd: measurement(1, 100, "PD must be between 1 and 100 mm"),
});
export const rxInput = z
  .object({
    date: date.refine(
      (v) => v <= today(),
      "Prescription date cannot be in the future",
    ),
    doctor: z.string().trim().max(150),
    notes: z.string().trim().max(5000),
    pdMode: z.enum(["binocular", "monocular"]),
    grid: z.object({
      distance: groupInput,
      computer: groupInput,
      near: groupInput,
    }),
    supersedesId: z.string().nullable().default(null),
    correctionReason: z.string().trim().max(2000).default(""),
  })
  .superRefine((v, ctx) => {
    if (
      !Object.values(v.grid).some(
        (g) =>
          [g.od, g.os].some((e) =>
            [e.sph, e.cyl, e.axis, e.pd].some(Boolean),
          ) || g.pd,
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Enter at least one prescription measurement",
        path: ["grid"],
      });
    if (v.supersedesId && !v.correctionReason)
      ctx.addIssue({
        code: "custom",
        message: "Explain the correction so the history remains clear",
        path: ["correctionReason"],
      });
    for (const [k, g] of Object.entries(v.grid)) {
      if (v.pdMode === "binocular" && (g.od.pd || g.os.pd))
        ctx.addIssue({
          code: "custom",
          message: "Use the shared PD field for binocular measurements",
          path: ["grid", k],
        });
      if (v.pdMode === "monocular" && g.pd)
        ctx.addIssue({
          code: "custom",
          message: "Use the separate eye PD fields for monocular measurements",
          path: ["grid", k],
        });
    }
  });
export const familyInput = z.object({
  relativeId: z.string().min(1).max(200),
  relationship: z.enum(["parent", "child", "partner", "sibling", "other"]),
  contact: z.boolean().default(false),
});
export const careInput = z.object({
  date: date.refine((v) => v <= today(), "Visit date cannot be in the future"),
  kind: z.enum([
    "Adjustment",
    "Repair",
    "Lens replacement",
    "Warranty",
    "Other",
  ]),
  notes: z.string().trim().min(1, "Describe the visit").max(5000),
});
export type CustomerInput = z.infer<typeof customerInput>;
export type Eye = z.infer<typeof eyeInput>;
export type Grid = z.infer<typeof rxInput>["grid"];
export type RxInput = z.infer<typeof rxInput>;
export type Customer = CustomerInput & {
  id: string;
  archived: boolean;
  demo: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
};
export type Prescription = RxInput & {
  deletedAt: string | null;
  id: string;
  customerId: string;
  author: string;
  createdAt: string;
};
export type Family = z.infer<typeof familyInput> & {
  id: string;
  customerId: string;
  createdAt: string;
};
export type Care = z.infer<typeof careInput> & {
  id: string;
  customerId: string;
  author: string;
  createdAt: string;
};
export type Attachment = {
  id: string;
  customerId: string;
  prescriptionId: string;
  name: string;
  mime: string;
  size: number;
  createdAt: string;
};
export type Audit = {
  id: string;
  customerId: string;
  action: string;
  author: string;
  createdAt: string;
};
export type Store = {
  customers: Customer[];
  prescriptions: Prescription[];
  families: Family[];
  aftercare: Care[];
  attachments: Attachment[];
  audit: Audit[];
  purchases: Purchase[];
  deletedPrescriptions: Prescription[];
  deletedPurchases: Purchase[];
};
export const purchaseCategories = [
  "Prescription glasses",
  "Sunglasses",
  "Frames",
  "Lenses",
  "Contact lenses",
  "Accessory",
  "Other",
] as const;
export const purchaseInput = z.object({
  date: date.refine(
    (v) => v <= today(),
    "Purchase date cannot be in the future",
  ),
  category: z.enum(purchaseCategories),
  description: z.string().trim().min(1, "Describe the purchased item").max(200),
  brand: z.string().trim().max(100).default(""),
  model: z.string().trim().max(100).default(""),
  quantity: z
    .number({ invalid_type_error: "Enter a valid quantity" })
    .int()
    .min(1, "Quantity must be at least 1")
    .max(1000),
  total: z
    .string()
    .trim()
    .max(20)
    .refine(
      (v) => v === "" || /^\d{1,8}([.,]\d{1,2})?$/.test(v),
      "Enter a valid amount with up to two decimal places",
    ),
  currency: z.literal("EUR").default("EUR"),
  prescriptionId: z.string().min(1).max(200).nullable().default(null),
  reference: z.string().trim().max(150).default(""),
  notes: z.string().trim().max(5000).default(""),
});
export type PurchaseInput = z.infer<typeof purchaseInput>;
export type Purchase = PurchaseInput & {
  deletedAt: string | null;
  id: string;
  customerId: string;
  totalCents: number | null;
  version: number;
  author: string;
  createdAt: string;
  updatedAt: string;
};
export const emptyGrid = (): Grid =>
  Object.fromEntries(
    ["distance", "computer", "near"].map((k) => [
      k,
      {
        od: { sph: "", cyl: "", axis: "", pd: "" },
        os: { sph: "", cyl: "", axis: "", pd: "" },
        pd: "",
      },
    ]),
  ) as Grid;
export const emptyCustomer: CustomerInput = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  dob: "",
  address: "",
  notes: "",
  tags: [],
};
export const name = (c?: { firstName: string; lastName: string }) =>
  c ? `${c.firstName} ${c.lastName}` : "Unknown customer";
export const groups = [
  ["distance", "Distance", "Për larg"],
  ["computer", "Computer", "Për kompjuter"],
  ["near", "Near", "Për afër"],
] as const;
