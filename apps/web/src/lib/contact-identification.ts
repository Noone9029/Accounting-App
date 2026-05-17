import type { ContactIdentificationType } from "@/lib/types";

export interface ContactIdentificationOption {
  value: ContactIdentificationType;
  label: string;
  pattern: string;
  maxLength: number;
  inputMode: "text" | "numeric";
  hint: string;
}

export const contactIdentificationOptions: ContactIdentificationOption[] = [
  { value: "CRN", label: "Commercial Register (CR) Number", pattern: "[0-9]{10}", maxLength: 10, inputMode: "numeric", hint: "10 digits." },
  { value: "MOM", label: "MOMRA License", pattern: "[A-Za-z0-9]{4,20}", maxLength: 20, inputMode: "text", hint: "4 to 20 letters or digits." },
  { value: "MLS", label: "MLSD License", pattern: "[A-Za-z0-9]{4,20}", maxLength: 20, inputMode: "text", hint: "4 to 20 letters or digits." },
  { value: "SAG", label: "SAGIA License", pattern: "[A-Za-z0-9]{4,20}", maxLength: 20, inputMode: "text", hint: "4 to 20 letters or digits." },
  { value: "NAT", label: "National ID", pattern: "1[0-9]{9}", maxLength: 10, inputMode: "numeric", hint: "10 digits starting with 1." },
  { value: "IQA", label: "Iqama Number", pattern: "2[0-9]{9}", maxLength: 10, inputMode: "numeric", hint: "10 digits starting with 2." },
  { value: "PAS", label: "Passport ID", pattern: "[A-Za-z0-9]{5,20}", maxLength: 20, inputMode: "text", hint: "5 to 20 letters or digits." },
  { value: "GCC", label: "GCC ID", pattern: "[A-Za-z0-9]{5,20}", maxLength: 20, inputMode: "text", hint: "5 to 20 letters or digits." },
  { value: "700", label: "700 Number", pattern: "700[0-9]{7}", maxLength: 10, inputMode: "numeric", hint: "10 digits starting with 700." },
  { value: "OTH", label: "Others", pattern: "[A-Za-z0-9]{1,30}", maxLength: 30, inputMode: "text", hint: "1 to 30 letters or digits." },
];

export function getContactIdentificationOption(value?: string | null): ContactIdentificationOption | null {
  return contactIdentificationOptions.find((option) => option.value === value) ?? null;
}

export function formatContactIdentificationType(value?: string | null): string {
  return getContactIdentificationOption(value)?.label ?? (value || "-");
}
