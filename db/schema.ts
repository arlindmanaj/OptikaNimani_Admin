import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
export const customers = sqliteTable(
  "customers",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    phone: text("phone").notNull().default(""),
    email: text("email").notNull().default(""),
    dob: text("dob").notNull().default(""),
    address: text("address").notNull().default(""),
    notes: text("notes").notNull().default(""),
    tags: text("tags").notNull().default("[]"),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    demo: integer("demo", { mode: "boolean" }).notNull().default(false),
    version: integer("version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("customer_owner").on(t.ownerId)],
);
export const prescriptions = sqliteTable(
  "prescriptions",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    date: text("date").notNull(),
    doctor: text("doctor").notNull().default(""),
    notes: text("notes").notNull().default(""),
    pdMode: text("pd_mode").notNull(),
    grid: text("grid").notNull(),
    supersedesId: text("supersedes_id"),
    correctionReason: text("correction_reason").notNull().default(""),
    author: text("author").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("rx_customer").on(t.customerId),
    uniqueIndex("rx_one_correction").on(t.supersedesId),
  ],
);
export const families = sqliteTable(
  "families",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    relativeId: text("relative_id")
      .notNull()
      .references(() => customers.id),
    relationship: text("relationship").notNull(),
    contact: integer("contact", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("family_customer").on(t.customerId),
    index("family_relative").on(t.relativeId),
  ],
);
export const aftercare = sqliteTable(
  "aftercare",
  {
    id: text("id").primaryKey(),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id),
    date: text("date").notNull(),
    kind: text("kind").notNull(),
    notes: text("notes").notNull(),
    author: text("author").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("care_customer").on(t.customerId)],
);
export const attachments = sqliteTable("attachments", {
  id: text("id").primaryKey(),
  customerId: text("customer_id")
    .notNull()
    .references(() => customers.id),
  prescriptionId: text("prescription_id")
    .notNull()
    .references(() => prescriptions.id),
  name: text("name").notNull(),
  key: text("key").notNull(),
  mime: text("mime").notNull(),
  size: integer("size").notNull(),
  createdAt: text("created_at").notNull(),
});
export const audit = sqliteTable(
  "audit",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull(),
    customerId: text("customer_id").notNull(),
    action: text("action").notNull(),
    author: text("author").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("audit_owner").on(t.ownerId)],
);
